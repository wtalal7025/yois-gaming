import winston from 'winston';
import 'winston-daily-rotate-file';

// Logging configuration interface
export interface LoggingConfig {
  level: string;
  format: 'json' | 'text';
  enableConsole: boolean;
  enableFile: boolean;
  enableRotation: boolean;
  maxSize: string;
  maxFiles: string;
  datePattern: string;
  zippedArchive: boolean;
}

// Production logging configuration
export const productionLoggingConfig: LoggingConfig = {
  level: 'info',
  format: 'json',
  enableConsole: true,
  enableFile: true,
  enableRotation: true,
  maxSize: '20m', // 20MB per file
  maxFiles: '14d', // Keep logs for 14 days
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
};

// Development logging configuration
export const developmentLoggingConfig: LoggingConfig = {
  level: 'debug',
  format: 'text',
  enableConsole: true,
  enableFile: false,
  enableRotation: false,
  maxSize: '10m',
  maxFiles: '7d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
};

// Get logging configuration based on environment
export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? productionLoggingConfig : developmentLoggingConfig;
}

// Create logger with enhanced error handling
export function createProductionLogger(config: LoggingConfig): winston.Logger {
  const transports: winston.transport[] = [];
  
  // Console transport with conditional formatting
  if (config.enableConsole) {
    transports.push(new winston.transports.Console({
      format: config.format === 'json' 
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, stack }) => {
              return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
            })
          ),
    }));
  }
  
  // File transport with rotation for production
  if (config.enableFile) {
    if (config.enableRotation) {
      // Rotating file transport for production
      transports.push(new winston.transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: config.datePattern,
        zippedArchive: config.zippedArchive,
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      }));
      
      // Separate error log file
      transports.push(new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: config.datePattern,
        zippedArchive: config.zippedArchive,
        maxSize: config.maxSize,
        maxFiles: config.maxFiles,
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      }));
    } else {
      // Simple file transport for development
      transports.push(new winston.transports.File({
        filename: 'logs/application.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
      }));
    }
  }
  
  // Create logger instance
  const logger = winston.createLogger({
    level: config.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    defaultMeta: {
      service: 'stake-games-backend',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    },
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  });
  
  return logger;
}

// Log levels for different scenarios
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
} as const;

// Structured logging helper functions
export class StructuredLogger {
  private logger: winston.Logger;
  
  constructor(logger: winston.Logger) {
    this.logger = logger;
  }
  
  // Log user authentication events
  logAuth(event: 'login' | 'logout' | 'register' | 'password_reset', userId: string, metadata?: any): void {
    this.logger.info('Authentication event', {
      event: `auth_${event}`,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
  
  // Log game events
  logGame(event: 'start' | 'end' | 'bet' | 'win' | 'lose', gameType: string, userId: string, metadata?: any): void {
    this.logger.info('Game event', {
      event: `game_${event}`,
      gameType,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
  
  // Log payment events
  logPayment(event: 'deposit' | 'withdrawal' | 'bet' | 'payout', amount: number, userId: string, metadata?: any): void {
    this.logger.info('Payment event', {
      event: `payment_${event}`,
      amount,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
  
  // Log security events
  logSecurity(event: 'suspicious_activity' | 'rate_limit' | 'blocked_ip' | 'failed_auth', metadata?: any): void {
    this.logger.warn('Security event', {
      event: `security_${event}`,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
  
  // Log system performance events
  logPerformance(event: 'slow_query' | 'high_memory' | 'high_cpu' | 'timeout', metadata?: any): void {
    this.logger.warn('Performance event', {
      event: `performance_${event}`,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
  
  // Log API events with response time
  logAPI(method: string, path: string, statusCode: number, responseTime: number, userId?: string): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, 'API request', {
      event: 'api_request',
      method,
      path,
      statusCode,
      responseTime,
      userId,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Log errors with context
  logError(error: Error, context?: any): void {
    this.logger.error('Application error', {
      event: 'error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

// Global logger instances
let globalLogger: winston.Logger;
let structuredLogger: StructuredLogger;

// Initialize global logger
export function initializeLogger(config?: LoggingConfig): winston.Logger {
  const loggingConfig = config || getLoggingConfig();
  globalLogger = createProductionLogger(loggingConfig);
  structuredLogger = new StructuredLogger(globalLogger);
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    globalLogger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    globalLogger.error('Unhandled Promise Rejection', {
      reason,
      promise,
      timestamp: new Date().toISOString(),
    });
  });
  
  return globalLogger;
}

// Get global logger instance
export function getLogger(): winston.Logger {
  if (!globalLogger) {
    initializeLogger();
  }
  return globalLogger;
}

// Get structured logger instance
export function getStructuredLogger(): StructuredLogger {
  if (!structuredLogger) {
    initializeLogger();
  }
  return structuredLogger;
}

// Log sanitization for sensitive data
export function sanitizeLogData(data: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey', 'creditCard'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}