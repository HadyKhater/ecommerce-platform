export interface StripeCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  items: StripeLineItem[];
  discountCode?: string;
  discountAmount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
}

export interface StripeLineItem {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  quantity: number;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  orderId?: string;
  status?: string;
  paymentStatus?: string;
  url?: string;
  metadata?: {
    orderId?: string;
    [key: string]: string | undefined;
  };
}
