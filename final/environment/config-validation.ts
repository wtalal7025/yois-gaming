/**
 * Production configuration validation
 * Validates environment configuration for production deployment
 */

// Types for configuration validation
interface EnvironmentConfig {
  NODE_ENV: string;
  API_URL: string;
  DATABASE_URL: string;
  REDIS_URL?: string;
  JWT_SECRET: string;
  CORS_ORIGINS: string[];
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
  LOG_LEVEL: string;
  MONITORING_ENABLED: boolean;
  CDN_URL?: string;
  ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  WEBHOOK_SECRET?: string;
  PAYMENT_API_KEY?: string;
  EMAIL_API_KEY?: string;
}

interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
  securityIssues: SecurityIssue[];
  environmentInfo: EnvironmentInfo;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  solution: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

interface SecurityIssue {
  field: string;
  issue: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string;
}

interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  architecture: string;
  memory: number;
  cpus: number;
  uptime: number;
}

/**
 * Configuration validator class
 */
export class ConfigValidator {
  private config: Partial<EnvironmentConfig>;
  private requiredFields: (keyof EnvironmentConfig)[] = [
    'NODE_ENV',
    'API_URL',
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
  ];

  private productionRequiredFields: (keyof EnvironmentConfig)[] = [
    'CORS_ORIGINS',
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_WINDOW',
    'LOG_LEVEL',
    'MONITORING_ENABLED'
  ];

  constructor(config: Partial<EnvironmentConfig>) {
    this.config = config;
  }

  public validateConfiguration(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const securityIssues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    // Validate required fields
    this.validateRequiredFields(errors);
    
    // Validate field formats and values
    this.validateFieldFormats(errors, warnings);
    
    // Security validation
    this.validateSecurity(securityIssues, warnings);
    
    // Production-specific validation
    if (this.config.NODE_ENV === 'production') {
      this.validateProductionConfig(errors, warnings, securityIssues);
    }

    // Generate recommendations
    this.generateRecommendations(recommendations, errors, warnings, securityIssues);

    // Calculate score
    const score = this.calculateConfigurationScore(errors, warnings, securityIssues);

    // Get environment info
    const environmentInfo = this.getEnvironmentInfo();

    return {
      valid: errors.filter(e => e.severity === 'critical').length === 0,
      score,
      errors,
      warnings,
      recommendations,
      securityIssues,
      environmentInfo
    };
  }

  private validateRequiredFields(errors: ValidationError[]): void {
    const fieldsToCheck = this.config.NODE_ENV === 'production' 
      ? [...this.requiredFields, ...this.productionRequiredFields]
      : this.requiredFields;

    for (const field of fieldsToCheck) {
      if (!this.config[field]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'critical',
          impact: 'Application will fail to start or behave unpredictably',
          solution: `Set the ${field} environment variable`
        });
      }
    }
  }

  private validateFieldFormats(errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate API_URL
    if (this.config.API_URL && !this.isValidUrl(this.config.API_URL)) {
      errors.push({
        field: 'API_URL',
        message: 'API_URL must be a valid URL',
        severity: 'high',
        impact: 'API requests will fail',
        solution: 'Provide a valid URL including protocol (https://)'
      });
    }

    // Validate DATABASE_URL
    if (this.config.DATABASE_URL && !this.isValidDatabaseUrl(this.config.DATABASE_URL)) {
      errors.push({
        field: 'DATABASE_URL',
        message: 'DATABASE_URL format is invalid',
        severity: 'critical',
        impact: 'Database connection will fail',
        solution: 'Use format: protocol://username:password@host:port/database'
      });
    }

    // Validate REDIS_URL
    if (this.config.REDIS_URL && !this.isValidRedisUrl(this.config.REDIS_URL)) {
      warnings.push({
        field: 'REDIS_URL',
        message: 'REDIS_URL format may be invalid',
        recommendation: 'Verify Redis connection string format'
      });
    }

    // Validate CORS_ORIGINS
    if (this.config.CORS_ORIGINS) {
      for (const origin of this.config.CORS_ORIGINS) {
        if (origin !== '*' && !this.isValidUrl(origin)) {
          errors.push({
            field: 'CORS_ORIGINS',
            message: `Invalid CORS origin: ${origin}`,
            severity: 'medium',
            impact: 'CORS requests may fail',
            solution: 'Provide valid URLs or use "*" for all origins (not recommended for production)'
          });
        }
      }
    }

    // Validate LOG_LEVEL
    const validLogLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (this.config.LOG_LEVEL && !validLogLevels.includes(this.config.LOG_LEVEL)) {
      warnings.push({
        field: 'LOG_LEVEL',
        message: `Log level '${this.config.LOG_LEVEL}' is not standard`,
        recommendation: `Use one of: ${validLogLevels.join(', ')}`
      });
    }

    // Validate rate limiting
    if (this.config.RATE_LIMIT_MAX && this.config.RATE_LIMIT_MAX < 10) {
      warnings.push({
        field: 'RATE_LIMIT_MAX',
        message: 'Rate limit is very restrictive',
        recommendation: 'Consider increasing rate limit for better user experience'
      });
    }
  }

  private validateSecurity(securityIssues: SecurityIssue[], warnings: ValidationWarning[]): void {
    // Validate JWT_SECRET strength
    if (this.config.JWT_SECRET) {
      if (this.config.JWT_SECRET.length < 32) {
        securityIssues.push({
          field: 'JWT_SECRET',
          issue: 'JWT secret is too short',
          risk: 'high',
          mitigation: 'Use a secret with at least 32 characters'
        });
      }

      if (this.isWeakSecret(this.config.JWT_SECRET)) {
        securityIssues.push({
          field: 'JWT_SECRET',
          issue: 'JWT secret appears to be weak or predictable',
          risk: 'critical',
          mitigation: 'Generate a cryptographically secure random string'
        });
      }
    }

    // Validate ENCRYPTION_KEY
    if (this.config.ENCRYPTION_KEY) {
      if (this.config.ENCRYPTION_KEY.length < 32) {
        securityIssues.push({
          field: 'ENCRYPTION_KEY',
          issue: 'Encryption key is too short',
          risk: 'critical',
          mitigation: 'Use a 256-bit (32 byte) or longer encryption key'
        });
      }
    }

    // Validate SESSION_SECRET
    if (this.config.SESSION_SECRET) {
      if (this.config.SESSION_SECRET.length < 32) {
        securityIssues.push({
          field: 'SESSION_SECRET',
          issue: 'Session secret is too short',
          risk: 'high',
          mitigation: 'Use a session secret with at least 32 characters'
        });
      }
    }

    // Check for development secrets in production
    if (this.config.NODE_ENV === 'production') {
      const developmentPatterns = [
        /^(test|dev|development|demo)/i,
        /^(123|password|secret|admin)/i,
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i // UUID pattern
      ];

      for (const [field, value] of Object.entries(this.config)) {
        if (typeof value === 'string' && (field.includes('SECRET') || field.includes('KEY'))) {
          for (const pattern of developmentPatterns) {
            if (pattern.test(value)) {
              securityIssues.push({
                field,
                issue: 'Appears to be a development/test secret in production',
                risk: 'critical',
                mitigation: 'Generate a production-grade secret'
              });
            }
          }
        }
      }
    }

    // Validate HTTPS usage in production
    if (this.config.NODE_ENV === 'production' && this.config.API_URL && !this.config.API_URL.startsWith('https://')) {
      securityIssues.push({
        field: 'API_URL',
        issue: 'Using HTTP in production environment',
        risk: 'high',
        mitigation: 'Use HTTPS for all production URLs'
      });
    }
  }

  private validateProductionConfig(errors: ValidationError[], warnings: ValidationWarning[], securityIssues: SecurityIssue[]): void {
    // Production-specific validations
    if (!this.config.MONITORING_ENABLED) {
      warnings.push({
        field: 'MONITORING_ENABLED',
        message: 'Monitoring is disabled in production',
        recommendation: 'Enable monitoring for production environments'
      });
    }

    if (!this.config.CDN_URL) {
      warnings.push({
        field: 'CDN_URL',
        message: 'CDN not configured',
        recommendation: 'Configure CDN for better performance'
      });
    }

    if (this.config.LOG_LEVEL === 'debug' || this.config.LOG_LEVEL === 'trace') {
      warnings.push({
        field: 'LOG_LEVEL',
        message: 'Debug logging enabled in production',
        recommendation: 'Use "info" or "warn" level for production'
      });
    }

    // Check for wildcard CORS in production
    if (this.config.CORS_ORIGINS && this.config.CORS_ORIGINS.includes('*')) {
      securityIssues.push({
        field: 'CORS_ORIGINS',
        issue: 'Wildcard CORS origin in production',
        risk: 'medium',
        mitigation: 'Specify exact allowed origins instead of "*"'
      });
    }
  }

  private generateRecommendations(
    recommendations: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    securityIssues: SecurityIssue[]
  ): void {
    // Critical errors recommendations
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push('🚨 Fix all critical configuration errors before deployment');
    }

    // Security recommendations
    const criticalSecurity = securityIssues.filter(s => s.risk === 'critical');
    if (criticalSecurity.length > 0) {
      recommendations.push('🔐 Address critical security issues immediately');
    }

    // General recommendations
    recommendations.push('📋 Store sensitive configuration in secure environment variables');
    recommendations.push('🔄 Regularly rotate secrets and API keys');
    recommendations.push('📊 Enable monitoring and logging in production');
    
    if (this.config.NODE_ENV === 'production') {
      recommendations.push('🌐 Use HTTPS for all external communications');
      recommendations.push('🚦 Configure proper rate limiting for your use case');
      recommendations.push('📈 Set up health checks and monitoring');
    }
  }

  private calculateConfigurationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    securityIssues: SecurityIssue[]
  ): number {
    let score = 100;

    // Deduct points for errors
    for (const error of errors) {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct points for security issues
    for (const issue of securityIssues) {
      switch (issue.risk) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 12;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    // Deduct points for warnings
    score -= warnings.length * 2;

    return Math.max(0, Math.round(score));
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
      platform: typeof process !== 'undefined' ? process.platform : 'browser',
      architecture: typeof process !== 'undefined' ? process.arch : 'unknown',
      memory: typeof process !== 'undefined' ? Math.round(process.memoryUsage().rss / 1024 / 1024) : 0,
      cpus: typeof process !== 'undefined' && typeof process.cpuUsage === 'function' ? 1 : 0, // Simplified
      uptime: typeof process !== 'undefined' ? Math.round(process.uptime()) : 0
    };
  }

  // Utility methods
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidDatabaseUrl(url: string): boolean {
    // Basic validation for database URL format
    const dbUrlPattern = /^(postgresql|mysql|sqlite|mongodb):\/\/.+/;
    return dbUrlPattern.test(url);
  }

  private isValidRedisUrl(url: string): boolean {
    // Basic validation for Redis URL format
    const redisUrlPattern = /^redis(s)?:\/\/.+/;
    return redisUrlPattern.test(url);
  }

  private isWeakSecret(secret: string): boolean {
    const weakPatterns = [
      /^(secret|password|key|token)$/i,
      /^[0-9]+$/,  // Only numbers
      /^[a-z]+$/,  // Only lowercase letters
      /^[A-Z]+$/,  // Only uppercase letters
      /^(test|dev|demo|example)/i,
      /^(.)\1+$/   // Repeated characters
    ];

    return weakPatterns.some(pattern => pattern.test(secret));
  }
}

/**
 * Environment-specific configuration loaders
 */
export class EnvironmentLoader {
  public static loadFromEnvironment(): Partial<EnvironmentConfig> {
    if (typeof process === 'undefined') {
      console.warn('Process environment not available (browser context)');
      return {};
    }

    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
      RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 100,
      RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW, 10) : 60000,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      MONITORING_ENABLED: process.env.MONITORING_ENABLED === 'true',
      CDN_URL: process.env.CDN_URL,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      SESSION_SECRET: process.env.SESSION_SECRET,
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
      PAYMENT_API_KEY: process.env.PAYMENT_API_KEY,
      EMAIL_API_KEY: process.env.EMAIL_API_KEY
    };
  }

  public static validateCurrentEnvironment(): ValidationResult {
    const config = this.loadFromEnvironment();
    const validator = new ConfigValidator(config);
    return validator.validateConfiguration();
  }
}

/**
 * Configuration templates for different environments
 */
export class ConfigurationTemplates {
  public static getDevelopmentTemplate(): Partial<EnvironmentConfig> {
    return {
      NODE_ENV: 'development',
      API_URL: 'http://localhost:3001',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/gaming_dev',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'dev-jwt-secret-change-in-production',
      CORS_ORIGINS: ['http://localhost:3000'],
      RATE_LIMIT_MAX: 1000,
      RATE_LIMIT_WINDOW: 60000,
      LOG_LEVEL: 'debug',
      MONITORING_ENABLED: false,
      ENCRYPTION_KEY: 'dev-encryption-key-change-in-production',
      SESSION_SECRET: 'dev-session-secret-change-in-production'
    };
  }

  public static getProductionTemplate(): Partial<EnvironmentConfig> {
    return {
      NODE_ENV: 'production',
      API_URL: 'https://api.yourdomain.com',
      DATABASE_URL: 'postgresql://user:password@db.host:5432/gaming_prod',
      REDIS_URL: 'redis://redis.host:6379',
      JWT_SECRET: '[GENERATE-SECURE-SECRET]',
      CORS_ORIGINS: ['https://yourdomain.com'],
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW: 60000,
      LOG_LEVEL: 'info',
      MONITORING_ENABLED: true,
      CDN_URL: 'https://cdn.yourdomain.com',
      ENCRYPTION_KEY: '[GENERATE-256-BIT-KEY]',
      SESSION_SECRET: '[GENERATE-SECURE-SECRET]'
    };
  }

  public static getStagingTemplate(): Partial<EnvironmentConfig> {
    const prodTemplate = this.getProductionTemplate();
    return {
      ...prodTemplate,
      NODE_ENV: 'staging',
      API_URL: 'https://staging-api.yourdomain.com',
      DATABASE_URL: 'postgresql://user:password@staging-db.host:5432/gaming_staging',
      CORS_ORIGINS: ['https://staging.yourdomain.com'],
      LOG_LEVEL: 'debug' // More verbose logging for staging
    };
  }
}

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).ConfigValidator = ConfigValidator;
  (window as any).EnvironmentLoader = EnvironmentLoader;
  (window as any).ConfigurationTemplates = ConfigurationTemplates;
  console.log('⚙️ Configuration Validation Tools loaded. Available: window.ConfigValidator, window.EnvironmentLoader, window.ConfigurationTemplates');
}