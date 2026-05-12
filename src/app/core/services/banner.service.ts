import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Banner, BannerRequest } from '../models/banner.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/banners`;

  getPublicBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.apiUrl}/public`);
  }

  getAllBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(this.apiUrl);
  }

  getBanner(id: string): Observable<Banner> {
    return this.http.get<Banner>(`${this.apiUrl}/${id}`);
  }

  createBanner(banner: BannerRequest): Observable<Banner> {
    return this.http.post<Banner>(this.apiUrl, banner);
  }

  updateBanner(id: string, banner: BannerRequest): Observable<Banner> {
    return this.http.put<Banner>(`${this.apiUrl}/${id}`, banner);
  }

  deleteBanner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: string): Observable<Banner> {
    return this.http.patch<Banner>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
