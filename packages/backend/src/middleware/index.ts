/**
 * Fastify middleware module
 * Contains authentication, validation, performance, and other middleware
 */

export {
  registerPerformanceMiddleware,
  defaultPerformanceConfig
} from './performance';

export {
  registerRateLimitingMiddleware,
  defaultRateLimitConfig,
  getRateLimiter
} from './rateLimiting';

export {
  registerSecurityMiddleware,
  defaultSecurityConfig,
  getSecurityMonitor
} from './security';