// Production security configuration
export interface SecurityConfig {
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    skipSuccessfulRequests: boolean;
  };
  helmet: {
    contentSecurityPolicy: {
      directives: Record<string, string[]>;
    };
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    frameguard: {
      action: string;
    };
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  jwt: {
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
}

// Production security configuration
export const productionSecurityConfig: SecurityConfig = {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'https://stake-games.vercel.app',
      process.env.ADMIN_URL || 'https://admin.stake-games.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Forwarded-For',
    ],
    maxAge: 86400, // 24 hours
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://supabase.co', 'https://*.supabase.co'],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://api.supabase.co',
          'https://*.supabase.co',
          'https://api.resend.com',
          'wss://realtime.supabase.co',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // HTTPS only in production
    httpOnly: true,
    sameSite: 'strict',
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
  },
  jwt: {
    expiresIn: '15m', // Short-lived access tokens
    refreshExpiresIn: '7d', // Longer-lived refresh tokens
    algorithm: 'HS256',
  },
};

// Development security configuration (more relaxed)
export const developmentSecurityConfig: SecurityConfig = {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
    ],
    maxAge: 3600, // 1 hour
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // More generous limit for development
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Allow eval for development tools
        connectSrc: ["'self'", 'ws://localhost:*', 'http://localhost:*'],
        imgSrc: ["'self'", 'data:', 'http:', 'https:'],
      },
    },
    hsts: {
      maxAge: 0, // Disable HSTS in development
      includeSubDomains: false,
      preload: false,
    },
    frameguard: {
      action: 'sameorigin',
    },
  },
  session: {
    secret: 'development-secret-key',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false, // HTTP allowed in development
    httpOnly: true,
    sameSite: 'lax',
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
  },
  jwt: {
    expiresIn: '1h', // Longer tokens for development convenience
    refreshExpiresIn: '30d',
    algorithm: 'HS256',
  },
};

// Get security configuration based on environment
export function getSecurityConfig(): SecurityConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? productionSecurityConfig : developmentSecurityConfig;
}

// Security middleware configuration
export interface SecurityMiddleware {
  enableHelmet: boolean;
  enableCors: boolean;
  enableRateLimit: boolean;
  enableCSRF: boolean;
  enableSessionSecurity: boolean;
  enableInputValidation: boolean;
  enableSQLInjectionProtection: boolean;
  enableXSSProtection: boolean;
}

export const productionSecurityMiddleware: SecurityMiddleware = {
  enableHelmet: true,
  enableCors: true,
  enableRateLimit: true,
  enableCSRF: true,
  enableSessionSecurity: true,
  enableInputValidation: true,
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
};

export const developmentSecurityMiddleware: SecurityMiddleware = {
  enableHelmet: false, // Disabled for easier development
  enableCors: true,
  enableRateLimit: false, // Disabled for easier testing
  enableCSRF: false, // Disabled for easier API testing
  enableSessionSecurity: true,
  enableInputValidation: true,
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
};

// Get security middleware configuration
export function getSecurityMiddleware(): SecurityMiddleware {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? productionSecurityMiddleware : developmentSecurityMiddleware;
}

// Input validation schemas
export const ValidationSchemas = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  betAmount: /^\d+(\.\d{1,2})?$/,
  gameType: /^(mines|sugar-rush|bars|dragon-tower|crash|limbo)$/,
};

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim();
}

export function sanitizeNumber(input: any): number | null {
  const parsed = parseFloat(input);
  return isNaN(parsed) ? null : parsed;
}

export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  return Boolean(input);
}

// IP address validation and blocking
export interface IPSecurityConfig {
  allowedIPs: string[];
  blockedIPs: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  enableGeoBlocking: boolean;
  enableVPNDetection: boolean;
}

export const productionIPSecurity: IPSecurityConfig = {
  allowedIPs: [], // Empty means all IPs allowed by default
  blockedIPs: [], // Add known malicious IPs
  allowedCountries: [], // Empty means all countries allowed
  blockedCountries: ['CN', 'RU'], // Example blocked countries
  enableGeoBlocking: true,
  enableVPNDetection: true,
};

// Security audit logging
export interface SecurityAuditLog {
  timestamp: Date;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export class SecurityAuditor {
  private logs: SecurityAuditLog[] = [];

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): void {
    const logEntry: SecurityAuditLog = {
      timestamp: new Date(),
      event,
      severity,
      source,
      details,
      ...(userId && { userId }),
      ...(sessionId && { sessionId }),
    };

    this.logs.push(logEntry);

    // In production, this would send to external logging service
    if (severity === 'critical' || severity === 'high') {
      console.warn('High-priority security event:', logEntry);
    }

    // Rotate logs to prevent memory issues
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }
  }

  getRecentLogs(count: number = 100): SecurityAuditLog[] {
    return this.logs.slice(-count);
  }

  getLogsByUser(userId: string, count: number = 50): SecurityAuditLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-count);
  }

  getLogsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SecurityAuditLog[] {
    return this.logs.filter(log => log.severity === severity);
  }
}

// Global security auditor instance
export const securityAuditor = new SecurityAuditor();

// Encryption utilities
export class EncryptionManager {
  private algorithm: string;
  private key: Buffer;

  constructor(config: SecurityConfig) {
    this.algorithm = config.encryption.algorithm;
    this.key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'hex');
  }

  encrypt(text: string): { encrypted: string; iv: string } {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  decrypt(encryptedData: string, ivHex: string): string {
    const crypto = require('crypto');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(this.algorithm, this.key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Password hashing utilities
export class PasswordManager {
  private saltRounds: number = 12;

  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }
}

// Global instances
export const passwordManager = new PasswordManager();
export const encryptionManager = new EncryptionManager(getSecurityConfig());