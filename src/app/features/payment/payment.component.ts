import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../shared/services/payment.service';
import { StripeService } from '../../shared/services/stripe.service';
import { PaymentRequest, PaymentMethod } from '../../shared/models/payment.model';
import { StripeCheckoutRequest, StripeLineItem } from '../../shared/models/stripe.model';
import { OrderService } from '../../shared/services/order.service';
import { CartService } from '../../shared/services/cart.service';
import { OrderResponse, OrderRequest, OrderItemResponse } from '../../shared/models/order.model';
import { CartResponse, CartItemResponse } from '../../shared/models/cart.model';
import { DiscountService } from '../../core/services/discount.service';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly stripeService = inject(StripeService);
  private readonly orderService = inject(OrderService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly discountService = inject(DiscountService);

  paymentForm!: FormGroup;
  orderId = signal<string | null>(null);
  order = signal<OrderResponse | null>(null);
  orderRequest = signal<OrderRequest | null>(null);
  cart = signal<CartResponse | null>(null);
  stripe = signal<Stripe | null>(null);

  // Payment method selection
  selectedPaymentMethod = signal<'card' | 'stripe'>('card');

  // Discount computed from service (persists across page refresh)
  discountInfo = computed(() => this.discountService.discountInfo());
  hasDiscount = computed(() => this.discountService.hasDiscount());

  // Computed values
  discountAmount = computed(() => this.discountService.discountAmount());
  finalTotal = computed(() => {
    if (this.order()) {
      // Order totalAmount already has discount applied, use it directly
      return this.order()!.totalAmount;
    }
    const base = this.cart()?.grandTotal ?? 0;
    const discount = this.discountAmount();
    return Math.max(0, base - discount);
  });

  // Order summary breakdown
  orderSummary = computed(() => {
    const subtotal = this.order()?.totalAmount ?? this.cart()?.grandTotal ?? 0;
    const discount = this.discountAmount();
    const shipping = 0; // Free shipping
    return {
      subtotal,
      discount,
      shipping,
      total: Math.max(0, subtotal - discount + shipping)
    };
  });

  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.initStripe();

    // Check if we have an order request from checkout step
    const state = typeof window !== 'undefined' ? window.history.state ?? {} : {};
    if (state && state.orderRequest) {
      this.orderRequest.set(state.orderRequest);
      this.loadCart();
    }

    this.route.queryParams.subscribe(params => {
      const id = params['orderId'];
      if (id) {
        this.orderId.set(id);
        this.loadOrder(id);
      } else if (!state.orderRequest) {
        this.router.navigate(['/cart']);
      }
    });
  }

  private async initStripe(): Promise<void> {
    const stripePublicKey = 'pk_test_51TY2lsFIMsEYqNvlpomUPKVci5SSDXBdPjyxbl8JPXnqQRvBkLztBvxVrFaBHpyQTdRyncwW4limwsPj1QGXf4ww001OcwPlTd';
    const stripe = await loadStripe(stripePublicKey);
    this.stripe.set(stripe);
  }

  private loadCart(): void {
    this.loading.set(true);
    this.cartService.getCart().subscribe({
      next: (cartData) => {
        this.cart.set(cartData);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load cart details.');
        this.loading.set(false);
      }
    });
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^(\d{4}\s?){4}$/)]],
      cardName: ['', Validators.required],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]],
    });
  }

  formatCardNumber(event: any): void {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 16) {
      input = input.substr(0, 16);
    }
    const formatted = input.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.paymentForm.patchValue({ cardNumber: formatted }, { emitEvent: false });
  }

  formatExpiryDate(event: any): void {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 4) {
      input = input.substr(0, 4);
    }
    if (input.length > 2) {
      input = input.substr(0, 2) + '/' + input.substr(2, 2);
    }
    this.paymentForm.patchValue({ expiryDate: input }, { emitEvent: false });
  }

  private loadOrder(orderId: string): void {
    this.loading.set(true);
    this.orderService.getOrder(orderId).subscribe({
      next: (orderData) => {
        this.order.set(orderData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load order details.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.selectedPaymentMethod() === 'stripe') {
      this.processStripePayment();
    } else {
      this.processCardPayment();
    }
  }

  private processCardPayment(): void {
    if (this.paymentForm.invalid || (!this.order() && !this.orderRequest())) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    // Two-phase commit: Create order reservation first (not final order)
    if (!this.orderId() && this.orderRequest()) {
      this.orderService.createOrderReservation(this.orderRequest()!).subscribe({
        next: (orderResponse) => {
          this.orderId.set(orderResponse.id);
          this.order.set(orderResponse);
          this.processPayment();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to create order reservation. Please try again.');
          this.submitting.set(false);
        }
      });
    } else {
      this.processPayment();
    }
  }

  private processPayment(): void {
    const currentOrder = this.order()!;
    const request: PaymentRequest = {
      orderId: this.orderId()!,
      amount: this.finalTotal(),
      currency: currentOrder.currency,
      paymentMethod: 'CREDIT_CARD' as PaymentMethod,
      discountCode: this.discountInfo()?.code || undefined,
      discountAmount: this.discountAmount() > 0 ? this.discountAmount() : undefined
    };

    this.paymentService.processPayment(request).subscribe({
      next: (paymentResponse) => {
        // First confirm the order to transition from RESERVED to CONFIRMED
        this.orderService.confirmOrder(this.orderId()!).subscribe({
          next: () => {
            this.submitting.set(false);
            // Clear cart after successful payment and order confirmation
            this.cartService.clearCart().subscribe();
            // Clear discount after successful payment
            this.discountService.clearDiscount();
            // On success redirect to Order Confirmation
            this.router.navigate(['/order-confirmation'], { queryParams: { orderId: this.orderId() } });
          },
          error: (confirmErr) => {
            console.error('Failed to confirm order:', confirmErr);
            this.error.set('Payment succeeded but order confirmation failed. Please contact support.');
            this.submitting.set(false);
            // Do not navigate - order is in an inconsistent state
          }
        });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Payment failed. Please check your details and try again.');
        this.submitting.set(false);
      }
    });
  }

  private async processStripePayment(): Promise<void> {
    this.submitting.set(true);
    this.error.set(null);

    try {
      // Two-phase commit: Create order reservation first (not final order)
      if (!this.orderId() && this.orderRequest()) {
        const orderResponse = await this.orderService.createOrderReservation(this.orderRequest()!).toPromise();
        if (orderResponse) {
          this.orderId.set(orderResponse.id);
          this.order.set(orderResponse);
        }
      }

      // Build line items from cart or order
      const lineItems = this.buildStripeLineItems();

      const discountInfo = this.discountInfo();
      // Fix 2: Convert EGP to USD cents for Stripe
      // Using fixed exchange rate: 1 USD = 50 EGP (approximate)
      const EGP_TO_USD_RATE = 50;
      const amountInUSDCents = Math.round((this.finalTotal() / EGP_TO_USD_RATE) * 100);

      // Fix 3: For FIXED_AMOUNT discounts, convert discountValue from EGP to USD cents
      let discountValueInUSDCents: number | undefined;
      if (this.hasDiscount() && discountInfo) {
        if (discountInfo.discountType === 'FIXED_AMOUNT') {
          // Convert fixed amount from EGP to USD cents
          discountValueInUSDCents = Math.round((discountInfo.discountValue / EGP_TO_USD_RATE) * 100);
        } else {
          // For PERCENTAGE, use the discountValue as-is (it's already a percentage)
          discountValueInUSDCents = discountInfo.discountValue;
        }
      }

      const checkoutRequest: StripeCheckoutRequest = {
        orderId: this.orderId()!,
        amount: amountInUSDCents, // USD cents (post-discount total)
        currency: 'usd', // Stripe does not support EGP, use USD
        items: lineItems,
        discountCode: discountInfo?.code,
        discountAmount: this.hasDiscount() ? this.discountAmount() : undefined,
        discountType: discountInfo?.discountType,
        discountValue: discountValueInUSDCents
      };

      // Create checkout session
      const response = await this.stripeService.createCheckoutSession(checkoutRequest).toPromise();

      // Store orderId in sessionStorage for retrieval after Stripe redirect
      if (this.orderId()) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('stripe_order_id', this.orderId()!);
        }
      }

      // Redirect to Stripe Checkout URL
      if (response?.url) {
        if (typeof window !== 'undefined') {
          window.location.href = response.url;
        }
      } else if (response?.sessionId) {
        // If URL is not provided, retrieve the session to get the URL
        const session = await this.stripeService.retrieveCheckoutSession(response.sessionId).toPromise();
        if (session?.url) {
          if (typeof window !== 'undefined') {
            window.location.href = session.url;
          }
        } else {
          this.error.set('Unable to get Stripe checkout URL');
          this.submitting.set(false);
        }
      } else {
        this.error.set('Failed to create Stripe checkout session');
        this.submitting.set(false);
      }
    } catch (err: any) {
      this.error.set(err.error?.message || 'Failed to initiate Stripe payment. Please try again.');
      this.submitting.set(false);
    }
  }

  private buildStripeLineItems(): StripeLineItem[] {
    const items: StripeLineItem[] = [];

    // Fix 1: Always use order items as the source of truth at payment time
    // The order is the definitive record of what the customer is paying for
    if (this.order()) {
      this.order()!.items.forEach((item: OrderItemResponse) => {
        // Fix 2: Convert EGP to USD cents
        // Stripe requires amounts in smallest currency unit (cents for USD)
        // Using fixed exchange rate: 1 USD = 50 EGP (approximate)
        const EGP_TO_USD_RATE = 50;
        const amountInUSDCents = Math.round((item.unitPrice / EGP_TO_USD_RATE) * 100);

        items.push({
          name: item.productName || 'Product',
          description: '',
          amount: amountInUSDCents,
          currency: 'usd',
          quantity: item.quantity
        });
      });
    }

    // Note: Discount is applied via Stripe's coupon system on the backend
    // using discountType and discountValue for proper percentage/fixed handling

    return items;
  }
}