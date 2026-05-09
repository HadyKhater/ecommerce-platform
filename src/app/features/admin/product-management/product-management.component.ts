import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, map, of, startWith, switchMap, tap, distinctUntilChanged, finalize } from 'rxjs';

import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { InventoryService, InventoryResponseWithStatus } from '../../../shared/services/inventory.service';
import { Product, ProductPage, Category, ProductRequest } from '../../../shared/models/product.model';
import { InventoryResponse } from '../../../shared/models/inventory.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

export interface ProductManagementVm {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  deleteSuccess: boolean;
}

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, NgClass, RouterLink, ReactiveFormsModule],
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductManagementComponent {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly inventoryService = inject(InventoryService);

  // Pagination signals
  readonly currentPage = signal(0);
  readonly pageSize = signal(10);

  // FIX 2: Filter signals
  readonly searchKeyword = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);
  /** Status filter: null = all, true = active only, false = inactive only */
  readonly statusFilter = signal<boolean | null>(null);

  /** Delete confirmation state */
  readonly deletingId = signal<string | null>(null);
  readonly deleteSuccess = signal(false);

  /** FIX 3: Track deleted product IDs to filter from UI without API refresh */
  readonly deletedIds = signal<Set<string>>(new Set());

  /** FIX 1: Track products being updated for loading state */
  readonly updatingIds = signal<Set<string>>(new Set());

  /** FIX 1: Track products array for local state updates */
  readonly localProducts = signal<Product[]>([]);

  /** Inventory map for live stock data */
  readonly inventoryMap = signal<Map<string, InventoryResponseWithStatus | null>>(new Map());

  /** Track products being initialized for loading state */
  readonly initializingIds = signal<Set<string>>(new Set());

  /** Manual refresh trigger for explicit reloads */
  readonly refreshTrigger = signal(0);

  /** FIX: Add a separate signal for ALL products for stats counting */
  readonly allProducts = signal<Product[]>([]);

  /** Categories for filter dropdown */
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError(() => of([] as Category[])),
    ),
    { initialValue: [] as Category[] },
  );

  // FIX 2: Search input with debounce
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly totalProducts = computed(() => this.allProducts().length);

  readonly activeCount = computed(() => this.allProducts().filter(p => p.active).length);

  readonly outOfStockCount = signal(0);

  // FIX 2: Load products when any filter or page changes
  private readonly filterChange$ = toObservable(
    computed(() => ({
      page: this.currentPage(),
      size: this.pageSize(),
      keyword: this.searchKeyword(),
      categoryId: this.selectedCategoryId(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      status: this.statusFilter(), // Status filter: null = all, true = active, false = inactive
      refresh: this.refreshTrigger(), // Include refresh trigger to force reload
    }))
  ).pipe(
    tap(() => {
      // Clear local products when filters change to use server-filtered results
      this.localProducts.set([]);
    })
  );

  // FIX 2: Debounced search input
  private readonly searchInput$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    tap((value) => {
      this.searchKeyword.set(value.trim());
      this.currentPage.set(0); // Reset to first page on search
    }),
  );




  private readonly products$ = this.filterChange$.pipe(
    switchMap((filters) => {
      const { page, size, keyword, categoryId, minPrice, maxPrice, status } = filters;
      // refresh is intentionally unused - it's just to trigger re-emission

      // Use getAdminProducts for admin view to see ALL products including inactive
      const fetch$ = this.productService.getAdminProducts(
        page,
        size,
        keyword || undefined,
        categoryId || undefined,
        minPrice ?? undefined,
        maxPrice ?? undefined,
        status ?? undefined, // Pass status filter: undefined = all, true = active, false = inactive
      );

      return fetch$.pipe(
        tap((res: ProductPage) => {
          // FIX 1: Update local products when new data arrives
          this.localProducts.set(res.content);
          // Load inventory for each product
          this.loadInventoryForProducts(res.content);
        }),
        map((res: ProductPage) => ({
          products: res.content,
          totalCount: res.totalElements,
          page: res.page,
          pageSize: res.size,
          loading: false,
          error: null as string | null,
          deleteSuccess: false,
        })),
        startWith({
          products: [] as Product[],
          totalCount: 0,
          page,
          pageSize: size,
          loading: true,
          error: null as string | null,
          deleteSuccess: false,
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to load products.';
          return of({
            products: [] as Product[],
            totalCount: 0,
            page,
            pageSize: size,
            loading: false,
            error: message,
            deleteSuccess: false,
          });
        }),
      );
    }),
  );

  readonly vm = toSignal(this.products$, {
    initialValue: {
      products: [] as Product[],
      totalCount: 0,
      page: 0,
      pageSize: 10,
      loading: true,
      error: null as string | null,
      deleteSuccess: false,
    },
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.vm().totalCount / this.vm().pageSize),
  );

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i),
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages = [];
    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  min(a: number, b: number) {
    return Math.min(a, b);
  }

  /** FIX 3: Filter deleted products from the display without API refresh */
  /** FIX 1: Merge localProducts (for live updates) with vm.products, filtering deleted */
  readonly displayProducts = computed(() => {
    const vmProducts = this.vm().products;
    const localProducts = this.localProducts();
    const deletedIds = this.deletedIds();
    // Use localProducts if available (for live updates), otherwise vmProducts
    const source = localProducts.length > 0 ? localProducts : vmProducts;
    return source.filter((p) => !deletedIds.has(p.id));
  });

  /**
   * FIX: Load stats by fetching all products and counting locally
   * Call this after any mutation (create, delete, toggle status)
   */
  private loadStats(): void {
    this.productService.getAdminProducts(0, 9999).subscribe({
      next: (res) => {
        this.allProducts.set(res.content);
        // We no longer load inventory for all products just to calculate out-of-stock count
      },
      error: (err) => console.error('Failed to load stats', err)
    });

    this.inventoryService.getOutOfStockCount().subscribe({
      next: (res) => {
        this.outOfStockCount.set(res.count);
      },
      error: (err) => console.error('Failed to load out of stock count', err)
    });
  }

  constructor() {
    this.loadStats();

    // Subscribe to search input changes
    this.searchInput$.subscribe();

    // Auto-hide delete success message after 3 seconds
    effect(() => {
      if (this.deleteSuccess()) {
        setTimeout(() => this.deleteSuccess.set(false), 3000);
      }
    });
  }

  // FIX: Manual load method - triggers reload via refresh trigger
  loadProducts(): void {
    this.refreshTrigger.update((n) => n + 1);
  }

  /**
   * FIX 1: Toggle product active status
   * Shows loading spinner on the row during API call
   * Updates local state on success without full page reload
   * Reverts on error and shows error message
   */
  toggleStatus(product: Product): void {
    // Add to updating set to show spinner
    this.updatingIds.update((set) => new Set(set).add(product.id));

    const newStatus = !product.active;
    const updateRequest: Partial<ProductRequest> = { active: newStatus };

    this.productService
      .updateProduct(product.id, updateRequest as ProductRequest)
      .pipe(
        tap((updatedProduct: Product) => {
          // Update local products array without reload
          this.localProducts.update((products) =>
            products.map((p) =>
              p.id === product.id ? { ...p, active: updatedProduct.active } : p,
            ),
          );
          // Also update stats
          this.loadStats();
        }),
        finalize(() => {
          // Remove from updating set regardless of success/failure
          this.updatingIds.update((set) => {
            const newSet = new Set(set);
            newSet.delete(product.id);
            return newSet;
          });
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to update product status.';
          console.error(message);
          // Error: UI reverts automatically since we only update on success
          return of(null);
        }),
      )
      .subscribe();
  }

  /** FIX 1: Check if a product is currently being updated */
  isUpdating(productId: string): boolean {
    return this.updatingIds().has(productId);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  // FIX 2: Category filter change handler
  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId || null);
    this.currentPage.set(0);
    this.loadProducts();
  }

  // FIX 2: Price filter change handlers
  onMinPriceChange(value: string): void {
    const numValue = value ? parseFloat(value) : null;
    this.minPrice.set(numValue);
    this.currentPage.set(0);
    this.loadProducts();
  }

  onMaxPriceChange(value: string): void {
    const numValue = value ? parseFloat(value) : null;
    this.maxPrice.set(numValue);
    this.currentPage.set(0);
    this.loadProducts();
  }

  // FIX 2: Clear all filters
  clearFilters(): void {
    this.searchControl.setValue('');
    this.searchKeyword.set('');
    this.selectedCategoryId.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.statusFilter.set(null); // Clear status filter
    this.currentPage.set(0);
    this.loadProducts();
  }

  /** Handle status filter change */
  onStatusChange(value: string): void {
    if (value === '') {
      this.statusFilter.set(null); // All Status
    } else if (value === 'true') {
      this.statusFilter.set(true); // Active Only
    } else if (value === 'false') {
      this.statusFilter.set(false); // Inactive Only
    }
    this.currentPage.set(0);
    this.loadProducts();
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  // FIXED: Delete with proper error handling - UI updates ONLY after API success
  deleteProduct(): void {
    const id = this.deletingId();
    if (!id) return;

    console.log('[Delete] Starting delete for product:', id);

    this.productService.deleteProduct(id).subscribe({
      next: () => {
        console.log('[Delete] API success for product:', id);
        // Only update UI after confirmed API success
        this.deletingId.set(null);
        this.deletedIds.update((set) => new Set(set).add(id));
        this.deleteSuccess.set(true);
        // Update stats only on success
        this.loadStats();
      },
      error: (err: unknown) => {
        console.error('[Delete] API error for product:', id, err);
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to delete product. Please try again.';
        // Show error in UI - do NOT remove from UI
        this.deletingId.set(null);
        // Note: Product stays visible in UI since delete failed
        alert('Delete failed: ' + message);
      },
    });
  }

  /**
   * FIX 2: Call this when returning from product form after creating a product
   * Used to refresh stats without full page reload
   */
  onProductCreated(): void {
    this.loadStats();
    this.loadProducts();
  }

  refresh(): void {
    this.loadProducts();
  }

  /**
   * Load inventory data for all products in the list.
   * Uses batch fetching to get all inventory in ONE request instead of N requests.
   * This eliminates console noise from individual 404 errors.
   */
  private loadInventoryForProducts(products: Product[]): void {
    if (products.length === 0) return;

    this.inventoryService.getAllInventory().pipe(
      catchError(() => of([] as InventoryResponse[])),
    ).subscribe((allInventory) => {
      const currentMap = new Map<string, InventoryResponseWithStatus | null>();
      
      // Create a lookup map from the batch response
      const inventoryLookup = new Map<string, InventoryResponseWithStatus>();
      // Handle both array and page response formats
      const items = Array.isArray(allInventory) 
        ? allInventory 
        : (allInventory as any).content ?? [];
      
      items.forEach((inv: InventoryResponse) => {
        inventoryLookup.set(inv.productId, { ...inv, isInitialized: true });
      });

      // Map each product to its inventory (or null if not initialized)
      products.forEach((product) => {
        const inventory = inventoryLookup.get(product.id) ?? null;
        currentMap.set(product.id, inventory);
      });

      this.inventoryMap.set(currentMap);
    });
  }

  /**
   * Get inventory for a specific product.
   * Returns null if no inventory data available.
   */
  getInventory(productId: string): InventoryResponseWithStatus | null {
    return this.inventoryMap().get(productId) ?? null;
  }

  /**
   * Get stock quantity class based on inventory levels.
   * Returns color class for stock display.
   */
  getStockClass(product: Product): string {
    const inventory = this.getInventory(product.id);
    const available = inventory?.quantityAvailable ?? 0;
    const threshold = inventory?.lowStockThreshold ?? 10;

    if (available === 0) return 'text-red-400';
    if (available <= threshold) return 'text-amber-400';
    return 'text-emerald-400';
  }

  /**
   * Get stock display text based on inventory levels.
   */
  getStockText(product: Product): string {
    const inventory = this.getInventory(product.id);
    const available = inventory?.quantityAvailable ?? 0;

    if (available === 0) return 'Out of Stock';
    return `${available} available`;
  }

  /**
   * Check if a product needs inventory initialization.
   * Returns true if inventory exists but isInitialized is false.
   */
  needsInitialization(productId: string): boolean {
    const inventory = this.getInventory(productId);
    return inventory !== null && inventory.isInitialized === false;
  }

  /**
   * Check if a product is currently being initialized.
   */
  isInitializing(productId: string): boolean {
    return this.initializingIds().has(productId);
  }

  /**
   * Initialize inventory for a product that doesn't have inventory data yet.
   * Calls the backend POST /api/inventory/initialize/{productId} with initial quantity of 0.
   */
  initializeInventory(productId: string): void {
    // Add to initializing set to show spinner
    this.initializingIds.update((set) => new Set(set).add(productId));

    this.inventoryService
      .initializeInventory(productId, 0)
      .pipe(
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to initialize inventory.';
          console.error('[Initialize Inventory] Error:', message);
          alert('Failed to initialize inventory: ' + message);
          return of(null);
        }),
        finalize(() => {
          // Remove from initializing set regardless of success/failure
          this.initializingIds.update((set) => {
            const newSet = new Set(set);
            newSet.delete(productId);
            return newSet;
          });
        }),
      )
      .subscribe((result) => {
        if (result !== null) {
          // Success: reload all inventory data to refresh the map
          const currentProducts = this.displayProducts();
          this.loadInventoryForProducts(currentProducts);
        }
      });
  }
}
