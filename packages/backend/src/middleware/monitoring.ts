/**
 * Monitoring Middleware
 * Automatic performance monitoring for all API requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getMonitoringService } from '../services/monitoring/MonitoringService';

interface MonitoringOptions {
  excludeRoutes?: string[];
  includeUserAgent?: boolean;
  includeRequestBody?: boolean;
  sampleRate?: number; // 0-1, for high-traffic sampling
}

/**
 * Performance monitoring middleware
 * Automatically tracks API performance metrics
 */
export function createPerformanceMonitoring(options: MonitoringOptions = {}) {
  const {
    excludeRoutes = ['/health', '/metrics', '/monitoring'],
    includeUserAgent = true,
    includeRequestBody = false,
    sampleRate = 1.0
  } = options;

  const monitoringService = getMonitoringService();

  return {
    // Pre-handler to start timing
    preHandler: async (request: FastifyRequest, _reply: FastifyReply) => {
      // Check if route should be excluded
      if (excludeRoutes.some(route => request.url.startsWith(route))) {
        return;
      }

      // Apply sampling rate
      if (Math.random() > sampleRate) {
        return;
      }

      // Store start time
      (request as any).monitoringStartTime = Date.now();
      (request as any).shouldMonitor = true;
    },

    // Response handler to record metrics
    onSend: async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      if (!(request as any).shouldMonitor) {
        return payload;
      }

      const startTime = (request as any).monitoringStartTime;
      if (!startTime) {
        return payload;
      }

      const responseTime = Date.now() - startTime;
      const route = request.routeOptions?.url || request.url;

      // Record performance metric
      const performanceMetric = {
        route: route,
        method: request.method,
        responseTime: responseTime,
        statusCode: reply.statusCode,
        userId: (request as any).user?.id,
        ip: request.ip,
        ...(includeUserAgent && request.headers['user-agent'] && { userAgent: request.headers['user-agent'] })
      };
      await monitoringService.recordPerformanceMetric(performanceMetric);

      // Record error if status code indicates failure
      if (reply.statusCode >= 400) {
        await monitoringService.recordError({
          level: reply.statusCode >= 500 ? 'error' : 'warn',
          message: `HTTP ${reply.statusCode} on ${route}`,
          route: route,
          userId: (request as any).user?.id,
          context: {
            method: request.method,
            statusCode: reply.statusCode,
            responseTime: responseTime,
            userAgent: request.headers['user-agent'],
            ...(includeRequestBody && { requestBody: request.body })
          }
        });
      }

      return payload;
    }
  };
}

/**
 * Analytics event tracking middleware
 * For tracking user interactions and game events
 */
export function createAnalyticsTracking() {
  const monitoringService = getMonitoringService();

  return {
    // Helper function for tracking events
    trackEvent: async (
      request: FastifyRequest,
      eventName: string,
      properties: Record<string, any> = {},
      value?: number
    ) => {
      const user = (request as any).user;
      const sessionId = request.headers['x-session-id'] as string || 'anonymous';

      await monitoringService.recordAnalytics({
        userId: user?.id || 'anonymous',
        sessionId: sessionId,
        event: eventName,
        gameType: properties.gameType,
        properties: properties,
        ...(typeof value === 'number' && { value })
      });
    }
  };
}

/**
 * Database query monitoring decorator
 * Tracks database performance
 */
export function createDatabaseMonitoring() {
  const monitoringService = getMonitoringService();

  return {
    // Wrapper for database operations
    trackQuery: async <T>(
      operation: string,
      table: string,
      query: () => Promise<T>,
      queryString?: string
    ): Promise<T> => {
      const startTime = Date.now();
      let error: string | undefined;
      let rowCount: number | undefined;

      try {
        const result = await query();

        // Try to determine row count
        if (Array.isArray(result)) {
          rowCount = result.length;
        } else if (result && typeof result === 'object' && 'length' in result) {
          rowCount = (result as any).length;
        }

        return result;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const executionTime = Date.now() - startTime;

        await monitoringService.recordDatabaseMetric({
          operation: operation,
          table: table,
          executionTime: executionTime,
          ...(typeof rowCount === 'number' && { rowCount }),
          ...(queryString && { query: queryString }),
          ...(error && { error })
        });
      }
    }
  };
}

/**
 * Error tracking middleware
 * Automatic error capture with context
 */
export function createErrorTracking() {
  const monitoringService = getMonitoringService();

  return {
    // Error handler
    errorHandler: async (error: Error, request: FastifyRequest, _reply: FastifyReply) => {
      const route = request.routeOptions?.url || request.url;
      const user = (request as any).user;

      // Determine error level
      let level: 'error' | 'warn' | 'critical' = 'error';
      if (error.message.toLowerCase().includes('critical') ||
        error.message.toLowerCase().includes('security')) {
        level = 'critical';
      } else if (error.message.toLowerCase().includes('warn')) {
        level = 'warn';
      }

      await monitoringService.recordError({
        level: level,
        message: error.message,
        ...(error.stack && { stack: error.stack }),
        route: route,
        userId: user?.id,
        context: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          params: request.params,
          query: request.query
        }
      });

      // Continue with default error handling
      throw error;
    }
  };
}

/**
 * Middleware integration helper
 * Easy setup for all monitoring features
 */
export function setupMonitoring(server: any, options: {
  performance?: MonitoringOptions;
  analytics?: boolean;
  database?: boolean;
  errors?: boolean;
} = {}) {
  const {
    performance: perfOptions = {},
    analytics = true,
    database = true,
    errors = true
  } = options;

  // Performance monitoring
  const perfMonitoring = createPerformanceMonitoring(perfOptions);
  server.addHook('preHandler', perfMonitoring.preHandler);
  server.addHook('onSend', perfMonitoring.onSend);

  // Analytics tracking
  if (analytics) {
    const analyticsTracking = createAnalyticsTracking();
    server.decorate('trackEvent', analyticsTracking.trackEvent);
  }

  // Database monitoring
  if (database) {
    const dbMonitoring = createDatabaseMonitoring();
    server.decorate('trackQuery', dbMonitoring.trackQuery);
  }

  // Error tracking
  if (errors) {
    const errorTracking = createErrorTracking();
    server.setErrorHandler(errorTracking.errorHandler);
  }

  return {
    performance: perfMonitoring,
    analytics: analytics ? createAnalyticsTracking() : null,
    database: database ? createDatabaseMonitoring() : null,
    errors: errors ? createErrorTracking() : null
  };
}

/**
 * Custom monitoring hooks for specific use cases
 */
export const MonitoringHooks = {
  /**
   * Track game session start
   */
  trackGameSession: async (request: FastifyRequest, gameType: string, betAmount: number) => {
    const analytics = createAnalyticsTracking();
    await analytics.trackEvent(request, 'game_session_start', {
      gameType: gameType,
      betAmount: betAmount
    });
  },

  /**
   * Track game result
   */
  trackGameResult: async (
    request: FastifyRequest,
    gameType: string,
    result: 'win' | 'loss',
    amount: number
  ) => {
    const analytics = createAnalyticsTracking();
    await analytics.trackEvent(request, 'game_result', {
      gameType: gameType,
      result: result,
      amount: amount
    }, amount);
  },

  /**
   * Track user registration
   */
  trackUserRegistration: async (request: FastifyRequest, userId: string, method: string) => {
    const analytics = createAnalyticsTracking();
    await analytics.trackEvent(request, 'user_registration', {
      userId: userId,
      registrationMethod: method
    });
  },

  /**
   * Track deposit/withdrawal
   */
  trackTransaction: async (
    request: FastifyRequest,
    type: 'deposit' | 'withdrawal',
    amount: number,
    method: string
  ) => {
    const analytics = createAnalyticsTracking();
    await analytics.trackEvent(request, `user_${type}`, {
      transactionType: type,
      paymentMethod: method
    }, amount);
  }
};