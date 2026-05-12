import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, NgClass } from '@angular/common';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { ProductService } from '../../../shared/services/product.service';
import { CartService } from '../../../shared/services/cart.service';
import { InventoryService } from '../../../shared/services/inventory.service';
import { Product } from '../../../shared/models/product.model';
import { InventoryResponse } from '../../../shared/models/inventory.model';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

export interface ProductDetailVm {
  product: Product | null;
  inventory: InventoryResponse | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [DecimalPipe, NgClass, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);

  /** Product ID from route params */
  readonly productId = signal<string>('');

  /** Selected image index for thumbnail gallery */
  readonly selectedImageIndex = signal<number>(0);

  /** Quantity for add to cart */
  readonly quantity = signal<number>(1);

  /** Loading state for add to cart */
  readonly addingToCart = signal(false);

  /** Success feedback state */
  readonly addToCartSuccess = signal(false);

  /** Image zoom state */
  readonly isZoomed = signal(false);
  readonly zoomPosition = signal({ x: 50, y: 50 });

  /** Touch handling for mobile swipe */
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly swipeThreshold = 50;

  /** Observable that emits whenever productId changes */
  private readonly productIdChange$ = toObservable(this.productId);

  /** Inventory data for the current product */
  readonly inventory = signal<InventoryResponse | null>(null);

  constructor() {
    // Read initial route param
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.productId.set(id);
  }

  /** Observable stream that fetches a single product */
  private readonly product$ = this.productIdChange$.pipe(
    switchMap((id) => {
      if (!id) {
        return of({
          product: null,
          inventory: null,
          loading: false,
          error: 'Product ID is missing.',
        });
      }
      return this.productService.getProductById(id).pipe(
        switchMap((product: Product) => {
          // Load inventory for this product
          return this.inventoryService.getInventoryByProductId(id).pipe(
            map((inventory: InventoryResponse | null) => ({
              product,
              inventory,
              loading: false,
              error: null as string | null,
            })),
            catchError(() => {
              // If inventory not found, still show product
              return of({
                product,
                inventory: null,
                loading: false,
                error: null as string | null,
              });
            }),
          );
        }),
        startWith({
          product: null as Product | null,
          inventory: null as InventoryResponse | null,
          loading: true,
          error: null as string | null,
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to load product.';
          return of({
            product: null as Product | null,
            inventory: null as InventoryResponse | null,
            loading: false,
            error: message,
          });
        }),
      );
    }),
  );

  readonly vm = toSignal(this.product$, {
    initialValue: {
      product: null,
      inventory: null,
      loading: true,
      error: null as string | null,
    },
  });

  /** Get available stock from inventory */
  readonly availableStock = computed(() => {
    return this.vm().inventory?.quantityAvailable ?? 0;
  });

  /** Check if product is out of stock */
  readonly isOutOfStock = computed(() => {
    return this.availableStock() === 0;
  });

  /** Check if product has low stock */
  readonly isLowStock = computed(() => {
    const available = this.availableStock();
    const threshold = this.vm().inventory?.lowStockThreshold ?? 10;
    return available > 0 && available <= threshold;
  });

  /** Check if the product has images */
  readonly hasImages = computed(
    () => (this.vm().product?.imageUrls?.length ?? 0) > 0,
  );

  /** Get selected image URL or first image */
  readonly selectedImageUrl = computed(() => {
    const product = this.vm().product;
    if (!product?.imageUrls?.length) {
      return this.getFallbackImage();
    }
    return product.imageUrls[this.selectedImageIndex()] ?? product.imageUrls[0];
  });

  /** Get first image URL from product */
  getFirstImage(product: Product | null): string {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls[0];
    }
    return this.getFallbackImage();
  }

  /** Handle image load error */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getFallbackImage();
  }

  /** Get fallback placeholder SVG */
  private getFallbackImage(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }

  /** Select thumbnail image */
  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
    this.isZoomed.set(false);
  }

  /** Navigate to previous image */
  prevImage(): void {
    const product = this.vm().product;
    if (!product?.imageUrls?.length) return;
    const currentIndex = this.selectedImageIndex();
    const newIndex = (currentIndex - 1 + product.imageUrls.length) % product.imageUrls.length;
    this.selectedImageIndex.set(newIndex);
    this.isZoomed.set(false);
  }

  /** Navigate to next image */
  nextImage(): void {
    const product = this.vm().product;
    if (!product?.imageUrls?.length) return;
    const currentIndex = this.selectedImageIndex();
    const newIndex = (currentIndex + 1) % product.imageUrls.length;
    this.selectedImageIndex.set(newIndex);
    this.isZoomed.set(false);
  }

  /** Toggle zoom mode */
  toggleZoom(): void {
    if (this.hasImages()) {
      this.isZoomed.update(z => !z);
    }
  }

  /** Handle mouse move for zoom */
  onMouseMove(event: MouseEvent): void {
    if (!this.isZoomed()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomPosition.set({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  /** Handle touch start for swipe */
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  /** Handle touch end for swipe */
  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > this.swipeThreshold) {
      if (diff > 0) {
        this.nextImage();
      } else {
        this.prevImage();
      }
    }
  }

  /** Increment quantity */
  incrementQuantity(): void {
    const max = this.availableStock();
    this.quantity.update((q) => (q < max ? q + 1 : q));
  }

  /** Decrement quantity */
  decrementQuantity(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  /** Add to cart */
  addToCart(): void {
    const product = this.vm().product;
    if (!product || this.addingToCart() || this.isOutOfStock()) return;

    this.addingToCart.set(true);
    this.addToCartSuccess.set(false);

    this.cartService
      .addToCart({
        productId: product.id,
        quantity: this.quantity(),
      })
      .subscribe({
        next: () => {
          this.addToCartSuccess.set(true);
          // Reset success message after 2 seconds
          setTimeout(() => this.addToCartSuccess.set(false), 2000);
        },
        error: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to add to cart.';
          console.error('Failed to add to cart:', message);
        },
        complete: () => {
          this.addingToCart.set(false);
        },
      });
  }
}
