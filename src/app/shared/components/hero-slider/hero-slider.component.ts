import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Banner } from '../../../core/models/banner.model';

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      #sliderContainer
      class="relative w-full overflow-hidden rounded-2xl"
      [class.h-[400px]]="variant() === 'hero'"
      [class.h-[300px]]="variant() === 'compact'"
      [class.h-[200px]]="variant() === 'minimal'"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      @if (isLoading()) {
        <!-- Skeleton Loading -->
        <div class="absolute inset-0 animate-shimmer bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]"></div>
      } @else if (effectiveBanners().length === 0) {
        <!-- Empty State -->
        <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div class="text-center">
            <div class="mb-4 text-6xl">🎯</div>
            <h3 class="text-xl font-semibold text-white">Featured Collections</h3>
            <p class="text-slate-400 mt-2">Discover amazing products</p>
          </div>
        </div>
      } @else {
        <!-- Slides -->
        <div
          class="flex h-full transition-transform duration-500 ease-out"
          [style.transform]="'translateX(-' + (currentIndex() * 100) + '%)'"
          [style.touch-action]="'pan-y'"
          (touchstart)="onTouchStart($event)"
          (touchend)="onTouchEnd($event)"
        >
          @for (banner of effectiveBanners(); track banner.id) {
            <div class="relative h-full w-full flex-shrink-0 flex-grow-0">
              <!-- Background Image -->
              <img
                [src]="banner.imageUrl"
                [alt]="banner.title"
                class="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                (error)="onImageError($event)"
              />
              <!-- Gradient Overlay -->
              <div class="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

              <!-- Content -->
              <div class="relative z-10 flex h-full items-center">
                <div class="max-w-7xl mx-auto px-8 w-full">
                  <div class="max-w-lg animate-reveal-up">
                    @if (banner.subtitle) {
                      <span class="inline-block mb-4 px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {{ banner.subtitle }}
                      </span>
                    }
                    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                      {{ banner.title }}
                    </h2>
                    @if (banner.linkUrl) {
                      <a
                        [routerLink]="banner.linkUrl"
                        class="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-105"
                      >
                        Shop Now
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Navigation Arrows -->
        @if (effectiveBanners().length > 1 && showArrows()) {
          <button
            type="button"
            (click)="prevSlide()"
            class="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/50 backdrop-blur-sm text-white hover:bg-slate-900/70 transition-all duration-200 hover:scale-110"
            [class.opacity-0]="!isHovered()"
            [class.opacity-100]="isHovered()"
            [attr.aria-label]="'Previous slide'"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            (click)="nextSlide()"
            class="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/50 backdrop-blur-sm text-white hover:bg-slate-900/70 transition-all duration-200 hover:scale-110"
            [class.opacity-0]="!isHovered()"
            [class.opacity-100]="isHovered()"
            [attr.aria-label]="'Next slide'"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        }

        <!-- Pagination Dots -->
        @if (effectiveBanners().length > 1 && showPagination()) {
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            @for (banner of effectiveBanners(); track banner.id; let i = $index) {
              <button
                type="button"
                (click)="goToSlide(i)"
                class="transition-all duration-300 rounded-full h-2"
                [class]="i === currentIndex() ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'"
                [attr.aria-label]="'Go to slide ' + (i + 1)"
              ></button>
            }
          </div>
        }

        <!-- Auto-play Progress -->
        @if (autoPlay() && effectiveBanners().length > 1) {
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/30">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-100 ease-linear"
              [style.width.%]="progress()"
            ></div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSliderComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sliderContainer = viewChild<ElementRef>('sliderContainer');

  readonly banners = input<Banner[]>([]);
  readonly autoPlay = input<boolean>(true);
  readonly autoPlayInterval = input<number>(5000);
  readonly showArrows = input<boolean>(true);
  readonly showPagination = input<boolean>(true);
  readonly variant = input<'hero' | 'compact' | 'minimal'>('hero');
  readonly isLoading = input<boolean>(false);
  readonly slideChange = output<number>();

  readonly currentIndex = signal(0);
  readonly isHovered = signal(false);
  readonly progress = signal(0);
  readonly effectiveBanners = signal<Banner[]>([]);

  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly swipeThreshold = 50;

  ngOnInit(): void {
    this.effectiveBanners.set(this.banners());
    if (this.autoPlay()) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  private startAutoPlay(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const interval = this.autoPlayInterval();

    this.progressTimer = setInterval(() => {
      if (!this.isHovered()) {
        this.progress.update(p => {
          const newProgress = p + (100 / (interval / 100));
          return newProgress >= 100 ? 0 : newProgress;
        });
      }
    }, 100);

    this.autoPlayTimer = setInterval(() => {
      if (!this.isHovered()) {
        this.nextSlide();
        this.progress.set(0);
      }
    }, interval);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > this.swipeThreshold) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
  }

  nextSlide(): void {
    const banners = this.effectiveBanners();
    if (banners.length <= 1) return;
    this.currentIndex.update(i => (i + 1) % banners.length);
    this.progress.set(0);
    this.slideChange.emit(this.currentIndex());
  }

  prevSlide(): void {
    const banners = this.effectiveBanners();
    if (banners.length <= 1) return;
    this.currentIndex.update(i => (i - 1 + banners.length) % banners.length);
    this.progress.set(0);
    this.slideChange.emit(this.currentIndex());
  }

  goToSlide(index: number): void {
    this.currentIndex.set(index);
    this.progress.set(0);
    this.slideChange.emit(index);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }
}
