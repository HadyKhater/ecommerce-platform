import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-promotions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full py-6">
      <div class="max-w-7xl mx-auto px-8">
        <div class="flex flex-wrap items-center justify-center gap-4">
          @for (i of skeletonItems(); track i) {
            <div
              class="flex items-center gap-3 px-6 py-3 rounded-full animate-pulse"
              [class.bg-slate-800]="true"
              [class.border]="true"
              [class.border-slate-700]="true"
            >
              <!-- Icon placeholder -->
              <div class="w-8 h-8 rounded-full bg-slate-700"></div>

              <!-- Text placeholders -->
              <div class="space-y-1">
                <div class="h-4 w-24 rounded bg-slate-700"></div>
                <div class="h-3 w-32 rounded bg-slate-600"></div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonPromotionsComponent {
  readonly count = input<number>(3);

  skeletonItems(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
