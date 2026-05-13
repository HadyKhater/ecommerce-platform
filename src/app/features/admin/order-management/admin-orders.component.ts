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

  // Pagination Signals
  readonly currentPage = signal(0);
  readonly pageSize = signal(10);
  readonly totalOrders = signal(0);

  // Filter Signals
  readonly searchQuery = signal('');
  readonly selectedStatus = signal('ALL');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly filteredOrders = computed(() => {
    let result = this.orders();

    // 1. Status Filter
    const status = this.selectedStatus();
    if (status !== 'ALL') {
      result = result.filter(o => o.status === status);
    }

    // 2. Search Query Filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(order =>
        order.id?.toLowerCase().startsWith(query) ||
        order.id?.toLowerCase().includes(query) ||
        order.userEmail?.toLowerCase().includes(query) ||
        order.items?.some(i =>
          i.productName?.toLowerCase().includes(query)
        )
      );
    }

    // 3. Date Range Filter
    const from = this.dateFrom();
    const to = this.dateTo();
    if (from || to) {
      result = result.filter(o => {
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);

        if (from) {
          const fromDate = new Date(from);
          fromDate.setHours(0, 0, 0, 0);
          if (orderDate < fromDate) return false;
        }

        if (to) {
          const toDate = new Date(to);
          toDate.setHours(0, 0, 0, 0);
          if (orderDate > toDate) return false;
        }

        return true;
      });
    }

    return result;
  });

  readonly paginatedOrders = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredOrders().slice(start, end);
  });

  readonly totalPages = computed(() => {
    const count = this.filteredOrders().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
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

  onFilterChange(status: string): void {
    this.selectedStatus.set(status as any);
    this.currentPage.set(0);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(0);
  }

  onDateChange(): void {
    this.currentPage.set(0);
  }

  clearDates(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(0);
  }

  clearSearch(): void {
    this.searchQuery.set('');
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
