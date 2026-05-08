import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AddToCartRequest,
  CartResponse,
  UpdateCartItemRequest,
} from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cart`;

  /** Signal for cart item count (for navbar badge) */
  readonly cartCount = signal(0);

  /** Get current user's cart */
  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(this.baseUrl).pipe(
      tap((cart) => this.updateCartCount(cart)),
    );
  }

  /** Load cart and update cart count signal */
  loadCart(): void {
    this.getCart().subscribe({
      error: () => {
        // Silently fail - cart may not exist yet
        this.cartCount.set(0);
      },
    });
  }

  /** Add item to cart */
  addToCart(request: AddToCartRequest): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${this.baseUrl}/items`, request).pipe(
      tap((cart) => this.updateCartCount(cart)),
    );
  }

  /** Update item quantity in cart */
  updateQuantity(productId: string, quantity: number): Observable<CartResponse> {
    const request: UpdateCartItemRequest = { quantity };
    return this.http
      .put<CartResponse>(`${this.baseUrl}/items/${productId}`, request)
      .pipe(tap((cart) => this.updateCartCount(cart)));
  }

  /** Remove item from cart */
  removeItem(productId: string): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.baseUrl}/items/${productId}`)
      .pipe(tap((cart) => this.updateCartCount(cart)));
  }

  /** Clear entire cart */
  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clear`).pipe(
      tap(() => this.cartCount.set(0)),
    );
  }

  /** Update cart count signal from cart response */
  private updateCartCount(cart: CartResponse): void {
    this.cartCount.set(cart.totalItemsCount ?? 0);
  }
}
