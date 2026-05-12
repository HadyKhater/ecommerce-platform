import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BannerService } from '../../../core/services/banner.service';
import { Banner, BannerRequest } from '../../../core/models/banner.model';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-banner-management',
  standalone: true,
  imports: [DatePipe, NgClass, ReactiveFormsModule],
  templateUrl: './banner-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannerManagementComponent {
  private readonly bannerService = inject(BannerService);
  private readonly fb = inject(FormBuilder);

  readonly banners = signal<Banner[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly selectedBanner = signal<Banner | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly bannerForm = this.fb.group({
    title: ['', Validators.required],
    subtitle: [''],
    imageUrl: ['', Validators.required],
    linkUrl: [''],
    active: [true],
    displayOrder: [0, Validators.required]
  });

  constructor() {
    this.loadBanners();
  }

  loadBanners() {
    this.loading.set(true);
    this.error.set(null);
    this.bannerService.getAllBanners().pipe(
      finalize(() => this.loading.set(false)),
      catchError(err => {
        this.error.set(err.message || 'Failed to load banners');
        return of([]);
      })
    ).subscribe(data => {
      // Sort primarily by displayOrder ascending
      const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
      this.banners.set(sorted);
    });
  }

  openAddModal() {
    this.bannerForm.reset({ active: true, displayOrder: 0 });
    this.selectedBanner.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(banner: Banner) {
    this.selectedBanner.set(banner);
    this.bannerForm.patchValue({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      active: banner.active,
      displayOrder: banner.displayOrder
    });
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.selectedBanner.set(null);
  }

  onSubmit() {
    if (this.bannerForm.invalid) return;

    this.submitting.set(true);
    const formValue = this.bannerForm.value;
    const request: BannerRequest = {
      title: formValue.title!,
      subtitle: formValue.subtitle || undefined,
      imageUrl: formValue.imageUrl!,
      linkUrl: formValue.linkUrl || undefined,
      active: formValue.active ?? true,
      displayOrder: formValue.displayOrder ?? 0
    };

    const currentBanner = this.selectedBanner();
    const action$ = currentBanner
      ? this.bannerService.updateBanner(currentBanner.id, request)
      : this.bannerService.createBanner(request);

    action$.pipe(
      finalize(() => this.submitting.set(false)),
      catchError(err => {
        alert(err.message || 'An error occurred');
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.closeModal();
        this.loadBanners();
      }
    });
  }

  confirmDelete(id: string) {
    this.deletingId.set(id);
  }

  cancelDelete() {
    this.deletingId.set(null);
  }

  deleteBanner() {
    const id = this.deletingId();
    if (!id) return;

    this.bannerService.deleteBanner(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadBanners();
      },
      error: (err) => {
        this.deletingId.set(null);
        alert(err.message || 'Failed to delete banner');
      }
    });
  }

  toggleActive(banner: Banner) {
    this.bannerService.toggleActive(banner.id).subscribe({
      next: (updatedBanner) => {
        this.banners.update(list => list.map(b => b.id === updatedBanner.id ? updatedBanner : b));
      },
      error: (err) => alert(err.message || 'Failed to toggle status')
    });
  }

  moveUp(banner: Banner, index: number) {
    if (index === 0) return;
    const prevBanner = this.banners()[index - 1];
    
    const request1: BannerRequest = { ...banner, displayOrder: prevBanner.displayOrder };
    const request2: BannerRequest = { ...prevBanner, displayOrder: banner.displayOrder };

    this.bannerService.updateBanner(banner.id, request1).subscribe(() => {
      this.bannerService.updateBanner(prevBanner.id, request2).subscribe(() => {
        this.loadBanners();
      });
    });
  }

  moveDown(banner: Banner, index: number) {
    if (index === this.banners().length - 1) return;
    const nextBanner = this.banners()[index + 1];
    
    const request1: BannerRequest = { ...banner, displayOrder: nextBanner.displayOrder };
    const request2: BannerRequest = { ...nextBanner, displayOrder: banner.displayOrder };

    this.bannerService.updateBanner(banner.id, request1).subscribe(() => {
      this.bannerService.updateBanner(nextBanner.id, request2).subscribe(() => {
        this.loadBanners();
      });
    });
  }
}
