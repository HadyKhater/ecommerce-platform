export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  stateOrGovernorate: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  /** Line unit price captured on the order, in EGP. */
  unitPriceEgp: number;
  /** Line total in EGP. */
  lineTotalEgp: number;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  createdAt: string;
  shippingAddress: Address;
  billingAddress: Address | null;
  items: OrderItem[];
  currency: 'EGP';
  subtotalEgp: number;
  shippingEgp: number;
  taxEgp: number;
  grandTotalEgp: number;
}

export interface PlaceOrderRequest {
  shippingAddress: Address;
  billingSameAsShipping: boolean;
  billingAddress: Address | null;
  cartId?: string | null;
  paymentMethodHint?: string | null;
}
