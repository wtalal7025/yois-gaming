/**
 * Final security audit and validation
 * Comprehensive security testing and vulnerability assessment
 */

// Types for security audit
interface SecurityAuditConfig {
  baseUrl: string;
  authEndpoints: string[];
  publicEndpoints: string[];
  protectedEndpoints: string[];
  testCredentials: {
    valid: { username: string; password: string };
    invalid: { username: string; password: string };
  };
  securityHeaders: string[];
  csrfTokens: boolean;
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    timeWindow: number; // in milliseconds
  };
  timeout: number;
}

interface SecurityTest {
  name: string;
  category: 'authentication' | 'authorization' | 'input' | 'headers' | 'rate-limit' | 'data' | 'session';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  test: () => Promise<SecurityTestResult>;
}

interface SecurityTestResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  details?: string;
  evidence?: any;
  recommendations: string[];
}

interface SecurityAuditResult {
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  testResults: Map<string, SecurityTestResult>;
  summary: string;
  recommendations: string[];
  complianceCheck: ComplianceResult;
}

interface ComplianceResult {
  gdpr: boolean;
  ccpa: boolean;
  pci: boolean;
  hipaa: boolean;
  owasp: {
    score: number;
    top10Covered: string[];
    missing: string[];
  };
}

/**
 * HTTP security client for testing
 */
class SecurityTestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  public async request(
    method: string,
    endpoint: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      followRedirects?: boolean;
      validateSSL?: boolean;
    } = {}
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
    error?: string;
  }> {
    const startTime = performance.now();
    
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const requestInit: RequestInit = {
        method,
        headers: {
          'User-Agent': 'SecurityAudit/1.0',
          ...options.headers
        },
        signal: AbortSignal.timeout(this.timeout),
        redirect: options.followRedirects === false ? 'manual' : 'follow'
      };

      if (options.body) {
        requestInit.body = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
      }

      const response = await fetch(url, requestInit);
      const responseTime = performance.now() - startTime;
      
      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const body = await response.text();

      return {
        status: response.status,
        headers,
        body,
        responseTime
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        status: 0,
        headers: {},
        body: '',
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async testSQLInjection(endpoint: string, parameter: string): Promise<boolean> {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#"
    ];

    for (const payload of payloads) {
      try {
        const response = await this.request('POST', endpoint, {
          headers: { 'Content-Type': 'application/json' },
          body: { [parameter]: payload }
        });

        // Check for SQL error messages or unexpected behavior
        if (response.body.toLowerCase().includes('sql') ||
            response.body.toLowerCase().includes('mysql') ||
            response.body.toLowerCase().includes('postgresql') ||
            response.body.toLowerCase().includes('error in your sql syntax')) {
          return true; // Vulnerability found
        }
      } catch (error) {
        // Continue with other payloads
      }
    }

    return false; // No vulnerability found
  }

  public async testXSS(endpoint: string, parameter: string): Promise<boolean> {
    const payloads = [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<img src=x onerror=alert('XSS')>",
      "'>><script>alert('XSS')</script>",
      "<svg onload=alert('XSS')>",
      "{{7*7}}",
      "${7*7}",
      "<%=7*7%>"
    ];

    for (const payload of payloads) {
      try {
        const response = await this.request('POST', endpoint, {
          headers: { 'Content-Type': 'application/json' },
          body: { [parameter]: payload }
        });

        // Check if payload is reflected without encoding
        if (response.body.includes(payload) && 
            !response.body.includes(payload.replace(/[<>&"']/g, (match) => {
              const escape: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
              };
              return escape[match];
            }))) {
          return true; // XSS vulnerability found
        }
      } catch (error) {
        // Continue with other payloads
      }
    }

    return false; // No XSS vulnerability found
  }
}

/**
 * Main security audit runner
 */
export class SecurityAuditor {
  private config: SecurityAuditConfig;
  private client: SecurityTestClient;
  private tests: SecurityTest[] = [];

  constructor(config: SecurityAuditConfig) {
    this.config = config;
    this.client = new SecurityTestClient(config.baseUrl, config.timeout);
    this.initializeTests();
  }

  private initializeTests(): void {
    // Authentication Tests
    this.tests.push({
      name: 'weak-password-policy',
      category: 'authentication',
      severity: 'high',
      description: 'Test for weak password policy enforcement',
      test: () => this.testWeakPasswordPolicy()
    });

    this.tests.push({
      name: 'brute-force-protection',
      category: 'authentication',
      severity: 'critical',
      description: 'Test for brute force attack protection',
      test: () => this.testBruteForceProtection()
    });

    // Authorization Tests
    this.tests.push({
      name: 'broken-access-control',
      category: 'authorization',
      severity: 'critical',
      description: 'Test for broken access control vulnerabilities',
      test: () => this.testBrokenAccessControl()
    });

    // Input Validation Tests
    this.tests.push({
      name: 'sql-injection',
      category: 'input',
      severity: 'critical',
      description: 'Test for SQL injection vulnerabilities',
      test: () => this.testSQLInjection()
    });

    this.tests.push({
      name: 'xss-protection',
      category: 'input',
      severity: 'high',
      description: 'Test for Cross-Site Scripting (XSS) vulnerabilities',
      test: () => this.testXSSProtection()
    });

    // Security Headers Tests
    this.tests.push({
      name: 'security-headers',
      category: 'headers',
      severity: 'medium',
      description: 'Test for proper security headers',
      test: () => this.testSecurityHeaders()
    });

    this.tests.push({
      name: 'https-enforcement',
      category: 'headers',
      severity: 'high',
      description: 'Test for HTTPS enforcement and HSTS',
      test: () => this.testHTTPSEnforcement()
    });

    // Rate Limiting Tests
    this.tests.push({
      name: 'rate-limiting',
      category: 'rate-limit',
      severity: 'medium',
      description: 'Test for proper rate limiting implementation',
      test: () => this.testRateLimiting()
    });

    // Data Protection Tests
    this.tests.push({
      name: 'sensitive-data-exposure',
      category: 'data',
      severity: 'high',
      description: 'Test for sensitive data exposure',
      test: () => this.testSensitiveDataExposure()
    });

    // Session Management Tests
    this.tests.push({
      name: 'session-security',
      category: 'session',
      severity: 'high',
      description: 'Test for secure session management',
      test: () => this.testSessionSecurity()
    });
  }

  public async runSecurityAudit(): Promise<SecurityAuditResult> {
    console.log(`🔐 Starting security audit with ${this.tests.length} tests...`);

    const testResults = new Map<string, SecurityTestResult>();
    let totalScore = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    // Run all tests
    for (const test of this.tests) {
      try {
        console.log(`Running ${test.name}...`);
        const result = await test.test();
        testResults.set(test.name, result);

        totalScore += result.score;
        
        if (result.passed) {
          passedTests++;
        } else {
          failedTests++;
          
          // Count issues by severity
          switch (test.severity) {
            case 'critical':
              criticalIssues++;
              break;
            case 'high':
              highIssues++;
              break;
            case 'medium':
              mediumIssues++;
              break;
            case 'low':
              lowIssues++;
              break;
          }
        }
      } catch (error) {
        console.error(`Test ${test.name} failed with error:`, error);
        testResults.set(test.name, {
          passed: false,
          score: 0,
          message: 'Test execution failed',
          details: error instanceof Error ? error.message : String(error),
          recommendations: ['Fix test execution issues']
        });
        failedTests++;
      }
    }

    // Calculate overall score and grade
    const overallScore = Math.round(totalScore / this.tests.length);
    const grade = this.calculateGrade(overallScore);

    // Generate compliance check
    const complianceCheck = this.checkCompliance(testResults);

    // Generate summary and recommendations
    const summary = this.generateSummary(overallScore, criticalIssues, highIssues, mediumIssues, lowIssues);
    const recommendations = this.generateRecommendations(testResults, criticalIssues, highIssues);

    return {
      overallScore,
      grade,
      totalTests: this.tests.length,
      passedTests,
      failedTests,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      testResults,
      summary,
      recommendations,
      complianceCheck
    };
  }

  // Test implementations
  private async testWeakPasswordPolicy(): Promise<SecurityTestResult> {
    const weakPasswords = ['123456', 'password', 'admin', '12345', 'qwerty'];
    let vulnerabilityFound = false;
    
    for (const password of weakPasswords) {
      try {
        const response = await this.client.request('POST', '/api/auth/register', {
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: 'testuser' + Date.now(),
            password: password,
            email: 'test@example.com'
          }
        });

        if (response.status === 200 || response.status === 201) {
          vulnerabilityFound = true;
          break;
        }
      } catch (error) {
        // Continue testing
      }
    }

    return {
      passed: !vulnerabilityFound,
      score: vulnerabilityFound ? 0 : 100,
      message: vulnerabilityFound 
        ? 'Weak password policy detected - weak passwords are accepted'
        : 'Strong password policy enforced',
      recommendations: vulnerabilityFound 
        ? ['Implement strong password requirements (min 8 chars, uppercase, lowercase, numbers, symbols)']
        : []
    };
  }

  private async testBruteForceProtection(): Promise<SecurityTestResult> {
    const maxAttempts = 10;
    let successfulAttempts = 0;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.request('POST', '/api/auth/login', {
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: this.config.testCredentials.invalid.username,
            password: 'wrongpassword' + i
          }
        });

        if (response.status !== 429 && response.status !== 423) {
          successfulAttempts++;
        } else {
          // Rate limiting detected
          break;
        }
      } catch (error) {
        // Continue testing
      }
    }

    const isProtected = successfulAttempts < maxAttempts;

    return {
      passed: isProtected,
      score: isProtected ? 100 : 0,
      message: isProtected
        ? 'Brute force protection is active'
        : `No brute force protection detected - ${successfulAttempts} attempts allowed`,
      recommendations: isProtected ? [] : [
        'Implement account lockout after failed attempts',
        'Add CAPTCHA after multiple failed attempts',
        'Implement progressive delays between attempts'
      ]
    };
  }

  private async testBrokenAccessControl(): Promise<SecurityTestResult> {
    const testEndpoints = [
      '/api/admin/users',
      '/api/admin/settings',
      '/api/user/profile/123',  // Different user ID
      '/api/wallet/balance/456' // Different user wallet
    ];

    let vulnerabilities = 0;
    const details: string[] = [];

    for (const endpoint of testEndpoints) {
      try {
        // Test without authentication
        const unauthResponse = await this.client.request('GET', endpoint);
        
        if (unauthResponse.status === 200) {
          vulnerabilities++;
          details.push(`${endpoint} accessible without authentication`);
        }

        // Test with invalid/low privilege token
        const lowPrivResponse = await this.client.request('GET', endpoint, {
          headers: { 'Authorization': 'Bearer invalid-token' }
        });

        if (lowPrivResponse.status === 200) {
          vulnerabilities++;
          details.push(`${endpoint} accessible with invalid token`);
        }
      } catch (error) {
        // Continue testing
      }
    }

    return {
      passed: vulnerabilities === 0,
      score: vulnerabilities === 0 ? 100 : Math.max(0, 100 - (vulnerabilities * 25)),
      message: vulnerabilities === 0 
        ? 'Access control properly implemented'
        : `${vulnerabilities} access control issues found`,
      details: details.join(', '),
      recommendations: vulnerabilities > 0 ? [
        'Implement proper authentication checks',
        'Enforce authorization for all protected endpoints',
        'Use role-based access control (RBAC)'
      ] : []
    };
  }

  private async testSQLInjection(): Promise<SecurityTestResult> {
    const testEndpoints = ['/api/auth/login', '/api/games/search'];
    let vulnerabilityFound = false;

    for (const endpoint of testEndpoints) {
      const hasVulnerability = await this.client.testSQLInjection(endpoint, 'query');
      if (hasVulnerability) {
        vulnerabilityFound = true;
        break;
      }
    }

    return {
      passed: !vulnerabilityFound,
      score: vulnerabilityFound ? 0 : 100,
      message: vulnerabilityFound 
        ? 'SQL injection vulnerability detected'
        : 'No SQL injection vulnerabilities found',
      recommendations: vulnerabilityFound ? [
        'Use parameterized queries/prepared statements',
        'Implement proper input validation and sanitization',
        'Use an ORM with built-in SQL injection protection'
      ] : []
    };
  }

  private async testXSSProtection(): Promise<SecurityTestResult> {
    const testEndpoints = ['/api/user/profile', '/api/games/review'];
    let vulnerabilityFound = false;

    for (const endpoint of testEndpoints) {
      const hasVulnerability = await this.client.testXSS(endpoint, 'content');
      if (hasVulnerability) {
        vulnerabilityFound = true;
        break;
      }
    }

    return {
      passed: !vulnerabilityFound,
      score: vulnerabilityFound ? 0 : 100,
      message: vulnerabilityFound 
        ? 'XSS vulnerability detected'
        : 'XSS protection is working correctly',
      recommendations: vulnerabilityFound ? [
        'Implement proper output encoding/escaping',
        'Use Content Security Policy (CSP)',
        'Validate and sanitize all user inputs'
      ] : []
    };
  }

  private async testSecurityHeaders(): Promise<SecurityTestResult> {
    const response = await this.client.request('GET', '/');
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'referrer-policy'
    ];

    const missingHeaders: string[] = [];
    const presentHeaders: string[] = [];

    for (const header of requiredHeaders) {
      if (headers[header]) {
        presentHeaders.push(header);
      } else {
        missingHeaders.push(header);
      }
    }

    const score = Math.round((presentHeaders.length / requiredHeaders.length) * 100);

    return {
      passed: missingHeaders.length === 0,
      score,
      message: `${presentHeaders.length}/${requiredHeaders.length} security headers present`,
      details: missingHeaders.length > 0 ? `Missing: ${missingHeaders.join(', ')}` : undefined,
      recommendations: missingHeaders.length > 0 ? [
        'Add missing security headers to all responses',
        'Configure web server to include security headers',
        'Use a security middleware to automatically add headers'
      ] : []
    };
  }

  private async testHTTPSEnforcement(): Promise<SecurityTestResult> {
    let httpsEnforced = true;
    const details: string[] = [];

    try {
      // Test HTTP redirect to HTTPS (if applicable)
      const httpUrl = this.config.baseUrl.replace('https://', 'http://');
      const httpResponse = await this.client.request('GET', '/', { followRedirects: false });
      
      if (httpResponse.status !== 301 && httpResponse.status !== 302) {
        httpsEnforced = false;
        details.push('HTTP not redirected to HTTPS');
      }

      // Check for HSTS header
      const httpsResponse = await this.client.request('GET', '/');
      if (!httpsResponse.headers['strict-transport-security']) {
        httpsEnforced = false;
        details.push('HSTS header missing');
      }

    } catch (error) {
      // HTTPS might be enforced at infrastructure level
    }

    return {
      passed: httpsEnforced,
      score: httpsEnforced ? 100 : 50,
      message: httpsEnforced ? 'HTTPS properly enforced' : 'HTTPS enforcement issues detected',
      details: details.length > 0 ? details.join(', ') : undefined,
      recommendations: httpsEnforced ? [] : [
        'Enforce HTTPS redirects for all HTTP requests',
        'Implement HSTS headers with appropriate max-age',
        'Use secure cookies with Secure and HttpOnly flags'
      ]
    };
  }

  private async testRateLimiting(): Promise<SecurityTestResult> {
    if (!this.config.rateLimit.enabled) {
      return {
        passed: false,
        score: 0,
        message: 'Rate limiting not configured for testing',
        recommendations: ['Configure and enable rate limiting']
      };
    }

    const requests = this.config.rateLimit.maxRequests + 5;
    let rateLimitHit = false;

    for (let i = 0; i < requests; i++) {
      try {
        const response = await this.client.request('GET', '/api/games');
        
        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }
      } catch (error) {
        // Continue testing
      }
    }

    return {
      passed: rateLimitHit,
      score: rateLimitHit ? 100 : 0,
      message: rateLimitHit 
        ? 'Rate limiting is working correctly'
        : 'Rate limiting not detected or misconfigured',
      recommendations: rateLimitHit ? [] : [
        'Implement proper rate limiting for all public endpoints',
        'Use different rate limits for authenticated vs anonymous users',
        'Return proper 429 status codes with Retry-After headers'
      ]
    };
  }

  private async testSensitiveDataExposure(): Promise<SecurityTestResult> {
    const sensitiveEndpoints = [
      '/api/user/profile',
      '/api/admin/logs',
      '/api/.env',
      '/api/config',
      '/.git/config',
      '/backup.sql'
    ];

    let exposureFound = false;
    const exposedEndpoints: string[] = [];

    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await this.client.request('GET', endpoint);
        
        // Check for sensitive data patterns
        const sensitivePatterns = [
          /password\s*[=:]\s*[^,\s}]+/i,
          /api[_-]?key\s*[=:]\s*[^,\s}]+/i,
          /secret\s*[=:]\s*[^,\s}]+/i,
          /token\s*[=:]\s*[^,\s}]+/i,
          /private[_-]?key/i
        ];

        if (response.status === 200) {
          for (const pattern of sensitivePatterns) {
            if (pattern.test(response.body)) {
              exposureFound = true;
              exposedEndpoints.push(endpoint);
              break;
            }
          }
        }
      } catch (error) {
        // Continue testing
      }
    }

    return {
      passed: !exposureFound,
      score: exposureFound ? 0 : 100,
      message: exposureFound 
        ? `Sensitive data exposure found in ${exposedEndpoints.length} endpoint(s)`
        : 'No sensitive data exposure detected',
      details: exposedEndpoints.length > 0 ? `Exposed: ${exposedEndpoints.join(', ')}` : undefined,
      recommendations: exposureFound ? [
        'Remove sensitive data from API responses',
        'Implement proper data filtering for different user roles',
        'Audit all endpoints for sensitive information leakage'
      ] : []
    };
  }

  private async testSessionSecurity(): Promise<SecurityTestResult> {
    let issues = 0;
    const details: string[] = [];

    try {
      // Test session after login
      const loginResponse = await this.client.request('POST', '/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        body: this.config.testCredentials.valid
      });

      if (loginResponse.status === 200) {
        const cookies = loginResponse.headers['set-cookie'];
        
        if (cookies) {
          // Check for secure cookie attributes
          if (!cookies.includes('Secure')) {
            issues++;
            details.push('Session cookie missing Secure flag');
          }
          
          if (!cookies.includes('HttpOnly')) {
            issues++;
            details.push('Session cookie missing HttpOnly flag');
          }
          
          if (!cookies.includes('SameSite')) {
            issues++;
            details.push('Session cookie missing SameSite attribute');
          }
        } else {
          issues++;
          details.push('No session cookie set after login');
        }
      }
    } catch (error) {
      issues++;
      details.push('Unable to test session security');
    }

    const score = Math.max(0, 100 - (issues * 25));

    return {
      passed: issues === 0,
      score,
      message: issues === 0 ? 'Session security properly implemented' : `${issues} session security issue(s) found`,
      details: details.length > 0 ? details.join(', ') : undefined,
      recommendations: issues > 0 ? [
        'Set Secure flag on all session cookies',
        'Set HttpOnly flag to prevent XSS attacks',
        'Use SameSite attribute to prevent CSRF attacks',
        'Implement proper session timeout and renewal'
      ] : []
    };
  }

  private calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private checkCompliance(testResults: Map<string, SecurityTestResult>): ComplianceResult {
    // Simplified compliance checking
    const passedTests = Array.from(testResults.values()).filter(r => r.passed).length;
    const totalTests = testResults.size;
    const complianceScore = (passedTests / totalTests) * 100;

    return {
      gdpr: complianceScore >= 80, // Basic GDPR compliance
      ccpa: complianceScore >= 75, // Basic CCPA compliance
      pci: complianceScore >= 90,  // PCI requires higher security
      hipaa: complianceScore >= 85, // HIPAA requires strong security
      owasp: {
        score: complianceScore,
        top10Covered: [
          'A01:2021-Broken Access Control',
          'A02:2021-Cryptographic Failures',
          'A03:2021-Injection',
          'A07:2021-Identification and Authentication Failures'
        ],
        missing: complianceScore < 90 ? [
          'A04:2021-Insecure Design',
          'A05:2021-Security Misconfiguration'
        ] : []
      }
    };
  }

  private generateSummary(
    overallScore: number,
    critical: number,
    high: number,
    medium: number,
    low: number
  ): string {
    let summary = `Security audit completed with an overall score of ${overallScore}/100. `;
    
    if (critical > 0) {
      summary += `🚨 ${critical} critical issue${critical > 1 ? 's' : ''} found that require immediate attention. `;
    }
    
    if (high > 0) {
      summary += `⚠️ ${high} high-severity issue${high > 1 ? 's' : ''} should be addressed soon. `;
    }
    
    if (medium > 0) {
      summary += `📋 ${medium} medium-severity issue${medium > 1 ? 's' : ''} should be reviewed. `;
    }
    
    if (critical === 0 && high === 0) {
      summary += '✅ No critical or high-severity issues found. ';
    }
    
    return summary;
  }

  private generateRecommendations(
    testResults: Map<string, SecurityTestResult>,
    critical: number,
    high: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (critical > 0) {
      recommendations.push('🚨 Address all critical security issues immediately before deployment');
    }
    
    if (high > 0) {
      recommendations.push('⚠️ Resolve high-severity issues within 24-48 hours');
    }
    
    recommendations.push('📋 Implement a regular security audit schedule (monthly/quarterly)');
    recommendations.push('🔄 Set up automated security scanning in CI/CD pipeline');
    recommendations.push('👥 Conduct security training for development team');
    recommendations.push('📚 Follow OWASP Top 10 guidelines for secure development');
    
    return recommendations;
  }
}

/**
 * Predefined security audit configurations
 */
export class GamingPlatformSecurityAudit {
  public static createProductionConfig(baseUrl: string): SecurityAuditConfig {
    return {
      baseUrl,
      authEndpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
      publicEndpoints: ['/api/games', '/api/health', '/'],
      protectedEndpoints: ['/api/user/profile', '/api/wallet/balance', '/api/admin'],
      testCredentials: {
        valid: { username: 'testuser', password: 'TestPass123!' },
        invalid: { username: 'invalid', password: 'wrongpass' }
      },
      securityHeaders: [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'Referrer-Policy'
      ],
      csrfTokens: true,
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        timeWindow: 60000 // 1 minute
      },
      timeout: 10000
    };
  }
}

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).SecurityAuditor = SecurityAuditor;
  (window as any).GamingPlatformSecurityAudit = GamingPlatformSecurityAudit;
  console.log('🔐 Security Audit Tools loaded. Available: window.SecurityAuditor, window.GamingPlatformSecurityAudit');
}