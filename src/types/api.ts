export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "PAYMENT_REQUIRED"
  | "KYC_PENDING"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED"
  | "BAD_REQUEST";

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AuthTokenPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}
