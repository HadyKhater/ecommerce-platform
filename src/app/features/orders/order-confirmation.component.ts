import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../shared/services/order.service';
import { OrderResponse } from '../../shared/models/order.model';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  order = signal<OrderResponse | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const orderId = params['orderId'];
      if (orderId) {
        this.loadOrder(orderId);
      } else {
        this.error.set('No order ID provided.');
        this.loading.set(false);
      }
    });
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
}
