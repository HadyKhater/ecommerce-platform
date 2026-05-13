export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentCategoryId: string | null;
  active: boolean;
}

export interface CategoryRequest {
  name: string;
  description: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string;
  /** Unit price in Egyptian Pounds (EGP). */
  price: number;
  imageUrls: string[];
  images?: ProductImage[];
  categoryId: string;
  /** Display name of the category (populated by the backend). */
  categoryName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSearchParams {
  keyword?: string;
  categoryId?: string;
  /** Minimum inclusive price filter. */
  minPrice?: number;
  /** Maximum inclusive price filter. */
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
}

export interface ProductRequest {
  name: string;
  description?: string;
  /** Unit price in Egyptian Pounds (EGP). */
  price: number;
  categoryId: string;
  imageUrls?: string[];
  sku?: string;
  active?: boolean;
}

export type ProductPage = PagedResponse<Product>;
