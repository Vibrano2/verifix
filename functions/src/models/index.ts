/**
 * Models Index
 * Central export for all models
 */

// User models
export * from './user.model';

// Artisan models
export * from './artisan.model';

// Job models
export { Job, JobStatus, CreateJobDTO, UpdateJobDTO, JobMatch } from './job.model';

// Transaction models
export * from './transaction.model';

// Match models
export { Match, MatchStatus, CreateMatchDTO } from './match.model';

// Rating models (separate collection per PRD v1.1)
export * from './rating.model';

// Analytics models
export * from './analytics.model';

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
