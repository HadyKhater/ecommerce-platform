export type PaymentStatus =
  | 'INITIATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export interface PaymentResponse {
  id: string;
  orderId: string;
  status: PaymentStatus;
  /** Authorized or captured total in EGP. */
  amountEgp: number;
  currency: 'EGP';
  clientRedirectUrl?: string | null;
  providerReference?: string | null;
}
