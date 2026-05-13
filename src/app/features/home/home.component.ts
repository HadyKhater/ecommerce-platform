import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { catchError, delay, finalize, map, of } from 'rxjs';

import { ProductService } from '../../shared/services/product.service';
import { CategoryService } from '../../shared/services/category.service';
import { Product, Category } from '../../shared/models/product.model';
import { BannerService } from '../../core/services/banner.service';
import { PromotionService } from '../../core/services/promotion.service';
import { Banner } from '../../core/models/banner.model';
import { Promotion } from '../../core/models/promotion.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { SkeletonHeroComponent, SkeletonCategoriesComponent, SkeletonProductsComponent, SkeletonPromotionsComponent } from '../../shared/components/skeletons';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    SkeletonHeroComponent,
    SkeletonCategoriesComponent,
    SkeletonProductsComponent,
    SkeletonPromotionsComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly bannerService = inject(BannerService);
  private readonly promotionService = inject(PromotionService);

  // Loading states
  readonly heroLoading = signal(true);
  readonly categoriesLoading = signal(true);
  readonly productsLoading = signal(true);
  readonly promotionsLoading = signal(true);

  // Promo bar signals
  readonly currentPromoIndex = signal(0);
  readonly promoBarDismissed = signal(false);
  private promoInterval: ReturnType<typeof setInterval> | null = null;

  // Countdown signals
  readonly countdownTime = signal<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Categories grid signals
  readonly showAllCategories = signal(false);
  readonly displayedCategories = computed(() =>
    this.showAllCategories() ? this.categories() : this.categories().slice(0, 8)
  );
  readonly hasMoreCategories = computed(() => this.categories().length > 8);

  // Hero slider
  readonly heroSlideIndex = signal(0);
  readonly heroProgress = signal(0);
  private heroAutoPlayInterval: ReturnType<typeof setInterval> | null = null;
  private heroProgressInterval: ReturnType<typeof setInterval> | null = null;
  private readonly heroAutoPlayDuration = 5000;

  // Stats counter signals
  readonly statProducts = signal(0);
  readonly statCategories = signal(0);
  readonly statDelivery = signal(100);
  readonly statsVisible = signal(false);
  private statsObserver: IntersectionObserver | null = null;

  /** Categories for showcase grid */
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      delay(300), // Ensure skeleton is visible for at least 300ms
      map(cats => {
        this.categoriesLoading.set(false);
        return cats;
      }),
      catchError(() => {
        this.categoriesLoading.set(false);
        return of([] as Category[]);
      }),
      finalize(() => {
        this.categoriesLoading.set(false);
      }),
    ),
    { initialValue: [] as Category[] },
  );

  /** Latest arrivals (4 most recent products) */
  readonly latestArrivals = toSignal(
    this.productService.getProducts(0, 100).pipe(
      delay(300), // Ensure skeleton is visible for at least 300ms
      map((res) => {
        const sorted = [...res.content]
          .sort((a: Product, b: Product) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 4);
        this.productsLoading.set(false);
        return sorted;
      }),
      catchError(() => {
        this.productsLoading.set(false);
        return of([] as Product[]);
      }),
      finalize(() => {
        this.productsLoading.set(false);
      }),
    ),
    { initialValue: [] as Product[] },
  );

  /** Active banners for carousel */
  readonly banners = toSignal(
    this.bannerService.getPublicBanners().pipe(
      delay(300), // Ensure skeleton is visible for at least 300ms
      map(banners => {
        this.heroLoading.set(false);
        return banners;
      }),
      catchError(() => {
        this.heroLoading.set(false);
        return of([] as Banner[]);
      }),
      finalize(() => {
        this.heroLoading.set(false);
      }),
    ),
    { initialValue: [] as Banner[] },
  );

  /** Active promotions */
  readonly activePromotions = toSignal(
    this.promotionService.getActivePromotions().pipe(
      delay(300), // Ensure skeleton is visible for at least 300ms
      map(promos => {
        this.promotionsLoading.set(false);
        return promos;
      }),
      catchError(() => {
        this.promotionsLoading.set(false);
        return of([] as Promotion[]);
      }),
      finalize(() => {
        this.promotionsLoading.set(false);
      }),
    ),
    { initialValue: [] as Promotion[] },
  );

  /** Get featured promotion (first active with highest discount) */
  readonly featuredPromotion = computed(() => {
    const promos = this.activePromotions();
    if (promos.length === 0) return null;
    return promos.reduce((max, promo) =>
      promo.discountValue > max.discountValue ? promo : max
      , promos[0]);
  });

  /** Category gradients */
  readonly categoryGradients = [
    'from-indigo-600 via-violet-600 to-purple-600',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-orange-500 via-amber-500 to-yellow-500',
    'from-rose-500 via-pink-500 to-fuchsia-500',
    'from-cyan-500 via-blue-500 to-indigo-500',
    'from-lime-500 via-green-500 to-emerald-500',
    'from-red-500 via-rose-500 to-pink-500',
    'from-violet-500 via-purple-500 to-fuchsia-500',
  ];

  /** Get gradient for category by index */
  getCategoryGradient(index: number): string {
    return this.categoryGradients[index % this.categoryGradients.length];
  }

  /** Get first image URL from product */
  getFirstImage(product: Product): string {
    if (product.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls[0];
    }
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }

  /** Handle image load error */
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

  /** Navigate to products page with category query param */
  navigateToCategory(categoryId: string): void {
    this.router.navigate(['/products'], {
      queryParams: { category: categoryId }
    });
  }

  /** Toggle categories grid expansion */
  toggleCategories(): void {
    this.showAllCategories.update(v => !v);
  }

  /** Dismiss promo bar */
  dismissPromoBar(): void {
    this.promoBarDismissed.set(true);
  }

  /** Get current promotion for display */
  get currentPromotion(): Promotion | null {
    const promos = this.activePromotions();
    if (promos.length === 0) return null;
    return promos[this.currentPromoIndex() % promos.length];
  }

  /** Calculate countdown time for promotion */
  private calculateCountdown(endDate: string): CountdownTime {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, end - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  /** Format number with leading zero */
  formatNumber(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /** Handle hero slide change */
  onHeroSlideChange(index: number): void {
    this.heroSlideIndex.set(index);
  }

  /** Navigate to previous hero slide */
  prevHeroSlide(): void {
    const banners = this.banners();
    if (banners.length <= 1) return;
    this.heroSlideIndex.update(i => (i - 1 + banners.length) % banners.length);
    this.resetHeroAutoPlay();
  }

  /** Navigate to next hero slide */
  nextHeroSlide(): void {
    const banners = this.banners();
    if (banners.length <= 1) return;
    this.heroSlideIndex.update(i => (i + 1) % banners.length);
    this.resetHeroAutoPlay();
  }

  /** Navigate to specific hero slide */
  goToHeroSlide(index: number): void {
    this.heroSlideIndex.set(index);
    this.resetHeroAutoPlay();
  }

  /** Reset hero autoplay timer */
  private resetHeroAutoPlay(): void {
    this.heroProgress.set(0);
    this.startHeroAutoPlay();
  }

  /** Start hero autoplay */
  private startHeroAutoPlay(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopHeroAutoPlay();

    this.heroProgressInterval = setInterval(() => {
      this.heroProgress.update(p => {
        const newProgress = p + (100 / (this.heroAutoPlayDuration / 100));
        return newProgress >= 100 ? 0 : newProgress;
      });
    }, 100);

    this.heroAutoPlayInterval = setInterval(() => {
      this.nextHeroSlide();
    }, this.heroAutoPlayDuration);
  }

  /** Stop hero autoplay */
  private stopHeroAutoPlay(): void {
    if (this.heroAutoPlayInterval) {
      clearInterval(this.heroAutoPlayInterval);
      this.heroAutoPlayInterval = null;
    }
    if (this.heroProgressInterval) {
      clearInterval(this.heroProgressInterval);
      this.heroProgressInterval = null;
    }
  }

  /** Get discount badge color */
  getDiscountBadgeClass(discountType: string, discountValue: number): string {
    if (discountType === 'PERCENTAGE' && discountValue >= 50) {
      return 'from-rose-500 via-pink-500 to-fuchsia-500';
    }
    if (discountType === 'PERCENTAGE' && discountValue >= 20) {
      return 'from-orange-500 via-amber-500 to-yellow-500';
    }
    return 'from-indigo-500 via-violet-500 to-purple-500';
  }

  /** Animate stats counter from 0 to target value */
  private animateStat(targetValue: number, duration: number, targetSignal: WritableSignal<number>): void {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      targetSignal.set(Math.floor(targetValue * easeOut));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /** Setup intersection observer for stats animation */
  private setupStatsObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;
    this.statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.statsVisible()) {
            this.statsVisible.set(true);
            // Animate stats: Products (13), Categories (8), Delivery (100)
            this.animateStat(13, 1500, this.statProducts);
            this.animateStat(8, 1500, this.statCategories);
            this.animateStat(100, 1500, this.statDelivery);
          }
        });
      },
      { threshold: 0.5 }
    );
    this.statsObserver.observe(statsSection);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Auto-rotate promotions every 3 seconds
      this.promoInterval = setInterval(() => {
        const promos = this.activePromotions();
        if (promos.length > 1) {
          this.currentPromoIndex.update(i => (i + 1) % promos.length);
        }
      }, 3000);

      // Initialize countdown for featured promotion
      this.countdownInterval = setInterval(() => {
        const promo = this.featuredPromotion();
        if (promo) {
          this.countdownTime.set(this.calculateCountdown(promo.endDate));
        }
      }, 1000);

      // Start hero autoplay when banners are available
      const banners = this.banners();
      if (banners.length > 1) {
        this.startHeroAutoPlay();
      }

      // Setup stats intersection observer
      setTimeout(() => this.setupStatsObserver(), 100);
    }
  }

  ngOnDestroy(): void {
    if (this.promoInterval) {
      clearInterval(this.promoInterval);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.stopHeroAutoPlay();
    if (this.statsObserver) {
      this.statsObserver.disconnect();
    }
  }
}
