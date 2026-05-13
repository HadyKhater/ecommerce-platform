/**
 * Cart models matching backend DTOs exactly.
 * All prices are in EGP (Egyptian Pounds).
 */

/** Response DTO for cart item details from backend. */
export interface CartItemResponse {
  productId: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  totalPrice: number;
  categoryId?: string;
}

/** Response DTO for cart details from backend. */
export interface CartResponse {
  cartId: string;
  userEmail: string;
  items: CartItemResponse[];
  totalItemsCount: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

/** Request DTO for adding an item to cart. */
export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

/** Request DTO for updating cart item quantity. */
export interface UpdateCartItemRequest {
  quantity: number;
}

/** Legacy cart interface for local storage or client-side state (optional). */
export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceEgp: number;
  thumbnailUrl?: string | null;
}

/** Legacy cart interface (optional). */
export interface Cart {
  id: string;
  items: CartItem[];
  currency: 'EGP';
  subtotalEgp: number;
  totalEgp: number;
}
