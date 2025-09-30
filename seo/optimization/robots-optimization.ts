/**
 * Robots.txt Optimization and Management System
 * Provides comprehensive robots.txt generation with crawling optimization and security controls
 */

// Types for robots.txt optimization
export interface RobotsConfig {
  userAgents: RobotsUserAgent[];
  sitemaps: string[];
  crawlDelay?: number;
  host?: string;
  cleanParam?: string[];
  disallowPatterns: string[];
  allowPatterns: string[];
  securityRules: RobotsSecurityRule[];
  customDirectives: RobotsDirective[];
}

export interface RobotsUserAgent {
  name: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
  requestRate?: string;
  visitTime?: string;
  noIndex?: string[];
}

export interface RobotsSecurityRule {
  pattern: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'disallow' | 'block';
}

export interface RobotsDirective {
  directive: string;
  value: string;
  userAgent?: string;
  comment?: string;
}

export interface CrawlOptimization {
  highPriorityPaths: string[];
  lowPriorityPaths: string[];
  excludedPaths: string[];
  crawlBudgetAllocation: Record<string, number>;
  botSpecificRules: Record<string, RobotsBotRule>;
}

export interface RobotsBotRule {
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelay: number;
  requestRate?: string;
  specialInstructions?: string[];
}

export interface RobotsValidation {
  isValid: boolean;
  errors: RobotsError[];
  warnings: RobotsWarning[];
  suggestions: string[];
  coverage: {
    allowedPaths: number;
    disallowedPaths: number;
    uncoveredPaths: number;
  };
}

export interface RobotsError {
  type: 'syntax' | 'security' | 'logic' | 'performance';
  line?: number;
  message: string;
  fix: string;
}

export interface RobotsWarning {
  type: 'optimization' | 'compatibility' | 'best-practice';
  line?: number;
  message: string;
  recommendation: string;
}

/**
 * Robots.txt Generator
 */
class RobotsGenerator {
  private config: RobotsConfig;
  private baseUrl: string;

  constructor(config: RobotsConfig, baseUrl: string) {
    this.config = config;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate robots.txt content
   */
  generateRobots(): string {
    const lines: string[] = [];

    // Add header comment
    lines.push('# Robots.txt for Gaming Platform');
    lines.push('# Generated on: ' + new Date().toISOString());
    lines.push('# See https://www.robotstxt.org/ for documentation');
    lines.push('');

    // Add host directive if specified
    if (this.config.host) {
      lines.push(`Host: ${this.config.host}`);
      lines.push('');
    }

    // Add user agent specific rules
    for (const userAgent of this.config.userAgents) {
      lines.push(...this.generateUserAgentRules(userAgent));
      lines.push('');
    }

    // Add sitemaps
    if (this.config.sitemaps.length > 0) {
      lines.push('# Sitemaps');
      for (const sitemap of this.config.sitemaps) {
        const sitemapUrl = sitemap.startsWith('http') ? sitemap : `${this.baseUrl}${sitemap}`;
        lines.push(`Sitemap: ${sitemapUrl}`);
      }
      lines.push('');
    }

    // Add clean-param directives (Yandex specific)
    if (this.config.cleanParam && this.config.cleanParam.length > 0) {
      lines.push('# Clean Parameters (Yandex)');
      for (const param of this.config.cleanParam) {
        lines.push(`Clean-param: ${param}`);
      }
      lines.push('');
    }

    // Add custom directives
    if (this.config.customDirectives.length > 0) {
      lines.push('# Custom Directives');
      for (const directive of this.config.customDirectives) {
        if (directive.comment) {
          lines.push(`# ${directive.comment}`);
        }
        if (directive.userAgent) {
          lines.push(`User-agent: ${directive.userAgent}`);
        }
        lines.push(`${directive.directive}: ${directive.value}`);
      }
      lines.push('');
    }

    // Add security notice
    lines.push('# Security Notice');
    lines.push('# Unauthorized crawling or scraping is prohibited');
    lines.push('# Contact: security@gamingplatform.com');

    return lines.join('\n').trim();
  }

  /**
   * Generate development robots.txt (blocks all crawlers)
   */
  generateDevelopmentRobots(): string {
    return [
      '# Development Environment - Block All Crawlers',
      '# This site is under development',
      '',
      'User-agent: *',
      'Disallow: /',
      '',
      '# Even block common crawlers explicitly',
      'User-agent: Googlebot',
      'Disallow: /',
      '',
      'User-agent: Bingbot',
      'Disallow: /',
      '',
      'User-agent: facebookexternalhit',
      'Disallow: /',
      '',
      '# No sitemaps in development',
      '# Sitemap: (none)',
      ''
    ].join('\n');
  }

  /**
   * Generate production-optimized robots.txt
   */
  generateProductionRobots(): string {
    // Override config for production optimization
    const productionConfig: RobotsConfig = {
      ...this.config,
      userAgents: [
        {
          name: '*',
          allow: ['/games/', '/games/category/', '/support/', '/about/'],
          disallow: [
            '/api/',
            '/admin/',
            '/auth/',
            '/profile/',
            '/wallet/',
            '/*?*',
            '/*#*',
            '/_next/',
            '/private/',
            '/tmp/',
            '/*.json$',
            '/*.xml$',
            '/search?*'
          ],
          crawlDelay: 1
        },
        {
          name: 'Googlebot',
          allow: ['/games/', '/games/category/', '/support/', '/about/', '/sitemap.xml'],
          disallow: ['/api/', '/admin/', '/auth/', '/profile/', '/wallet/'],
          crawlDelay: 1
        },
        {
          name: 'Bingbot',
          allow: ['/games/', '/games/category/', '/support/', '/about/'],
          disallow: ['/api/', '/admin/', '/auth/', '/profile/', '/wallet/'],
          crawlDelay: 2
        },
        {
          name: 'facebookexternalhit',
          allow: ['/games/', '/about/'],
          disallow: ['*'],
          crawlDelay: 5
        }
      ]
    };

    const productionGenerator = new RobotsGenerator(productionConfig, this.baseUrl);
    return productionGenerator.generateRobots();
  }

  private generateUserAgentRules(userAgent: RobotsUserAgent): string[] {
    const lines: string[] = [];

    lines.push(`User-agent: ${userAgent.name}`);

    // Add allow rules first
    for (const allowPath of userAgent.allow) {
      lines.push(`Allow: ${allowPath}`);
    }

    // Add disallow rules
    for (const disallowPath of userAgent.disallow) {
      lines.push(`Disallow: ${disallowPath}`);
    }

    // Add crawl delay
    if (userAgent.crawlDelay) {
      lines.push(`Crawl-delay: ${userAgent.crawlDelay}`);
    }

    // Add request rate (Google specific)
    if (userAgent.requestRate) {
      lines.push(`Request-rate: ${userAgent.requestRate}`);
    }

    // Add visit time (Google specific)
    if (userAgent.visitTime) {
      lines.push(`Visit-time: ${userAgent.visitTime}`);
    }

    // Add noindex directives (if supported)
    if (userAgent.noIndex && userAgent.noIndex.length > 0) {
      for (const noIndexPath of userAgent.noIndex) {
        lines.push(`Noindex: ${noIndexPath}`);
      }
    }

    return lines;
  }
}

/**
 * Robots.txt Validator
 */
class RobotsValidator {
  private knownUserAgents = [
    '*', 'Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 
    'Baiduspider', 'YandexBot', 'facebookexternalhit', 'Twitterbot',
    'LinkedInBot', 'WhatsApp', 'Applebot', 'MJ12bot'
  ];

  private dangerousPatterns = [
    { pattern: /allow:\s*\/admin/i, severity: 'critical' as const, message: 'Admin paths should not be explicitly allowed' },
    { pattern: /allow:\s*\/api/i, severity: 'high' as const, message: 'API endpoints should not be publicly crawlable' },
    { pattern: /allow:\s*\/auth/i, severity: 'critical' as const, message: 'Authentication paths should never be allowed' },
    { pattern: /allow:\s*\/private/i, severity: 'critical' as const, message: 'Private paths should never be allowed' },
    { pattern: /disallow:\s*\/$/i, severity: 'high' as const, message: 'Disallowing entire site may harm SEO' }
  ];

  /**
   * Validate robots.txt content
   */
  validate(robotsContent: string): RobotsValidation {
    const errors: RobotsError[] = [];
    const warnings: RobotsWarning[] = [];
    const suggestions: string[] = [];

    const lines = robotsContent.split('\n');
    let allowedPaths = 0;
    let disallowedPaths = 0;
    let currentUserAgent = '';
    let hasSitemap = false;
    let hasUserAgent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      if (line.startsWith('#') || line === '') {
        continue; // Skip comments and empty lines
      }

      // Validate line format
      if (!this.isValidDirective(line)) {
        errors.push({
          type: 'syntax',
          line: lineNumber,
          message: `Invalid directive format: ${line}`,
          fix: 'Use format "Directive: value"'
        });
        continue;
      }

      const [directive, value] = line.split(':', 2).map(s => s.trim());

      // Validate specific directives
      switch (directive.toLowerCase()) {
        case 'user-agent':
          hasUserAgent = true;
          currentUserAgent = value;
          this.validateUserAgent(value, lineNumber, warnings);
          break;

        case 'allow':
          allowedPaths++;
          this.validatePath(value, 'allow', lineNumber, errors, warnings);
          break;

        case 'disallow':
          disallowedPaths++;
          this.validatePath(value, 'disallow', lineNumber, errors, warnings);
          break;

        case 'crawl-delay':
          this.validateCrawlDelay(value, lineNumber, errors, warnings);
          break;

        case 'sitemap':
          hasSitemap = true;
          this.validateSitemap(value, lineNumber, errors, warnings);
          break;

        case 'host':
          this.validateHost(value, lineNumber, errors, warnings);
          break;

        default:
          warnings.push({
            type: 'compatibility',
            line: lineNumber,
            message: `Unknown directive: ${directive}`,
            recommendation: 'Verify directive is supported by target crawlers'
          });
      }

      // Check for dangerous patterns
      for (const pattern of this.dangerousPatterns) {
        if (pattern.pattern.test(line)) {
          errors.push({
            type: 'security',
            line: lineNumber,
            message: pattern.message,
            fix: 'Remove or modify this directive for security'
          });
        }
      }
    }

    // Overall validation checks
    if (!hasUserAgent) {
      errors.push({
        type: 'syntax',
        message: 'No User-agent directives found',
        fix: 'Add at least one User-agent directive'
      });
    }

    if (!hasSitemap) {
      warnings.push({
        type: 'best-practice',
        message: 'No sitemap specified',
        recommendation: 'Add Sitemap directive to help crawlers discover content'
      });
    }

    // Generate suggestions
    if (allowedPaths === 0 && disallowedPaths > 0) {
      suggestions.push('Consider adding Allow directives for important content');
    }

    if (disallowedPaths > allowedPaths * 3) {
      suggestions.push('You have many more Disallow than Allow rules - ensure important content is crawlable');
    }

    suggestions.push('Test your robots.txt with Google Search Console');
    suggestions.push('Monitor crawl budget usage in search console');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      coverage: {
        allowedPaths,
        disallowedPaths,
        uncoveredPaths: 0 // Would need site analysis to calculate
      }
    };
  }

  private isValidDirective(line: string): boolean {
    return /^[a-zA-Z-]+\s*:\s*.+$/.test(line);
  }

  private validateUserAgent(value: string, lineNumber: number, warnings: RobotsWarning[]): void {
    if (value === '') {
      warnings.push({
        type: 'best-practice',
        line: lineNumber,
        message: 'Empty user-agent value',
        recommendation: 'Use "*" for all user agents or specify a specific crawler'
      });
    }

    if (value !== '*' && !this.knownUserAgents.includes(value)) {
      warnings.push({
        type: 'compatibility',
        line: lineNumber,
        message: `Unknown user agent: ${value}`,
        recommendation: 'Verify this user agent name is correct'
      });
    }
  }

  private validatePath(value: string, type: 'allow' | 'disallow', lineNumber: number, errors: RobotsError[], warnings: RobotsWarning[]): void {
    if (value === '') {
      if (type === 'disallow') {
        warnings.push({
          type: 'best-practice',
          line: lineNumber,
          message: 'Empty Disallow allows all paths',
          recommendation: 'Use "Disallow:" only if you want to allow everything'
        });
      } else {
        warnings.push({
          type: 'optimization',
          line: lineNumber,
          message: 'Empty Allow directive has no effect',
          recommendation: 'Remove empty Allow directive'
        });
      }
    }

    if (!value.startsWith('/') && value !== '*') {
      warnings.push({
        type: 'best-practice',
        line: lineNumber,
        message: 'Path should start with "/"',
        recommendation: 'Ensure paths are relative to site root'
      });
    }

    // Check for overly broad disallows
    if (type === 'disallow' && (value === '/' || value === '*')) {
      warnings.push({
        type: 'optimization',
        line: lineNumber,
        message: 'Blocking entire site may hurt SEO',
        recommendation: 'Be more specific about what to block'
      });
    }
  }

  private validateCrawlDelay(value: string, lineNumber: number, errors: RobotsError[], warnings: RobotsWarning[]): void {
    const delay = parseFloat(value);
    
    if (isNaN(delay)) {
      errors.push({
        type: 'syntax',
        line: lineNumber,
        message: 'Crawl-delay must be a number',
        fix: 'Use numeric value for crawl delay in seconds'
      });
      return;
    }

    if (delay < 0) {
      errors.push({
        type: 'logic',
        line: lineNumber,
        message: 'Crawl-delay cannot be negative',
        fix: 'Use positive number for crawl delay'
      });
    }

    if (delay > 60) {
      warnings.push({
        type: 'optimization',
        line: lineNumber,
        message: 'Very high crawl delay may reduce indexing',
        recommendation: 'Consider shorter delay unless necessary for server protection'
      });
    }
  }

  private validateSitemap(value: string, lineNumber: number, errors: RobotsError[], warnings: RobotsWarning[]): void {
    if (!value.startsWith('http')) {
      errors.push({
        type: 'syntax',
        line: lineNumber,
        message: 'Sitemap must be absolute URL',
        fix: 'Use full URL starting with http:// or https://'
      });
    }

    if (!value.endsWith('.xml')) {
      warnings.push({
        type: 'best-practice',
        line: lineNumber,
        message: 'Sitemap should typically be XML format',
        recommendation: 'Verify sitemap format is correct'
      });
    }
  }

  private validateHost(value: string, lineNumber: number, errors: RobotsError[], warnings: RobotsWarning[]): void {
    if (!value.includes('.')) {
      warnings.push({
        type: 'best-practice',
        line: lineNumber,
        message: 'Host should be a valid domain',
        recommendation: 'Use format "example.com" or "www.example.com"'
      });
    }
  }
}

/**
 * Crawl Optimization Manager
 */
class CrawlOptimizationManager {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate crawl optimization recommendations
   */
  generateOptimizations(siteStructure: string[]): CrawlOptimization {
    const highPriorityPaths = this.identifyHighPriorityPaths(siteStructure);
    const lowPriorityPaths = this.identifyLowPriorityPaths(siteStructure);
    const excludedPaths = this.identifyExcludedPaths(siteStructure);

    return {
      highPriorityPaths,
      lowPriorityPaths,
      excludedPaths,
      crawlBudgetAllocation: this.calculateCrawlBudget(highPriorityPaths, lowPriorityPaths),
      botSpecificRules: this.generateBotSpecificRules()
    };
  }

  private identifyHighPriorityPaths(paths: string[]): string[] {
    const highPriority = [
      '/',
      '/games/',
      '/games/category/',
      '/about/',
      '/support/',
      '/sitemap.xml'
    ];

    // Add game-specific paths that are frequently accessed
    const gamesPaths = paths.filter(path => 
      path.startsWith('/games/') && 
      !path.includes('?') && 
      !path.includes('#')
    );

    return [...highPriority, ...gamesPaths];
  }

  private identifyLowPriorityPaths(paths: string[]): string[] {
    return paths.filter(path => 
      path.startsWith('/terms') ||
      path.startsWith('/privacy') ||
      path.startsWith('/legal/') ||
      path.includes('/archive/')
    );
  }

  private identifyExcludedPaths(paths: string[]): string[] {
    return paths.filter(path =>
      path.startsWith('/api/') ||
      path.startsWith('/admin/') ||
      path.startsWith('/auth/') ||
      path.startsWith('/profile/') ||
      path.startsWith('/wallet/') ||
      path.includes('?') ||
      path.includes('#') ||
      path.startsWith('/_next/') ||
      path.startsWith('/private/')
    );
  }

  private calculateCrawlBudget(highPriority: string[], lowPriority: string[]): Record<string, number> {
    const totalBudget = 1000; // Assume daily crawl budget
    
    return {
      highPriority: Math.floor(totalBudget * 0.6),
      mediumPriority: Math.floor(totalBudget * 0.3),
      lowPriority: Math.floor(totalBudget * 0.1)
    };
  }

  private generateBotSpecificRules(): Record<string, RobotsBotRule> {
    return {
      'Googlebot': {
        allowedPaths: ['/games/', '/games/category/', '/about/', '/support/'],
        disallowedPaths: ['/api/', '/admin/', '/auth/'],
        crawlDelay: 1,
        requestRate: '1',
        specialInstructions: ['Prioritize game pages', 'Index category pages daily']
      },
      'Bingbot': {
        allowedPaths: ['/games/', '/games/category/', '/about/'],
        disallowedPaths: ['/api/', '/admin/', '/auth/', '/profile/'],
        crawlDelay: 2,
        specialInstructions: ['Focus on static content']
      },
      'facebookexternalhit': {
        allowedPaths: ['/games/', '/about/'],
        disallowedPaths: ['*'],
        crawlDelay: 5,
        specialInstructions: ['Only for social sharing preview']
      }
    };
  }
}

/**
 * Main Robots Optimization Manager
 */
export class RobotsOptimizationManager {
  private static instance: RobotsOptimizationManager;
  private generator: RobotsGenerator;
  private validator: RobotsValidator;
  private optimizer: CrawlOptimizationManager;
  private config: RobotsConfig;
  private cache: Map<string, { content: string; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
    
    this.config = {
      userAgents: [
        {
          name: '*',
          allow: ['/games/', '/about/', '/support/'],
          disallow: ['/api/', '/admin/', '/auth/', '/profile/', '/wallet/', '/*?*'],
          crawlDelay: 1
        }
      ],
      sitemaps: ['/sitemap.xml', '/sitemap-games.xml'],
      disallowPatterns: ['/api/', '/admin/', '/auth/', '/profile/', '/wallet/'],
      allowPatterns: ['/games/', '/about/', '/support/'],
      securityRules: [
        {
          pattern: '/admin/',
          reason: 'Administrative interface should not be crawled',
          severity: 'critical',
          action: 'disallow'
        },
        {
          pattern: '/api/',
          reason: 'API endpoints should not be indexed',
          severity: 'high', 
          action: 'disallow'
        }
      ],
      customDirectives: []
    };

    this.generator = new RobotsGenerator(this.config, baseUrl);
    this.validator = new RobotsValidator();
    this.optimizer = new CrawlOptimizationManager(baseUrl);
  }

  static getInstance(): RobotsOptimizationManager {
    if (!RobotsOptimizationManager.instance) {
      RobotsOptimizationManager.instance = new RobotsOptimizationManager();
    }
    return RobotsOptimizationManager.instance;
  }

  /**
   * Initialize robots optimization
   */
  initialize(customConfig?: Partial<RobotsConfig>): void {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
      this.generator = new RobotsGenerator(this.config, baseUrl);
    }

    console.log('Robots.txt optimization system initialized');
  }

  /**
   * Generate robots.txt for current environment
   */
  generateRobots(environment: 'development' | 'staging' | 'production' = 'production'): string {
    const cacheKey = `robots_${environment}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.content;
    }

    let content: string;

    switch (environment) {
      case 'development':
        content = this.generator.generateDevelopmentRobots();
        break;
      case 'staging':
        content = this.generator.generateDevelopmentRobots(); // Block staging too
        break;
      case 'production':
        content = this.generator.generateProductionRobots();
        break;
      default:
        content = this.generator.generateRobots();
    }

    this.cache.set(cacheKey, {
      content,
      timestamp: Date.now()
    });

    return content;
  }

  /**
   * Validate robots.txt content
   */
  validateRobots(content: string): RobotsValidation {
    return this.validator.validate(content);
  }

  /**
   * Generate crawl optimization recommendations
   */
  generateCrawlOptimizations(siteStructure: string[]): CrawlOptimization {
    return this.optimizer.generateOptimizations(siteStructure);
  }

  /**
   * Test robots.txt against specific paths
   */
  testRobots(robotsContent: string, userAgent: string, paths: string[]): Record<string, boolean> {
    // This would implement robots.txt parsing and path testing
    // For now, return a simplified implementation
    const results: Record<string, boolean> = {};
    const lines = robotsContent.split('\n');
    
    let currentUserAgent = '';
    let disallowedPaths: string[] = [];
    let allowedPaths: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('User-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        if (agent === userAgent || agent === '*') {
          currentUserAgent = agent;
          disallowedPaths = [];
          allowedPaths = [];
        }
      } else if (currentUserAgent && trimmed.startsWith('Disallow:')) {
        const path = trimmed.split(':')[1].trim();
        if (path) disallowedPaths.push(path);
      } else if (currentUserAgent && trimmed.startsWith('Allow:')) {
        const path = trimmed.split(':')[1].trim();
        if (path) allowedPaths.push(path);
      }
    }

    for (const path of paths) {
      let isAllowed = true;
      
      // Check disallow patterns
      for (const disallowPattern of disallowedPaths) {
        if (this.matchesPattern(path, disallowPattern)) {
          isAllowed = false;
          break;
        }
      }
      
      // Check allow patterns (overrides disallow)
      for (const allowPattern of allowedPaths) {
        if (this.matchesPattern(path, allowPattern)) {
          isAllowed = true;
          break;
        }
      }
      
      results[path] = isAllowed;
    }

    return results;
  }

  /**
   * Clear robots cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - in production would use proper robots.txt pattern matching
    if (pattern === '/') return true;
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    }
    return path.startsWith(pattern);
  }
}

// Export convenience functions
export const robotsManager = RobotsOptimizationManager.getInstance();

export const initializeRobots = (config?: Partial<RobotsConfig>) => 
  robotsManager.initialize(config);

export const generateRobots = (environment?: 'development' | 'staging' | 'production') =>
  robotsManager.generateRobots(environment);

export const validateRobots = (content: string) => robotsManager.validateRobots(content);

export const testRobots = (robotsContent: string, userAgent: string, paths: string[]) =>
  robotsManager.testRobots(robotsContent, userAgent, paths);

// Default export
export default RobotsOptimizationManager;