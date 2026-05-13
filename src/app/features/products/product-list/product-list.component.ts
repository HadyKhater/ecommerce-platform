import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe, isPlatformBrowser, NgClass, NgOptimizedImage } from '@angular/common';
import { catchError, debounceTime, map, of, startWith, switchMap, combineLatest, tap } from 'rxjs';

import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { CartService } from '../../../shared/services/cart.service';
import { AuthService } from '../../../shared/services/auth.service';
import { InventoryService } from '../../../shared/services/inventory.service';
import { Product, ProductPage, Category } from '../../../shared/models/product.model';
import { InventoryResponse } from '../../../shared/models/inventory.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

export interface ProductListVm {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [DecimalPipe, RouterLink, NgClass, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartService = inject(CartService);
  private readonly inventoryService = inject(InventoryService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Inventory map for live stock data - authoritative source */
  readonly inventoryMap = signal<Map<string, InventoryResponse | null>>(new Map());

  /** Page settings */
  readonly currentPage = signal(0);
  readonly pageSize = signal(12); // Standard page size for grid

  /** Search & Filter signals */
  readonly searchKeyword = signal('');
  readonly selectedCategory = signal<string>('');
  readonly minPrice = signal<number>(0);
  readonly maxPrice = signal<number>(0);
  maxPriceCap = 0;
  readonly availabilityFilter = signal<'all' | 'in-stock' | 'out-of-stock'>('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly sortBy = signal<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');

  /** Transition state for smooth changes */
  readonly transitioning = signal(false);

  /** Categories for sidebar */
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError(() => of([] as Category[])),
    ),
    { initialValue: [] as Category[] },
  );

  /** Debounced search keyword as observable */
  private readonly searchKeyword$ = toObservable(this.searchKeyword).pipe(
    debounceTime(300),
  );

  private readonly categoryId$ = toObservable(this.selectedCategory);
  private readonly minPrice$ = toObservable(this.minPrice);
  private readonly maxPrice$ = toObservable(this.maxPrice);
  private readonly page$ = toObservable(this.currentPage);

  /** Combined trigger stream for API fetching */
  private readonly fetchTrigger$ = combineLatest([
    this.searchKeyword$,
    this.categoryId$,
    this.page$,
  ]).pipe(
    map(([keyword, categoryId, page]) => ({
      keyword: keyword.trim() || undefined,
      categoryId: categoryId || undefined,
      page,
    })),
  );

  private readonly products$ = this.fetchTrigger$.pipe(
    switchMap((filters) => {
      this.transitioning.set(true);
      
      const fetch$ = filters.keyword || filters.categoryId
        ? this.productService.searchProducts({
            page: filters.page,
            pageSize: this.pageSize(),
            keyword: filters.keyword,
            categoryId: filters.categoryId,
          })
        : this.productService.getProducts(filters.page, this.pageSize());

      return fetch$.pipe(
        tap((res: ProductPage) => {
          this.loadInventoryForProducts(res.content);
          if (res.content.length > 0) {
            const highest = Math.ceil(
              Math.max(...res.content.map(p => p.price ?? 0))
            );
            this.maxPrice.set(highest);
            this.maxPriceCap = highest;
          }
        }),
        map((res: ProductPage): ProductListVm => {
          setTimeout(() => this.transitioning.set(false), 50);
          return {
            products: res.content,
            totalCount: res.totalElements,
            page: res.page,
            pageSize: res.size,
            loading: false,
            error: null,
          };
        }),
        startWith({
          products: [] as Product[],
          totalCount: 0,
          page: 0,
          pageSize: this.pageSize(),
          loading: true,
          error: null,
        } as ProductListVm),
        catchError((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load products.';
          this.transitioning.set(false);
          return of({
            products: [] as Product[],
            totalCount: 0,
            page: 0,
            pageSize: this.pageSize(),
            loading: false,
            error: message,
          });
        }),
      );
    }),
  );

  /** Main VM signal */
  readonly vm = toSignal(this.products$, {
    initialValue: {
      products: [] as Product[],
      totalCount: 0,
      page: 0,
      pageSize: 12,
      loading: true,
      error: null as string | null,
    } satisfies ProductListVm,
  });

  /** Computed: Apply client-side filters (Price Range, Availability) and Sorting */
  readonly filteredProducts = computed(() => {
    let result = [...this.vm().products];

    // 0. Category Filter
    if (this.selectedCategory()) {
      result = result.filter(p => !this.selectedCategory() || p.categoryId === this.selectedCategory());
    }

    // 1. Price Range Filter
    result = result.filter(p => p.price >= this.minPrice() && p.price <= this.maxPrice());

    // 2. Availability Filter
    if (this.availabilityFilter() !== 'all') {
      result = result.filter(p => {
        const stock = this.getAvailableStock(p);
        return this.availabilityFilter() === 'in-stock' ? stock > 0 : stock === 0;
      });
    }

    // 3. Sort By
    switch (this.sortBy()) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      // 'featured' is default API order
    }

    return result;
  });

  /** Computed: Total count after client-side filtering */
  readonly filteredCount = computed(() => this.filteredProducts().length);

  /** Computed: Check if any filter is active */
  readonly hasActiveFilters = computed(() => {
    return this.searchKeyword().trim().length > 0 ||
      this.selectedCategory() !== '' ||
      this.minPrice() !== 0 ||
      this.maxPrice() !== this.maxPriceCap ||
      this.availabilityFilter() !== 'all';
  });

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }

  isNew(product: Product): boolean {
    const created = new Date(product.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.currentPage.set(0);
  }

  clearFilters(): void {
    this.searchKeyword.set('');
    this.selectedCategory.set('');
    this.minPrice.set(0);
    this.maxPrice.set(this.maxPriceCap);
    this.availabilityFilter.set('all');
    this.sortBy.set('featured');
    this.currentPage.set(0);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
    });
  }

  quickAddToCart(product: Product): void {
    const inventory = this.getInventory(product.id);
    const available = inventory?.quantityAvailable ?? 0;

    if (available <= 0) return;

    if (!this.authService.isLoggedIn()) {
      sessionStorage.setItem('pending_action', JSON.stringify({
        type: 'ADD_TO_CART',
        productId: product.id,
        quantity: 1,
        productName: product.name
      }));
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.cartService.addToCart({
      productId: product.id,
      quantity: 1,
    }).subscribe({
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to add to cart.';
        console.error('Failed to quick add:', message);
      },
    });
  }

  private loadInventoryForProducts(products: Product[]): void {
    if (products.length === 0) return;

    this.inventoryService.getAllInventory().pipe(
      catchError(() => of([] as InventoryResponse[])),
    ).subscribe((allInventory) => {
      const currentMap = new Map<string, InventoryResponse | null>();
      const inventoryLookup = new Map<string, InventoryResponse>();
      allInventory.forEach((inv: InventoryResponse) => {
        inventoryLookup.set(inv.productId, inv);
      });

      products.forEach((product) => {
        const inventory = inventoryLookup.get(product.id) ?? null;
        currentMap.set(product.id, inventory);
      });

      this.inventoryMap.set(currentMap);
    });
  }

  getInventory(productId: string): InventoryResponse | null {
    return this.inventoryMap().get(productId) ?? null;
  }

  getAvailableStock(product: Product): number {
    const inventory = this.getInventory(product.id);
    return inventory?.quantityAvailable ?? 0;
  }

  /** Pagination Methods */
  nextPage(): void {
    if ((this.currentPage() + 1) * this.pageSize() < this.vm().totalCount) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  get totalPages(): number {
    return Math.ceil(this.vm().totalCount / this.pageSize());
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}
