/**
 * Database Query Optimization and Performance Enhancement System
 * Implements intelligent query optimization, connection pooling, and monitoring
 */

// Types for database optimization
export interface DatabaseConfig {
  connectionPool: {
    min: number;
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
  };
  queryOptimization: {
    enableQueryCache: boolean;
    enablePreparedStatements: boolean;
    enableBatchOperations: boolean;
    slowQueryThreshold: number;
  };
  monitoring: {
    enableQueryLogging: boolean;
    enablePerformanceMetrics: boolean;
    metricsRetentionDays: number;
  };
  indexing: {
    autoCreateIndexes: boolean;
    analyzeQueryPatterns: boolean;
  };
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: number;
  parameters?: any[];
  result?: {
    rowCount: number;
    size: number;
  };
  connectionId?: string;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number;
  queryPattern: string;
}

export interface ConnectionPoolStats {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  created: number;
  destroyed: number;
  acquireCount: number;
  acquireSuccessCount: number;
  acquireFailCount: number;
  acquireTimeouts: number;
  avgAcquireTime: number;
  avgIdleTime: number;
}

/**
 * Query Cache for prepared statements and results
 */
class QueryCache {
  private cache = new Map<string, any>();
  private preparedStatements = new Map<string, any>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  getCachedResult(queryHash: string): any | null {
    const cached = this.cache.get(queryHash);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(queryHash);
      return null;
    }

    return cached.result;
  }

  setCachedResult(queryHash: string, result: any): void {
    // Implement LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(queryHash, {
      result,
      timestamp: Date.now()
    });
  }

  getPreparedStatement(queryHash: string): any | null {
    return this.preparedStatements.get(queryHash) || null;
  }

  setPreparedStatement(queryHash: string, statement: any): void {
    this.preparedStatements.set(queryHash, statement);
  }

  clear(): void {
    this.cache.clear();
    this.preparedStatements.clear();
  }

  getStats(): { cacheSize: number; preparedStatementsSize: number } {
    return {
      cacheSize: this.cache.size,
      preparedStatementsSize: this.preparedStatements.size
    };
  }
}

/**
 * Query Pattern Analyzer for index recommendations
 */
class QueryPatternAnalyzer {
  private queryPatterns = new Map<string, number>();
  private slowQueries: QueryMetrics[] = [];
  private tableAccess = new Map<string, { reads: number; writes: number; joins: string[] }>();

  recordQuery(metrics: QueryMetrics): void {
    const pattern = this.normalizeQuery(metrics.query);
    this.queryPatterns.set(pattern, (this.queryPatterns.get(pattern) || 0) + 1);

    // Track slow queries
    if (metrics.executionTime > 100) { // > 100ms
      this.slowQueries.push(metrics);
      if (this.slowQueries.length > 1000) {
        this.slowQueries.shift(); // Keep only recent slow queries
      }
    }

    // Analyze table access patterns
    this.analyzeTableAccess(metrics.query);
  }

  generateIndexRecommendations(): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    // Analyze frequent queries for missing indexes
    for (const [pattern, count] of this.queryPatterns) {
      if (count > 10) { // Query executed frequently
        const recommendation = this.analyzeQueryForIndexes(pattern, count);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    // Analyze slow queries
    for (const slowQuery of this.slowQueries) {
      const recommendation = this.analyzeSlowQueryForIndexes(slowQuery);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return this.deduplicateRecommendations(recommendations);
  }

  getQueryPatternStats(): Array<{ pattern: string; count: number }> {
    return Array.from(this.queryPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  private normalizeQuery(query: string): string {
    // Remove specific values and normalize query structure
    return query
      .toLowerCase()
      .replace(/\$\d+|\?/g, '?') // Replace parameter placeholders
      .replace(/\s+/g, ' ')
      .replace(/'\w+'|"\w+"/g, '?') // Replace string literals
      .replace(/\b\d+\b/g, '?') // Replace numeric literals
      .trim();
  }

  private analyzeTableAccess(query: string): void {
    const lowerQuery = query.toLowerCase();
    
    // Simple table name extraction (in a real implementation, use proper SQL parser)
    const selectMatch = lowerQuery.match(/from\s+(\w+)/);
    const insertMatch = lowerQuery.match(/insert\s+into\s+(\w+)/);
    const updateMatch = lowerQuery.match(/update\s+(\w+)/);
    const deleteMatch = lowerQuery.match(/delete\s+from\s+(\w+)/);

    const tableName = selectMatch?.[1] || insertMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1];
    
    if (tableName) {
      const access = this.tableAccess.get(tableName) || { reads: 0, writes: 0, joins: [] };
      
      if (lowerQuery.includes('select')) {
        access.reads++;
      } else if (lowerQuery.includes('insert') || lowerQuery.includes('update') || lowerQuery.includes('delete')) {
        access.writes++;
      }

      // Detect joins
      const joinMatch = lowerQuery.match(/join\s+(\w+)/g);
      if (joinMatch) {
        joinMatch.forEach(join => {
          const joinTable = join.match(/join\s+(\w+)/)?.[1];
          if (joinTable && !access.joins.includes(joinTable)) {
            access.joins.push(joinTable);
          }
        });
      }

      this.tableAccess.set(tableName, access);
    }
  }

  private analyzeQueryForIndexes(pattern: string, frequency: number): IndexRecommendation | null {
    // Analyze WHERE clauses for potential indexes
    const whereMatch = pattern.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/);
    if (!whereMatch) return null;

    const whereClause = whereMatch[1];
    const tableMatch = pattern.match(/from\s+(\w+)/);
    if (!tableMatch) return null;

    const tableName = tableMatch[1];
    
    // Extract column names from WHERE clause
    const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
    if (!columnMatches || columnMatches.length === 0) return null;

    const columns = columnMatches.map(match => match.replace(/\s*[=<>].*/, ''));

    return {
      table: tableName,
      columns,
      type: 'btree',
      reason: `Frequent query pattern (${frequency} executions) with WHERE clause filtering`,
      estimatedImprovement: Math.min(frequency * 0.1, 90), // Estimated percentage improvement
      queryPattern: pattern
    };
  }

  private analyzeSlowQueryForIndexes(metrics: QueryMetrics): IndexRecommendation | null {
    const pattern = this.normalizeQuery(metrics.query);
    
    // Focus on SELECT queries that are slow
    if (!pattern.includes('select')) return null;

    const tableMatch = pattern.match(/from\s+(\w+)/);
    if (!tableMatch) return null;

    const tableName = tableMatch[1];
    
    // Look for ORDER BY clauses that might benefit from indexes
    const orderByMatch = pattern.match(/order\s+by\s+(\w+)/);
    if (orderByMatch) {
      return {
        table: tableName,
        columns: [orderByMatch[1]],
        type: 'btree',
        reason: `Slow query (${metrics.executionTime}ms) with ORDER BY clause`,
        estimatedImprovement: 70,
        queryPattern: pattern
      };
    }

    return null;
  }

  private deduplicateRecommendations(recommendations: IndexRecommendation[]): IndexRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.table}:${rec.columns.sort().join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * Database Performance Monitor
 */
class DatabasePerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private connectionStats = new Map<string, any>();
  private alertThresholds = {
    slowQueryMs: 1000,
    connectionPoolUtilization: 0.8,
    deadlockCount: 5
  };

  recordQueryMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 24 hours)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > dayAgo);

    // Check for alerts
    this.checkForAlerts(metrics);
  }

  recordConnectionStats(connectionId: string, stats: any): void {
    this.connectionStats.set(connectionId, {
      ...stats,
      timestamp: Date.now()
    });
  }

  getPerformanceSummary(): {
    totalQueries: number;
    avgExecutionTime: number;
    slowQueries: number;
    mostExpensive: QueryMetrics[];
    queryTypeDistribution: Record<string, number>;
  } {
    const totalQueries = this.metrics.length;
    const avgExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const slowQueries = this.metrics.filter(m => m.executionTime > this.alertThresholds.slowQueryMs).length;
    
    // Get most expensive queries
    const mostExpensive = [...this.metrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Query type distribution
    const queryTypeDistribution: Record<string, number> = {};
    this.metrics.forEach(m => {
      const type = m.query.trim().split(' ')[0].toUpperCase();
      queryTypeDistribution[type] = (queryTypeDistribution[type] || 0) + 1;
    });

    return {
      totalQueries,
      avgExecutionTime,
      slowQueries,
      mostExpensive,
      queryTypeDistribution
    };
  }

  private checkForAlerts(metrics: QueryMetrics): void {
    // Slow query alert
    if (metrics.executionTime > this.alertThresholds.slowQueryMs) {
      this.sendAlert('slow_query', {
        query: metrics.query,
        executionTime: metrics.executionTime,
        threshold: this.alertThresholds.slowQueryMs
      });
    }
  }

  private sendAlert(type: string, data: any): void {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.warn(`Database Alert [${type}]:`, data);
  }
}

/**
 * Main Database Optimizer
 */
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private config: DatabaseConfig;
  private queryCache: QueryCache;
  private patternAnalyzer: QueryPatternAnalyzer;
  private performanceMonitor: DatabasePerformanceMonitor;
  private batchOperations = new Map<string, any[]>();

  private constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      connectionPool: {
        min: 2,
        max: 10,
        acquireTimeoutMs: 30000,
        idleTimeoutMs: 30000,
        ...config.connectionPool
      },
      queryOptimization: {
        enableQueryCache: true,
        enablePreparedStatements: true,
        enableBatchOperations: true,
        slowQueryThreshold: 1000,
        ...config.queryOptimization
      },
      monitoring: {
        enableQueryLogging: true,
        enablePerformanceMetrics: true,
        metricsRetentionDays: 7,
        ...config.monitoring
      },
      indexing: {
        autoCreateIndexes: false,
        analyzeQueryPatterns: true,
        ...config.indexing
      }
    };

    this.queryCache = new QueryCache();
    this.patternAnalyzer = new QueryPatternAnalyzer();
    this.performanceMonitor = new DatabasePerformanceMonitor();
  }

  static getInstance(config?: Partial<DatabaseConfig>): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer(config);
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Optimized query execution with caching and monitoring
   */
  async executeQuery<T = any>(
    query: string, 
    parameters: any[] = [],
    options: {
      useCache?: boolean;
      usePreparedStatement?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const queryHash = this.hashQuery(query, parameters);
    
    // Check cache first if enabled
    if (this.config.queryOptimization.enableQueryCache && options.useCache !== false) {
      const cachedResult = this.queryCache.getCachedResult(queryHash);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      let result: T[];

      // Use prepared statement if enabled
      if (this.config.queryOptimization.enablePreparedStatements && options.usePreparedStatement !== false) {
        result = await this.executePreparedStatement<T>(query, parameters, queryHash);
      } else {
        result = await this.executeDirectQuery<T>(query, parameters);
      }

      const executionTime = Date.now() - startTime;

      // Record metrics
      const metrics: QueryMetrics = {
        query,
        executionTime,
        timestamp: startTime,
        parameters,
        result: {
          rowCount: result.length,
          size: JSON.stringify(result).length
        }
      };

      if (this.config.monitoring.enablePerformanceMetrics) {
        this.performanceMonitor.recordQueryMetrics(metrics);
      }

      if (this.config.indexing.analyzeQueryPatterns) {
        this.patternAnalyzer.recordQuery(metrics);
      }

      // Cache the result if cacheable
      if (this.shouldCacheResult(query, executionTime)) {
        this.queryCache.setCachedResult(queryHash, result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record failed query metrics
      if (this.config.monitoring.enableQueryLogging) {
        console.error('Query execution failed:', {
          query,
          parameters,
          executionTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw error;
    }
  }

  /**
   * Batch operation optimizer
   */
  async executeBatch(
    queries: Array<{ query: string; parameters?: any[] }>,
    options: { transaction?: boolean } = {}
  ): Promise<any[]> {
    if (!this.config.queryOptimization.enableBatchOperations) {
      // Execute queries sequentially if batch is disabled
      const results = [];
      for (const { query, parameters = [] } of queries) {
        results.push(await this.executeQuery(query, parameters));
      }
      return results;
    }

    // Group similar queries for batch optimization
    const batchGroups = this.groupQueriesForBatch(queries);
    const results: any[] = [];

    for (const group of batchGroups) {
      if (group.length === 1) {
        // Single query, execute normally
        const { query, parameters = [] } = group[0];
        results.push(await this.executeQuery(query, parameters));
      } else {
        // Multiple similar queries, execute as batch
        results.push(...await this.executeBatchGroup(group, options.transaction));
      }
    }

    return results;
  }

  /**
   * Get index recommendations based on query patterns
   */
  getIndexRecommendations(): IndexRecommendation[] {
    return this.patternAnalyzer.generateIndexRecommendations();
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(): {
    queries: ReturnType<DatabasePerformanceMonitor['getPerformanceSummary']>;
    cache: ReturnType<QueryCache['getStats']>;
    patterns: ReturnType<QueryPatternAnalyzer['getQueryPatternStats']>;
  } {
    return {
      queries: this.performanceMonitor.getPerformanceSummary(),
      cache: this.queryCache.getStats(),
      patterns: this.patternAnalyzer.getQueryPatternStats()
    };
  }

  /**
   * Clear all caches and reset statistics
   */
  reset(): void {
    this.queryCache.clear();
    // Reset other components as needed
  }

  private async executePreparedStatement<T>(
    query: string, 
    parameters: any[], 
    queryHash: string
  ): Promise<T[]> {
    let preparedStatement = this.queryCache.getPreparedStatement(queryHash);
    
    if (!preparedStatement) {
      // In a real implementation, prepare the statement using your database driver
      preparedStatement = { query, prepared: true };
      this.queryCache.setPreparedStatement(queryHash, preparedStatement);
    }

    // Execute prepared statement (mock implementation)
    return this.executeDirectQuery<T>(query, parameters);
  }

  private async executeDirectQuery<T>(query: string, parameters: any[]): Promise<T[]> {
    // Mock implementation - replace with actual database execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    
    // Return mock result
    return [] as T[];
  }

  private groupQueriesForBatch(queries: Array<{ query: string; parameters?: any[] }>): Array<Array<{ query: string; parameters?: any[] }>> {
    const groups: Record<string, Array<{ query: string; parameters?: any[] }>> = {};
    
    for (const queryObj of queries) {
      const pattern = this.normalizeQueryForBatching(queryObj.query);
      if (!groups[pattern]) {
        groups[pattern] = [];
      }
      groups[pattern].push(queryObj);
    }

    return Object.values(groups);
  }

  private async executeBatchGroup(
    group: Array<{ query: string; parameters?: any[] }>,
    useTransaction?: boolean
  ): Promise<any[]> {
    // Mock batch execution
    const results = [];
    for (const { query, parameters = [] } of group) {
      results.push(await this.executeDirectQuery(query, parameters));
    }
    return results;
  }

  private normalizeQueryForBatching(query: string): string {
    // Normalize query for batching (remove specific parameters)
    return query
      .toLowerCase()
      .replace(/\$\d+|\?/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hashQuery(query: string, parameters: any[]): string {
    // Simple hash function for cache keys
    const queryString = query + JSON.stringify(parameters);
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private shouldCacheResult(query: string, executionTime: number): boolean {
    // Cache read queries that took significant time
    const isReadQuery = /^select/i.test(query.trim());
    const isExpensiveQuery = executionTime > 50; // Cache queries > 50ms
    
    return isReadQuery && isExpensiveQuery;
  }
}

// Export convenience function
export const createDatabaseOptimizer = (config?: Partial<DatabaseConfig>) => 
  DatabaseOptimizer.getInstance(config);

// Export for connection pool configuration
export const createConnectionPoolConfig = (config: Partial<DatabaseConfig['connectionPool']> = {}) => ({
  min: 2,
  max: 10,
  acquireTimeoutMs: 30000,
  idleTimeoutMs: 30000,
  ...config
});

// Default export
export default DatabaseOptimizer;