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
  perUserLimit?: number;
  usageCount: number;
  userUsageCount: number;
  applicableToAll: boolean;
  categoryIds?: string[];
  categoryNames?: string[];
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
  perUserLimit?: number;
  applicableToAll: boolean;
  categoryIds?: string[];
}

export interface ValidatePromoCodeRequest {
  code: string;
  orderAmount: number;
  userId?: string;
  userEmail?: string;
  cartCategoryIds?: string[];
}

export interface ValidatePromoCodeResponse {
  valid: boolean;
  message: string;
  discountAmount: number;
  promotion: Promotion | null;
}
