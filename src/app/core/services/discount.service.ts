import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'applied_discount';

  // Private signal for discount info
  private readonly _discountInfo = signal<DiscountInfo | null>(null);

  // Public readonly computed
  readonly discountInfo = computed(() => this._discountInfo());
  readonly hasDiscount = computed(() => this._discountInfo() !== null);
  readonly discountAmount = computed(() => this._discountInfo()?.discountAmount ?? 0);
  readonly discountCode = computed(() => this._discountInfo()?.code ?? null);

  constructor() {
    // Load from localStorage on init (browser only)
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
    }
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
    this.saveToStorage();
  }

  /**
   * Clear the applied discount
   */
  clearDiscount(): void {
    this._discountInfo.set(null);
    this.clearStorage();
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

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DiscountInfo;
        // Validate the stored discount is not too old (e.g., older than 1 hour)
        const appliedAt = new Date(parsed.appliedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 1) {
          this._discountInfo.set(parsed);
        } else {
          this.clearStorage();
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const info = this._discountInfo();
      if (info) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}
