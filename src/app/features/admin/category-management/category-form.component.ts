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
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { catchError, of, tap } from 'rxjs';

import { CategoryService } from '../../../shared/services/category.service';
import { Category, CategoryRequest } from '../../../shared/models/product.model';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** If editing, this holds the category ID from the route */
  readonly editId = signal<string | null>(null);

  readonly isEditMode = computed(() => this.editId() !== null);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingCategory = signal(false);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadCategory(id);
    }
  }

  private loadCategory(id: string): void {
    this.loadingCategory.set(true);
    this.categoryService
      .getCategoryById(id)
      .pipe(
        tap((category: Category) => {
          this.form.patchValue({
            name: category.name,
            description: category.description ?? '',
          });
          this.loadingCategory.set(false);
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Failed to load category.';
          this.error.set(message);
          this.loadingCategory.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const rawValue = this.form.value;

    const request: CategoryRequest = {
      name: rawValue.name.trim(),
      description: rawValue.description?.trim() ?? '',
    };

    const id = this.editId();
    const action$ = id
      ? this.categoryService.updateCategory(id, request)
      : this.categoryService.createCategory(request);

    action$
      .pipe(
        tap(() => {
          this.submitting.set(false);
          void this.router.navigate(['/admin/categories']);
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : `Failed to ${id ? 'update' : 'create'} category.`;
          this.error.set(message);
          this.submitting.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }
}
