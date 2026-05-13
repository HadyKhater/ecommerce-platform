import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../shared/services/cart.service';
import { OrderService } from '../../shared/services/order.service';
import { CartResponse } from '../../shared/models/cart.model';
import { OrderRequest } from '../../shared/models/order.model';
import { AuthService } from '../../shared/services/auth.service';
import { PromotionService } from '../../core/services/promotion.service';
import { ValidatePromoCodeResponse } from '../../core/models/promotion.model';
import { DiscountService } from '../../core/services/discount.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly promotionService = inject(PromotionService);
  private readonly discountService = inject(DiscountService);

  checkoutForm!: FormGroup;
  cart = signal<CartResponse | null>(null);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

  // Promo code signals
  promoCode = signal('');
  promoLoading = signal(false);
  promoError = signal<string | null>(null);
  promoValidation = signal<ValidatePromoCodeResponse | null>(null);

  // Discount computed from service
  appliedDiscount = computed(() => this.discountService.discountAmount());
  hasDiscount = computed(() => this.discountService.hasDiscount());
  discountInfo = computed(() => this.discountService.discountInfo());

  cartTotal = computed(() => this.cart()?.grandTotal ?? 0);
  finalTotal = computed(() => this.discountService.calculateFinalTotal(this.cartTotal()));

  // Order summary breakdown
  orderSummary = computed(() => {
    const subtotal = this.cartTotal();
    const discount = this.appliedDiscount();
    const shipping = 0; // Free shipping
    return {
      subtotal,
      discount,
      shipping,
      total: Math.max(0, subtotal - discount + shipping)
    };
  });

  ngOnInit(): void {
    this.initForm();
    this.loadCart();
  }

  private initForm(): void {
    this.checkoutForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['EG', Validators.required],
      currency: ['EGP', Validators.required],
    });
  }

  private loadCart(): void {
    this.loading.set(true);
    this.cartService.getCart().subscribe({
      next: (cartData) => {
        if (!cartData || cartData.items.length === 0) {
          this.router.navigate(['/cart']);
        } else {
          this.cart.set(cartData);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load cart.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid || !this.cart()) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValues = this.checkoutForm.value;
    const shippingAddress = `${formValues.addressLine1}, ${formValues.addressLine2 ? formValues.addressLine2 + ', ' : ''}${formValues.city}, ${formValues.state} ${formValues.zipCode}, ${formValues.country}`;

    const currentCart = this.cart()!;
    const request: OrderRequest = {
      items: currentCart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      shippingAddress: shippingAddress,
      currency: formValues.currency,
      userEmail: this.authService.user()?.email ?? '',
      promoCode: this.discountService.discountInfo()?.code,
      discountAmount: this.appliedDiscount()
    };

    this.submitting.set(false);
    // Navigate to payment - pass request in state to be created on final confirmation
    this.router.navigate(['/payment'], {
      state: { orderRequest: request }
    });
  }

  validatePromoCode(): void {
    const code = this.promoCode().trim();
    if (!code) {
      this.promoError.set('Please enter a promo code');
      return;
    }

    // Check if same code already applied
    if (this.discountService.discountCode() === code) {
      this.promoError.set('This promo code is already applied');
      return;
    }

    this.promoLoading.set(true);
    this.promoError.set(null);
    this.promoValidation.set(null);

    this.promotionService.validatePromoCode({
      code: code,
      orderAmount: this.cartTotal(),
      userId: this.authService.user()?.id,
      userEmail: this.authService.user()?.email,
      cartCategoryIds: this.cart()?.items.map(item => item.categoryId!) || []
    }).subscribe({
      next: (response) => {
        this.promoLoading.set(false);
        if (response.valid && response.promotion) {
          this.promoValidation.set(response);
          // Store discount in service for persistence
          this.discountService.applyDiscount({
            code: code,
            discountAmount: response.discountAmount,
            discountType: response.promotion.discountType,
            discountValue: response.promotion.discountValue,
            subtotal: this.cartTotal()
          });
        } else {
          this.promoError.set(response.message || 'Invalid promo code');
          this.discountService.clearDiscount();
        }
      },
      error: (err) => {
        this.promoLoading.set(false);
        this.promoError.set(err.error?.message || 'Failed to validate promo code');
        this.discountService.clearDiscount();
      }
    });
  }

  removePromoCode(): void {
    this.promoCode.set('');
    this.promoValidation.set(null);
    this.promoError.set(null);
    this.discountService.clearDiscount();
  }

  /**
   * Check if discount is still valid for current cart total
   */
  isDiscountValid(): boolean {
    return this.discountService.isDiscountValid(this.cartTotal());
  }
}
