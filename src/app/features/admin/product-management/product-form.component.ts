import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { catchError, of, switchMap, tap } from 'rxjs';

import { ProductService } from '../../../shared/services/product.service';
import { CategoryService } from '../../../shared/services/category.service';
import { Product, ProductRequest, Category } from '../../../shared/models/product.model';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** If editing, this holds the product ID from the route */
  readonly editId = signal<string | null>(null);

  readonly isEditMode = computed(() => this.editId() !== null);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingProduct = signal(false);

  /** Categories for the dropdown */
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError(() => of([] as Category[])),
    ),
    { initialValue: [] as Category[] },
  );

  readonly form: FormGroup = this.fb.group({
    sku: [''],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    priceEgp: [0, [Validators.required, Validators.min(0.01)]],
    imageUrls: [''],
    categoryId: ['', Validators.required],
    active: [true],
  });

  /** Computed preview URL from the imageUrls field */
  readonly imagePreviewUrl = computed(() => {
    const raw = this.form.get('imageUrls')?.value as string | null;
    if (!raw) return null;
    const urls = this.parseImageUrls(raw);
    return urls.length > 0 ? urls[0] : null;
  });

  /** Handle image load error by setting a fallback */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder-product.png';
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadProduct(id);
    }
  }

  private loadProduct(id: string): void {
    this.loadingProduct.set(true);
    this.productService
      .getProductById(id)
      .pipe(
        tap((product: Product) => {
          this.form.patchValue({
            sku: product.sku,
            name: product.name,
            description: product.description,
            priceEgp: product.price,
            imageUrls: (product.imageUrls ?? []).join(', '),
            categoryId: product.categoryId,
            active: product.active,
          });
          this.loadingProduct.set(false);
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to load product.';
          this.error.set(message);
          this.loadingProduct.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  /** Convert comma-separated string to string array */
  private parseImageUrls(raw: string): string[] {
    return raw
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const rawValue = this.form.value;

    // Build complete request matching backend CreateProductRequest/UpdateProductRequest
    const request: ProductRequest = {
      name: rawValue.name,
      description: rawValue.description || undefined,
      price: Number(rawValue.priceEgp),
      categoryId: rawValue.categoryId,
      imageUrls: this.parseImageUrls(rawValue.imageUrls ?? ''),
      sku: rawValue.sku || undefined,
      active: Boolean(rawValue.active),
    };

    // Debug: log the request body
    console.log('Product request body:', JSON.stringify(request, null, 2));

    const id = this.editId();
    const action$ = id
      ? this.productService.updateProduct(id, request)
      : this.productService.createProduct(request);

    action$
      .pipe(
        tap(() => {
          this.submitting.set(false);
          void this.router.navigate(['/admin/products']);
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : `Failed to ${id ? 'update' : 'create'} product.`;
          this.error.set(message);
          this.submitting.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }
}
