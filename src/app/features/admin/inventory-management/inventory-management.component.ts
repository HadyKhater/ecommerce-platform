import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, tap, finalize } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { InventoryService } from '../../../shared/services/inventory.service';
import { ProductService } from '../../../shared/services/product.service';
import { InventoryResponse, StockMovementResponse } from '../../../shared/models/inventory.model';
import { Product } from '../../../shared/models/product.model';

export interface InventoryManagementVm {
  inventory: InventoryResponse[];
  loading: boolean;
  error: string | null;
  filterStatus: 'all' | 'low-stock' | 'out-of-stock';
  searchKeyword: string;
  restockSuccess: boolean;
  adjustSuccess: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  showOutOfStockAlert: boolean;
  outOfStockCount: number;
}

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryManagementComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  // State signals
  readonly inventory = signal<InventoryResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filterStatus = signal<'all' | 'low-stock' | 'out-of-stock'>('all');
  readonly searchKeyword = signal('');
  readonly restockSuccess = signal(false);
  readonly adjustSuccess = signal(false);

  // Pagination state (client-side)
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.size()));

  // Out of stock alert state
  readonly showOutOfStockAlert = signal(false);
  readonly outOfStockItems = signal<InventoryResponse[]>([]);
  readonly loadingOutOfStock = signal(false);

  // Modal state
  readonly showRestockModal = signal(false);
  readonly showAdjustModal = signal(false);
  readonly showHistoryModal = signal(false);
  readonly selectedItem = signal<InventoryResponse | null>(null);
  readonly restockQuantity = signal(1);
  readonly restockReason = signal('');
  readonly adjustReason = signal('');

  // Loading states for actions
  readonly restockingProductId = signal<string | null>(null);
  readonly adjustingProductId = signal<string | null>(null);

  // Product cache for name lookup
  readonly productCache = signal<Map<string, string>>(new Map());

  // Filter by specific productId (when navigating from product-management)
  readonly filterProductId = signal<string | null>(null);

  // History state
  readonly loadingHistory = signal(false);
  readonly movementHistory = signal<StockMovementResponse[]>([]);

  // Search control with debounce
  readonly searchControl = new FormControl('', { nonNullable: true });

  // Computed stats
  readonly totalProducts = computed(() => this.totalElements());

  readonly lowStockCount = computed(() =>
    (this.inventory() ?? []).filter((item) => item.isLowStock && !item.isOutOfStock).length
  );

  readonly outOfStockCount = computed(() =>
    (this.inventory() ?? []).filter((item) => item.isOutOfStock).length
  );

  readonly totalUnitsAvailable = computed(() =>
    (this.inventory() ?? []).reduce((sum, item) => sum + item.quantityAvailable, 0)
  );

  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i)
  );

  // Filtered inventory (before pagination)
  readonly filteredInventory = computed(() => {
    let items = this.inventory() ?? [];
    const status = this.filterStatus();
    const keyword = this.searchKeyword().toLowerCase().trim();
    const productIdFilter = this.filterProductId();

    // Filter by specific productId (when navigating from product-management)
    if (productIdFilter) {
      items = items.filter((item) => item.productId === productIdFilter);
    }

    // Filter by status
    if (status === 'low-stock') {
      items = items.filter((item) => item.isLowStock && !item.isOutOfStock);
    } else if (status === 'out-of-stock') {
      items = items.filter((item) => item.isOutOfStock);
    }

    // Filter by search keyword
    if (keyword) {
      items = items.filter((item) => {
        const productName = this.productCache().get(item.productId) || '';
        return (
          item.productId.toLowerCase().includes(keyword) ||
          productName.toLowerCase().includes(keyword)
        );
      });
    }

    return items;
  });

  // Paginated inventory (client-side pagination)
  readonly paginatedInventory = computed(() => {
    const start = this.page() * this.size();
    return this.filteredInventory().slice(start, start + this.size());
  });

  // ViewModel
  readonly vm = computed<InventoryManagementVm>(() => ({
    inventory: this.paginatedInventory(),
    loading: this.loading(),
    error: this.error(),
    filterStatus: this.filterStatus(),
    searchKeyword: this.searchKeyword(),
    restockSuccess: this.restockSuccess(),
    adjustSuccess: this.adjustSuccess(),
    currentPage: this.page(),
    pageSize: this.size(),
    totalPages: this.totalPages(),
    totalElements: this.totalElements(),
    showOutOfStockAlert: this.showOutOfStockAlert(),
    outOfStockCount: this.outOfStockItems().length,
  }));

  constructor() {
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((keyword) => this.searchKeyword.set(keyword)),
      )
      .subscribe();
  }

  ngOnInit(): void {
    // Check for productId query param (from Manage Stock button)
    this.route.queryParamMap.subscribe((params) => {
      const productId = params.get('productId');
      this.filterProductId.set(productId);

      if (productId) {
        // Load specific product's inventory and details
        this.loadInventoryForProduct(productId);
        this.loadProductDetails(productId);
      } else {
        // Load all inventory
        this.loadInventory();
        this.loadProducts();
      }
    });
  }

  /**
   * Load inventory for a specific product
   */
  private loadInventoryForProduct(productId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventoryService
      .getInventoryByProductId(productId)
      .pipe(
        tap((item) => {
          this.inventory.set([item]);
          this.loading.set(false);
        }),
        catchError((err) => {
          this.error.set(err.message || 'Failed to load inventory');
          this.loading.set(false);
          return of([] as InventoryResponse[]);
        }),
      )
      .subscribe();
  }

  /**
   * Load details for a specific product
   */
  private loadProductDetails(productId: string): void {
    this.productService
      .getProductById(productId)
      .pipe(
        tap((product: Product) => {
          const cache = new Map(this.productCache());
          cache.set(product.id, product.name);
          this.productCache.set(cache);
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  /**
   * Clear product filter and show all inventory
   */
  clearProductFilter(): void {
    this.filterProductId.set(null);
    this.loadInventory();
    this.loadProducts();
  }

  /**
   * Load all inventory items (client-side pagination)
   */
  loadInventory(): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventoryService
      .getAllInventory()
      .pipe(
        tap((response: InventoryResponse[]) => {
          this.inventory.set(response ?? []);
          this.totalElements.set(response?.length ?? 0);
          this.loading.set(false);
        }),
        catchError((err) => {
          this.error.set(err.message || 'Failed to load inventory');
          this.loading.set(false);
          return of([] as InventoryResponse[]);
        }),
      )
      .subscribe();
  }

  /**
   * Load all out-of-stock items for global alert
   */
  loadOutOfStockItems(): void {
    this.loadingOutOfStock.set(true);
    this.inventoryService
      .getOutOfStockItems()
      .pipe(
        tap((items) => {
          this.outOfStockItems.set(items);
          this.loadingOutOfStock.set(false);
        }),
        catchError((err) => {
          console.error('Failed to load out-of-stock items:', err);
          this.loadingOutOfStock.set(false);
          return of([] as InventoryResponse[]);
        }),
      )
      .subscribe();
  }

  /**
   * Toggle out-of-stock alert view
   */
  toggleOutOfStockAlert(): void {
    this.showOutOfStockAlert.update((value) => !value);
    if (this.showOutOfStockAlert() && this.outOfStockItems().length === 0) {
      this.loadOutOfStockItems();
    }
  }

  /**
   * Pagination controls (client-side)
   */
  prevPage(): void {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
    }
  }

  goToPage(p: number): void {
    this.page.set(p);
  }

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const pages: number[] = [];
    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, start + 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  /**
   * Load all products to build name cache
   */
  private loadProducts(): void {
    this.productService
      .getProducts(0, 1000)
      .pipe(
        tap((response) => {
          const cache = new Map(this.productCache());
          response.content.forEach((product: Product) => {
            cache.set(product.id, product.name);
          });
          this.productCache.set(cache);
        }),
        catchError(() => of({ content: [] as Product[] })),
      )
      .subscribe();
  }

  /**
   * Set filter status
   */
  setFilterStatus(status: 'all' | 'low-stock' | 'out-of-stock'): void {
    this.filterStatus.set(status);
  }

  /**
   * Open restock modal
   */
  openRestockModal(item: InventoryResponse): void {
    this.selectedItem.set(item);
    this.restockQuantity.set(1);
    this.restockReason.set('');
    this.showRestockModal.set(true);
  }

  /**
   * Open adjust modal
   */
  openAdjustModal(item: InventoryResponse): void {
    this.selectedItem.set(item);
    this.adjustAvailable.set(item.quantityAvailable);
    this.adjustReserved.set(item.quantityReserved);
    this.adjustThreshold.set(item.lowStockThreshold);
    this.adjustReason.set('');
    this.showAdjustModal.set(true);
  }

  /**
   * View history - opens history panel and loads movement history
   */
  viewHistory(item: InventoryResponse): void {
    this.selectedItem.set(item);
    this.showHistoryModal.set(true);
    this.loadMovementHistory(item.productId);
  }

  /**
   * Load movement history for a product
   */
  private loadMovementHistory(productId: string): void {
    this.loadingHistory.set(true);
    this.inventoryService
      .getMovementHistory(productId)
      .pipe(
        tap((movements) => {
          this.movementHistory.set(movements);
          this.loadingHistory.set(false);
        }),
        catchError((err) => {
          this.error.set(err.message || 'Failed to load movement history');
          this.loadingHistory.set(false);
          return of([] as StockMovementResponse[]);
        }),
      )
      .subscribe();
  }

  /**
   * Close restock modal
   */
  closeRestockModal(): void {
    this.showRestockModal.set(false);
    this.selectedItem.set(null);
  }

  /**
   * Close adjust modal
   */
  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
    this.selectedItem.set(null);
  }

  /**
   * Close history panel
   */
  closeHistoryPanel(): void {
    this.showHistoryModal.set(false);
    this.selectedItem.set(null);
    this.movementHistory.set([]);
  }

  /**
   * Close all modals
   */
  closeModal(): void {
    this.showRestockModal.set(false);
    this.showAdjustModal.set(false);
    this.showHistoryModal.set(false);
    this.selectedItem.set(null);
  }

  // Template accessor methods for modals
  restockModalOpen(): boolean {
    return this.showRestockModal();
  }

  adjustModalOpen(): boolean {
    return this.showAdjustModal();
  }

  historyPanelOpen(): boolean {
    return this.showHistoryModal();
  }

  // Template accessor methods for adjust form
  // These are now writable signals that can be used with .set() in the template
  readonly adjustAvailable = signal(0);

  readonly adjustReserved = signal(0);

  readonly adjustThreshold = signal(0);

  /**
   * Submit restock
   */
  onRestock(): void {
    const item = this.selectedItem();
    if (!item) return;

    this.restockingProductId.set(item.productId);
    this.error.set(null);

    this.inventoryService
      .restockProduct({
        productId: item.productId,
        quantity: this.restockQuantity(),
        reason: this.restockReason() || 'Manual restock',
      })
      .pipe(
        tap(() => {
          this.restockSuccess.set(true);
          this.closeRestockModal();
          this.loadInventory();
          // Refresh out-of-stock items if alert is active
          if (this.showOutOfStockAlert()) {
            this.loadOutOfStockItems();
          }
          setTimeout(() => this.restockSuccess.set(false), 3000);
        }),
        catchError((err) => {
          this.error.set(err.message || 'Failed to restock product');
          return of(null);
        }),
        finalize(() => this.restockingProductId.set(null)),
      )
      .subscribe();
  }

  /**
   * Submit stock adjustment
   */
  onAdjust(): void {
    const item = this.selectedItem();
    if (!item) return;

    this.adjustingProductId.set(item.productId);
    this.error.set(null);

    this.inventoryService
      .adjustStock(item.productId, {
        quantityAvailable: this.adjustAvailable(),
        quantityReserved: this.adjustReserved(),
        lowStockThreshold: this.adjustThreshold(),
        reason: this.adjustReason() || 'Manual adjustment',
      })
      .pipe(
        tap(() => {
          this.adjustSuccess.set(true);
          this.closeAdjustModal();
          this.loadInventory();
          // Refresh out-of-stock items if alert is active
          if (this.showOutOfStockAlert()) {
            this.loadOutOfStockItems();
          }
          setTimeout(() => this.adjustSuccess.set(false), 3000);
        }),
        catchError((err) => {
          this.error.set(err.message || 'Failed to adjust stock');
          return of(null);
        }),
        finalize(() => this.adjustingProductId.set(null)),
      )
      .subscribe();
  }

  /**
   * Get product name from cache
   */
  getProductName(productId: string): string {
    return this.productCache().get(productId) || 'Unknown Product';
  }

  /**
   * Truncate ID for display
   */
  truncateId(id: string): string {
    return id.length > 12 ? `${id.substring(0, 8)}...` : id;
  }

  /**
   * Copy ID to clipboard
   */
  copyToClipboard(id: string): void {
    navigator.clipboard.writeText(id).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  /**
   * Get CSS class for available quantity
   */
  getAvailableQuantityClass(item: InventoryResponse): string {
    if (item.isOutOfStock) return 'text-red-400';
    if (item.isLowStock) return 'text-amber-400';
    return 'text-emerald-400';
  }

  /**
   * Get status badge CSS class
   */
  getStatusBadgeClass(item: InventoryResponse): string {
    if (item.isOutOfStock) {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (item.isLowStock) {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  }

  /**
   * Get status text
   */
  getStatusText(item: InventoryResponse): string {
    if (item.isOutOfStock) return 'Out of Stock';
    if (item.isLowStock) return 'Low Stock';
    return 'In Stock';
  }

  /**
   * Get movement type badge class
   */
  getMovementTypeClass(movementType: string): string {
    switch (movementType) {
      case 'RESTOCK':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'SALE':
        return 'bg-red-500/10 text-red-400';
      case 'RETURN':
        return 'bg-blue-500/10 text-blue-400';
      case 'ADJUSTMENT':
        return 'bg-amber-500/10 text-amber-400';
      case 'RESERVATION':
        return 'bg-violet-500/10 text-violet-400';
      case 'RELEASE':
        return 'bg-slate-500/10 text-slate-400';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(dateString: string | null): string {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Get alert button CSS class
   */
  getAlertBtnClass(): string {
    if (this.vm().showOutOfStockAlert) {
      return 'rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-red-500/20 text-red-400 border border-red-500/30';
    }
    return 'rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-slate-800 text-slate-400 border border-slate-600';
  }

  /**
   * Get pagination button CSS class
   */
  getPaginationBtnClass(page: number): string {
    if (page === this.vm().currentPage) {
      return 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors bg-primary-500 text-white shadow-lg shadow-primary-500/25';
    }
    return 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-dark-hover';
  }
}
