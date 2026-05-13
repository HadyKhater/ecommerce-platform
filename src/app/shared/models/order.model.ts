export interface CartItemDto {
  productId: string;
  quantity: number;
}

export interface OrderRequest {
  items: CartItemDto[];
  shippingAddress: string;
  currency: string;
  userEmail?: string;
  promoCode?: string;
  discountAmount?: number;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface OrderResponse {
  id: string;
  userId: string;
  userEmail?: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  shippingAddress: string;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}
