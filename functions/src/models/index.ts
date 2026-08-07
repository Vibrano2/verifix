/**
 * Models Index
 * Central export for all models
 */

// User models
export * from './user.model';

// Artisan models
export * from './artisan.model';

// Job models
export * from './job.model';

// Transaction models
export * from './transaction.model';

// Match models
export * from './match.model';

// Common types
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
