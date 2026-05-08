/**
 * Inventory models matching backend DTOs exactly.
 * All inventory operations for the e-commerce platform.
 */

/** Response DTO for inventory details from backend. */
export interface InventoryResponse {
  id: string;
  productId: string;
  quantityAvailable: number;
  quantityReserved: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response DTO for stock movement history. */
export interface StockMovementResponse {
  id: string;
  productId: string;
  movementType: 'RESTOCK' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE';
  quantity: number;
  reason: string;
  createdAt: string;
}

/** Request DTO for restocking a product. */
export interface RestockRequest {
  productId: string;
  quantity: number;
  reason: string;
}

/** Request DTO for adjusting stock levels. */
export interface AdjustStockRequest {
  quantityAvailable: number;
  quantityReserved: number;
  lowStockThreshold: number;
  reason: string;
}

/** Response DTO for stock availability check. */
export interface StockCheckResponse {
  available: boolean;
  quantityAvailable: number;
}

/** Request DTO for reserving stock. */
export interface ReserveStockRequest {
  productId: string;
  quantity: number;
  reason: string;
}

/** Request DTO for releasing reserved stock. */
export interface ReleaseStockRequest {
  productId: string;
  quantity: number;
  reason: string;
}
