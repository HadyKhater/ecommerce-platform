import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-products',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Header skeleton -->
      <div class="flex items-end justify-between mb-12">
        <div class="space-y-3">
          <div class="h-12 w-56 rounded-xl bg-slate-800 animate-pulse"></div>
          <div class="h-5 w-40 rounded-lg bg-slate-800/70 animate-pulse"></div>
        </div>
        <div class="h-8 w-24 rounded-lg bg-slate-800 animate-pulse"></div>
      </div>

      <!-- Products grid skeleton -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (i of skeletonItems(); track i) {
          <div class="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 animate-pulse">
            <!-- Image placeholder -->
            <div class="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-700/50">
              <div class="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-slate-600/20 to-transparent bg-[length:200%_100%]"></div>

              <!-- Badge placeholders -->
              <div class="absolute left-3 top-3 h-5 w-12 rounded-full bg-slate-600/50"></div>
              <div class="absolute bottom-3 left-3 h-5 w-20 rounded-full bg-slate-600/50"></div>
            </div>

            <!-- Content placeholder -->
            <div class="p-4 space-y-3">
              <div class="h-5 w-full rounded-lg bg-slate-700/50"></div>
              <div class="h-5 w-3/4 rounded-lg bg-slate-700/50"></div>

              <div class="flex items-center justify-between pt-2">
                <div class="h-7 w-24 rounded-lg bg-indigo-600/30"></div>
                <div class="h-4 w-16 rounded bg-slate-600/50"></div>
              </div>

              <div class="h-11 w-full rounded-xl bg-indigo-600/20 mt-4"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonProductsComponent {
  readonly count = input<number>(4);

  skeletonItems(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
