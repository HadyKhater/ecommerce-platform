import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StripeService } from '../../../shared/services/stripe.service';
import { CartService } from '../../../shared/services/cart.service';
import { DiscountService } from '../../../core/services/discount.service';
import { OrderService } from '../../../shared/services/order.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      @if (loading()) {
        <div class="flex flex-col items-center justify-center">
          <div class="h-16 w-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-6 text-slate-300">Verifying your payment...</p>
        </div>
      } @else if (success()) {
        <div class="rounded-2xl border border-slate-700 bg-slate-800 p-8">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 mb-6">
            <svg class="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
          <p class="text-slate-400 mb-2">Your payment has been processed successfully.</p>
          <p class="text-slate-500 text-sm mb-8">Session ID: {{ sessionId() }}</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a routerLink="/orders" class="btn-primary px-6 py-3 rounded-xl">View Orders</a>
            <a routerLink="/" class="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition">Continue Shopping</a>
          </div>
        </div>
      } @else {
        <div class="rounded-2xl border border-slate-700 bg-slate-800 p-8">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 mb-6">
            <svg class="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-4">Payment Failed</h1>
          <p class="text-slate-400 mb-8">{{ errorMessage() }}</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a routerLink="/payment" class="btn-primary px-6 py-3 rounded-xl">Try Again</a>
            <a routerLink="/" class="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition">Continue Shopping</a>
          </div>
        </div>
      }
    </section>
  `,
  styles: []
})
export class PaymentSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stripeService = inject(StripeService);
  private readonly cartService = inject(CartService);
  private readonly discountService = inject(DiscountService);
  private readonly orderService = inject(OrderService);

  loading = signal<boolean>(true);
  success = signal<boolean>(false);
  sessionId = signal<string>('');
  errorMessage = signal<string>('');
  orderId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['sessionId'] || params['session_id'];
      const orderIdFromQuery = params['orderId'];
      if (sessionId) {
        this.sessionId.set(sessionId);
        // Try to get orderId from multiple sources:
        // 1. Query params (if passed from order-confirmation)
        // 2. sessionStorage (stored before Stripe redirect)
        if (orderIdFromQuery) {
          this.orderId.set(orderIdFromQuery);
        } else {
          if (typeof window !== 'undefined') {
            const storedOrderId = sessionStorage.getItem('stripe_order_id');
            if (storedOrderId) {
              this.orderId.set(storedOrderId);
              // Clear it after reading to avoid stale data
              sessionStorage.removeItem('stripe_order_id');
            }
          }
        }
        this.verifySession(sessionId);
      } else {
        this.loading.set(false);
        this.success.set(false);
        this.errorMessage.set('No session ID provided');
      }
    });
  }

  private verifySession(sessionId: string): void {
    this.stripeService.retrieveCheckoutSession(sessionId).subscribe({
      next: (session) => {
        this.loading.set(false);
        if (session.paymentStatus === 'paid' || session.status === 'complete') {
          // Extract orderId from session metadata if not provided via query param
          if (!this.orderId() && session.metadata && session.metadata['orderId']) {
            this.orderId.set(session.metadata['orderId']);
          }

          // First confirm the order to transition from RESERVED to CONFIRMED
          if (this.orderId()) {
            this.orderService.confirmOrder(this.orderId()!).subscribe({
              next: () => {
                // Order confirmed successfully, now clear cart and discount
                this.cartService.clearCart().subscribe({
                  next: () => {
                    console.log('Cart cleared after successful Stripe payment');
                  },
                  error: (err) => {
                    console.error('Failed to clear cart after Stripe payment:', err);
                  }
                });
                // Clear discount after successful payment
                this.discountService.clearDiscount();
                this.success.set(true);
              },
              error: (confirmErr) => {
                console.error('Failed to confirm order after Stripe payment:', confirmErr);
                this.success.set(false);
                this.errorMessage.set('Payment succeeded but order confirmation failed. Please contact support.');
              }
            });
          } else {
            // No orderId available, proceed without confirmation (fallback)
            console.warn('No orderId available to confirm order after Stripe payment');
            this.cartService.clearCart().subscribe({
              next: () => {
                console.log('Cart cleared after successful Stripe payment');
              },
              error: (err) => {
                console.error('Failed to clear cart after Stripe payment:', err);
              }
            });
            this.discountService.clearDiscount();
            this.success.set(true);
          }
        } else {
          this.success.set(false);
          this.errorMessage.set('Payment status: ' + (session.paymentStatus || 'unknown'));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.success.set(false);
        this.errorMessage.set('Failed to verify payment session');
      }
    });
  }
}