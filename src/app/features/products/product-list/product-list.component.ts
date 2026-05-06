import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, isPlatformBrowser, NgClass, NgOptimizedImage } from '@angular/common';
import { catchError, debounceTime, map, of, startWith, switchMap, combineLatest } from 'rxjs';

import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { Product, ProductPage, Category } from '../../../shared/models/product.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

export interface ProductListVm {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [DecimalPipe, NgOptimizedImage, RouterLink, NgClass],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  /** Page settings - load all products for client-side grouping */
  readonly currentPage = signal(0);
  readonly pageSize = signal(100); // Load more for proper grouping

  /** Search signal with debounced API calls */
  readonly searchKeyword = signal('');
  readonly selectedCategoryId = signal<string>('');
  readonly minPrice = signal<number | undefined>(undefined);
  readonly maxPrice = signal<number | undefined>(undefined);

  /** Transition state for smooth category/search changes */
  readonly transitioning = signal(false);

  /** Categories for filter pills */
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

  private readonly categoryId$ = toObservable(this.selectedCategoryId);
  private readonly minPrice$ = toObservable(this.minPrice);
  private readonly maxPrice$ = toObservable(this.maxPrice);
  private readonly page$ = toObservable(this.currentPage);

  /** Track previous filter state to detect category/search changes vs initial load */
  private previousFilters = { categoryId: '', keyword: '' };
  private productsLoaded = false;
  private currentProducts: Product[] = [];
  private currentTotalCount = 0;
  private currentPageNum = 0;

  /** Target category for scroll from query params */
  private targetCategory: string | null = null;

  /** Combined trigger stream for all filter changes */
  private readonly filterTrigger$ = combineLatest([
    this.searchKeyword$,
    this.categoryId$,
    this.minPrice$,
    this.maxPrice$,
    this.page$,
  ]).pipe(
    map(([keyword, categoryId, minPrice, maxPrice, page]) => ({
      keyword: keyword.trim() || undefined,
      categoryId: categoryId || undefined,
      minPrice,
      maxPrice,
      page,
    })),
  );

  private readonly products$ = this.filterTrigger$.pipe(
    switchMap((filters) => {
      const hasFilters = filters.keyword || filters.categoryId || filters.minPrice !== undefined || filters.maxPrice !== undefined;

      // Check if this is a category or search change (not initial load)
      const isCategoryChange = filters.categoryId !== this.previousFilters.categoryId;
      const isSearchChange = filters.keyword !== this.previousFilters.keyword;
      const isFilterChangeOnly = (isCategoryChange || isSearchChange) && this.productsLoaded;

      // Update tracking for next time
      this.previousFilters = {
        categoryId: filters.categoryId || '',
        keyword: filters.keyword || ''
      };

      // If it's a filter change and we already have products, use smooth transition
      if (isFilterChangeOnly) {
        this.transitioning.set(true);
      }

      const fetch$ = hasFilters
        ? this.productService.searchProducts({
            page: 0,
            pageSize: this.pageSize(),
            keyword: filters.keyword,
            categoryId: filters.categoryId,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
          })
        : this.productService.getProducts(0, this.pageSize());

      return fetch$.pipe(
        map((res: ProductPage): ProductListVm => {
          this.productsLoaded = true;
          this.currentProducts = res.content;
          this.currentTotalCount = res.totalElements;
          this.currentPageNum = res.page;
          // Smooth fade-in after filter change
          if (isFilterChangeOnly) {
            setTimeout(() => this.transitioning.set(false), 50);
          }
          // Scroll to target category after products render
          setTimeout(() => this.scrollToTargetCategory(), 100);
          return {
            products: res.content,
            totalCount: res.totalElements,
            page: res.page,
            pageSize: res.size,
            loading: false,
            error: null,
          };
        }),
        startWith(isFilterChangeOnly
          ? {
              // Keep existing products visible during transition, don't show skeleton
              products: this.currentProducts,
              totalCount: this.currentTotalCount,
              page: this.currentPageNum,
              pageSize: this.pageSize(),
              loading: false, // Don't show skeleton on filter change
              error: null,
            }
          : {
              products: [] as Product[],
              totalCount: 0,
              page: 0,
              pageSize: this.pageSize(),
              loading: true,
              error: null,
            }
        ),
        catchError((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to load products.';
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

  /** Convert observable to signal for template use */
  readonly vm = toSignal(this.products$, {
    initialValue: {
      products: [] as Product[],
      totalCount: 0,
      page: 0,
      pageSize: 100,
      loading: true,
      error: null as string | null,
    } satisfies ProductListVm,
  });

  /** Computed: Check if any filter is active */
  readonly hasActiveFilters = computed(() => {
    return this.searchKeyword().trim().length > 0 ||
      this.selectedCategoryId() !== '' ||
      this.minPrice() !== undefined ||
      this.maxPrice() !== undefined;
  });

  /** Computed: Check if we're in search mode */
  readonly isSearchMode = computed(() => {
    return this.searchKeyword().trim().length > 0;
  });

  /** Computed: Check if a specific category is selected */
  readonly isCategoryFilterActive = computed(() => {
    return this.selectedCategoryId() !== '';
  });

  /** Computed: Group products by category for sectioned display */
  readonly groupedProducts = computed(() => {
    const groups = new Map<string, Product[]>();
    this.vm().products.forEach((p: Product) => {
      const cat = p.categoryName ?? 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    });
    return Array.from(groups.entries())
      .map(([name, products]) => ({ name, products }));
  });

  /** Computed: Get latest arrivals (4 most recent) */
  readonly latestArrivals = computed(() => {
    return [...this.vm().products]
      .sort((a: Product, b: Product) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  });

  /** Get category name by ID for display */
  getCategoryNameById(categoryId: string): string {
    const cat = this.categories().find(c => c.id === categoryId);
    return cat?.name ?? 'Products';
  }

  /** Computed: Get selected category name */
  readonly selectedCategoryName = computed(() => {
    return this.getCategoryNameById(this.selectedCategoryId());
  });

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }

  trackByCategoryName(index: number, group: { name: string; products: Product[] }): string {
    return group.name;
  }

  /** Get first image URL from product, handling both string[] and single string */
  getFirstImage(product: Product): string {
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls[0];
    }
    // Fallback placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }

  /** Handle image load error by setting fallback */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }

  /** Check if product was created within last 7 days */
  isNew(product: Product): boolean {
    const created = new Date(product.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  /** Select a category by ID */
  selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.currentPage.set(0);
  }

  /** Select category by name (used for "See all" links) */
  selectCategoryByName(categoryName: string): void {
    const cat = this.categories().find(c => c.name === categoryName);
    if (cat) {
      this.selectedCategoryId.set(cat.id);
    }
  }

  /** Clear all filters */
  clearFilters(): void {
    this.searchKeyword.set('');
    this.selectedCategoryId.set('');
    this.minPrice.set(undefined);
    this.maxPrice.set(undefined);
    this.currentPage.set(0);
  }

  /** Handle min price input */
  onMinPriceInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.minPrice.set(val ? +val : undefined);
    this.currentPage.set(0);
  }

  /** Handle max price input */
  onMaxPriceInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.maxPrice.set(val ? +val : undefined);
    this.currentPage.set(0);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.targetCategory = params['category'] || null;
    });
  }

  scrollToTargetCategory(): void {
    if (this.targetCategory && isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'instant' });

      setTimeout(() => {
        const element = document.getElementById(
          'category-' + this.targetCategory
        );
        if (element) {
          const navbarHeight = 80;
          const elementTop = element.getBoundingClientRect().top
                             + window.scrollY;
          const targetPosition = elementTop - navbarHeight - 16;

          // Smooth manual scroll (slow and simple)
          const startPosition = 0;
          const distance = targetPosition - startPosition;
          const duration = 1200; // 1.2 seconds — slow and clean
          let startTime: number | null = null;

          function easeInOutQuad(t: number): number {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          }

          function step(currentTime: number): void {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startPosition + distance * easeInOutQuad(progress));
            if (elapsed < duration) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
        }
        this.targetCategory = null;
      }, 300);
    }
  }
}

