import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../shared/services/order.service';
import { AuthService } from '../../shared/services/auth.service';
import { OrderResponse } from '../../shared/models/order.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  orders = signal<OrderResponse[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Simple state to track expanded order details
  expandedOrderId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    const user = this.authService.user();
    if (!user || !user.id) {
      this.error.set('User not found. Please log in.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.orderService.getUserOrders(user.id).subscribe({
      next: (data) => {
        // Sort orders by createdAt descending
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.orders.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load order history.');
        this.loading.set(false);
      }
    });
  }

  toggleOrderDetails(orderId: string): void {
    if (this.expandedOrderId() === orderId) {
      this.expandedOrderId.set(null);
    } else {
      this.expandedOrderId.set(orderId);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
      case 'CONFIRMED':
        return 'bg-blue-500/10 text-blue-400 ring-blue-500/20';
      case 'PROCESSING':
        return 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20';
      case 'SHIPPED':
        return 'bg-purple-500/10 text-purple-400 ring-purple-500/20';
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-500/10 text-red-400 ring-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
    }
  }
}
