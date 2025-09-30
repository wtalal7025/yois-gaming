/**
 * Advanced Rate Limiting and DDoS Protection System
 * Provides comprehensive rate limiting, traffic analysis, and attack mitigation
 */

// Types for rate limiting
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
  skipSuccessful?: boolean;
  skipFailed?: boolean;
  onLimitReached?: (request: any, response: any) => void;
  store?: RateLimitStore;
  headers?: boolean;
  message?: string | object;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitRule {
  id: string;
  path?: string;
  method?: string;
  userType?: 'anonymous' | 'authenticated' | 'premium';
  windowMs: number;
  maxRequests: number;
  priority: number;
  skipCondition?: (request: any) => boolean;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  resetTime: number;
  firstRequest: number;
  isBlocked: boolean;
  blockExpires?: number;
}

export interface AttackPattern {
  type: 'brute_force' | 'ddos' | 'scraping' | 'api_abuse';
  threshold: number;
  timeWindow: number;
  action: 'block' | 'challenge' | 'slow_down';
  duration: number;
  score: number;
}

export interface TrafficAnalysis {
  timestamp: number;
  requests: number;
  uniqueIPs: number;
  suspiciousActivity: SuspiciousActivity[];
  attacksDetected: DetectedAttack[];
  topEndpoints: EndpointStats[];
  topUserAgents: string[];
  geolocation: Record<string, number>;
}

export interface SuspiciousActivity {
  type: 'high_frequency' | 'unusual_pattern' | 'bot_behavior';
  ip: string;
  score: number;
  details: Record<string, any>;
}

export interface DetectedAttack {
  type: AttackPattern['type'];
  source: string;
  startTime: number;
  endTime?: number;
  requestCount: number;
  isActive: boolean;
  mitigation: string[];
}

export interface EndpointStats {
  path: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
  uniqueUsers: number;
}

/**
 * Rate Limit Store Interface
 */
export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  increment(key: string): Promise<RateLimitEntry>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * In-Memory Rate Limit Store
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: any = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (entry.resetTime < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string): Promise<RateLimitEntry> {
    const existing = await this.get(key);
    const now = Date.now();

    if (existing) {
      existing.count++;
      return existing;
    }

    const newEntry: RateLimitEntry = {
      key,
      count: 1,
      resetTime: now + (60 * 1000), // Default 1 minute window
      firstRequest: now,
      isBlocked: false
    };

    await this.set(key, newEntry);
    return newEntry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys = Array.from(this.store.entries())
      .filter(([, entry]) => entry.resetTime < now)
      .map(([key]) => key);

    expiredKeys.forEach(key => this.store.delete(key));
    
    console.log(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  // Get store statistics
  getStats(): { size: number; entries: Array<{ key: string; count: number; resetTime: number }> } {
    return {
      size: this.store.size,
      entries: Array.from(this.store.entries()).map(([key, entry]) => ({
        key,
        count: entry.count,
        resetTime: entry.resetTime
      }))
    };
  }
}

/**
 * Attack Detection Engine
 */
class AttackDetectionEngine {
  private patterns: AttackPattern[] = [];
  private detectedAttacks = new Map<string, DetectedAttack>();
  private trafficHistory: TrafficAnalysis[] = [];
  private suspiciousIPs = new Set<string>();

  constructor() {
    this.initializeDefaultPatterns();
    this.startPeriodicAnalysis();
  }

  /**
   * Analyze request for attack patterns
   */
  analyzeRequest(request: any, rateLimitEntry?: RateLimitEntry): SuspiciousActivity[] {
    const suspicious: SuspiciousActivity[] = [];
    const ip = this.getClientIP(request);
    const userAgent = request.headers['user-agent'] || '';

    // High frequency requests
    if (rateLimitEntry && rateLimitEntry.count > 100) {
      suspicious.push({
        type: 'high_frequency',
        ip,
        score: Math.min(rateLimitEntry.count / 10, 100),
        details: {
          requestCount: rateLimitEntry.count,
          timeWindow: Date.now() - rateLimitEntry.firstRequest
        }
      });
    }

    // Bot behavior detection
    if (this.detectBotBehavior(userAgent, request)) {
      suspicious.push({
        type: 'bot_behavior',
        ip,
        score: 70,
        details: {
          userAgent,
          reason: 'Automated request pattern detected'
        }
      });
    }

    // Unusual patterns
    if (this.detectUnusualPatterns(request, ip)) {
      suspicious.push({
        type: 'unusual_pattern',
        ip,
        score: 50,
        details: {
          pattern: 'Sequential endpoint scanning'
        }
      });
    }

    return suspicious;
  }

  /**
   * Check if IP should be blocked
   */
  shouldBlock(ip: string, suspicious: SuspiciousActivity[]): boolean {
    // Calculate total suspicion score
    const totalScore = suspicious.reduce((sum, activity) => sum + activity.score, 0);
    
    if (totalScore > 150) {
      this.suspiciousIPs.add(ip);
      return true;
    }

    return this.suspiciousIPs.has(ip);
  }

  /**
   * Record attack detection
   */
  recordAttack(type: AttackPattern['type'], source: string, requestCount = 1): void {
    const key = `${type}:${source}`;
    const existing = this.detectedAttacks.get(key);

    if (existing && existing.isActive) {
      existing.requestCount += requestCount;
      existing.endTime = Date.now();
    } else {
      this.detectedAttacks.set(key, {
        type,
        source,
        startTime: Date.now(),
        requestCount,
        isActive: true,
        mitigation: this.getMitigationStrategies(type)
      });
    }
  }

  /**
   * Get current traffic analysis
   */
  getCurrentTrafficAnalysis(): TrafficAnalysis {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return {
      timestamp: now,
      requests: 0, // Would be populated from actual traffic data
      uniqueIPs: 0,
      suspiciousActivity: [],
      attacksDetected: Array.from(this.detectedAttacks.values()).filter(a => a.isActive),
      topEndpoints: [],
      topUserAgents: [],
      geolocation: {}
    };
  }

  /**
   * Get detected attacks
   */
  getDetectedAttacks(): DetectedAttack[] {
    return Array.from(this.detectedAttacks.values()).filter(a => a.isActive);
  }

  /**
   * Clear attack detection for IP
   */
  clearAttackDetection(ip: string): void {
    this.suspiciousIPs.delete(ip);
    const keysToDelete = Array.from(this.detectedAttacks.keys())
      .filter(key => key.includes(ip));
    
    keysToDelete.forEach(key => this.detectedAttacks.delete(key));
  }

  private initializeDefaultPatterns(): void {
    this.patterns = [
      {
        type: 'brute_force',
        threshold: 20,
        timeWindow: 60000, // 1 minute
        action: 'block',
        duration: 300000, // 5 minutes
        score: 90
      },
      {
        type: 'ddos',
        threshold: 1000,
        timeWindow: 60000,
        action: 'challenge',
        duration: 600000, // 10 minutes
        score: 95
      },
      {
        type: 'scraping',
        threshold: 100,
        timeWindow: 300000, // 5 minutes
        action: 'slow_down',
        duration: 300000,
        score: 60
      },
      {
        type: 'api_abuse',
        threshold: 500,
        timeWindow: 300000,
        action: 'block',
        duration: 900000, // 15 minutes
        score: 80
      }
    ];
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 5 minutes
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 5 * 60 * 1000);
  }

  private performPeriodicAnalysis(): void {
    // Deactivate old attacks
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
    
    for (const [key, attack] of this.detectedAttacks.entries()) {
      if (attack.startTime < cutoffTime) {
        attack.isActive = false;
      }
    }

    // Clear old suspicious IPs
    // In a real implementation, you'd have timestamps for suspicious IPs
    if (this.suspiciousIPs.size > 1000) {
      this.suspiciousIPs.clear();
    }
  }

  private detectBotBehavior(userAgent: string, request: any): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];

    // Check user agent
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      return true;
    }

    // Check for missing common headers
    const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
    const missingHeaders = commonHeaders.filter(header => !request.headers[header]);
    
    return missingHeaders.length > 1;
  }

  private detectUnusualPatterns(request: any, ip: string): boolean {
    // This would typically analyze historical data
    // For now, return false - would need more sophisticated analysis
    return false;
  }

  private getClientIP(request: any): string {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.headers['x-forwarded-for']?.split(',')[0] || 
           'unknown';
  }

  private getMitigationStrategies(type: AttackPattern['type']): string[] {
    const strategies: Record<AttackPattern['type'], string[]> = {
      brute_force: ['IP blocking', 'Account lockout', 'CAPTCHA challenge'],
      ddos: ['Rate limiting', 'Traffic filtering', 'Load balancing'],
      scraping: ['Bot detection', 'Request throttling', 'CAPTCHA'],
      api_abuse: ['API key validation', 'Usage quotas', 'Request signing']
    };

    return strategies[type] || ['Rate limiting'];
  }
}

/**
 * Rate Limiting Middleware
 */
class RateLimitingMiddleware {
  private rules: RateLimitRule[] = [];
  private store: RateLimitStore;
  private attackDetector: AttackDetectionEngine;
  private defaultConfig: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.defaultConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      headers: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Too many requests, please try again later.',
      ...config
    };

    this.store = config.store || new MemoryRateLimitStore();
    this.attackDetector = new AttackDetectionEngine();
    
    this.initializeDefaultRules();
  }

  /**
   * Add rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove rate limiting rule
   */
  removeRule(ruleId: string): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index > -1) {
      this.rules.splice(index, 1);
    }
  }

  /**
   * Express middleware
   */
  express() {
    return async (req: any, res: any, next: any) => {
      try {
        const result = await this.processRequest(req, res);
        
        if (result.blocked) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: result.message,
            retryAfter: result.retryAfter
          });
        }

        // Add rate limit headers
        if (this.defaultConfig.headers) {
          this.setRateLimitHeaders(res, result);
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Fastify plugin
   */
  fastify() {
    return async (fastify: any) => {
      fastify.addHook('onRequest', async (request: any, reply: any) => {
        const result = await this.processRequest(request, reply);
        
        if (result.blocked) {
          reply.code(429).send({
            error: 'Rate limit exceeded',
            message: result.message,
            retryAfter: result.retryAfter
          });
          return;
        }

        // Add rate limit headers
        if (this.defaultConfig.headers) {
          this.setRateLimitHeaders(reply, result);
        }
      });
    };
  }

  /**
   * Process request for rate limiting
   */
  async processRequest(request: any, response?: any): Promise<{
    blocked: boolean;
    message?: string;
    retryAfter?: number;
    remaining?: number;
    limit?: number;
    resetTime?: number;
  }> {
    const applicableRule = this.findApplicableRule(request);
    if (!applicableRule) {
      return { blocked: false };
    }

    const key = this.generateKey(request, applicableRule);
    const entry = await this.store.increment(key);
    
    // Set reset time based on rule
    if (entry.resetTime === entry.firstRequest + 60000) { // Default was applied
      entry.resetTime = entry.firstRequest + applicableRule.windowMs;
      await this.store.set(key, entry);
    }

    // Analyze for attack patterns
    const suspiciousActivity = this.attackDetector.analyzeRequest(request, entry);
    const shouldBlock = this.attackDetector.shouldBlock(this.getClientIP(request), suspiciousActivity);

    // Check if limit exceeded or IP should be blocked
    const limitExceeded = entry.count > applicableRule.maxRequests;
    
    if (limitExceeded || shouldBlock) {
      if (shouldBlock) {
        this.attackDetector.recordAttack('brute_force', this.getClientIP(request));
      }

      entry.isBlocked = true;
      entry.blockExpires = Date.now() + 300000; // 5 minute block
      await this.store.set(key, entry);

      return {
        blocked: true,
        message: this.defaultConfig.message as string,
        retryAfter: Math.ceil((entry.resetTime - Date.now()) / 1000),
        remaining: 0,
        limit: applicableRule.maxRequests,
        resetTime: entry.resetTime
      };
    }

    return {
      blocked: false,
      remaining: Math.max(0, applicableRule.maxRequests - entry.count),
      limit: applicableRule.maxRequests,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(): Promise<{
    rules: RateLimitRule[];
    storeStats: any;
    attacks: DetectedAttack[];
    traffic: TrafficAnalysis;
  }> {
    return {
      rules: this.rules,
      storeStats: (this.store as MemoryRateLimitStore).getStats?.() || {},
      attacks: this.attackDetector.getDetectedAttacks(),
      traffic: this.attackDetector.getCurrentTrafficAnalysis()
    };
  }

  /**
   * Reset rate limit for specific key
   */
  async resetRateLimit(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Clear attack detection for IP
   */
  clearAttackDetection(ip: string): void {
    this.attackDetector.clearAttackDetection(ip);
  }

  private initializeDefaultRules(): void {
    // General API rate limit
    this.addRule({
      id: 'api-general',
      path: '/api/*',
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      priority: 1
    });

    // Authentication endpoints - stricter limits
    this.addRule({
      id: 'auth-login',
      path: '/api/auth/login',
      method: 'POST',
      windowMs: 300000, // 5 minutes
      maxRequests: 5,
      priority: 10
    });

    // Game endpoints - moderate limits
    this.addRule({
      id: 'games-play',
      path: '/api/games/*',
      userType: 'authenticated',
      windowMs: 60000,
      maxRequests: 200,
      priority: 5
    });

    // Public endpoints - generous limits
    this.addRule({
      id: 'public-general',
      userType: 'anonymous',
      windowMs: 60000,
      maxRequests: 50,
      priority: 1
    });
  }

  private findApplicableRule(request: any): RateLimitRule | null {
    for (const rule of this.rules) {
      if (this.matchesRule(request, rule)) {
        return rule;
      }
    }
    return null;
  }

  private matchesRule(request: any, rule: RateLimitRule): boolean {
    // Check path pattern
    if (rule.path && !this.matchesPath(request.path || request.url, rule.path)) {
      return false;
    }

    // Check HTTP method
    if (rule.method && request.method !== rule.method) {
      return false;
    }

    // Check user type
    if (rule.userType) {
      const isAuthenticated = !!(request.user || request.headers.authorization);
      if (rule.userType === 'authenticated' && !isAuthenticated) {
        return false;
      }
      if (rule.userType === 'anonymous' && isAuthenticated) {
        return false;
      }
    }

    // Check skip condition
    if (rule.skipCondition && rule.skipCondition(request)) {
      return false;
    }

    return true;
  }

  private matchesPath(requestPath: string, rulePath: string): boolean {
    if (rulePath === '*') return true;
    if (rulePath.endsWith('*')) {
      const prefix = rulePath.slice(0, -1);
      return requestPath.startsWith(prefix);
    }
    return requestPath === rulePath;
  }

  private generateKey(request: any, rule: RateLimitRule): string {
    const keyParts = [rule.id];

    if (this.defaultConfig.keyGenerator) {
      keyParts.push(this.defaultConfig.keyGenerator(request));
    } else {
      // Default key generation
      const ip = this.getClientIP(request);
      keyParts.push(ip);

      // Include user ID if authenticated
      if (request.user?.id) {
        keyParts.push(`user:${request.user.id}`);
      }
    }

    return keyParts.join(':');
  }

  private getClientIP(request: any): string {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.headers['x-forwarded-for']?.split(',')[0] || 
           'unknown';
  }

  private setRateLimitHeaders(response: any, result: any): void {
    if (this.defaultConfig.standardHeaders) {
      // Standard rate limiting headers
      response.header?.('RateLimit-Limit', result.limit);
      response.header?.('RateLimit-Remaining', result.remaining);
      response.header?.('RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }

    if (this.defaultConfig.legacyHeaders) {
      // Legacy headers
      response.header?.('X-RateLimit-Limit', result.limit);
      response.header?.('X-RateLimit-Remaining', result.remaining);
      response.header?.('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }

    if (result.blocked && result.retryAfter) {
      response.header?.('Retry-After', result.retryAfter);
    }
  }
}

/**
 * Main Rate Limiting Manager
 */
export class RateLimitManager {
  private static instance: RateLimitManager;
  private middleware: RateLimitingMiddleware;
  private isEnabled = true;

  private constructor() {
    this.middleware = new RateLimitingMiddleware();
  }

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Initialize rate limiting
   */
  initialize(config?: Partial<RateLimitConfig>): void {
    console.log('Initializing rate limiting and DDoS protection...');
    
    if (config) {
      this.middleware = new RateLimitingMiddleware(config);
    }
    
    console.log('Rate limiting and DDoS protection initialized');
  }

  /**
   * Get middleware instance
   */
  getMiddleware(): RateLimitingMiddleware {
    return this.middleware;
  }

  /**
   * Add custom rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.middleware.addRule(rule);
  }

  /**
   * Remove rate limiting rule
   */
  removeRule(ruleId: string): void {
    this.middleware.removeRule(ruleId);
  }

  /**
   * Get current statistics
   */
  async getStatistics(): Promise<any> {
    return await this.middleware.getStatistics();
  }

  /**
   * Enable/disable rate limiting
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if rate limiting is enabled
   */
  isRateLimitingEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export convenience functions
export const rateLimitManager = RateLimitManager.getInstance();

export const initializeRateLimiting = (config?: Partial<RateLimitConfig>) =>
  rateLimitManager.initialize(config);

export const createRateLimitMiddleware = (config?: Partial<RateLimitConfig>) =>
  new RateLimitingMiddleware(config);

export const addRateLimitRule = (rule: RateLimitRule) =>
  rateLimitManager.addRule(rule);

export const getRateLimitStatistics = () =>
  rateLimitManager.getStatistics();

// Default export
export default RateLimitManager;