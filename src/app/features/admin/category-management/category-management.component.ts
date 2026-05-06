import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap, finalize } from 'rxjs';

import { CategoryService } from '../../../shared/services/category.service';
import { Category, CategoryRequest } from '../../../shared/models/product.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

export interface CategoryManagementVm {
  categories: Category[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  deleteSuccess: boolean;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent {
  private readonly categoryService = inject(CategoryService);

  // Search signal
  readonly searchKeyword = signal('');

  /** Delete confirmation state */
  readonly deletingId = signal<string | null>(null);
  readonly deleteSuccess = signal(false);

  /** Track deleted category IDs to filter from UI without API refresh */
  readonly deletedIds = signal<Set<string>>(new Set());

  /** Track categories being updated for loading state */
  readonly updatingIds = signal<Set<string>>(new Set());

  /** Track categories array for local state updates */
  readonly localCategories = signal<Category[]>([]);

  /** Manual refresh trigger for explicit reloads */
  readonly refreshTrigger = signal(0);

  /** Stats trigger to reload stats after mutations */
  readonly statsTrigger = signal(0);

  // Search input with debounce
  readonly searchControl = new FormControl('', { nonNullable: true });

  // Search input stream
  private readonly searchInput$ = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    tap((value) => {
      this.searchKeyword.set(value.trim());
    }),
  );

  // Load categories when refresh trigger changes
  private readonly categories$ = toObservable(
    computed(() => ({ refresh: this.refreshTrigger() }))
  ).pipe(
    switchMap(() => {
      return this.categoryService.getCategories().pipe(
        tap((categories) => {
          this.localCategories.set(categories);
        }),
        map((categories) => ({
          categories,
          totalCount: categories.length,
          loading: false,
          error: null as string | null,
          deleteSuccess: false,
          stats: { total: 0, active: 0, inactive: 0 },
        })),
        startWith({
          categories: [] as Category[],
          totalCount: 0,
          loading: true,
          error: null as string | null,
          deleteSuccess: false,
          stats: { total: 0, active: 0, inactive: 0 },
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to load categories.';
          return of({
            categories: [] as Category[],
            totalCount: 0,
            loading: false,
            error: message,
            deleteSuccess: false,
            stats: { total: 0, active: 0, inactive: 0 },
          });
        }),
      );
    }),
  );

  // Stats computation stream
  private readonly stats$ = toObservable(this.statsTrigger).pipe(
    switchMap(() =>
      this.categoryService.getCategories().pipe(
        map((categories) => ({
          total: categories.length,
          active: categories.filter((c) => c.active).length,
          inactive: categories.filter((c) => !c.active).length,
        })),
        catchError(() => of({ total: 0, active: 0, inactive: 0 })),
      ),
    ),
    startWith({ total: 0, active: 0, inactive: 0 }),
  );

  // Combined stream that merges categories and stats
  private readonly vm$ = this.categories$.pipe(
    switchMap((categoryData) =>
      this.stats$.pipe(
        map((stats) => ({
          ...categoryData,
          stats,
        })),
      ),
    ),
  );

  readonly vm = toSignal(this.vm$, {
    initialValue: {
      categories: [] as Category[],
      totalCount: 0,
      loading: true,
      error: null as string | null,
      deleteSuccess: false,
      stats: { total: 0, active: 0, inactive: 0 },
    },
  });

  /** Filter deleted categories from the display */
  readonly displayCategories = computed(() => {
    const vmCategories = this.vm().categories;
    const localCategories = this.localCategories();
    const deletedIds = this.deletedIds();
    const keyword = this.searchKeyword().toLowerCase();

    // Use localCategories if available, otherwise vmCategories
    const source = localCategories.length > 0 ? localCategories : vmCategories;

    // Filter out deleted and apply search
    return source
      .filter((c) => !deletedIds.has(c.id))
      .filter((c) =>
        keyword === '' ||
        c.name.toLowerCase().includes(keyword) ||
        (c.description && c.description.toLowerCase().includes(keyword))
      );
  });

  constructor() {
    // Subscribe to search input changes
    this.searchInput$.subscribe();

    // Auto-hide delete success message after 3 seconds
    effect(() => {
      if (this.deleteSuccess()) {
        setTimeout(() => this.deleteSuccess.set(false), 3000);
      }
    });
  }

  /**
   * Toggle category active status
   */
  toggleStatus(category: Category): void {
    this.updatingIds.update((set) => new Set(set).add(category.id));

    const newStatus = !category.active;
    const updateRequest: CategoryRequest = {
      name: category.name,
      description: category.description ?? '',
    };

    this.categoryService
      .updateCategory(category.id, updateRequest)
      .pipe(
        tap((updatedCategory: Category) => {
          // Update local categories array without reload
          this.localCategories.update((categories) =>
            categories.map((c) =>
              c.id === category.id ? { ...c, active: updatedCategory.active } : c,
            ),
          );
          this.loadStats();
        }),
        finalize(() => {
          this.updatingIds.update((set) => {
            const newSet = new Set(set);
            newSet.delete(category.id);
            return newSet;
          });
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to update category status.';
          console.error(message);
          return of(null);
        }),
      )
      .subscribe();
  }

  /** Check if a category is currently being updated */
  isUpdating(categoryId: string): boolean {
    return this.updatingIds().has(categoryId);
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  /**
   * Delete category with proper error handling
   */
  deleteCategory(): void {
    const id = this.deletingId();
    if (!id) return;

    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.deletedIds.update((set) => new Set(set).add(id));
        this.deleteSuccess.set(true);
        this.loadStats();
      },
      error: (err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to delete category. Please try again.';
        this.deletingId.set(null);
        alert('Delete failed: ' + message);
      },
    });
  }

  private loadStats(): void {
    this.statsTrigger.update((n) => n + 1);
  }

  refresh(): void {
    this.refreshTrigger.update((n) => n + 1);
    this.deletedIds.set(new Set());
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchKeyword.set('');
  }
}
