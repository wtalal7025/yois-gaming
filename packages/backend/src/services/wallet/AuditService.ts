/**
 * Audit Service
 * Handles comprehensive logging of all financial and security operations
 * for compliance, monitoring, and forensic analysis
 */

// Reason: Interface for database operations, will be implemented with actual DB later
interface AuditRepository {
  logAuthenticationEvent(
    userId: string,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void>

  logSecurityEvent(
    userId: string | null,
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): Promise<void>

  logWalletOperation(
    userId: string,
    operation: string,
    amount?: number,
    transactionId?: string,
    metadata?: Record<string, any>
  ): Promise<void>

  logBalanceChange(
    userId: string,
    action: string,
    amount: number,
    transactionId: string,
    oldBalance?: number,
    newBalance?: number,
    metadata?: Record<string, any>
  ): Promise<void>

  logGameEvent(
    userId: string,
    gameId: string,
    event: string,
    amount?: number,
    metadata?: Record<string, any>
  ): Promise<void>

  logError(
    userId: string | null,
    error: string,
    level: 'warning' | 'error' | 'critical',
    metadata?: Record<string, any>
  ): Promise<void>

  logSystemEvent(
    event: string,
    level: 'info' | 'warning' | 'error',
    metadata?: Record<string, any>
  ): Promise<void>

  searchAuditLogs(
    filters: AuditLogFilter
  ): Promise<AuditLogEntry[]>
}

interface AuditLogFilter {
  userId?: string
  startDate?: Date
  endDate?: Date
  eventType?: string
  severity?: string
  limit?: number
  offset?: number
}

interface AuditLogEntry {
  id: string
  userId?: string
  timestamp: Date
  eventType: string
  action: string
  severity: string
  success?: boolean
  amount?: number
  transactionId?: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export class AuditService {
  private auditRepository: AuditRepository

  constructor(auditRepository: AuditRepository) {
    this.auditRepository = auditRepository
  }

  /**
   * Log authentication events (login, logout, registration, etc.)
   * @param userId - User ID
   * @param action - Authentication action performed
   * @param success - Whether the action was successful
   * @param metadata - Additional context data
   */
  async logAuthentication(
    userId: string,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logAuthenticationEvent(userId, action, success, {
        timestamp: new Date().toISOString(),
        ...metadata
      })
    } catch (error) {
      // Reason: Audit logging failures should not break main operations
      console.error('Failed to log authentication event:', error)
    }
  }

  /**
   * Log security-related events
   * @param userId - User ID (null for system events)
   * @param event - Security event description
   * @param metadata - Additional context data
   */
  async logSecurityEvent(
    userId: string | null,
    event: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Determine severity based on event type
      const severity = this.determineSeverity(event)

      await this.auditRepository.logSecurityEvent(userId, event, severity, {
        timestamp: new Date().toISOString(),
        ...metadata
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Log wallet operations (deposits, withdrawals, transfers)
   * @param userId - User ID
   * @param operation - Operation performed
   * @param metadata - Additional context data
   */
  async logWalletOperation(
    userId: string,
    operation: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logWalletOperation(
        userId,
        operation,
        metadata?.amount,
        metadata?.transactionId,
        {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      )
    } catch (error) {
      console.error('Failed to log wallet operation:', error)
    }
  }

  /**
   * Log balance changes with before/after amounts
   * @param userId - User ID
   * @param action - Action that caused balance change
   * @param amount - Amount of change
   * @param transactionId - Associated transaction ID
   * @param metadata - Additional context data
   */
  async logBalanceChange(
    userId: string,
    action: string,
    amount: number,
    transactionId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logBalanceChange(
        userId,
        action,
        amount,
        transactionId,
        metadata?.oldBalance,
        metadata?.newBalance,
        {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      )
    } catch (error) {
      console.error('Failed to log balance change:', error)
    }
  }

  /**
   * Log game-related events (bets, wins, losses)
   * @param userId - User ID
   * @param gameId - Game identifier
   * @param event - Game event description
   * @param amount - Associated amount (bet/win)
   * @param metadata - Additional context data
   */
  async logGameEvent(
    userId: string,
    gameId: string,
    event: string,
    amount?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logGameEvent(userId, gameId, event, amount, {
        timestamp: new Date().toISOString(),
        ...metadata
      })
    } catch (error) {
      console.error('Failed to log game event:', error)
    }
  }

  /**
   * Log errors and exceptions
   * @param userId - User ID (null for system errors)
   * @param error - Error description
   * @param metadata - Additional context data
   */
  async logError(
    userId: string | null,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Determine error level based on error type
      const level = this.determineErrorLevel(error)

      await this.auditRepository.logError(userId, error, level, {
        timestamp: new Date().toISOString(),
        ...metadata
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  /**
   * Log system-level events
   * @param event - System event description
   * @param level - Event severity level
   * @param metadata - Additional context data
   */
  async logSystemEvent(
    event: string,
    level: 'info' | 'warning' | 'error' = 'info',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logSystemEvent(event, level, {
        timestamp: new Date().toISOString(),
        ...metadata
      })
    } catch (error) {
      console.error('Failed to log system event:', error)
    }
  }

  /**
   * Search audit logs with filters
   * @param filters - Search criteria
   * @returns Promise with matching audit log entries
   */
  async searchAuditLogs(filters: AuditLogFilter): Promise<AuditLogEntry[]> {
    try {
      // Set default limits to prevent excessive data retrieval
      const searchFilters: AuditLogFilter = {
        ...filters,
        limit: filters.limit && filters.limit <= 1000 ? filters.limit : 100,
        offset: filters.offset || 0
      }

      return await this.auditRepository.searchAuditLogs(searchFilters)
    } catch (error) {
      console.error('Failed to search audit logs:', error)
      throw new Error('Failed to search audit logs')
    }
  }

  /**
   * Log suspicious activity patterns
   * @param userId - User ID
   * @param pattern - Suspicious pattern detected
   * @param riskScore - Risk score (0-100)
   * @param metadata - Additional context data
   */
  async logSuspiciousActivity(
    userId: string,
    pattern: string,
    riskScore: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const severity = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : 'medium'

      await this.auditRepository.logSecurityEvent(
        userId,
        `suspicious_activity: ${pattern}`,
        severity,
        {
          timestamp: new Date().toISOString(),
          riskScore,
          pattern,
          ...metadata
        }
      )
    } catch (error) {
      console.error('Failed to log suspicious activity:', error)
    }
  }

  /**
   * Log compliance events for regulatory requirements
   * @param userId - User ID
   * @param complianceEvent - Compliance event type
   * @param details - Event details
   * @param metadata - Additional context data
   */
  async logComplianceEvent(
    userId: string,
    complianceEvent: string,
    details: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.auditRepository.logSecurityEvent(
        userId,
        `compliance: ${complianceEvent}`,
        'medium',
        {
          timestamp: new Date().toISOString(),
          complianceEvent,
          details,
          ...metadata
        }
      )
    } catch (error) {
      console.error('Failed to log compliance event:', error)
    }
  }

  /**
   * Batch log multiple events efficiently
   * @param events - Array of events to log
   */
  async batchLogEvents(events: Array<{
    type: 'auth' | 'security' | 'wallet' | 'balance' | 'game' | 'error' | 'system'
    data: any
  }>): Promise<void> {
    // Process events in parallel but catch individual failures
    const promises = events.map(async (event) => {
      try {
        switch (event.type) {
          case 'auth':
            await this.logAuthentication(
              event.data.userId,
              event.data.action,
              event.data.success,
              event.data.metadata
            )
            break
          case 'security':
            await this.logSecurityEvent(
              event.data.userId,
              event.data.event,
              event.data.metadata
            )
            break
          case 'wallet':
            await this.logWalletOperation(
              event.data.userId,
              event.data.operation,
              event.data.metadata
            )
            break
          case 'balance':
            await this.logBalanceChange(
              event.data.userId,
              event.data.action,
              event.data.amount,
              event.data.transactionId,
              event.data.metadata
            )
            break
          case 'game':
            await this.logGameEvent(
              event.data.userId,
              event.data.gameId,
              event.data.event,
              event.data.amount,
              event.data.metadata
            )
            break
          case 'error':
            await this.logError(
              event.data.userId,
              event.data.error,
              event.data.metadata
            )
            break
          case 'system':
            await this.logSystemEvent(
              event.data.event,
              event.data.level,
              event.data.metadata
            )
            break
        }
      } catch (error) {
        console.error(`Failed to log ${event.type} event:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Determine severity level based on security event type
   * @param event - Security event description
   * @returns Severity level
   */
  private determineSeverity(event: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalEvents = ['account_takeover', 'unauthorized_access', 'data_breach']
    const highEvents = ['multiple_failed_logins', 'suspicious_activity', 'fraud_detected']
    const mediumEvents = ['failed_login', 'password_change', 'unusual_transaction']

    if (criticalEvents.some(e => event.includes(e))) return 'critical'
    if (highEvents.some(e => event.includes(e))) return 'high'
    if (mediumEvents.some(e => event.includes(e))) return 'medium'
    return 'low'
  }

  /**
   * Determine error level based on error type
   * @param error - Error description
   * @returns Error level
   */
  private determineErrorLevel(error: string): 'warning' | 'error' | 'critical' {
    const criticalErrors = ['database_connection_lost', 'payment_system_down', 'security_breach']
    const errors = ['transaction_failed', 'balance_error', 'authentication_error']

    if (criticalErrors.some(e => error.includes(e))) return 'critical'
    if (errors.some(e => error.includes(e))) return 'error'
    return 'warning'
  }
}