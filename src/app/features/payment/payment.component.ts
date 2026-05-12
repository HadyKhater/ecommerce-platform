import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../shared/services/payment.service';
import { PaymentRequest, PaymentMethod } from '../../shared/models/payment.model';
import { OrderService } from '../../shared/services/order.service';
import { OrderResponse } from '../../shared/models/order.model';
import { DiscountService } from '../../core/services/discount.service';

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
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly discountService = inject(DiscountService);

  paymentForm!: FormGroup;
  orderId = signal<string | null>(null);
  order = signal<OrderResponse | null>(null);

  // Discount computed from service (persists across page refresh)
  discountInfo = computed(() => this.discountService.discountInfo());
  hasDiscount = computed(() => this.discountService.hasDiscount());

  // Computed values
  discountAmount = computed(() => this.discountService.discountAmount());
  finalTotal = computed(() => {
    const base = this.order()?.totalAmount ?? 0;
    const discount = this.discountAmount();
    return Math.max(0, base - discount);
  });

  // Order summary breakdown
  orderSummary = computed(() => {
    const subtotal = this.order()?.totalAmount ?? 0;
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
    this.route.queryParams.subscribe(params => {
      const id = params['orderId'];
      if (id) {
        this.orderId.set(id);
        this.loadOrder(id);
      } else {
        this.router.navigate(['/cart']);
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
    if (this.paymentForm.invalid || !this.order()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const request: PaymentRequest = {
      orderId: this.orderId()!,
      amount: this.finalTotal(),
      currency: this.order()!.currency,
      paymentMethod: 'CREDIT_CARD' as PaymentMethod,
      discountCode: this.discountInfo()?.code || undefined,
      discountAmount: this.discountAmount() > 0 ? this.discountAmount() : undefined
    };

    this.paymentService.processPayment(request).subscribe({
      next: (paymentResponse) => {
        this.submitting.set(false);
        // Clear discount after successful payment
        this.discountService.clearDiscount();
        // On success redirect to Order Confirmation
        this.router.navigate(['/order-confirmation'], { queryParams: { orderId: this.orderId() } });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Payment failed. Please check your details and try again.');
        this.submitting.set(false);
      }
    });
  }
}
