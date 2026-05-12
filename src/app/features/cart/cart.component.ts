import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { CartService } from '../../shared/services/cart.service';
import { CartResponse } from '../../shared/models/cart.model';
import { DiscountService } from '../../core/services/discount.service';

export interface CartVm {
  cart: CartResponse | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly discountService = inject(DiscountService);

  // Discount info from service
  readonly hasDiscount = computed(() => this.discountService.hasDiscount());
  readonly discountAmount = computed(() => this.discountService.discountAmount());
  readonly discountCode = computed(() => this.discountService.discountCode());

  // Order summary with discount
  readonly orderSummary = computed(() => {
    const cart = this.vm().cart;
    const subtotal = cart?.grandTotal ?? 0;
    const discount = this.discountAmount();
    const shipping = 0; // Free shipping
    return {
      subtotal,
      discount,
      shipping,
      total: Math.max(0, subtotal - discount + shipping),
      itemCount: cart?.totalItemsCount ?? 0
    };
  });

  /** Refresh trigger signal */
  private readonly refreshTrigger = signal(0);

  /** Observable that emits whenever refreshTrigger changes */
  private readonly refresh$ = toObservable(this.refreshTrigger);

  /** Cart view model as signal */
  readonly vm = toSignal(
    this.refresh$.pipe(
      switchMap(() =>
        this.cartService.getCart().pipe(
          map((cart): CartVm => ({
            cart,
            loading: false,
            error: null,
          })),
          startWith({
            cart: null as CartResponse | null,
            loading: true,
            error: null as string | null,
          }),
          catchError((err: unknown) => {
            const message =
              err instanceof Error ? err.message : 'Failed to load cart.';
            return of({
              cart: null as CartResponse | null,
              loading: false,
              error: message,
            });
          }),
        ),
      ),
    ),
    {
      initialValue: {
        cart: null as CartResponse | null,
        loading: true,
        error: null as string | null,
      } satisfies CartVm,
    },
  );

  /** Update item quantity */
  updateQuantity(productId: string, quantity: number): void {
    if (quantity < 1) return;

    this.cartService.updateQuantity(productId, quantity).subscribe({
      next: () => this.refreshTrigger.update((v) => v + 1),
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to update quantity.';
        console.error('Failed to update quantity:', message);
      },
    });
  }

  /** Remove item from cart */
  removeItem(productId: string): void {
    this.cartService.removeItem(productId).subscribe({
      next: () => this.refreshTrigger.update((v) => v + 1),
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to remove item.';
        console.error('Failed to remove item:', message);
      },
    });
  }

  /** Clear entire cart */
  clearCart(): void {
    this.cartService.clearCart().subscribe({
      next: () => this.refreshTrigger.update((v) => v + 1),
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to clear cart.';
        console.error('Failed to clear cart:', message);
      },
    });
  }

  /** Navigate to checkout */
  checkout(): void {
    void this.router.navigate(['/checkout']);
  }

  /** Get first image from cart item or return fallback */
  getItemImage(imageUrl: string | null): string {
    if (imageUrl) {
      return imageUrl;
    }
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjEiPjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
  }
}
