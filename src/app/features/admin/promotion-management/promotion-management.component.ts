import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PromotionService } from '../../../core/services/promotion.service';
import { Promotion, PromotionRequest, DiscountType } from '../../../core/models/promotion.model';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-promotion-management',
  standalone: true,
  imports: [DatePipe, NgClass, ReactiveFormsModule],
  templateUrl: './promotion-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionManagementComponent {
  private readonly promotionService = inject(PromotionService);
  private readonly fb = inject(FormBuilder);

  readonly promotions = signal<Promotion[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly selectedPromotion = signal<Promotion | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly promotionForm = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    description: [''],
    discountType: ['PERCENTAGE' as DiscountType, Validators.required],
    discountValue: [0, [Validators.required, Validators.min(0)]],
    minimumOrderAmount: [undefined as number | undefined],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    active: [true],
    usageLimit: [undefined as number | undefined],
    applicableToAll: [true]
  });

  constructor() {
    this.loadPromotions();
  }

  loadPromotions() {
    this.loading.set(true);
    this.error.set(null);
    this.promotionService.getAllPromotions().pipe(
      finalize(() => this.loading.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Failed to load promotions');
        return of([]);
      })
    ).subscribe(data => {
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.promotions.set(sorted);
    });
  }

  openAddModal() {
    this.promotionForm.reset({
      active: true,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      applicableToAll: true
    });
    this.selectedPromotion.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(promotion: Promotion) {
    this.selectedPromotion.set(promotion);
    this.promotionForm.patchValue({
      name: promotion.name,
      code: promotion.code || '',
      description: promotion.description || '',
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      minimumOrderAmount: promotion.minimumOrderAmount,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      active: promotion.active,
      usageLimit: promotion.usageLimit,
      applicableToAll: promotion.applicableToAll
    });
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.selectedPromotion.set(null);
  }

  onSubmit() {
    if (this.promotionForm.invalid) return;

    this.submitting.set(true);
    const formValue = this.promotionForm.value;
    const request: PromotionRequest = {
      name: formValue.name!,
      code: formValue.code || undefined,
      description: formValue.description || undefined,
      discountType: formValue.discountType!,
      discountValue: formValue.discountValue!,
      minimumOrderAmount: formValue.minimumOrderAmount || undefined,
      startDate: formValue.startDate!,
      endDate: formValue.endDate!,
      active: formValue.active ?? true,
      usageLimit: formValue.usageLimit || undefined,
      applicableToAll: formValue.applicableToAll ?? true
    };

    const currentPromotion = this.selectedPromotion();
    const action$ = currentPromotion
      ? this.promotionService.updatePromotion(currentPromotion.id, request)
      : this.promotionService.createPromotion(request);

    action$.pipe(
      finalize(() => this.submitting.set(false)),
      catchError(err => {
        alert(err.message || 'An error occurred');
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.closeModal();
        this.loadPromotions();
      }
    });
  }

  confirmDelete(id: string) {
    this.deletingId.set(id);
  }

  cancelDelete() {
    this.deletingId.set(null);
  }

  deletePromotion() {
    const id = this.deletingId();
    if (!id) return;

    this.promotionService.deletePromotion(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadPromotions();
      },
      error: (err) => {
        this.deletingId.set(null);
        alert(err.message || 'Failed to delete promotion');
      }
    });
  }

  toggleActive(promotion: Promotion) {
    this.promotionService.toggleActive(promotion.id).subscribe({
      next: (updatedPromotion) => {
        this.promotions.update(list => list.map(p => p.id === updatedPromotion.id ? updatedPromotion : p));
      },
      error: (err) => alert(err.message || 'Failed to toggle status')
    });
  }

  getStatusBadge(promotion: Promotion): { label: string; class: string } {
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);

    if (!promotion.active) {
      return { label: 'Inactive', class: 'bg-slate-500/10 text-slate-400' };
    }
    if (now < start) {
      return { label: 'Upcoming', class: 'bg-blue-500/10 text-blue-400' };
    }
    if (now > end) {
      return { label: 'Expired', class: 'bg-red-500/10 text-red-400' };
    }
    return { label: 'Active', class: 'bg-emerald-500/10 text-emerald-400' };
  }

  getUsageDisplay(promotion: Promotion): string {
    if (promotion.usageLimit === null || promotion.usageLimit === undefined) {
      return `${promotion.usageCount} / ∞`;
    }
    return `${promotion.usageCount} / ${promotion.usageLimit}`;
  }

  getDiscountDisplay(promotion: Promotion): string {
    if (promotion.discountType === 'PERCENTAGE') {
      return `${promotion.discountValue}%`;
    }
    return `${promotion.discountValue} EGP`;
  }
}
