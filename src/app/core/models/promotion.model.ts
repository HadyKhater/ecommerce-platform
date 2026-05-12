export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  startDate: string;
  endDate: string;
  active: boolean;
  usageLimit?: number;
  usageCount: number;
  applicableToAll: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRequest {
  name: string;
  code?: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  startDate: string;
  endDate: string;
  active: boolean;
  usageLimit?: number;
  applicableToAll: boolean;
}

export interface ValidatePromoCodeRequest {
  code: string;
  orderAmount: number;
}

export interface ValidatePromoCodeResponse {
  valid: boolean;
  message: string;
  discountAmount: number;
  promotion: Promotion | null;
}
