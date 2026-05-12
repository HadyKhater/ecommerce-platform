export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'BANK_TRANSFER';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  /** Optional discount code applied to this payment */
  discountCode?: string;
  /** Optional discount amount in currency units */
  discountAmount?: number;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}
