/** Cart currencies are denominated in EGP for storefront display. */

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  /** Unit price captured at-time-of-addition, in EGP. */
  unitPriceEgp: number;
  thumbnailUrl?: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  currency: 'EGP';
  subtotalEgp: number;
  totalEgp: number;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}
