// Response envelopes (docs/FRONTEND_GUIDE.md section 4).

export interface ApiSuccess<T> {
  statusCode: number;
  data: T;
  message: string;
  success: true;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: string[];
  stack?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated lists come as `{ <name>: T[], pagination }`, e.g. `{ users: [...], pagination }`. */
export type Paginated<K extends string, T> = { [P in K]: T[] } & { pagination: Pagination };

export interface PageQuery {
  page?: number;
  /** Max 100. */
  limit?: number;
}
