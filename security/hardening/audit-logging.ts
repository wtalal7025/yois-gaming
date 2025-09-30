/**
 * Comprehensive Security Audit Logging System
 * Provides detailed security event logging, compliance reporting, and forensic analysis
 */

// Types for audit logging
export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  severity: AuditSeverity;
  actor: AuditActor;
  resource: AuditResource;
  action: string;
  outcome: AuditOutcome;
  details: Record<string, any>;
  metadata: AuditMetadata;
  tags: string[];
}

export interface AuditActor {
  type: 'user' | 'system' | 'admin' | 'service' | 'anonymous';
  id?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  roles?: string[];
}

export interface AuditResource {
  type: string;
  id?: string;
  name?: string;
  path?: string;
  attributes?: Record<string, any>;
}

export interface AuditMetadata {
  correlationId: string;
  requestId?: string;
  traceId?: string;
  source: string;
  version: string;
  environment: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

export type AuditEventType = 
  | 'authentication'
  | 'authorization' 
  | 'data_access'
  | 'data_modification'
  | 'configuration_change'
  | 'security_violation'
  | 'financial_transaction'
  | 'game_action'
  | 'system_event'
  | 'compliance'
  | 'error'
  | 'warning';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditOutcome = 'success' | 'failure' | 'partial' | 'unknown';

export interface AuditFilter {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  actors?: string[];
  resources?: string[];
  outcomes?: AuditOutcome[];
  tags?: string[];
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStorage {
  store(event: AuditEvent): Promise<void>;
  query(filter: AuditFilter): Promise<AuditEvent[]>;
  count(filter: AuditFilter): Promise<number>;
  archive(beforeDate: Date): Promise<number>;
  purge(beforeDate: Date): Promise<number>;
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  statistics: {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    failureRate: number;
    topActors: Array<{ actor: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
  };
  violations: AuditEvent[];
  recommendations: string[];
  complianceScore: number;
}

/**
 * In-Memory Audit Storage (for development/testing)
 */
class MemoryAuditStorage implements AuditStorage {
  private events: Map<string, AuditEvent> = new Map();
  private indexes: {
    byType: Map<AuditEventType, Set<string>>;
    byActor: Map<string, Set<string>>;
    byResource: Map<string, Set<string>>;
    byTimestamp: Array<{ timestamp: number; id: string }>;
  } = {
    byType: new Map(),
    byActor: new Map(),
    byResource: new Map(),
    byTimestamp: []
  };

  async store(event: AuditEvent): Promise<void> {
    this.events.set(event.id, event);
    this.updateIndexes(event);
    
    // Keep only last 10000 events in memory
    if (this.events.size > 10000) {
      const oldest = this.indexes.byTimestamp.shift();
      if (oldest) {
        this.removeFromIndexes(oldest.id);
        this.events.delete(oldest.id);
      }
    }
  }

  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    let candidateIds = new Set<string>();
    let firstFilter = true;

    // Filter by event type
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      const typeIds = new Set<string>();
      for (const type of filter.eventTypes) {
        const ids = this.indexes.byType.get(type);
        if (ids) {
          ids.forEach(id => typeIds.add(id));
        }
      }
      candidateIds = firstFilter ? typeIds : new Set([...candidateIds].filter(id => typeIds.has(id)));
      firstFilter = false;
    }

    // Filter by actor
    if (filter.actors && filter.actors.length > 0) {
      const actorIds = new Set<string>();
      for (const actor of filter.actors) {
        const ids = this.indexes.byActor.get(actor);
        if (ids) {
          ids.forEach(id => actorIds.add(id));
        }
      }
      candidateIds = firstFilter ? actorIds : new Set([...candidateIds].filter(id => actorIds.has(id)));
      firstFilter = false;
    }

    // If no specific filters, get all events
    if (firstFilter) {
      candidateIds = new Set(this.events.keys());
    }

    // Get events and apply remaining filters
    const events: AuditEvent[] = [];
    for (const id of candidateIds) {
      const event = this.events.get(id);
      if (!event) continue;

      // Time range filter
      if (filter.startTime && event.timestamp < filter.startTime) continue;
      if (filter.endTime && event.timestamp > filter.endTime) continue;

      // Severity filter
      if (filter.severities && !filter.severities.includes(event.severity)) continue;

      // Outcome filter
      if (filter.outcomes && !filter.outcomes.includes(event.outcome)) continue;

      // Tags filter
      if (filter.tags && !filter.tags.some(tag => event.tags.includes(tag))) continue;

      // Correlation ID filter
      if (filter.correlationId && event.metadata.correlationId !== filter.correlationId) continue;

      events.push(event);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    return events.slice(offset, offset + limit);
  }

  async count(filter: AuditFilter): Promise<number> {
    const events = await this.query({ ...filter, limit: undefined, offset: undefined });
    return events.length;
  }

  async archive(beforeDate: Date): Promise<number> {
    // In memory storage doesn't implement archiving
    return 0;
  }

  async purge(beforeDate: Date): Promise<number> {
    let purgedCount = 0;
    const idsToRemove: string[] = [];

    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < beforeDate) {
        idsToRemove.push(id);
      }
    }

    for (const id of idsToRemove) {
      this.removeFromIndexes(id);
      this.events.delete(id);
      purgedCount++;
    }

    return purgedCount;
  }

  private updateIndexes(event: AuditEvent): void {
    // Update type index
    if (!this.indexes.byType.has(event.type)) {
      this.indexes.byType.set(event.type, new Set());
    }
    this.indexes.byType.get(event.type)!.add(event.id);

    // Update actor index
    const actorKey = event.actor.id || event.actor.ipAddress;
    if (!this.indexes.byActor.has(actorKey)) {
      this.indexes.byActor.set(actorKey, new Set());
    }
    this.indexes.byActor.get(actorKey)!.add(event.id);

    // Update resource index
    const resourceKey = `${event.resource.type}:${event.resource.id || event.resource.name}`;
    if (!this.indexes.byResource.has(resourceKey)) {
      this.indexes.byResource.set(resourceKey, new Set());
    }
    this.indexes.byResource.get(resourceKey)!.add(event.id);

    // Update timestamp index
    this.indexes.byTimestamp.push({
      timestamp: event.timestamp.getTime(),
      id: event.id
    });
    this.indexes.byTimestamp.sort((a, b) => a.timestamp - b.timestamp);
  }

  private removeFromIndexes(eventId: string): void {
    const event = this.events.get(eventId);
    if (!event) return;

    // Remove from type index
    this.indexes.byType.get(event.type)?.delete(eventId);

    // Remove from actor index
    const actorKey = event.actor.id || event.actor.ipAddress;
    this.indexes.byActor.get(actorKey)?.delete(eventId);

    // Remove from resource index
    const resourceKey = `${event.resource.type}:${event.resource.id || event.resource.name}`;
    this.indexes.byResource.get(resourceKey)?.delete(eventId);

    // Remove from timestamp index
    const timestampIndex = this.indexes.byTimestamp.findIndex(item => item.id === eventId);
    if (timestampIndex >= 0) {
      this.indexes.byTimestamp.splice(timestampIndex, 1);
    }
  }
}

/**
 * Database Audit Storage (for production)
 */
class DatabaseAuditStorage implements AuditStorage {
  private connection: any; // Database connection

  constructor(connection: any) {
    this.connection = connection;
  }

  async store(event: AuditEvent): Promise<void> {
    const query = `
      INSERT INTO audit_events (
        id, timestamp, type, severity, actor_type, actor_id, actor_ip,
        resource_type, resource_id, action, outcome, details, metadata, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.connection.execute(query, [
      event.id,
      event.timestamp,
      event.type,
      event.severity,
      event.actor.type,
      event.actor.id,
      event.actor.ipAddress,
      event.resource.type,
      event.resource.id,
      event.action,
      event.outcome,
      JSON.stringify(event.details),
      JSON.stringify(event.metadata),
      JSON.stringify(event.tags)
    ]);
  }

  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.startTime) {
      conditions.push('timestamp >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('timestamp <= ?');
      params.push(filter.endTime);
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      conditions.push(`type IN (${filter.eventTypes.map(() => '?').join(',')})`);
      params.push(...filter.eventTypes);
    }

    if (filter.severities && filter.severities.length > 0) {
      conditions.push(`severity IN (${filter.severities.map(() => '?').join(',')})`);
      params.push(...filter.severities);
    }

    if (filter.outcomes && filter.outcomes.length > 0) {
      conditions.push(`outcome IN (${filter.outcomes.map(() => '?').join(',')})`);
      params.push(...filter.outcomes);
    }

    if (filter.correlationId) {
      conditions.push("JSON_EXTRACT(metadata, '$.correlationId') = ?");
      params.push(filter.correlationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT * FROM audit_events 
      ${whereClause} 
      ORDER BY timestamp DESC 
      ${limitClause} ${offsetClause}
    `;

    const rows = await this.connection.query(query, params);
    return rows.map(this.rowToEvent);
  }

  async count(filter: AuditFilter): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.startTime) {
      conditions.push('timestamp >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('timestamp <= ?');
      params.push(filter.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as count FROM audit_events ${whereClause}`;

    const result = await this.connection.query(query, params);
    return result[0].count;
  }

  async archive(beforeDate: Date): Promise<number> {
    // Move old records to archive table
    const archiveQuery = `
      INSERT INTO audit_events_archive 
      SELECT * FROM audit_events WHERE timestamp < ?
    `;
    
    const deleteQuery = `DELETE FROM audit_events WHERE timestamp < ?`;
    
    await this.connection.execute(archiveQuery, [beforeDate]);
    const result = await this.connection.execute(deleteQuery, [beforeDate]);
    
    return result.affectedRows || 0;
  }

  async purge(beforeDate: Date): Promise<number> {
    const query = `DELETE FROM audit_events WHERE timestamp < ?`;
    const result = await this.connection.execute(query, [beforeDate]);
    return result.affectedRows || 0;
  }

  private rowToEvent(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      type: row.type,
      severity: row.severity,
      actor: {
        type: row.actor_type,
        id: row.actor_id,
        ipAddress: row.actor_ip,
        email: row.actor_email,
        userAgent: row.actor_user_agent,
        sessionId: row.actor_session_id
      },
      resource: {
        type: row.resource_type,
        id: row.resource_id,
        name: row.resource_name,
        path: row.resource_path
      },
      action: row.action,
      outcome: row.outcome,
      details: JSON.parse(row.details || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      tags: JSON.parse(row.tags || '[]')
    };
  }
}

/**
 * Audit Logger
 */
class AuditLogger {
  private storage: AuditStorage;
  private correlationId: string = '';

  constructor(storage: AuditStorage) {
    this.storage = storage;
  }

  /**
   * Log audit event
   */
  async log(
    type: AuditEventType,
    action: string,
    actor: Partial<AuditActor>,
    resource: Partial<AuditResource>,
    outcome: AuditOutcome = 'success',
    details: Record<string, any> = {},
    severity: AuditSeverity = 'medium',
    tags: string[] = []
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      severity,
      actor: this.normalizeActor(actor),
      resource: this.normalizeResource(resource),
      action,
      outcome,
      details,
      metadata: this.createMetadata(),
      tags
    };

    await this.storage.store(event);
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_verify',
    actor: Partial<AuditActor>,
    outcome: AuditOutcome,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log(
      'authentication',
      action,
      actor,
      { type: 'user_session', id: actor.sessionId },
      outcome,
      details,
      outcome === 'failure' ? 'high' : 'medium',
      ['auth', action]
    );
  }

  /**
   * Log financial transactions
   */
  async logFinancialTransaction(
    action: 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund',
    actor: Partial<AuditActor>,
    amount: number,
    currency: string,
    outcome: AuditOutcome,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log(
      'financial_transaction',
      action,
      actor,
      { type: 'transaction', id: details.transactionId },
      outcome,
      { ...details, amount, currency },
      'high',
      ['financial', action, currency]
    );
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(
    violation: string,
    actor: Partial<AuditActor>,
    severity: AuditSeverity,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log(
      'security_violation',
      violation,
      actor,
      { type: 'security_incident', name: violation },
      'failure',
      details,
      severity,
      ['security', 'violation', severity]
    );
  }

  /**
   * Log game actions
   */
  async logGameAction(
    action: string,
    actor: Partial<AuditActor>,
    gameId: string,
    outcome: AuditOutcome,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log(
      'game_action',
      action,
      actor,
      { type: 'game', id: gameId },
      outcome,
      details,
      'medium',
      ['game', action, gameId]
    );
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeActor(actor: Partial<AuditActor>): AuditActor {
    return {
      type: actor.type || 'anonymous',
      id: actor.id,
      email: actor.email,
      ipAddress: actor.ipAddress || 'unknown',
      userAgent: actor.userAgent,
      sessionId: actor.sessionId,
      roles: actor.roles
    };
  }

  private normalizeResource(resource: Partial<AuditResource>): AuditResource {
    return {
      type: resource.type || 'unknown',
      id: resource.id,
      name: resource.name,
      path: resource.path,
      attributes: resource.attributes
    };
  }

  private createMetadata(): AuditMetadata {
    return {
      correlationId: this.correlationId || this.generateId(),
      source: 'gaming-platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

/**
 * Compliance Reporter
 */
class ComplianceReporter {
  private storage: AuditStorage;

  constructor(storage: AuditStorage) {
    this.storage = storage;
  }

  /**
   * Generate compliance report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const filter: AuditFilter = {
      startTime: startDate,
      endTime: endDate,
      limit: 10000 // Large limit for comprehensive analysis
    };

    const events = await this.storage.query(filter);
    const totalEvents = await this.storage.count(filter);

    // Calculate statistics
    const statistics = this.calculateStatistics(events);
    
    // Find violations
    const violations = events.filter(event => 
      event.type === 'security_violation' || 
      event.outcome === 'failure' && event.severity === 'high'
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(statistics, violations);

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(statistics, violations.length, totalEvents);

    return {
      period: { start: startDate, end: endDate },
      statistics,
      violations,
      recommendations,
      complianceScore
    };
  }

  private calculateStatistics(events: AuditEvent[]) {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};
    let failures = 0;

    for (const event of events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

      // Count actors
      const actorKey = event.actor.id || event.actor.ipAddress;
      actorCounts[actorKey] = (actorCounts[actorKey] || 0) + 1;

      // Count resources
      const resourceKey = `${event.resource.type}:${event.resource.id || event.resource.name}`;
      resourceCounts[resourceKey] = (resourceCounts[resourceKey] || 0) + 1;

      // Count failures
      if (event.outcome === 'failure') {
        failures++;
      }
    }

    return {
      totalEvents: events.length,
      eventsByType: eventsByType as Record<AuditEventType, number>,
      eventsBySeverity: eventsBySeverity as Record<AuditSeverity, number>,
      failureRate: events.length > 0 ? failures / events.length : 0,
      topActors: Object.entries(actorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([actor, count]) => ({ actor, count })),
      topResources: Object.entries(resourceCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([resource, count]) => ({ resource, count }))
    };
  }

  private generateRecommendations(statistics: any, violations: AuditEvent[]): string[] {
    const recommendations: string[] = [];

    // High failure rate
    if (statistics.failureRate > 0.1) {
      recommendations.push('High failure rate detected. Review authentication and authorization mechanisms.');
    }

    // Too many security violations
    if (violations.length > statistics.totalEvents * 0.05) {
      recommendations.push('Elevated security violations detected. Implement additional security controls.');
    }

    // Suspicious actor activity
    for (const { actor, count } of statistics.topActors.slice(0, 3)) {
      if (count > statistics.totalEvents * 0.1) {
        recommendations.push(`Actor ${actor} shows unusually high activity. Consider investigation.`);
      }
    }

    // Low event volume might indicate logging gaps
    if (statistics.totalEvents < 1000) {
      recommendations.push('Low audit event volume. Verify logging coverage across all system components.');
    }

    return recommendations;
  }

  private calculateComplianceScore(statistics: any, violationCount: number, totalEvents: number): number {
    let score = 100;

    // Deduct for high failure rate
    score -= Math.min(30, statistics.failureRate * 100);

    // Deduct for security violations
    score -= Math.min(40, (violationCount / totalEvents) * 200);

    // Deduct for insufficient logging
    if (totalEvents < 100) {
      score -= 20;
    }

    return Math.max(0, Math.round(score));
  }
}

/**
 * Main Audit Logging Manager
 */
export class AuditLoggingManager {
  private static instance: AuditLoggingManager;
  private storage: AuditStorage;
  private logger: AuditLogger;
  private reporter: ComplianceReporter;
  private isEnabled = true;

  private constructor() {
    // Use memory storage by default, can be replaced with database storage
    this.storage = new MemoryAuditStorage();
    this.logger = new AuditLogger(this.storage);
    this.reporter = new ComplianceReporter(this.storage);
  }

  static getInstance(): AuditLoggingManager {
    if (!AuditLoggingManager.instance) {
      AuditLoggingManager.instance = new AuditLoggingManager();
    }
    return AuditLoggingManager.instance;
  }

  /**
   * Initialize audit logging
   */
  initialize(customStorage?: AuditStorage): void {
    if (customStorage) {
      this.storage = customStorage;
      this.logger = new AuditLogger(this.storage);
      this.reporter = new ComplianceReporter(this.storage);
    }

    console.log('Audit logging system initialized');
    
    // Set up periodic cleanup
    this.scheduleCleanup();
  }

  /**
   * Get audit logger
   */
  getLogger(): AuditLogger {
    return this.logger;
  }

  /**
   * Get compliance reporter
   */
  getReporter(): ComplianceReporter {
    return this.reporter;
  }

  /**
   * Get audit storage
   */
  getStorage(): AuditStorage {
    return this.storage;
  }

  /**
   * Query audit events
   */
  async query(filter: AuditFilter): Promise<AuditEvent[]> {
    return this.storage.query(filter);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    return this.reporter.generateReport(startDate, endDate);
  }

  /**
   * Archive old events
   */
  async archiveEvents(beforeDate: Date): Promise<number> {
    return this.storage.archive(beforeDate);
  }

  /**
   * Purge old events
   */
  async purgeEvents(beforeDate: Date): Promise<number> {
    return this.storage.purge(beforeDate);
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if audit logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Create audit middleware for Express
   */
  createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.isEnabled) return next();

      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      this.logger.setCorrelationId(correlationId);

      // Add audit context to request
      req.audit = {
        log: this.logger.log.bind(this.logger),
        logAuth: this.logger.logAuthentication.bind(this.logger),
        logFinancial: this.logger.logFinancialTransaction.bind(this.logger),
        logSecurity: this.logger.logSecurityViolation.bind(this.logger),
        logGame: this.logger.logGameAction.bind(this.logger)
      };

      next();
    };
  }

  private scheduleCleanup(): void {
    // Clean up old events every 24 hours
    setInterval(() => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.archiveEvents(thirtyDaysAgo).catch(console.error);

      // Purge very old events (older than 1 year)
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      this.purgeEvents(oneYearAgo).catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export convenience functions
export const auditLogger = AuditLoggingManager.getInstance();

export const initializeAuditLogging = (customStorage?: AuditStorage) => 
  auditLogger.initialize(customStorage);

export const logAuditEvent = (
  type: AuditEventType,
  action: string,
  actor: Partial<AuditActor>,
  resource: Partial<AuditResource>,
  outcome: AuditOutcome = 'success',
  details: Record<string, any> = {}
) => auditLogger.getLogger().log(type, action, actor, resource, outcome, details);

export const createAuditMiddleware = () => auditLogger.createExpressMiddleware();

export const generateComplianceReport = (startDate: Date, endDate: Date) =>
  auditLogger.generateComplianceReport(startDate, endDate);

// Export storage implementations
export { MemoryAuditStorage, DatabaseAuditStorage };

// Default export
export default AuditLoggingManager;