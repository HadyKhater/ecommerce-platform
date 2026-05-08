import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdjustStockRequest,
  InventoryResponse,
  RestockRequest,
  StockCheckResponse,
  StockMovementResponse,
} from '../models/inventory.model';

/** Extended inventory response with initialization status */
export interface InventoryResponseWithStatus extends InventoryResponse {
  isInitialized: boolean;
}

/** Paginated inventory response */
export interface InventoryPage {
  content: InventoryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  /**
   * Get all inventory items (ADMIN only).
   * Returns plain list of InventoryResponse with stock levels for all products.
   * NOTE: Backend does NOT support pagination for this endpoint.
   */
  getAllInventory(): Observable<InventoryResponse[]> {
    return this.http.get<InventoryResponse[]>(this.baseUrl);
  }

  /**
   * Get out-of-stock items by filtering from all inventory.
   * NOTE: Backend does NOT have a dedicated /out-of-stock endpoint,
   * so we fetch all inventory and filter client-side.
   */
  getOutOfStockItems(): Observable<InventoryResponse[]> {
    return this.getAllInventory().pipe(
      map((items) => items.filter((item) => item.isOutOfStock)),
    );
  }

  /**
   * Get inventory details for a specific product by its ID.
   * Returns InventoryResponse with stock levels, reserved quantity, and thresholds.
   * If the product hasn't been initialized in inventory yet (404), returns a placeholder
   * object with isInitialized: false instead of throwing an error.
   */
  getInventoryByProductId(productId: string): Observable<InventoryResponseWithStatus> {
    return this.http.get<InventoryResponse>(`${this.baseUrl}/${productId}`).pipe(
      map((response) => ({
        ...response,
        isInitialized: true,
      })),
      catchError((error) => {
        if (error.status === 404) {
          // Product hasn't been initialized in inventory yet
          return of({
            id: '',
            productId: productId,
            quantityAvailable: 0,
            quantityReserved: 0,
            lowStockThreshold: 10,
            isLowStock: false,
            isOutOfStock: true,
            createdAt: '',
            updatedAt: '',
            isInitialized: false,
          } as InventoryResponseWithStatus);
        }
        // Re-throw other errors
        throw error;
      }),
    );
  }

  /**
   * Get low stock items (ADMIN only).
   * Returns list of InventoryResponse where quantityAvailable <= lowStockThreshold.
   */
  getLowStockItems(): Observable<InventoryResponse[]> {
    return this.http.get<InventoryResponse[]>(`${this.baseUrl}/low-stock`);
  }

  /**
   * Get movement history for a specific product (ADMIN only).
   * Returns list of StockMovementResponse with all stock movements.
   */
  getMovementHistory(productId: string): Observable<StockMovementResponse[]> {
    return this.http.get<StockMovementResponse[]>(`${this.baseUrl}/${productId}/history`);
  }

  /**
   * Check if stock is available for a specific product and quantity.
   * Returns StockCheckResponse with available boolean and quantityAvailable.
   */
  checkStock(productId: string, quantity: number): Observable<StockCheckResponse> {
    const params = new HttpParams().set('quantity', quantity.toString());
    return this.http.get<StockCheckResponse>(`${this.baseUrl}/${productId}/check`, { params });
  }

  /**
   * Restock a product (ADMIN only).
   * Returns updated InventoryResponse after restocking.
   */
  restockProduct(request: RestockRequest): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(`${this.baseUrl}/restock`, request);
  }

  /**
   * Adjust stock levels for a product (ADMIN only).
   * Returns updated InventoryResponse after adjustment.
   */
  adjustStock(productId: string, request: AdjustStockRequest): Observable<InventoryResponse> {
    return this.http.put<InventoryResponse>(`${this.baseUrl}/${productId}/adjust`, request);
  }

  /**
   * Initialize inventory for a product that doesn't have inventory data yet (ADMIN only).
   * Creates a new inventory record with the specified initial quantity.
   * Returns void on success.
   */
  initializeInventory(productId: string, initialQuantity: number = 0): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/initialize/${productId}`, { initialQuantity });
  }
}
