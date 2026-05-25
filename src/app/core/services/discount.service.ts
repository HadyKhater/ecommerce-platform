import { Injectable, signal, computed } from '@angular/core';

export interface DiscountInfo {
  code: string;
  discountAmount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  subtotal: number;
  appliedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiscountService {
  // Private signal for discount info
  private readonly _discountInfo = signal<DiscountInfo | null>(null);

  // Public readonly computed
  readonly discountInfo = computed(() => this._discountInfo());
  readonly hasDiscount = computed(() => this._discountInfo() !== null);
  readonly discountAmount = computed(() => this._discountInfo()?.discountAmount ?? 0);
  readonly discountCode = computed(() => this._discountInfo()?.code ?? null);

  constructor() {
    // Discount is now in-memory only, cleared on page refresh
  }

  /**
   * Apply a discount with full details
   */
  applyDiscount(info: Omit<DiscountInfo, 'appliedAt'>): void {
    const discountWithTimestamp: DiscountInfo = {
      ...info,
      appliedAt: new Date().toISOString()
    };
    this._discountInfo.set(discountWithTimestamp);
  }

  /**
   * Clear the applied discount
   */
  clearDiscount(): void {
    this._discountInfo.set(null);
  }

  /**
   * Calculate final total after discount
   */
  calculateFinalTotal(subtotal: number): number {
    const discount = this.discountAmount();
    return Math.max(0, subtotal - discount);
  }

  /**
   * Get discount breakdown for display
   */
  getDiscountBreakdown(subtotal: number, shippingCost: number = 0): {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  } {
    const discount = this.discountAmount();
    const total = Math.max(0, subtotal - discount + shippingCost);
    return {
      subtotal,
      discount,
      shipping: shippingCost,
      total
    };
  }

  /**
   * Validate if discount is still applicable for given subtotal
   * (can be extended to check expiration, usage limits, etc.)
   */
  isDiscountValid(currentSubtotal: number): boolean {
    const info = this._discountInfo();
    if (!info) return false;

    // Check if subtotal has changed significantly (more than 1% tolerance)
    const tolerance = info.subtotal * 0.01;
    if (Math.abs(currentSubtotal - info.subtotal) > tolerance) {
      return false;
    }

    return true;
  }

}
