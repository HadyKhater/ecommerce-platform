import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StripeCheckoutRequest, StripeCheckoutResponse } from '../models/stripe.model';
@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/stripe`;

  createCheckoutSession(request: StripeCheckoutRequest): Observable<StripeCheckoutResponse> {
    return this.http.post<StripeCheckoutResponse>(`${this.apiUrl}/checkout`, request);
  }

  retrieveCheckoutSession(sessionId: string): Observable<StripeCheckoutResponse> {
    return this.http.get<StripeCheckoutResponse>(`${this.apiUrl}/session/${sessionId}`);
  }
}