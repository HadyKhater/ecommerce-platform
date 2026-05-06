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
import { Product } from '../../../shared/models/product.model';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

export interface ProductDetailVm {
  product: Product | null;
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
  private readonly route = inject(ActivatedRoute);

  /** Product ID from route params */
  readonly productId = signal<string>('');

  /** Selected image index for thumbnail gallery */
  readonly selectedImageIndex = signal<number>(0);

  /** Quantity for add to cart */
  readonly quantity = signal<number>(1);

  /** Observable that emits whenever productId changes */
  private readonly productIdChange$ = toObservable(this.productId);

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
          loading: false,
          error: 'Product ID is missing.',
        });
      }
      return this.productService.getProductById(id).pipe(
        map((product: Product) => ({
          product,
          loading: false,
          error: null as string | null,
        })),
        startWith({
          product: null as Product | null,
          loading: true,
          error: null as string | null,
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to load product.';
          return of({
            product: null as Product | null,
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
      loading: true,
      error: null as string | null,
    },
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
  }

  /** Increment quantity */
  incrementQuantity(): void {
    const max = this.vm().product?.stockQuantity ?? 0;
    this.quantity.update((q) => (q < max ? q + 1 : q));
  }

  /** Decrement quantity */
  decrementQuantity(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  /** Add to cart (placeholder) */
  addToCart(): void {
    // TODO: Implement cart functionality
    console.log('Add to cart:', this.vm().product?.id, 'Quantity:', this.quantity());
  }
}
