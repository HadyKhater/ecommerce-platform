import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';

import { OrderService } from '../../../shared/services/order.service';
import { OrderResponse, OrderStatus } from '../../../shared/models/order.model';

const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, NgClass, RouterLink, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly updatingOrderId = signal<string | null>(null);
  readonly updateSuccess = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(0);
  readonly pageSize = signal(10);
  readonly totalOrders = signal(0);

  // Filter
  readonly statusFilter = signal<OrderStatus | null>(null);

  readonly filteredOrders = computed(() => {
    let result = this.orders();
    const filter = this.statusFilter();
    if (filter) {
      result = result.filter(o => o.status === filter);
    }
    return result;
  });

  readonly paginatedOrders = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredOrders().slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredOrders().length / this.pageSize());
  });

  readonly orderStatuses = ORDER_STATUSES;

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getAllOrders().pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.orders.set(sorted);
        this.totalOrders.set(sorted.length);
        this.currentPage.set(0);
      },
      error: () => {
        this.error.set('Failed to load orders. Please try again.');
      }
    });
  }

  onStatusChange(orderId: string, newStatus: OrderStatus): void {
    this.updatingOrderId.set(orderId);
    this.updateSuccess.set(null);

    this.orderService.updateOrderStatus(orderId, newStatus).pipe(
      finalize(() => this.updatingOrderId.set(null))
    ).subscribe({
      next: (updatedOrder) => {
        this.orders.update(orders =>
          orders.map(o => o.id === orderId ? updatedOrder : o)
        );
        this.updateSuccess.set(`Order ${orderId.slice(0, 8)} status updated to ${newStatus}`);
        setTimeout(() => this.updateSuccess.set(null), 3000);
      },
      error: () => {
        this.error.set('Failed to update order status. Please try again.');
      }
    });
  }

  onFilterChange(status: OrderStatus | null): void {
    this.statusFilter.set(status);
    this.currentPage.set(0);
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  refreshOrders(): void {
    this.loadOrders();
  }

  getStatusBadgeClass(status: OrderStatus): string {
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

  formatOrderId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }
}
