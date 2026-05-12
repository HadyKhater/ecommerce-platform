import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-screen overflow-hidden" [class.animate-pulse]="animated()">
      <!-- Animated gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div class="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-slate-700/20 to-transparent bg-[length:200%_100%]"></div>
      </div>

      <!-- Floating shapes skeleton -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[150px]"></div>
      <div class="absolute left-1/4 top-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]"></div>

      <!-- Content skeleton -->
      <div class="relative z-10 max-w-7xl mx-auto px-8 h-full flex items-center">
        <div class="w-full flex flex-col lg:flex-row items-center gap-12">
          <!-- Left content -->
          <div class="w-full lg:w-[60%] space-y-6">
            <div class="h-24 md:h-32 w-3/4 rounded-2xl bg-slate-800/50"></div>
            <div class="h-24 md:h-32 w-1/2 rounded-2xl bg-slate-800/50"></div>
            <div class="h-24 md:h-32 w-2/3 rounded-2xl bg-slate-800/50"></div>
            <div class="h-6 w-64 rounded-lg bg-slate-800/50 mt-8"></div>
            <div class="flex gap-4 mt-10">
              <div class="h-14 w-48 rounded-full bg-indigo-600/30"></div>
              <div class="h-14 w-48 rounded-full bg-slate-800/50"></div>
            </div>
          </div>

          <!-- Right card -->
          <div class="w-full lg:w-[40%] flex justify-center">
            <div class="w-80 h-80 md:w-96 md:h-96 rounded-[40px] bg-slate-800/50"></div>
          </div>
        </div>
      </div>

      <!-- Scroll indicator skeleton -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div class="h-4 w-32 rounded bg-slate-800/50 mb-2"></div>
        <div class="w-px h-12 bg-slate-700/50"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonHeroComponent {
  readonly animated = input<boolean>(true);
}
