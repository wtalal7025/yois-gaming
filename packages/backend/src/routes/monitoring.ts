/**
 * Monitoring API Routes
 * Endpoints for monitoring dashboard, metrics, and alerts
 */

import { FastifyPluginAsync } from 'fastify';
import { getMonitoringService } from '../services/monitoring/MonitoringService';
import { getApiCacheService } from '../services/cache/ApiCacheService';
import { getRedisService } from '../services/cache/RedisService';

const monitoringRoutes: FastifyPluginAsync = async (fastify) => {
  const monitoringService = getMonitoringService();
  const cacheService = getApiCacheService();
  const redisService = getRedisService();

  // Middleware for admin authentication (implement according to your auth system)
  const requireAdmin = async (request: any, reply: any) => {
    // TODO: Implement admin authentication
    // For now, just check if user exists and has admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  };

  /**
   * Get monitoring dashboard data
   */
  fastify.get('/dashboard', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Get monitoring dashboard data',
      querystring: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d'],
            default: '24h'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            performance: {
              type: 'object',
              properties: {
                avgResponseTime: { type: 'number' },
                requestCount: { type: 'number' },
                errorRate: { type: 'number' },
                p95ResponseTime: { type: 'number' }
              }
            },
            errors: {
              type: 'object',
              properties: {
                totalErrors: { type: 'number' },
                criticalErrors: { type: 'number' },
                topErrors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      count: { type: 'number' },
                      fingerprint: { type: 'string' }
                    }
                  }
                }
              }
            },
            analytics: {
              type: 'object',
              properties: {
                activeUsers: { type: 'number' },
                totalSessions: { type: 'number' },
                popularGames: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      game: { type: 'string' },
                      sessions: { type: 'number' },
                      revenue: { type: 'number' }
                    }
                  }
                }
              }
            },
            system: {
              type: 'object',
              properties: {
                activeAlerts: { type: 'number' },
                resolvedAlerts: { type: 'number' },
                systemHealth: { 
                  type: 'string',
                  enum: ['healthy', 'warning', 'critical']
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { timeRange = '24h' } = request.query as { timeRange?: '1h' | '24h' | '7d' | '30d' };
      const dashboardData = await monitoringService.getDashboardData(timeRange);
      
      return dashboardData;
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get system metrics
   */
  fastify.get('/metrics/system', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Get current system metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            timestamp: { type: 'number' },
            activeConnections: { type: 'number' },
            requestsPerSecond: { type: 'number' },
            errorRate: { type: 'number' },
            avgResponseTime: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const systemMetrics = await monitoringService.getSystemMetrics();
      return systemMetrics;
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to fetch system metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get active alerts
   */
  fastify.get('/alerts', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Get active alerts',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'number' },
              type: { 
                type: 'string',
                enum: ['performance', 'error', 'system', 'security']
              },
              severity: { 
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical']
              },
              title: { type: 'string' },
              description: { type: 'string' },
              metric: { type: 'string' },
              threshold: { type: 'number' },
              actualValue: { type: 'number' },
              resolved: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const alerts = monitoringService.getActiveAlerts();
      return alerts;
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Resolve an alert
   */
  fastify.post('/alerts/:alertId/resolve', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Resolve an alert',
      params: {
        type: 'object',
        required: ['alertId'],
        properties: {
          alertId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { alertId } = request.params as { alertId: string };
      const resolved = await monitoringService.resolveAlert(alertId);
      
      if (resolved) {
        return { success: true, message: 'Alert resolved successfully' };
      } else {
        reply.status(404);
        return { success: false, message: 'Alert not found or already resolved' };
      }
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get cache statistics
   */
  fastify.get('/cache/stats', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Get cache statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            hits: { type: 'number' },
            misses: { type: 'number' },
            hitRate: { type: 'number' },
            avgResponseTime: { type: 'number' },
            keyCount: { type: 'number' },
            connected: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const cacheInfo = await cacheService.getCacheInfo();
      return cacheInfo;
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to fetch cache stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Clear API cache
   */
  fastify.delete('/cache/clear', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Clear API cache',
      querystring: {
        type: 'object',
        properties: {
          tags: {
            type: 'string',
            description: 'Comma-separated list of tags to clear'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            clearedCount: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tags } = request.query as { tags?: string };
      
      let clearedCount = 0;
      
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        clearedCount = await cacheService.invalidateByTags(tagList);
      } else {
        clearedCount = await cacheService.invalidateAll();
      }

      return {
        success: true,
        clearedCount,
        message: `Cleared ${clearedCount} cache entries`
      };
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get Redis connection health
   */
  fastify.get('/health/redis', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Check Redis connection health',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { 
              type: 'string',
              enum: ['connected', 'disconnected']
            },
            latency: { type: 'number' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const healthStatus = await redisService.healthCheck();
      
      if (healthStatus.status === 'disconnected') {
        reply.status(503);
      }
      
      return healthStatus;
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to check Redis health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get performance metrics for a specific route
   */
  fastify.get('/metrics/routes/:route', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Get metrics for a specific route',
      params: {
        type: 'object',
        required: ['route'],
        properties: {
          route: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d'],
            default: '24h'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            route: { type: 'string' },
            requestCount: { type: 'number' },
            avgResponseTime: { type: 'number' },
            errorRate: { type: 'number' },
            p95ResponseTime: { type: 'number' },
            statusCodes: {
              type: 'object',
              additionalProperties: { type: 'number' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // This would require additional implementation in MonitoringService
      // For now, return a placeholder response
      const { route } = request.params as { route: string };
      const { timeRange = '24h' } = request.query as { timeRange?: string };
      
      return {
        route: decodeURIComponent(route),
        requestCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        statusCodes: {},
        message: 'Route-specific metrics not implemented yet'
      };
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to fetch route metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Manual cleanup endpoint for maintenance
   */
  fastify.post('/maintenance/cleanup', {
    preHandler: [requireAdmin],
    schema: {
      tags: ['monitoring'],
      summary: 'Run manual cleanup of old monitoring data',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            cleanedItems: {
              type: 'object',
              properties: {
                cache: { type: 'number' },
                alerts: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Run cache cleanup
      const cleanedCache = await cacheService.cleanup();
      
      return {
        success: true,
        message: 'Cleanup completed successfully',
        cleanedItems: {
          cache: cleanedCache,
          alerts: 0 // Alerts cleanup would need implementation
        }
      };
    } catch (error) {
      reply.status(500).send({ 
        error: 'Failed to run cleanup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export default monitoringRoutes;