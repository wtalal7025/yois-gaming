/**
 * API-related type definitions
 * Contains interfaces for API requests, responses, and error handling
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Socket.IO event types
 */
export type SocketEvent = 
  | 'game:join'
  | 'game:leave'
  | 'game:bet'
  | 'game:result'
  | 'game:state'
  | 'player:connect'
  | 'player:disconnect';

/**
 * Socket message interface
 */
export interface SocketMessage<T = unknown> {
  event: SocketEvent;
  data: T;
  timestamp: string;
  playerId?: string;
}