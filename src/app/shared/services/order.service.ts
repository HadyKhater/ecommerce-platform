import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderRequest, OrderResponse } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  createOrder(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.apiUrl, request);
  }

  getUserOrders(userId: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  getOrder(orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/${orderId}`);
  }

  cancelOrder(orderId: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/${orderId}/cancel`, {});
  }

  getAllOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/admin/all`);
  }

  updateOrderStatus(orderId: string, status: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/admin/${orderId}/status?status=${status}`, {});
  }

  // ==================== Two-Phase Order Creation Methods ====================

  /**
   * Phase 1: Create a temporary order reservation (awaiting payment)
   * This reserves stock but does not finalize the order.
   * The reservation expires after a configurable timeout if not confirmed.
   */
  createOrderReservation(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/reserve`, request);
  }

  /**
   * Phase 2: Confirm a reserved order after successful payment
   * This converts the reservation to a confirmed order.
   */
  confirmOrder(orderId: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/${orderId}/confirm`, {});
  }

  /**
   * Cancel a reserved order (e.g., on payment failure)
   * This releases the reserved stock and marks the order as cancelled.
   */
  cancelReservation(orderId: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/${orderId}/cancel-reservation`, {});
  }
}
