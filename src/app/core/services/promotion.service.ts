import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Promotion, PromotionRequest, ValidatePromoCodeRequest, ValidatePromoCodeResponse } from '../models/promotion.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/promotions`;

  validatePromoCode(request: ValidatePromoCodeRequest): Observable<ValidatePromoCodeResponse> {
    return this.http.post<ValidatePromoCodeResponse>(`${this.apiUrl}/validate`, request);
  }

  getActivePromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/active`);
  }

  getAllPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.apiUrl);
  }

  getPromotion(id: string): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiUrl}/${id}`);
  }

  createPromotion(promotion: PromotionRequest): Observable<Promotion> {
    return this.http.post<Promotion>(this.apiUrl, promotion);
  }

  updatePromotion(id: string, promotion: PromotionRequest): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiUrl}/${id}`, promotion);
  }

  deletePromotion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: string): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
