/**
 * Monitoring & Analytics Service
 * Comprehensive monitoring for performance metrics, error tracking, and user analytics
 */

import { getRedisService } from '../cache/RedisService';

interface PerformanceMetric {
  timestamp: number;
  route: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  errorMessage?: string;
}

interface ErrorEvent {
  timestamp: number;
  level: 'error' | 'warn' | 'critical';
  message: string;
  stack?: string;
  route?: string;
  userId?: string;
  context?: Record<string, any>;
  fingerprint?: string; // For deduplication
}

interface UserAnalytics {
  timestamp: number;
  userId: string;
  sessionId: string;
  event: string;
  gameType?: string;
  properties?: Record<string, any>;
  value?: number; // For monetary events
}

interface DatabaseMetric {
  timestamp: number;
  operation: string;
  table: string;
  executionTime: number;
  rowCount?: number;
  query?: string;
  error?: string;
}

interface SystemMetrics {
  timestamp: number;
  cpuUsage?: number;
  memoryUsage?: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  avgResponseTime: number;
}

interface Alert {
  id: string;
  timestamp: number;
  type: 'performance' | 'error' | 'system' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  actualValue: number;
  resolved: boolean;
  resolvedAt?: number;
}

interface MonitoringConfig {
  performanceThresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
  };
  alerting: {
    enabled: boolean;
    channels: string[]; // email, slack, webhook
    cooldown: number; // seconds between same alerts
  };
  retention: {
    metrics: number; // days
    errors: number; // days
    analytics: number; // days
  };
}

export class MonitoringService {
  private redis = getRedisService();
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private analytics: UserAnalytics[] = [];
  private dbMetrics: DatabaseMetric[] = [];
  private activeAlerts = new Map<string, Alert>();
  private config: MonitoringConfig;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      performanceThresholds: {
        responseTime: 1000, // 1 second
        errorRate: 5, // 5%
        memoryUsage: 80, // 80%
        cpuUsage: 70 // 70%
      },
      alerting: {
        enabled: true,
        channels: ['log'], // Default to logging
        cooldown: 300 // 5 minutes
      },
      retention: {
        metrics: 30,
        errors: 90,
        analytics: 365
      },
      ...config
    };

    // Start periodic cleanup
    this.startCleanupJob();
  }

  /**
   * Record API performance metric
   */
  async recordPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      timestamp: Date.now(),
      ...metric
    };

    try {
      // Store in memory for immediate access
      this.metrics.push(fullMetric);

      // Store in Redis for persistence
      const key = `metrics:performance:${Date.now()}:${Math.random()}`;
      await this.redis.set(key, JSON.stringify(fullMetric), 86400); // 1 day TTL

      // Check for performance alerts
      await this.checkPerformanceThresholds(fullMetric);

      // Clean memory if too many metrics
      if (this.metrics.length > 10000) {
        this.metrics = this.metrics.slice(-5000);
      }
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Record error event
   */
  async recordError(error: Omit<ErrorEvent, 'timestamp' | 'fingerprint'>): Promise<void> {
    const fingerprint = this.generateErrorFingerprint(error);
    const errorEvent: ErrorEvent = {
      timestamp: Date.now(),
      fingerprint,
      ...error
    };

    try {
      // Store in memory
      this.errors.push(errorEvent);

      // Store in Redis
      const key = `metrics:errors:${Date.now()}:${Math.random()}`;
      await this.redis.set(key, JSON.stringify(errorEvent), 86400 * this.config.retention.errors);

      // Update error count for fingerprint
      const countKey = `error_count:${fingerprint}`;
      await this.redis.increment(countKey);

      // Create alert for critical errors
      if (error.level === 'critical') {
        await this.createAlert({
          type: 'error',
          severity: 'critical',
          title: 'Critical Error Occurred',
          description: error.message,
          metric: 'error_rate',
          threshold: 0,
          actualValue: 1
        });
      }

      // Clean memory
      if (this.errors.length > 5000) {
        this.errors = this.errors.slice(-2500);
      }
    } catch (err) {
      console.error('Failed to record error:', err);
    }
  }

  /**
   * Record user analytics event
   */
  async recordAnalytics(analytics: Omit<UserAnalytics, 'timestamp'>): Promise<void> {
    const analyticsEvent: UserAnalytics = {
      timestamp: Date.now(),
      ...analytics
    };

    try {
      // Store in memory
      this.analytics.push(analyticsEvent);

      // Store in Redis
      const key = `metrics:analytics:${Date.now()}:${Math.random()}`;
      await this.redis.set(key, JSON.stringify(analyticsEvent), 86400 * this.config.retention.analytics);

      // Update user session data
      if (analytics.sessionId) {
        const sessionKey = `session:analytics:${analytics.sessionId}`;
        await this.redis.lPush(sessionKey, JSON.stringify(analyticsEvent));
      }

      // Clean memory
      if (this.analytics.length > 10000) {
        this.analytics = this.analytics.slice(-5000);
      }
    } catch (error) {
      console.error('Failed to record analytics:', error);
    }
  }

  /**
   * Record database performance metric
   */
  async recordDatabaseMetric(metric: Omit<DatabaseMetric, 'timestamp'>): Promise<void> {
    const dbMetric: DatabaseMetric = {
      timestamp: Date.now(),
      ...metric
    };

    try {
      // Store in memory
      this.dbMetrics.push(dbMetric);

      // Store in Redis
      const key = `metrics:database:${Date.now()}:${Math.random()}`;
      await this.redis.set(key, JSON.stringify(dbMetric), 86400); // 1 day TTL

      // Check for slow query alerts
      if (dbMetric.executionTime > 1000) { // Queries slower than 1 second
        await this.createAlert({
          type: 'performance',
          severity: 'medium',
          title: 'Slow Database Query',
          description: `Query on ${dbMetric.table} took ${dbMetric.executionTime}ms`,
          metric: 'db_query_time',
          threshold: 1000,
          actualValue: dbMetric.executionTime
        });
      }

      // Clean memory
      if (this.dbMetrics.length > 5000) {
        this.dbMetrics = this.dbMetrics.slice(-2500);
      }
    } catch (error) {
      console.error('Failed to record database metric:', error);
    }
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    performance: {
      avgResponseTime: number;
      requestCount: number;
      errorRate: number;
      p95ResponseTime: number;
    };
    errors: {
      totalErrors: number;
      criticalErrors: number;
      topErrors: Array<{ message: string; count: number; fingerprint: string }>;
    };
    analytics: {
      activeUsers: number;
      totalSessions: number;
      popularGames: Array<{ game: string; sessions: number; revenue: number }>;
    };
    system: {
      activeAlerts: number;
      resolvedAlerts: number;
      systemHealth: 'healthy' | 'warning' | 'critical';
    };
  }> {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;

    try {
      // Performance metrics
      const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
      const responseTimes = recentMetrics.map(m => m.responseTime);
      const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      const p95ResponseTime = responseTimes.length > 0
        ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
        : 0;

      const errorRate = recentMetrics.length > 0
        ? (errorCount / recentMetrics.length) * 100
        : 0;

      // Error analysis
      const recentErrors = this.errors.filter(e => e.timestamp > cutoffTime);
      const criticalErrors = recentErrors.filter(e => e.level === 'critical').length;

      const errorCounts = new Map<string, { message: string; count: number; fingerprint: string }>();
      recentErrors.forEach(error => {
        if (error.fingerprint) {
          const existing = errorCounts.get(error.fingerprint);
          if (existing) {
            existing.count++;
          } else {
            errorCounts.set(error.fingerprint, {
              message: error.message,
              count: 1,
              fingerprint: error.fingerprint
            });
          }
        }
      });

      const topErrors = Array.from(errorCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Analytics
      const recentAnalytics = this.analytics.filter(a => a.timestamp > cutoffTime);
      const uniqueUsers = new Set(recentAnalytics.map(a => a.userId)).size;
      const uniqueSessions = new Set(recentAnalytics.map(a => a.sessionId)).size;

      const gameStats = new Map<string, { sessions: number; revenue: number }>();
      recentAnalytics
        .filter(a => a.gameType)
        .forEach(a => {
          const game = a.gameType!;
          const existing = gameStats.get(game) || { sessions: 0, revenue: 0 };
          existing.sessions++;
          existing.revenue += a.value || 0;
          gameStats.set(game, existing);
        });

      const popularGames = Array.from(gameStats.entries())
        .map(([game, stats]) => ({ game, ...stats }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 10);

      // System health
      const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.resolved).length;
      const resolvedAlerts = Array.from(this.activeAlerts.values()).filter(a => a.resolved).length;

      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (activeAlerts > 0) {
        const criticalAlerts = Array.from(this.activeAlerts.values())
          .filter(a => !a.resolved && a.severity === 'critical').length;
        systemHealth = criticalAlerts > 0 ? 'critical' : 'warning';
      }

      return {
        performance: {
          avgResponseTime: Math.round(avgResponseTime),
          requestCount: recentMetrics.length,
          errorRate: Math.round(errorRate * 100) / 100,
          p95ResponseTime: Math.round(p95ResponseTime || 0)
        },
        errors: {
          totalErrors: recentErrors.length,
          criticalErrors,
          topErrors
        },
        analytics: {
          activeUsers: uniqueUsers,
          totalSessions: uniqueSessions,
          popularGames
        },
        system: {
          activeAlerts,
          resolvedAlerts,
          systemHealth
        }
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get system metrics for monitoring
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate metrics from recent data
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const requestsPerSecond = recentMetrics.length / 60;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentMetrics.length > 0 ? (errorCount / recentMetrics.length) * 100 : 0;
    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    return {
      timestamp: now,
      activeConnections: recentMetrics.length, // Approximation
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime)
    };
  }

  /**
   * Create an alert
   */
  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alertId = `${alertData.type}-${alertData.metric}-${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      timestamp: Date.now(),
      resolved: false,
      ...alertData
    };

    // Check cooldown
    const cooldownKey = `alert_cooldown:${alertData.type}:${alertData.metric}`;
    const lastAlert = await this.redis.get(cooldownKey);
    if (lastAlert) {
      return; // Still in cooldown
    }

    // Set cooldown
    await this.redis.set(cooldownKey, Date.now().toString(), this.config.alerting.cooldown);

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.redis.set(`alert:${alertId}`, JSON.stringify(alert), 86400 * 7); // 7 days

    // Send alert through configured channels
    await this.sendAlert(alert);
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: Alert): Promise<void> {
    if (!this.config.alerting.enabled) return;

    for (const channel of this.config.alerting.channels) {
      try {
        switch (channel) {
          case 'log':
            console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`);
            break;
          case 'email':
            // Email integration would go here
            console.log('📧 Email alert sent (not implemented)');
            break;
          case 'slack':
            // Slack integration would go here  
            console.log('💬 Slack alert sent (not implemented)');
            break;
          case 'webhook':
            // Webhook integration would go here
            console.log('🔗 Webhook alert sent (not implemented)');
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private async checkPerformanceThresholds(metric: PerformanceMetric): Promise<void> {
    // Response time threshold
    if (metric.responseTime > this.config.performanceThresholds.responseTime) {
      await this.createAlert({
        type: 'performance',
        severity: metric.responseTime > this.config.performanceThresholds.responseTime * 2 ? 'high' : 'medium',
        title: 'Slow Response Time',
        description: `Route ${metric.route} responded in ${metric.responseTime}ms`,
        metric: 'response_time',
        threshold: this.config.performanceThresholds.responseTime,
        actualValue: metric.responseTime
      });
    }

    // Error rate threshold (check last 100 requests)
    const recentMetrics = this.metrics.slice(-100);
    if (recentMetrics.length >= 10) {
      const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
      const errorRate = (errorCount / recentMetrics.length) * 100;

      if (errorRate > this.config.performanceThresholds.errorRate) {
        await this.createAlert({
          type: 'performance',
          severity: errorRate > this.config.performanceThresholds.errorRate * 2 ? 'high' : 'medium',
          title: 'High Error Rate',
          description: `Error rate is ${errorRate.toFixed(1)}%`,
          metric: 'error_rate',
          threshold: this.config.performanceThresholds.errorRate,
          actualValue: errorRate
        });
      }
    }
  }

  /**
   * Generate fingerprint for error deduplication
   */
  private generateErrorFingerprint(error: Omit<ErrorEvent, 'timestamp' | 'fingerprint'>): string {
    const components = [
      error.level,
      error.message,
      error.route || 'unknown',
      (error.stack || '').split('\n')[0] // First line of stack trace
    ];

    return Buffer.from(components.join('|')).toString('base64').substring(0, 16);
  }

  /**
   * Convert time range to milliseconds
   */
  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanup().catch(console.error);
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old data based on retention policies
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();

    try {
      // Clean up metrics older than retention period
      const metricsRetention = now - (this.config.retention.metrics * 24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > metricsRetention);

      // Clean up errors
      const errorsRetention = now - (this.config.retention.errors * 24 * 60 * 60 * 1000);
      this.errors = this.errors.filter(e => e.timestamp > errorsRetention);

      // Clean up analytics
      const analyticsRetention = now - (this.config.retention.analytics * 24 * 60 * 60 * 1000);
      this.analytics = this.analytics.filter(a => a.timestamp > analyticsRetention);

      // Clean up resolved alerts older than 7 days
      const alertRetention = now - (7 * 24 * 60 * 60 * 1000);
      for (const [id, alert] of this.activeAlerts.entries()) {
        if (alert.resolved && alert.resolvedAt && alert.resolvedAt < alertRetention) {
          this.activeAlerts.delete(id);
        }
      }

      console.log('🧹 Monitoring cleanup completed');
    } catch (error) {
      console.error('❌ Monitoring cleanup failed:', error);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    // Update in Redis
    await this.redis.set(`alert:${alertId}`, JSON.stringify(alert), 86400 * 7);

    return true;
  }
}

// Global instance
let monitoringService: MonitoringService;

/**
 * Get or create monitoring service instance
 */
export function getMonitoringService(config?: Partial<MonitoringConfig>): MonitoringService {
  if (!monitoringService) {
    monitoringService = new MonitoringService(config);
  }
  return monitoringService;
}