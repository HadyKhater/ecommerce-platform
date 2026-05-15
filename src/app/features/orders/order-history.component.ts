import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { OrderService } from '../../shared/services/order.service';
import { AuthService } from '../../shared/services/auth.service';
import { OrderResponse } from '../../shared/models/order.model';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';

export interface OrderHistoryVm {
  orders: OrderResponse[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, SlicePipe, RouterLink],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent {
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  // Simple state to track expanded order details
  readonly expandedOrderId = signal<string | null>(null);

  // Create observables from auth signals
  private readonly authResolved$ = toObservable(this.authService.isAuthResolved);
  private readonly user$ = toObservable(this.authService.user);

  // Create observable stream that combines auth resolution and order loading
  private readonly orders$ = combineLatest([
    this.authResolved$,
    this.user$,
  ]).pipe(
    map(([resolved, user]) => ({ resolved, user })),
    switchMap(({ resolved, user }) => {
      // If auth not resolved yet, emit loading state
      if (!resolved) {
        return of({
          orders: [] as OrderResponse[],
          loading: true,
          error: null as string | null,
        } as OrderHistoryVm);
      }

      // If user not logged in, show empty state
      if (!user || !user.id) {
        return of({
          orders: [] as OrderResponse[],
          loading: false,
          error: null as string | null,
        } as OrderHistoryVm);
      }

      // Load orders for authenticated user
      return this.orderService.getUserOrders(user.id).pipe(
        tap((orders) => {
          // Sort orders by createdAt descending
          orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }),
        map((orders): OrderHistoryVm => ({
          orders,
          loading: false,
          error: null,
        })),
        startWith({
          orders: [] as OrderResponse[],
          loading: true,
          error: null as string | null,
        } as OrderHistoryVm),
        catchError((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load order history.';
          return of({
            orders: [] as OrderResponse[],
            loading: false,
            error: message,
          });
        }),
      );
    }),
    shareReplay(1),
  );

  // Convert observable to signal with initial loading state
  readonly vm = toSignal(this.orders$, {
    initialValue: {
      orders: [] as OrderResponse[],
      loading: true,
      error: null as string | null,
    } satisfies OrderHistoryVm,
  });

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