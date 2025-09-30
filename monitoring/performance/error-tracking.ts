/**
 * Comprehensive Error Tracking System
 * Captures, categorizes, and reports application errors and performance issues
 */

// Types for error tracking
export interface ErrorReport {
  id: string;
  timestamp: number;
  type: 'javascript' | 'unhandledrejection' | 'resource' | 'network' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context: ErrorContext;
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

export interface ErrorContext {
  url: string;
  referrer: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
  connection?: {
    type: string;
    effectiveType: string;
    downlink?: number;
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing?: {
    navigationStart: number;
    loadEventEnd: number;
    domContentLoadedEventEnd: number;
  };
}

export interface Breadcrumb {
  id: string;
  timestamp: number;
  type: 'navigation' | 'user' | 'http' | 'console' | 'custom';
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorTrackingConfig {
  apiEndpoint: string;
  maxBreadcrumbs: number;
  captureConsole: boolean;
  captureNetwork: boolean;
  captureUnhandledRejections: boolean;
  captureResourceErrors: boolean;
  ignorePatterns: RegExp[];
  beforeSend?: (error: ErrorReport) => ErrorReport | null;
  onError?: (error: ErrorReport) => void;
  sampling: {
    rate: number;
    userSample?: (userId?: string) => boolean;
  };
  privacy: {
    scrubFields: string[];
    scrubUrls: RegExp[];
    allowUrls: RegExp[];
  };
}

/**
 * Breadcrumb Manager
 */
class BreadcrumbManager {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs = 50) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  /**
   * Add breadcrumb
   */
  add(breadcrumb: Omit<Breadcrumb, 'id' | 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Get all breadcrumbs
   */
  getAll(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  private generateId(): string {
    return `breadcrumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Context Collector
 */
class ContextCollector {
  /**
   * Collect error context
   */
  collect(): ErrorContext {
    const context: ErrorContext = {
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
    };

    // Add connection information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      context.connection = {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink,
      };
    }

    // Add memory information if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      context.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    // Add timing information
    if (performance.timing) {
      const timing = performance.timing;
      context.timing = {
        navigationStart: timing.navigationStart,
        loadEventEnd: timing.loadEventEnd,
        domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      };
    }

    return context;
  }
}

/**
 * Error Sanitizer
 */
class ErrorSanitizer {
  private scrubFields: string[];
  private scrubUrls: RegExp[];

  constructor(scrubFields: string[] = [], scrubUrls: RegExp[] = []) {
    this.scrubFields = [
      'password',
      'token',
      'key',
      'secret',
      'auth',
      'credit',
      'card',
      ...scrubFields,
    ];
    this.scrubUrls = scrubUrls;
  }

  /**
   * Sanitize error report
   */
  sanitize(error: ErrorReport): ErrorReport {
    const sanitizedError = { ...error };

    // Scrub sensitive data from stack trace
    if (sanitizedError.stack) {
      sanitizedError.stack = this.scrubStackTrace(sanitizedError.stack);
    }

    // Scrub sensitive data from message
    sanitizedError.message = this.scrubString(sanitizedError.message);

    // Scrub metadata
    sanitizedError.metadata = this.scrubObject(sanitizedError.metadata);

    // Scrub breadcrumbs
    sanitizedError.breadcrumbs = sanitizedError.breadcrumbs.map(breadcrumb => ({
      ...breadcrumb,
      message: this.scrubString(breadcrumb.message),
      data: breadcrumb.data ? this.scrubObject(breadcrumb.data) : undefined,
    }));

    return sanitizedError;
  }

  private scrubStackTrace(stack: string): string {
    let scrubbedStack = stack;

    // Remove sensitive URLs
    for (const urlPattern of this.scrubUrls) {
      scrubbedStack = scrubbedStack.replace(urlPattern, '[SCRUBBED_URL]');
    }

    return scrubbedStack;
  }

  private scrubString(str: string): string {
    let scrubbedStr = str;

    // Remove common sensitive patterns
    const patterns = [
      /token[=:]\s*['"]*([^'"\s]+)['"]*$/gi,
      /key[=:]\s*['"]*([^'"\s]+)['"]*$/gi,
      /password[=:]\s*['"]*([^'"\s]+)['"]*$/gi,
      /secret[=:]\s*['"]*([^'"\s]+)['"]*$/gi,
    ];

    for (const pattern of patterns) {
      scrubbedStr = scrubbedStr.replace(pattern, '$&[SCRUBBED]');
    }

    return scrubbedStr;
  }

  private scrubObject(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') return obj;

    const scrubbed = { ...obj };

    for (const key of Object.keys(scrubbed)) {
      const lowerKey = key.toLowerCase();
      
      if (this.scrubFields.some(field => lowerKey.includes(field))) {
        scrubbed[key] = '[SCRUBBED]';
      } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
        scrubbed[key] = this.scrubObject(scrubbed[key]);
      }
    }

    return scrubbed;
  }
}

/**
 * Error Rate Limiter
 */
class ErrorRateLimiter {
  private errorCounts: Map<string, { count: number; firstSeen: number }> = new Map();
  private windowSize = 60000; // 1 minute
  private maxErrors = 10; // Max errors per window

  /**
   * Check if error should be reported
   */
  shouldReport(errorKey: string): boolean {
    const now = Date.now();
    const errorData = this.errorCounts.get(errorKey);

    if (!errorData) {
      this.errorCounts.set(errorKey, { count: 1, firstSeen: now });
      return true;
    }

    // Reset if window has passed
    if (now - errorData.firstSeen > this.windowSize) {
      this.errorCounts.set(errorKey, { count: 1, firstSeen: now });
      return true;
    }

    // Check if under limit
    if (errorData.count < this.maxErrors) {
      errorData.count++;
      return true;
    }

    return false;
  }

  /**
   * Generate error key for deduplication
   */
  generateErrorKey(error: ErrorReport): string {
    const parts = [
      error.type,
      error.message.substring(0, 100),
      error.lineNumber,
      error.columnNumber,
    ].filter(Boolean);

    return parts.join('|');
  }
}

/**
 * Main Error Tracker
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private config: ErrorTrackingConfig;
  private breadcrumbManager: BreadcrumbManager;
  private contextCollector: ContextCollector;
  private errorSanitizer: ErrorSanitizer;
  private rateLimiter: ErrorRateLimiter;
  private isInitialized = false;
  private originalConsole: Console;

  private constructor(config: ErrorTrackingConfig) {
    this.config = config;
    this.breadcrumbManager = new BreadcrumbManager(config.maxBreadcrumbs);
    this.contextCollector = new ContextCollector();
    this.errorSanitizer = new ErrorSanitizer(config.privacy.scrubFields, config.privacy.scrubUrls);
    this.rateLimiter = new ErrorRateLimiter();
    this.originalConsole = { ...console };
  }

  static getInstance(config?: ErrorTrackingConfig): ErrorTracker {
    if (!ErrorTracker.instance && config) {
      ErrorTracker.instance = new ErrorTracker(config);
    }
    return ErrorTracker.instance;
  }

  /**
   * Initialize error tracking
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.setupErrorHandlers();
    this.setupBreadcrumbTracking();
    
    if (this.config.captureConsole) {
      this.setupConsoleTracking();
    }

    if (this.config.captureNetwork) {
      this.setupNetworkTracking();
    }

    this.isInitialized = true;
    console.log('Error tracking initialized');
  }

  /**
   * Report custom error
   */
  reportError(
    error: Error | string,
    context?: Record<string, any>,
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const errorReport = this.createErrorReport({
      error: typeof error === 'string' ? new Error(error) : error,
      type: 'custom',
      severity,
      context: context || {},
    });

    this.processError(errorReport);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: Breadcrumb['level'] = 'info',
    type: Breadcrumb['type'] = 'custom',
    data?: Record<string, any>
  ): void {
    this.breadcrumbManager.add({
      type,
      category,
      message,
      level,
      data,
    });
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, userData?: Record<string, any>): void {
    this.addBreadcrumb(
      `User context set: ${userId}`,
      'user',
      'info',
      'custom',
      userData
    );
  }

  /**
   * Set tags
   */
  setTags(tags: Record<string, string>): void {
    // Tags would be stored and added to all future errors
    this.addBreadcrumb(
      'Tags updated',
      'context',
      'info',
      'custom',
      { tags }
    );
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbManager.clear();
  }

  private setupErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      const errorReport = this.createErrorReport({
        error: event.error || new Error(event.message),
        type: 'javascript',
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      this.processError(errorReport);
    });

    // Unhandled promise rejections
    if (this.config.captureUnhandledRejections) {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason));

        const errorReport = this.createErrorReport({
          error,
          type: 'unhandledrejection',
          severity: 'high',
          context: { reason: event.reason },
        });

        this.processError(errorReport);
      });
    }

    // Resource loading errors
    if (this.config.captureResourceErrors) {
      window.addEventListener('error', (event) => {
        const target = event.target;
        if (target && target !== window && (target as any).tagName) {
          const element = target as any;
          if (element.tagName === 'IMG' || element.tagName === 'SCRIPT' || element.tagName === 'LINK') {
            const errorReport = this.createErrorReport({
              error: new Error(`Resource failed to load: ${element.src || element.href}`),
              type: 'resource',
              severity: 'medium',
              context: {
                tagName: element.tagName,
                src: element.src,
                href: element.href,
              },
            });

            this.processError(errorReport);
          }
        }
      }, true);
    }
  }

  private setupBreadcrumbTracking(): void {
    // Track page navigation
    window.addEventListener('popstate', () => {
      this.addBreadcrumb(
        `Navigated to ${window.location.pathname}`,
        'navigation',
        'info',
        'navigation'
      );
    });

    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const selector = this.getElementSelector(target);
      this.addBreadcrumb(
        `Clicked ${selector}`,
        'ui',
        'info',
        'user',
        { selector, tagName: target.tagName }
      );
    });
  }

  private setupConsoleTracking(): void {
    ['log', 'info', 'warn', 'error', 'debug'].forEach((method) => {
      const original = (console as any)[method];
      (console as any)[method] = (...args: any[]) => {
        // Call original method
        original.apply(console, args);

        // Add breadcrumb for console output
        if (method === 'error' || method === 'warn') {
          this.addBreadcrumb(
            args.map(arg => String(arg)).join(' '),
            'console',
            method as any,
            'console'
          );
        }
      };
    });
  }

  private setupNetworkTracking(): void {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] instanceof Request) {
        url = args[0].url;
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      }
      
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.addBreadcrumb(
            `HTTP ${response.status} ${method} ${url}`,
            'network',
            'warning',
            'http',
            { status: response.status, method, url }
          );
        }

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.addBreadcrumb(
          `Network error ${method} ${url}`,
          'network',
          'error',
          'http',
          { error: errorMessage, method, url }
        );
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string) {
      this.addEventListener('load', () => {
        if (this.status >= 400) {
          ErrorTracker.instance?.addBreadcrumb(
            `HTTP ${this.status} ${method} ${url}`,
            'network',
            'warning',
            'http',
            { status: this.status, method, url }
          );
        }
      });

      this.addEventListener('error', () => {
        ErrorTracker.instance?.addBreadcrumb(
          `Network error ${method} ${url}`,
          'network',
          'error',
          'http',
          { method, url }
        );
      });

      return originalXHROpen.apply(this, arguments as any);
    };
  }

  private createErrorReport(params: {
    error: Error;
    type: ErrorReport['type'];
    severity: ErrorReport['severity'];
    context: Record<string, any>;
  }): ErrorReport {
    const { error, type, severity, context } = params;

    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type,
      severity,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      lineNumber: context.lineno,
      columnNumber: context.colno,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      context: this.contextCollector.collect(),
      breadcrumbs: this.breadcrumbManager.getAll(),
      tags: {},
      metadata: context,
    };
  }

  private async processError(error: ErrorReport): Promise<void> {
    // Check sampling
    if (!this.shouldSampleError(error)) {
      return;
    }

    // Check rate limiting
    const errorKey = this.rateLimiter.generateErrorKey(error);
    if (!this.rateLimiter.shouldReport(errorKey)) {
      return;
    }

    // Check ignore patterns
    if (this.shouldIgnoreError(error)) {
      return;
    }

    // Sanitize error
    const sanitizedError = this.errorSanitizer.sanitize(error);

    // Apply beforeSend hook
    let finalError = sanitizedError;
    if (this.config.beforeSend) {
      const modifiedError = this.config.beforeSend(finalError);
      if (!modifiedError) return; // Error was filtered out
      finalError = modifiedError;
    }

    // Send error
    try {
      await this.sendError(finalError);
      
      // Call onError hook
      if (this.config.onError) {
        this.config.onError(finalError);
      }
    } catch (sendError) {
      console.error('Failed to send error report:', sendError);
    }
  }

  private shouldSampleError(error: ErrorReport): boolean {
    if (this.config.sampling.rate >= 1) return true;
    
    if (this.config.sampling.userSample) {
      return this.config.sampling.userSample(error.userId);
    }

    return Math.random() < this.config.sampling.rate;
  }

  private shouldIgnoreError(error: ErrorReport): boolean {
    // Check URL allowlist
    if (this.config.privacy.allowUrls.length > 0) {
      const isAllowed = this.config.privacy.allowUrls.some(pattern => 
        pattern.test(error.url)
      );
      if (!isAllowed) return true;
    }

    // Check ignore patterns
    return this.config.ignorePatterns.some(pattern =>
      pattern.test(error.message) || (error.stack && pattern.test(error.stack))
    );
  }

  private async sendError(error: ErrorReport): Promise<void> {
    const payload = JSON.stringify(error);

    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon(this.config.apiEndpoint, payload);
      if (!success) {
        throw new Error('sendBeacon failed');
      }
    } else {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true,
      });
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    return localStorage.getItem('user-id') || undefined;
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }
}

// Default configuration
export const defaultErrorTrackingConfig: ErrorTrackingConfig = {
  apiEndpoint: '/api/errors',
  maxBreadcrumbs: 50,
  captureConsole: true,
  captureNetwork: true,
  captureUnhandledRejections: true,
  captureResourceErrors: true,
  ignorePatterns: [
    /Script error/,
    /Non-Error promise rejection captured/,
  ],
  sampling: {
    rate: 1.0, // 100% sampling for development
  },
  privacy: {
    scrubFields: ['password', 'token', 'apiKey'],
    scrubUrls: [],
    allowUrls: [],
  },
};

// Export convenience functions
export const initializeErrorTracking = (config: Partial<ErrorTrackingConfig> = {}) => {
  const finalConfig = { ...defaultErrorTrackingConfig, ...config };
  const tracker = ErrorTracker.getInstance(finalConfig);
  tracker.initialize();
  return tracker;
};

export const reportError = (error: Error | string, context?: Record<string, any>, severity?: ErrorReport['severity']) => {
  const tracker = ErrorTracker.getInstance();
  tracker?.reportError(error, context, severity);
};

export const addBreadcrumb = (message: string, category: string, level?: Breadcrumb['level'], type?: Breadcrumb['type'], data?: Record<string, any>) => {
  const tracker = ErrorTracker.getInstance();
  tracker?.addBreadcrumb(message, category, level, type, data);
};

// Default export
export default ErrorTracker;