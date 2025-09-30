/**
 * Uptime and Availability Monitoring System
 * Provides comprehensive uptime tracking, health checks, and availability monitoring
 */

// Types for uptime monitoring
export interface HealthCheck {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  timeout: number;
  interval: number;
  expectedStatus?: number[];
  expectedContent?: string;
  retries: number;
  retryDelay: number;
  enabled: boolean;
  tags: string[];
}

export interface HealthCheckResult {
  checkId: string;
  timestamp: number;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  statusCode?: number;
  error?: string;
  content?: string;
  metadata: {
    attempt: number;
    totalAttempts: number;
    dnsTime?: number;
    connectTime?: number;
    tlsTime?: number;
    responseSize?: number;
  };
}

export interface UptimeMetrics {
  checkId: string;
  timeRange: {
    start: number;
    end: number;
  };
  uptime: number; // Percentage
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  incidents: UptimeIncident[];
  availability: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export interface UptimeIncident {
  id: string;
  checkId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ongoing' | 'resolved' | 'investigating';
  severity: 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  affectedServices: string[];
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  timestamp: number;
  status: UptimeIncident['status'];
  message: string;
  author: string;
}

export interface UptimeConfig {
  checks: HealthCheck[];
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailNotifications?: {
      enabled: boolean;
      recipients: string[];
      smtpConfig: any;
    };
    slackNotifications?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
  storage: {
    retentionDays: number;
    batchSize: number;
    flushInterval: number;
  };
  thresholds: {
    responseTimeWarning: number;
    responseTimeCritical: number;
    uptimeWarning: number;
    uptimeCritical: number;
  };
}

/**
 * HTTP Client for Health Checks
 */
class HealthCheckClient {
  private abortController: AbortController | null = null;

  /**
   * Perform health check
   */
  async performCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = performance.now();
    let attempt = 0;

    while (attempt < check.retries) {
      attempt++;
      
      try {
        const result = await this.makeRequest(check, startTime, attempt);
        if (result.status === 'up') {
          return result;
        }

        // If not the last attempt, wait before retrying
        if (attempt < check.retries) {
          await this.delay(check.retryDelay);
        } else {
          return result;
        }
      } catch (error) {
        if (attempt >= check.retries) {
          return {
            checkId: check.id,
            timestamp: Date.now(),
            status: 'down',
            responseTime: performance.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              attempt,
              totalAttempts: check.retries,
            },
          };
        }
        
        await this.delay(check.retryDelay);
      }
    }

    // This should never be reached, but added for type safety
    return {
      checkId: check.id,
      timestamp: Date.now(),
      status: 'down',
      responseTime: performance.now() - startTime,
      error: 'Maximum retries exceeded',
      metadata: {
        attempt,
        totalAttempts: check.retries,
      },
    };
  }

  private async makeRequest(
    check: HealthCheck,
    startTime: number,
    attempt: number
  ): Promise<HealthCheckResult> {
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), check.timeout);

    try {
      const requestStart = performance.now();
      const response = await fetch(check.url, {
        method: check.method,
        headers: check.headers,
        body: check.body,
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      // Check status code
      const expectedStatuses = check.expectedStatus || [200];
      const isStatusOk = expectedStatuses.includes(response.status);

      let content = '';
      let isContentOk = true;

      // Check response content if specified
      if (check.expectedContent && response.ok) {
        try {
          content = await response.text();
          isContentOk = content.includes(check.expectedContent);
        } catch {
          isContentOk = false;
        }
      }

      const status: HealthCheckResult['status'] = 
        isStatusOk && isContentOk ? 'up' : 'down';

      return {
        checkId: check.id,
        timestamp: Date.now(),
        status,
        responseTime,
        statusCode: response.status,
        content: content.substring(0, 1000), // Limit content size
        metadata: {
          attempt,
          totalAttempts: check.retries,
          responseSize: content.length,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel ongoing request
   */
  cancel(): void {
    this.abortController?.abort();
  }
}

/**
 * Metrics Calculator
 */
class UptimeMetricsCalculator {
  /**
   * Calculate uptime metrics from results
   */
  calculateMetrics(
    checkId: string,
    results: HealthCheckResult[],
    timeRange: { start: number; end: number }
  ): UptimeMetrics {
    const filteredResults = results.filter(
      r => r.checkId === checkId && 
           r.timestamp >= timeRange.start && 
           r.timestamp <= timeRange.end
    );

    const totalChecks = filteredResults.length;
    const successfulChecks = filteredResults.filter(r => r.status === 'up').length;
    const failedChecks = totalChecks - successfulChecks;
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    const responseTimes = filteredResults
      .filter(r => r.status === 'up')
      .map(r => r.responseTime);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // Calculate availability for different time periods
    const now = Date.now();
    const availability = {
      last24h: this.calculateUptimeForPeriod(results, checkId, now - 24 * 60 * 60 * 1000, now),
      last7d: this.calculateUptimeForPeriod(results, checkId, now - 7 * 24 * 60 * 60 * 1000, now),
      last30d: this.calculateUptimeForPeriod(results, checkId, now - 30 * 24 * 60 * 60 * 1000, now),
    };

    // Generate incidents from consecutive failures
    const incidents = this.generateIncidents(filteredResults);

    return {
      checkId,
      timeRange,
      uptime,
      totalChecks,
      successfulChecks,
      failedChecks,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      incidents,
      availability,
    };
  }

  private calculateUptimeForPeriod(
    results: HealthCheckResult[],
    checkId: string,
    start: number,
    end: number
  ): number {
    const periodResults = results.filter(
      r => r.checkId === checkId && r.timestamp >= start && r.timestamp <= end
    );

    if (periodResults.length === 0) return 0;

    const successful = periodResults.filter(r => r.status === 'up').length;
    return (successful / periodResults.length) * 100;
  }

  private generateIncidents(results: HealthCheckResult[]): UptimeIncident[] {
    const incidents: UptimeIncident[] = [];
    let currentIncident: Partial<UptimeIncident> | null = null;

    for (const result of results.sort((a, b) => a.timestamp - b.timestamp)) {
      if (result.status === 'down') {
        if (!currentIncident) {
          // Start new incident
          currentIncident = {
            id: this.generateIncidentId(),
            checkId: result.checkId,
            startTime: result.timestamp,
            status: 'ongoing',
            severity: 'major',
            title: 'Service Unavailable',
            description: result.error || 'Health check failed',
            affectedServices: [],
            updates: [],
          };
        }
      } else if (result.status === 'up' && currentIncident) {
        // End current incident
        const incident: UptimeIncident = {
          ...currentIncident as UptimeIncident,
          endTime: result.timestamp,
          duration: result.timestamp - (currentIncident.startTime || 0),
          status: 'resolved',
        };
        
        incidents.push(incident);
        currentIncident = null;
      }
    }

    // If there's an ongoing incident, add it
    if (currentIncident) {
      incidents.push(currentIncident as UptimeIncident);
    }

    return incidents;
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Alert Manager
 */
class AlertManager {
  private config: UptimeConfig['alerting'];
  private lastAlerts: Map<string, number> = new Map();
  private alertCooldown = 5 * 60 * 1000; // 5 minutes

  constructor(config: UptimeConfig['alerting']) {
    this.config = config;
  }

  /**
   * Process health check result for alerting
   */
  async processResult(
    check: HealthCheck,
    result: HealthCheckResult,
    metrics: UptimeMetrics
  ): Promise<void> {
    if (!this.config.enabled) return;

    const alertKey = `${check.id}_${result.status}`;
    const lastAlert = this.lastAlerts.get(alertKey) || 0;
    const now = Date.now();

    // Implement alert cooldown to prevent spam
    if (now - lastAlert < this.alertCooldown) {
      return;
    }

    let shouldAlert = false;
    let severity: 'warning' | 'critical' = 'warning';
    let message = '';

    if (result.status === 'down') {
      shouldAlert = true;
      severity = 'critical';
      message = `🔴 ${check.name} is DOWN - ${result.error || 'Health check failed'}`;
    } else if (result.status === 'up' && this.lastAlerts.has(`${check.id}_down`)) {
      shouldAlert = true;
      severity = 'warning';
      message = `🟢 ${check.name} is back UP - Response time: ${result.responseTime.toFixed(2)}ms`;
      this.lastAlerts.delete(`${check.id}_down`);
    } else if (result.responseTime > this.getResponseTimeThreshold(severity)) {
      shouldAlert = true;
      message = `⚠️ ${check.name} slow response - ${result.responseTime.toFixed(2)}ms (threshold: ${this.getResponseTimeThreshold(severity)}ms)`;
    }

    if (shouldAlert) {
      await this.sendAlert(check, result, message, severity);
      this.lastAlerts.set(alertKey, now);
    }
  }

  private async sendAlert(
    check: HealthCheck,
    result: HealthCheckResult,
    message: string,
    severity: 'warning' | 'critical'
  ): Promise<void> {
    const alertData = {
      check: check.name,
      status: result.status,
      url: check.url,
      responseTime: result.responseTime,
      error: result.error,
      timestamp: result.timestamp,
      severity,
    };

    // Send webhook alert
    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            data: alertData,
          }),
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }

    // Send Slack notification
    if (this.config.slackNotifications?.enabled && this.config.slackNotifications.webhookUrl) {
      try {
        await fetch(this.config.slackNotifications.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: this.config.slackNotifications.channel,
            text: message,
            attachments: [{
              color: severity === 'critical' ? 'danger' : 'warning',
              fields: [
                { title: 'Service', value: check.name, short: true },
                { title: 'Status', value: result.status, short: true },
                { title: 'Response Time', value: `${result.responseTime.toFixed(2)}ms`, short: true },
                { title: 'URL', value: check.url, short: false },
              ],
            }],
          }),
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  private getResponseTimeThreshold(severity: 'warning' | 'critical'): number {
    // These would come from config in a real implementation
    return severity === 'critical' ? 5000 : 2000;
  }
}

/**
 * Main Uptime Monitor
 */
export class UptimeMonitor {
  private static instance: UptimeMonitor;
  private config: UptimeConfig;
  private client: HealthCheckClient;
  private metricsCalculator: UptimeMetricsCalculator;
  private alertManager: AlertManager;
  private results: HealthCheckResult[] = [];
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  private constructor(config: UptimeConfig) {
    this.config = config;
    this.client = new HealthCheckClient();
    this.metricsCalculator = new UptimeMetricsCalculator();
    this.alertManager = new AlertManager(config.alerting);
  }

  static getInstance(config?: UptimeConfig): UptimeMonitor {
    if (!UptimeMonitor.instance && config) {
      UptimeMonitor.instance = new UptimeMonitor(config);
    }
    return UptimeMonitor.instance;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) return;

    console.log('Starting uptime monitoring...');
    
    for (const check of this.config.checks) {
      if (check.enabled) {
        this.scheduleCheck(check);
      }
    }

    this.isRunning = true;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('Stopping uptime monitoring...');
    
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    
    this.intervals.clear();
    this.client.cancel();
    this.isRunning = false;
  }

  /**
   * Add health check
   */
  addCheck(check: HealthCheck): void {
    this.config.checks.push(check);
    
    if (this.isRunning && check.enabled) {
      this.scheduleCheck(check);
    }
  }

  /**
   * Remove health check
   */
  removeCheck(checkId: string): void {
    this.config.checks = this.config.checks.filter(c => c.id !== checkId);
    
    const interval = this.intervals.get(checkId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(checkId);
    }
  }

  /**
   * Get metrics for a check
   */
  getMetrics(
    checkId: string,
    timeRange?: { start: number; end: number }
  ): UptimeMetrics {
    const defaultTimeRange = {
      start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      end: Date.now(),
    };

    return this.metricsCalculator.calculateMetrics(
      checkId,
      this.results,
      timeRange || defaultTimeRange
    );
  }

  /**
   * Get all results for a check
   */
  getResults(checkId?: string, limit = 100): HealthCheckResult[] {
    let filtered = checkId 
      ? this.results.filter(r => r.checkId === checkId)
      : this.results;

    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Perform immediate check
   */
  async performCheck(checkId: string): Promise<HealthCheckResult> {
    const check = this.config.checks.find(c => c.id === checkId);
    if (!check) {
      throw new Error(`Check ${checkId} not found`);
    }

    const result = await this.client.performCheck(check);
    this.addResult(result);

    const metrics = this.getMetrics(checkId);
    await this.alertManager.processResult(check, result, metrics);

    return result;
  }

  private scheduleCheck(check: HealthCheck): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(check.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new interval
    const interval = setInterval(async () => {
      try {
        const result = await this.client.performCheck(check);
        this.addResult(result);

        const metrics = this.getMetrics(check.id);
        await this.alertManager.processResult(check, result, metrics);
      } catch (error) {
        console.error(`Error in health check ${check.id}:`, error);
      }
    }, check.interval);

    this.intervals.set(check.id, interval);

    // Perform initial check
    setImmediate(async () => {
      try {
        await this.performCheck(check.id);
      } catch (error) {
        console.error(`Error in initial health check ${check.id}:`, error);
      }
    });
  }

  private addResult(result: HealthCheckResult): void {
    this.results.push(result);

    // Cleanup old results based on retention policy
    const cutoffTime = Date.now() - (this.config.storage.retentionDays * 24 * 60 * 60 * 1000);
    this.results = this.results.filter(r => r.timestamp >= cutoffTime);

    // Sort by timestamp for efficient querying
    this.results.sort((a, b) => a.timestamp - b.timestamp);
  }
}

// Default configuration
export const defaultUptimeConfig: UptimeConfig = {
  checks: [],
  alerting: {
    enabled: true,
    webhookUrl: '/api/alerts/webhook',
  },
  storage: {
    retentionDays: 30,
    batchSize: 100,
    flushInterval: 60000, // 1 minute
  },
  thresholds: {
    responseTimeWarning: 2000,
    responseTimeCritical: 5000,
    uptimeWarning: 99.0,
    uptimeCritical: 95.0,
  },
};

// Export convenience functions
export const initializeUptimeMonitoring = (config: Partial<UptimeConfig> = {}) => {
  const finalConfig = { ...defaultUptimeConfig, ...config };
  const monitor = UptimeMonitor.getInstance(finalConfig);
  monitor.start();
  return monitor;
};

export const createHealthCheck = (
  name: string,
  url: string,
  options: Partial<HealthCheck> = {}
): HealthCheck => ({
  id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  url,
  method: 'GET',
  timeout: 10000,
  interval: 60000, // 1 minute
  retries: 3,
  retryDelay: 1000,
  enabled: true,
  tags: [],
  ...options,
});

// Default export
export default UptimeMonitor;