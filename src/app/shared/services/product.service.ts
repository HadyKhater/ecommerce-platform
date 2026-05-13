import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Product,
  ProductPage,
  ProductRequest,
  ProductSearchParams,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  getProducts(page = 0, size = 12): Observable<ProductPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ProductPage>(this.baseUrl, { params });
  }

  getAdminProducts(page = 0, size = 12, keyword?: string, categoryId?: string, minPrice?: number, maxPrice?: number, active?: boolean): Observable<ProductPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (keyword) params = params.set('keyword', keyword);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (minPrice !== undefined) params = params.set('minPrice', minPrice.toString());
    if (maxPrice !== undefined) params = params.set('maxPrice', maxPrice.toString());
    if (active !== undefined) params = params.set('active', active.toString());

    return this.http.get<ProductPage>(`${this.baseUrl}/admin/all`, { params });
  }

  searchProducts(params: ProductSearchParams): Observable<ProductPage> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize !== undefined) httpParams = httpParams.set('size', params.pageSize.toString());
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());

    return this.http.get<ProductPage>(this.baseUrl, { params: httpParams });
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  createProduct(product: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  updateProduct(id: string, product: Partial<ProductRequest>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // --- Product Image Methods ---

  getProductImages(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${productId}/images`);
  }

  addProductImage(productId: string, request: { imageUrl: string; displayOrder: number; isPrimary: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${productId}/images`, request);
  }

  updateProductImage(productId: string, imageId: string, request: { imageUrl: string; displayOrder: number; isPrimary: boolean }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${productId}/images/${imageId}`, request);
  }

  deleteProductImage(productId: string, imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productId}/images/${imageId}`);
  }

  setPrimaryImage(productId: string, imageId: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${productId}/images/${imageId}/primary`, {});
  }

  reorderProductImages(productId: string, imageIds: string[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/${productId}/images/reorder`, imageIds);
  }
}
