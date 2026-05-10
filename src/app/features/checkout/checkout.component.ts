import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../shared/services/cart.service';
import { OrderService } from '../../shared/services/order.service';
import { CartResponse } from '../../shared/models/cart.model';
import { OrderRequest } from '../../shared/models/order.model';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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

  checkoutForm!: FormGroup;
  cart = signal<CartResponse | null>(null);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);

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
      userEmail: this.authService.user()?.email ?? ''
    };

    this.orderService.createOrder(request).subscribe({
      next: (orderResponse) => {
        // Clear cart after successful order creation
        this.cartService.clearCart().subscribe();
        this.submitting.set(false);
        this.router.navigate(['/payment'], { queryParams: { orderId: orderResponse.id } });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to create order. Please try again.');
        this.submitting.set(false);
      }
    });
  }
}
