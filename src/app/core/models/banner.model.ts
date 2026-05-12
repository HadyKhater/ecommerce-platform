export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface BannerRequest {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  displayOrder: number;
}
