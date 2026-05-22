import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <div class="rounded-2xl border border-slate-700 bg-slate-800 p-8">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 mb-6">
          <svg class="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-4">Payment Cancelled</h1>
        <p class="text-slate-400 mb-8">Your payment was cancelled. No charges were made.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a routerLink="/cart" class="btn-primary px-6 py-3 rounded-xl">Return to Cart</a>
          <a routerLink="/products" class="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition">Continue Shopping</a>
        </div>
      </div>
    </section>
  `,
  styles: []
})
export class PaymentCancelComponent {}