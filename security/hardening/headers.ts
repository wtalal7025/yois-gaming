/**
 * Security Headers and Content Security Policy (CSP) Management System
 * Provides comprehensive security headers and CSP optimization
 */

// Types for security headers management
export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  hstsMaxAge?: number;
  includeSubdomains?: boolean;
  preload?: boolean;
  enableCSP?: boolean;
  cspDirectives?: CSPDirectives;
  enableFrameOptions?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  enableContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  referrerPolicy?: ReferrerPolicyDirective;
  enablePermissionsPolicy?: boolean;
  permissionsPolicy?: PermissionsPolicyDirectives;
  customHeaders?: Record<string, string>;
}

export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  childSrc?: string[];
  workerSrc?: string[];
  manifestSrc?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
  reportUri?: string[];
  reportTo?: string;
  requireTrustedTypesFor?: string[];
  trustedTypes?: string[];
}

export interface PermissionsPolicyDirectives {
  accelerometer?: string[];
  ambientLightSensor?: string[];
  autoplay?: string[];
  battery?: string[];
  camera?: string[];
  displayCapture?: string[];
  documentDomain?: string[];
  encryptedMedia?: string[];
  executionWhileNotRendered?: string[];
  executionWhileOutOfViewport?: string[];
  fullscreen?: string[];
  geolocation?: string[];
  gyroscope?: string[];
  magnetometer?: string[];
  microphone?: string[];
  midi?: string[];
  navigationOverride?: string[];
  notifications?: string[];
  payment?: string[];
  pictureInPicture?: string[];
  publicKeyCredentialsGet?: string[];
  screenWakeLock?: string[];
  syncXhr?: string[];
  usb?: string[];
  webShare?: string[];
  xrSpatialTracking?: string[];
}

export type ReferrerPolicyDirective =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface CSPViolationReport {
  documentUri: string;
  referrer?: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  disposition: 'enforce' | 'report';
  blockedUri: string;
  lineNumber?: number;
  columnNumber?: number;
  sourceFile?: string;
  statusCode: number;
  scriptSample?: string;
}

export interface SecurityAuditResult {
  headers: Record<string, string>;
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  compliance: SecurityCompliance;
}

export interface SecurityVulnerability {
  type: 'missing-header' | 'weak-policy' | 'insecure-directive' | 'deprecated-header';
  severity: 'low' | 'medium' | 'high' | 'critical';
  header?: string;
  directive?: string;
  description: string;
  impact: string;
  remediation: string;
}

export interface SecurityCompliance {
  owasp: {
    score: number;
    passed: string[];
    failed: string[];
  };
  mozilla: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
  };
  custom: {
    policies: string[];
    violations: string[];
  };
}

/**
 * CSP Builder and Manager
 */
class CSPManager {
  private directives: CSPDirectives = {};
  private reportOnly = false;
  private nonces = new Set<string>();
  private hashes = new Set<string>();

  /**
   * Set CSP directive
   */
  setDirective(directive: keyof CSPDirectives, values: string[] | boolean): void {
    if (typeof values === 'boolean') {
      // For boolean directives like upgrade-insecure-requests
      this.directives[directive] = values as any;
    } else {
      this.directives[directive] = [...values] as any;
    }
  }

  /**
   * Add source to directive
   */
  addSource(directive: keyof CSPDirectives, source: string): void {
    const currentValue = this.directives[directive];
    if (Array.isArray(currentValue)) {
      currentValue.push(source);
    } else {
      this.directives[directive] = [source] as any;
    }
  }

  /**
   * Remove source from directive
   */
  removeSource(directive: keyof CSPDirectives, source: string): void {
    const currentValue = this.directives[directive];
    if (Array.isArray(currentValue)) {
      const index = currentValue.indexOf(source);
      if (index > -1) {
        currentValue.splice(index, 1);
      }
    }
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  generateNonce(): string {
    const nonce = this.createNonce();
    this.nonces.add(nonce);
    
    // Add to script-src if not already present
    if (!this.hasNonceInDirective('scriptSrc')) {
      this.addSource('scriptSrc', `'nonce-${nonce}'`);
    }
    
    return nonce;
  }

  /**
   * Add hash for inline content
   */
  addHash(algorithm: 'sha256' | 'sha384' | 'sha512', content: string): string {
    const hash = this.calculateHash(algorithm, content);
    const hashValue = `'${algorithm}-${hash}'`;
    
    this.hashes.add(hashValue);
    this.addSource('scriptSrc', hashValue);
    
    return hashValue;
  }

  /**
   * Set report-only mode
   */
  setReportOnly(reportOnly: boolean): void {
    this.reportOnly = reportOnly;
  }

  /**
   * Build CSP header value
   */
  build(): string {
    const policies: string[] = [];

    // Process each directive
    Object.entries(this.directives).forEach(([key, value]) => {
      const directive = this.camelToKebab(key);
      
      if (typeof value === 'boolean' && value) {
        // Boolean directives like upgrade-insecure-requests
        policies.push(directive);
      } else if (Array.isArray(value) && value.length > 0) {
        policies.push(`${directive} ${value.join(' ')}`);
      }
    });

    return policies.join('; ');
  }

  /**
   * Get CSP header name
   */
  getHeaderName(): string {
    return this.reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';
  }

  /**
   * Validate CSP policy
   */
  validate(): string[] {
    const warnings: string[] = [];

    // Check for unsafe directives
    ['scriptSrc', 'styleSrc'].forEach(directive => {
      const value = this.directives[directive as keyof CSPDirectives] as string[];
      if (value?.includes("'unsafe-inline'")) {
        warnings.push(`Unsafe inline allowed in ${directive}`);
      }
      if (value?.includes("'unsafe-eval'")) {
        warnings.push(`Unsafe eval allowed in ${directive}`);
      }
    });

    // Check for wildcard usage
    Object.entries(this.directives).forEach(([key, value]) => {
      if (Array.isArray(value) && value.includes('*')) {
        warnings.push(`Wildcard (*) used in ${key}`);
      }
    });

    return warnings;
  }

  /**
   * Clone CSP manager
   */
  clone(): CSPManager {
    const clone = new CSPManager();
    clone.directives = JSON.parse(JSON.stringify(this.directives));
    clone.reportOnly = this.reportOnly;
    clone.nonces = new Set(this.nonces);
    clone.hashes = new Set(this.hashes);
    return clone;
  }

  private createNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private hasNonceInDirective(directive: keyof CSPDirectives): boolean {
    const value = this.directives[directive];
    return Array.isArray(value) && value.some(v => v.startsWith("'nonce-"));
  }

  private calculateHash(algorithm: string, content: string): string {
    // This would typically use Web Crypto API in browser or crypto module in Node.js
    // For now, return a placeholder
    return 'placeholder-hash';
  }

  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
}

/**
 * Security Headers Manager
 */
class SecurityHeadersManager {
  private config: SecurityHeadersConfig;
  private cspManager: CSPManager;
  private customCSPReportHandler?: (report: CSPViolationReport) => void;

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = {
      enableHSTS: true,
      hstsMaxAge: 31536000, // 1 year
      includeSubdomains: true,
      preload: true,
      enableCSP: true,
      enableFrameOptions: true,
      frameOptions: 'DENY',
      enableContentTypeOptions: true,
      enableReferrerPolicy: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      enablePermissionsPolicy: true,
      ...config
    };

    this.cspManager = new CSPManager();
    this.initializeDefaultCSP();
  }

  /**
   * Generate all security headers
   */
  generateHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Strict Transport Security (HSTS)
    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = this.buildHSTSHeader();
    }

    // Content Security Policy
    if (this.config.enableCSP) {
      const cspValue = this.cspManager.build();
      if (cspValue) {
        headers[this.cspManager.getHeaderName()] = cspValue;
      }
    }

    // X-Frame-Options
    if (this.config.enableFrameOptions && this.config.frameOptions) {
      headers['X-Frame-Options'] = this.config.frameOptions;
    }

    // X-Content-Type-Options
    if (this.config.enableContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy && this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy;
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy && this.config.permissionsPolicy) {
      headers['Permissions-Policy'] = this.buildPermissionsPolicyHeader();
    }

    // Additional security headers
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['X-Download-Options'] = 'noopen';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';

    // Custom headers
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    return headers;
  }

  /**
   * Get CSP manager for customization
   */
  getCSPManager(): CSPManager {
    return this.cspManager;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate nonce for inline content
   */
  generateNonce(): string {
    return this.cspManager.generateNonce();
  }

  /**
   * Set CSP report handler
   */
  setCSPReportHandler(handler: (report: CSPViolationReport) => void): void {
    this.customCSPReportHandler = handler;
  }

  /**
   * Handle CSP violation report
   */
  handleCSPViolation(report: CSPViolationReport): void {
    console.warn('CSP Violation:', report);
    
    // Log violation details
    const logEntry = {
      timestamp: new Date().toISOString(),
      documentUri: report.documentUri,
      violatedDirective: report.violatedDirective,
      blockedUri: report.blockedUri,
      userAgent: navigator.userAgent,
      disposition: report.disposition
    };

    // Store in local storage for debugging
    const violations = JSON.parse(localStorage.getItem('csp-violations') || '[]');
    violations.push(logEntry);
    localStorage.setItem('csp-violations', JSON.stringify(violations.slice(-100))); // Keep last 100

    // Call custom handler
    if (this.customCSPReportHandler) {
      this.customCSPReportHandler(report);
    }
  }

  /**
   * Audit current security headers
   */
  auditHeaders(headers: Record<string, string>): SecurityAuditResult {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check HSTS
    if (!headers['strict-transport-security']) {
      vulnerabilities.push({
        type: 'missing-header',
        severity: 'high',
        header: 'Strict-Transport-Security',
        description: 'HSTS header is missing',
        impact: 'Vulnerable to SSL stripping attacks',
        remediation: 'Add Strict-Transport-Security header'
      });
      score -= 15;
    }

    // Check CSP
    if (!headers['content-security-policy'] && !headers['content-security-policy-report-only']) {
      vulnerabilities.push({
        type: 'missing-header',
        severity: 'critical',
        header: 'Content-Security-Policy',
        description: 'CSP header is missing',
        impact: 'Vulnerable to XSS and data injection attacks',
        remediation: 'Implement Content Security Policy'
      });
      score -= 25;
    }

    // Check X-Frame-Options
    if (!headers['x-frame-options']) {
      vulnerabilities.push({
        type: 'missing-header',
        severity: 'medium',
        header: 'X-Frame-Options',
        description: 'X-Frame-Options header is missing',
        impact: 'Vulnerable to clickjacking attacks',
        remediation: 'Add X-Frame-Options: DENY or SAMEORIGIN'
      });
      score -= 10;
    }

    // Check X-Content-Type-Options
    if (!headers['x-content-type-options']) {
      vulnerabilities.push({
        type: 'missing-header',
        severity: 'medium',
        header: 'X-Content-Type-Options',
        description: 'X-Content-Type-Options header is missing',
        impact: 'Vulnerable to MIME type confusion attacks',
        remediation: 'Add X-Content-Type-Options: nosniff'
      });
      score -= 10;
    }

    // Generate recommendations
    if (vulnerabilities.length > 0) {
      recommendations.push('Implement missing security headers');
      recommendations.push('Regular security header audits');
      recommendations.push('Monitor CSP violations');
    }

    // Calculate compliance scores
    const compliance: SecurityCompliance = {
      owasp: {
        score: Math.max(0, score - 20),
        passed: [],
        failed: vulnerabilities.map(v => v.header || v.description)
      },
      mozilla: {
        grade: this.calculateMozillaGrade(score),
        score
      },
      custom: {
        policies: [],
        violations: vulnerabilities.map(v => v.description)
      }
    };

    return {
      headers,
      score,
      vulnerabilities,
      recommendations,
      compliance
    };
  }

  private initializeDefaultCSP(): void {
    // Set secure defaults for gaming platform
    this.cspManager.setDirective('defaultSrc', ["'self'"]);
    this.cspManager.setDirective('scriptSrc', ["'self'", "'unsafe-inline'", 'https://apis.google.com']);
    this.cspManager.setDirective('styleSrc', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    this.cspManager.setDirective('imgSrc', ["'self'", 'data:', 'https:']);
    this.cspManager.setDirective('fontSrc', ["'self'", 'https://fonts.gstatic.com']);
    this.cspManager.setDirective('connectSrc', ["'self'", 'wss:', 'ws:']);
    this.cspManager.setDirective('mediaSrc', ["'self'"]);
    this.cspManager.setDirective('objectSrc', ["'none'"]);
    this.cspManager.setDirective('frameSrc', ["'none'"]);
    this.cspManager.setDirective('frameAncestors', ["'none'"]);
    this.cspManager.setDirective('formAction', ["'self'"]);
    this.cspManager.setDirective('baseUri', ["'self'"]);
    this.cspManager.setDirective('upgradeInsecureRequests', true);

    // Apply custom CSP directives if provided
    if (this.config.cspDirectives) {
      Object.entries(this.config.cspDirectives).forEach(([key, value]) => {
        this.cspManager.setDirective(key as keyof CSPDirectives, value as any);
      });
    }
  }

  private buildHSTSHeader(): string {
    let hsts = `max-age=${this.config.hstsMaxAge}`;
    
    if (this.config.includeSubdomains) {
      hsts += '; includeSubDomains';
    }
    
    if (this.config.preload) {
      hsts += '; preload';
    }
    
    return hsts;
  }

  private buildPermissionsPolicyHeader(): string {
    if (!this.config.permissionsPolicy) return '';

    const policies: string[] = [];
    
    Object.entries(this.config.permissionsPolicy).forEach(([feature, allowlist]) => {
      if (Array.isArray(allowlist)) {
        const sources = allowlist.length === 0 ? '()' : `(${allowlist.join(' ')})`;
        policies.push(`${feature}=${sources}`);
      }
    });

    return policies.join(', ');
  }

  private calculateMozillaGrade(score: number): SecurityCompliance['mozilla']['grade'] {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

/**
 * Security Headers Middleware for Express/Fastify
 */
export class SecurityHeadersMiddleware {
  private headerManager: SecurityHeadersManager;

  constructor(config?: SecurityHeadersConfig) {
    this.headerManager = new SecurityHeadersManager(config);
  }

  /**
   * Express middleware
   */
  express() {
    return (req: any, res: any, next: any) => {
      const headers = this.headerManager.generateHeaders();
      Object.entries(headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });
      next();
    };
  }

  /**
   * Fastify plugin
   */
  fastify() {
    return async (fastify: any) => {
      fastify.addHook('onSend', async (request: any, reply: any) => {
        const headers = this.headerManager.generateHeaders();
        Object.entries(headers).forEach(([name, value]) => {
          reply.header(name, value);
        });
      });
    };
  }

  /**
   * Generic header setter
   */
  setHeaders(setHeader: (name: string, value: string) => void): void {
    const headers = this.headerManager.generateHeaders();
    Object.entries(headers).forEach(([name, value]) => {
      setHeader(name, value);
    });
  }

  /**
   * Get header manager
   */
  getHeaderManager(): SecurityHeadersManager {
    return this.headerManager;
  }
}

/**
 * Browser-side CSP Management
 */
export class BrowserSecurityManager {
  private static instance: BrowserSecurityManager;
  private headerManager: SecurityHeadersManager;
  private violationCount = 0;

  private constructor() {
    this.headerManager = new SecurityHeadersManager();
    this.setupCSPViolationHandler();
  }

  static getInstance(): BrowserSecurityManager {
    if (!BrowserSecurityManager.instance) {
      BrowserSecurityManager.instance = new BrowserSecurityManager();
    }
    return BrowserSecurityManager.instance;
  }

  /**
   * Initialize browser security
   */
  initialize(): void {
    console.log('Initializing browser security...');
    
    this.performSecurityAudit();
    this.monitorSecurityViolations();
    
    console.log('Browser security initialized');
  }

  /**
   * Generate nonce for inline scripts
   */
  generateNonce(): string {
    return this.headerManager.generateNonce();
  }

  /**
   * Audit current page headers
   */
  auditCurrentHeaders(): SecurityAuditResult {
    // This would typically require server response headers
    // For demo purposes, we'll simulate with common headers
    const simulatedHeaders = {
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff'
    };

    return this.headerManager.auditHeaders(simulatedHeaders);
  }

  /**
   * Get violation count
   */
  getViolationCount(): number {
    return this.violationCount;
  }

  /**
   * Get stored violations
   */
  getStoredViolations(): any[] {
    return JSON.parse(localStorage.getItem('csp-violations') || '[]');
  }

  /**
   * Clear stored violations
   */
  clearStoredViolations(): void {
    localStorage.removeItem('csp-violations');
    this.violationCount = 0;
  }

  private setupCSPViolationHandler(): void {
    document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
      this.violationCount++;
      
      const report: CSPViolationReport = {
        documentUri: event.documentURI,
        referrer: event.referrer || undefined,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        disposition: event.disposition as 'enforce' | 'report',
        blockedUri: event.blockedURI,
        lineNumber: event.lineNumber || undefined,
        columnNumber: event.columnNumber || undefined,
        sourceFile: event.sourceFile || undefined,
        statusCode: event.statusCode,
        scriptSample: event.sample || undefined
      };

      this.headerManager.handleCSPViolation(report);
    });
  }

  private performSecurityAudit(): void {
    // Audit security implementation
    const audit = this.auditCurrentHeaders();
    
    if (audit.vulnerabilities.length > 0) {
      console.warn(`Security audit found ${audit.vulnerabilities.length} vulnerabilities:`);
      audit.vulnerabilities.forEach(vuln => {
        console.warn(`- ${vuln.severity.toUpperCase()}: ${vuln.description}`);
      });
    } else {
      console.log('✅ Security audit passed');
    }
  }

  private monitorSecurityViolations(): void {
    // Monitor for various security issues
    const originalLog = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Mixed Content') || 
          message.includes('Content Security Policy') ||
          message.includes('CORS')) {
        this.violationCount++;
      }
      originalLog.apply(console, args);
    };
  }
}

// Export convenience functions
export const securityHeaders = new SecurityHeadersManager();

export const createSecurityMiddleware = (config?: SecurityHeadersConfig) =>
  new SecurityHeadersMiddleware(config);

export const browserSecurity = BrowserSecurityManager.getInstance();

export const initializeBrowserSecurity = () => browserSecurity.initialize();

export const generateSecurityHeaders = (config?: SecurityHeadersConfig) =>
  new SecurityHeadersManager(config).generateHeaders();

// Default export
export default SecurityHeadersManager;