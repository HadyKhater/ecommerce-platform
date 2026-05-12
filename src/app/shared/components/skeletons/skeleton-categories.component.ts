import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-categories',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Header skeleton -->
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-3">
          <div class="h-10 w-64 rounded-xl bg-slate-800 animate-pulse"></div>
          <div class="h-2 w-16 rounded-full bg-indigo-600/30 animate-pulse"></div>
        </div>
        <div class="h-8 w-32 rounded-lg bg-slate-800 animate-pulse"></div>
      </div>

      <!-- Categories grid skeleton -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        @for (i of skeletonItems(); track i) {
          <div
            class="group relative h-[280px] rounded-3xl overflow-hidden animate-pulse"
            [class.bg-gradient-to-br]="true"
            [class.from-slate-800]="true"
            [class.to-slate-700]="true"
          >
            <!-- Shimmer effect -->
            <div class="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-slate-600/20 to-transparent bg-[length:200%_100%]"></div>

            <!-- Category name placeholder -->
            <div class="absolute top-4 left-4 h-6 w-20 rounded-full bg-slate-600/50"></div>

            <!-- Large letter placeholder -->
            <div class="absolute -bottom-2 -right-2 w-32 h-32 rounded-full bg-slate-600/20"></div>

            <!-- Bottom text placeholder -->
            <div class="absolute bottom-4 left-4 h-8 w-24 rounded-lg bg-slate-600/50"></div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonCategoriesComponent {
  readonly count = input<number>(8);

  skeletonItems(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
