export interface ApiError {
  type: string;
  title: string;
  detail: string;
  status: number;
  timestamp: string;
  errors?: Record<string, string>;
}
