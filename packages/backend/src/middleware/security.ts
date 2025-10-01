/**
 * Security Hardening Middleware
 * Implements comprehensive security features for production deployment
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface SecurityConfig {
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number; // Preflight cache time in seconds
    credentials: boolean;
  };
  headers: {
    enabled: boolean;
    hsts: {
      enabled: boolean;
      maxAge: number; // Seconds
      includeSubDomains: boolean;
      preload: boolean;
    };
    contentSecurityPolicy: {
      enabled: boolean;
      directives: Record<string, string[]>;
    };
    referrerPolicy: string;
    contentTypeOptions: boolean;
    frameOptions: string;
    xssProtection: boolean;
    permissionsPolicy: string;
  };
  requestValidation: {
    enabled: boolean;
    maxBodySize: number; // bytes
    maxQueryParams: number;
    maxHeaders: number;
    allowedContentTypes: string[];
    blockedUserAgents: RegExp[];
  };
  monitoring: {
    enabled: boolean;
    logFailedRequests: boolean;
    alertOnSuspiciousActivity: boolean;
    suspiciousThresholds: {
      rapidRequests: number; // requests per second from single IP
      unusualPaths: number; // 404s per minute
      malformedRequests: number; // per minute
    };
  };
}

interface SecurityStats {
  blockedRequests: number;
  suspiciousActivity: number;
  malformedRequests: number;
  corsViolations: number;
  cspViolations: number;
  lastReset: Date;
}

/**
 * Security monitoring and enforcement
 */
class SecurityMonitor {
  private config: SecurityConfig;
  private stats: SecurityStats;
  private suspiciousIPs = new Map<string, { count: number; lastSeen: number; violations: string[] }>();
  private requestCounts = new Map<string, { count: number; window: number }>();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.stats = {
      blockedRequests: 0,
      suspiciousActivity: 0,
      malformedRequests: 0,
      corsViolations: 0,
      cspViolations: 0,
      lastReset: new Date()
    };

    // Clean up monitoring data every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Clean up old IP tracking data
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen < fiveMinutesAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }

    // Clean up request count tracking
    for (const [ip, data] of this.requestCounts.entries()) {
      if (data.window < fiveMinutesAgo) {
        this.requestCounts.delete(ip);
      }
    }
  }

  isBlockedUserAgent(userAgent: string): boolean {
    return this.config.requestValidation.blockedUserAgents.some(pattern =>
      pattern.test(userAgent)
    );
  }

  trackSuspiciousActivity(ip: string, violation: string): boolean {
    const now = Date.now();
    const existing = this.suspiciousIPs.get(ip);

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.violations.push(violation);

      // Keep only recent violations
      existing.violations = existing.violations.slice(-10);
    } else {
      this.suspiciousIPs.set(ip, {
        count: 1,
        lastSeen: now,
        violations: [violation]
      });
    }

    const ipData = this.suspiciousIPs.get(ip)!;

    // Alert if suspicious activity threshold exceeded
    if (ipData.count > 10 && this.config.monitoring.alertOnSuspiciousActivity) {
      console.warn(`🚨 Suspicious activity from IP ${ip}: ${ipData.count} violations`, {
        violations: ipData.violations,
        ip
      });
      return true; // Block this IP
    }

    return false;
  }

  trackRapidRequests(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    const existing = this.requestCounts.get(ip);
    if (!existing || existing.window < windowStart) {
      this.requestCounts.set(ip, { count: 1, window: now });
      return false;
    }

    existing.count++;

    if (existing.count > this.config.monitoring.suspiciousThresholds.rapidRequests) {
      this.trackSuspiciousActivity(ip, 'rapid_requests');
      return true;
    }

    return false;
  }

  validateRequest(request: FastifyRequest): { valid: boolean; reason?: string } {
    const userAgent = request.headers['user-agent'] || '';
    const contentType = request.headers['content-type'] || '';
    const ip = request.ip;

    // Check blocked user agents
    if (this.isBlockedUserAgent(userAgent)) {
      this.stats.blockedRequests++;
      this.trackSuspiciousActivity(ip, 'blocked_user_agent');
      return { valid: false, reason: 'Blocked user agent' };
    }

    // Check rapid requests
    if (this.trackRapidRequests(ip)) {
      this.stats.blockedRequests++;
      return { valid: false, reason: 'Too many rapid requests' };
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && contentType) {
      const isAllowed = this.config.requestValidation.allowedContentTypes.some(type =>
        contentType.includes(type)
      );

      if (!isAllowed) {
        this.stats.malformedRequests++;
        this.trackSuspiciousActivity(ip, 'invalid_content_type');
        return { valid: false, reason: 'Invalid content type' };
      }
    }

    // Check for malformed requests
    const queryParams = Object.keys(request.query as object).length;
    const headerCount = Object.keys(request.headers).length;

    if (queryParams > this.config.requestValidation.maxQueryParams) {
      this.stats.malformedRequests++;
      this.trackSuspiciousActivity(ip, 'too_many_query_params');
      return { valid: false, reason: 'Too many query parameters' };
    }

    if (headerCount > this.config.requestValidation.maxHeaders) {
      this.stats.malformedRequests++;
      this.trackSuspiciousActivity(ip, 'too_many_headers');
      return { valid: false, reason: 'Too many headers' };
    }

    return { valid: true };
  }

  getStats(): SecurityStats & { suspiciousIPs: Array<{ ip: string; violations: number; lastViolations: string[] }> } {
    const suspiciousIPsList = Array.from(this.suspiciousIPs.entries())
      .map(([ip, data]) => ({
        ip,
        violations: data.count,
        lastViolations: data.violations.slice(-3)
      }))
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 10);

    return {
      ...this.stats,
      suspiciousIPs: suspiciousIPsList
    };
  }

  resetStats(): void {
    this.stats = {
      blockedRequests: 0,
      suspiciousActivity: 0,
      malformedRequests: 0,
      corsViolations: 0,
      cspViolations: 0,
      lastReset: new Date()
    };
    this.suspiciousIPs.clear();
    this.requestCounts.clear();
  }
}

// Global security monitor instance
let securityMonitor: SecurityMonitor;

/**
 * Register security hardening middleware
 */
export async function registerSecurityMiddleware(
  fastify: FastifyInstance,
  config: SecurityConfig
): Promise<void> {
  // Initialize security monitor
  securityMonitor = new SecurityMonitor(config);

  // Request validation hook
  if (config.requestValidation.enabled) {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const validation = securityMonitor.validateRequest(request);

      if (!validation.valid) {
        if (config.monitoring.logFailedRequests) {
          console.warn(`🛡️ Security block: ${validation.reason} from ${request.ip} on ${request.url}`);
        }

        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Request validation failed'
        });
      }
    });
  }

  // Security headers hook
  if (config.headers.enabled) {
    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
      // HSTS Header
      if (config.headers.hsts.enabled && request.protocol === 'https') {
        const hstsValue = `max-age=${config.headers.hsts.maxAge}` +
          (config.headers.hsts.includeSubDomains ? '; includeSubDomains' : '') +
          (config.headers.hsts.preload ? '; preload' : '');
        reply.header('Strict-Transport-Security', hstsValue);
      }

      // Content Security Policy
      if (config.headers.contentSecurityPolicy.enabled) {
        const cspDirectives = Object.entries(config.headers.contentSecurityPolicy.directives)
          .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
          .join('; ');
        reply.header('Content-Security-Policy', cspDirectives);
      }

      // Other security headers
      reply.header('Referrer-Policy', config.headers.referrerPolicy);
      reply.header('X-Frame-Options', config.headers.frameOptions);

      if (config.headers.contentTypeOptions) {
        reply.header('X-Content-Type-Options', 'nosniff');
      }

      if (config.headers.xssProtection) {
        reply.header('X-XSS-Protection', '1; mode=block');
      }

      if (config.headers.permissionsPolicy) {
        reply.header('Permissions-Policy', config.headers.permissionsPolicy);
      }

      return payload;
    });
  }

  // Security stats endpoint
  fastify.get('/api/security/stats', async (_request: FastifyRequest, _reply: FastifyReply) => {
    const stats = securityMonitor.getStats();
    return {
      ...stats,
      timestamp: new Date().toISOString()
    };
  });

  // Security management endpoint
  fastify.post('/api/security/reset-stats', async (_request: FastifyRequest, _reply: FastifyReply) => {
    securityMonitor.resetStats();
    return { message: 'Security stats reset successfully' };
  });

  console.log('✅ Security hardening middleware registered successfully');
}

// Default production-ready configuration
export const defaultSecurityConfig: SecurityConfig = {
  cors: {
    enabled: true,
    allowedOrigins: ['http://localhost:3000', 'https://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
    credentials: true
  },
  headers: {
    enabled: true,
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false
    },
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'media-src': ["'self'"],
        'frame-src': ["'none'"]
      }
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentTypeOptions: true,
    frameOptions: 'DENY',
    xssProtection: true,
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
  },
  requestValidation: {
    enabled: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxQueryParams: 50,
    maxHeaders: 100,
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain'
    ],
    blockedUserAgents: [
      /bot|crawler|spider|scraper/i,
      /wget|curl/i,
      /python-requests|httpie/i
    ]
  },
  monitoring: {
    enabled: true,
    logFailedRequests: true,
    alertOnSuspiciousActivity: true,
    suspiciousThresholds: {
      rapidRequests: 50, // 50 requests per second
      unusualPaths: 10, // 10 404s per minute
      malformedRequests: 5 // 5 malformed requests per minute
    }
  }
};

export function getSecurityMonitor(): SecurityMonitor | undefined {
  return securityMonitor;
}