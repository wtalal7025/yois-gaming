/**
 * Dynamic Meta Tag Optimization System
 * Provides comprehensive SEO meta tag generation and management for all pages
 */

// Types for meta tag optimization
export interface MetaTagConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  robots?: string;
  author?: string;
  language?: string;
  viewport?: string;
  charset?: string;
  themeColor?: string;
  alternateLanguages?: Array<{ lang: string; href: string }>;
  customTags?: Array<{ name: string; content: string; property?: string }>;
}

export interface PageMetaData {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  category?: string;
  lastModified?: Date;
  priority?: number;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  images?: Array<{
    url: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export interface GameMetaData extends PageMetaData {
  gameId: string;
  gameType: string;
  minBet?: number;
  maxBet?: number;
  rtp?: number;
  volatility?: 'low' | 'medium' | 'high';
  features?: string[];
  releaseDate?: Date;
}

export interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: string[];
  keywordDensity: Record<string, number>;
  readabilityScore: number;
  technicalSEO: {
    hasValidTitle: boolean;
    hasValidDescription: boolean;
    hasCanonical: boolean;
    hasStructuredData: boolean;
    imageOptimization: boolean;
    mobileFriendly: boolean;
    pageSpeed: number;
  };
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: 'title' | 'description' | 'keywords' | 'content' | 'technical' | 'images' | 'links';
  message: string;
  element?: string;
  fix?: string;
}

/**
 * Meta Tag Generator
 */
class MetaTagGenerator {
  private defaultConfig: Partial<MetaTagConfig> = {
    viewport: 'width=device-width, initial-scale=1.0',
    charset: 'UTF-8',
    robots: 'index, follow',
    author: 'Gaming Platform',
    language: 'en',
    themeColor: '#1a1a1a'
  };

  private titleTemplates: Record<string, string> = {
    home: '{title} - Premium Online Gaming Platform',
    game: '{title} - Play Online | {siteName}',
    category: '{title} Games - Online Casino | {siteName}',
    profile: 'My Profile - {siteName}',
    wallet: 'Wallet & Transactions - {siteName}',
    support: 'Help & Support - {siteName}',
    about: 'About Us - {siteName}',
    terms: 'Terms of Service - {siteName}',
    privacy: 'Privacy Policy - {siteName}'
  };

  private descriptionTemplates: Record<string, string> = {
    home: 'Experience the best online gaming platform with {gameCount}+ games, secure transactions, and exciting bonuses. Play now!',
    game: 'Play {title} online with real money. Features {features}. Min bet: {minBet}, Max bet: {maxBet}. Join now for exclusive bonuses!',
    category: 'Discover {count} premium {category} games. High RTPs, secure gaming, instant payouts. Play {category} games now!',
    profile: 'Manage your gaming profile, view statistics, update preferences, and track your gaming journey.',
    wallet: 'Secure wallet management with instant deposits, fast withdrawals, and complete transaction history.',
    support: 'Get help with our comprehensive support center. Find answers, contact support, and resolve issues quickly.'
  };

  /**
   * Generate meta tags for a page
   */
  generateMetaTags(pageData: PageMetaData, template?: string): string {
    const config = this.createMetaConfig(pageData, template);
    return this.renderMetaTags(config);
  }

  /**
   * Generate game-specific meta tags
   */
  generateGameMetaTags(gameData: GameMetaData): string {
    const config = this.createGameMetaConfig(gameData);
    return this.renderMetaTags(config);
  }

  /**
   * Create meta configuration for a page
   */
  createMetaConfig(pageData: PageMetaData, template = 'default'): MetaTagConfig {
    const siteName = 'Gaming Platform';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';

    // Generate title using template
    let title = pageData.title;
    if (this.titleTemplates[template]) {
      title = this.titleTemplates[template]
        .replace('{title}', pageData.title)
        .replace('{siteName}', siteName);
    }

    // Generate description using template
    let description = pageData.description;
    if (this.descriptionTemplates[template]) {
      description = this.descriptionTemplates[template]
        .replace('{title}', pageData.title)
        .replace('{siteName}', siteName);
    }

    // Ensure optimal length
    title = this.optimizeTitle(title);
    description = this.optimizeDescription(description);

    return {
      ...this.defaultConfig,
      title,
      description,
      keywords: pageData.keywords,
      canonical: `${baseUrl}${pageData.path}`,
      customTags: [
        { name: 'page-topic', content: pageData.category || 'gaming' },
        { name: 'content-language', content: 'en' },
        { name: 'revisit-after', content: '7 days' },
        ...(pageData.lastModified ? [{ name: 'last-modified', content: pageData.lastModified.toISOString() }] : [])
      ]
    };
  }

  /**
   * Create game-specific meta configuration
   */
  createGameMetaConfig(gameData: GameMetaData): MetaTagConfig {
    const baseConfig = this.createMetaConfig(gameData, 'game');
    
    // Add game-specific features to description
    const features = gameData.features?.join(', ') || '';
    const enhancedDescription = baseConfig.description
      .replace('{features}', features)
      .replace('{minBet}', gameData.minBet?.toString() || '$0.10')
      .replace('{maxBet}', gameData.maxBet?.toString() || '$500');

    return {
      ...baseConfig,
      description: enhancedDescription,
      customTags: [
        ...baseConfig.customTags || [],
        { name: 'game-type', content: gameData.gameType },
        { name: 'game-id', content: gameData.gameId },
        ...(gameData.rtp ? [{ name: 'rtp', content: `${gameData.rtp}%` }] : []),
        ...(gameData.volatility ? [{ name: 'volatility', content: gameData.volatility }] : []),
        ...(gameData.releaseDate ? [{ name: 'release-date', content: gameData.releaseDate.toISOString() }] : [])
      ]
    };
  }

  /**
   * Render meta tags as HTML string
   */
  renderMetaTags(config: MetaTagConfig): string {
    const tags: string[] = [];

    // Basic meta tags
    if (config.charset) {
      tags.push(`<meta charset="${config.charset}">`);
    }

    if (config.viewport) {
      tags.push(`<meta name="viewport" content="${config.viewport}">`);
    }

    // Title
    tags.push(`<title>${this.escapeHtml(config.title)}</title>`);

    // Description
    tags.push(`<meta name="description" content="${this.escapeHtml(config.description)}">`);

    // Keywords
    if (config.keywords && config.keywords.length > 0) {
      tags.push(`<meta name="keywords" content="${config.keywords.join(', ')}">`);
    }

    // Robots
    if (config.robots) {
      tags.push(`<meta name="robots" content="${config.robots}">`);
    }

    // Author
    if (config.author) {
      tags.push(`<meta name="author" content="${config.author}">`);
    }

    // Language
    if (config.language) {
      tags.push(`<meta name="language" content="${config.language}">`);
      tags.push(`<meta http-equiv="content-language" content="${config.language}">`);
    }

    // Canonical URL
    if (config.canonical) {
      tags.push(`<link rel="canonical" href="${config.canonical}">`);
    }

    // Theme color
    if (config.themeColor) {
      tags.push(`<meta name="theme-color" content="${config.themeColor}">`);
      tags.push(`<meta name="msapplication-TileColor" content="${config.themeColor}">`);
    }

    // Alternate languages
    if (config.alternateLanguages) {
      for (const alt of config.alternateLanguages) {
        tags.push(`<link rel="alternate" hreflang="${alt.lang}" href="${alt.href}">`);
      }
    }

    // Custom tags
    if (config.customTags) {
      for (const tag of config.customTags) {
        if (tag.property) {
          tags.push(`<meta property="${tag.property}" content="${this.escapeHtml(tag.content)}">`);
        } else {
          tags.push(`<meta name="${tag.name}" content="${this.escapeHtml(tag.content)}">`);
        }
      }
    }

    return tags.join('\n');
  }

  /**
   * Optimize title length and format
   */
  private optimizeTitle(title: string): string {
    // Optimal title length: 50-60 characters
    if (title.length > 60) {
      const words = title.split(' ');
      let optimized = '';
      
      for (const word of words) {
        if ((optimized + word).length > 57) {
          optimized = optimized.trim() + '...';
          break;
        }
        optimized += word + ' ';
      }
      
      return optimized.trim() || title.substring(0, 57) + '...';
    }
    
    return title;
  }

  /**
   * Optimize description length and format
   */
  private optimizeDescription(description: string): string {
    // Optimal description length: 150-160 characters
    if (description.length > 160) {
      const sentences = description.split('. ');
      let optimized = '';
      
      for (const sentence of sentences) {
        if ((optimized + sentence).length > 157) {
          if (optimized) {
            optimized = optimized.trim();
            if (!optimized.endsWith('.')) {
              optimized += '.';
            }
          } else {
            optimized = sentence.substring(0, 157) + '...';
          }
          break;
        }
        optimized += sentence + '. ';
      }
      
      return optimized;
    }
    
    return description;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * SEO Analyzer
 */
class SEOAnalyzer {
  /**
   * Analyze page SEO
   */
  analyzePage(pageData: PageMetaData, content?: string): SEOAnalysis {
    const issues: SEOIssue[] = [];
    let score = 100;

    // Title analysis
    const titleAnalysis = this.analyzeTitle(pageData.title);
    issues.push(...titleAnalysis.issues);
    score -= titleAnalysis.penalty;

    // Description analysis
    const descAnalysis = this.analyzeDescription(pageData.description);
    issues.push(...descAnalysis.issues);
    score -= descAnalysis.penalty;

    // Keywords analysis
    const keywordAnalysis = this.analyzeKeywords(pageData.keywords);
    issues.push(...keywordAnalysis.issues);
    score -= keywordAnalysis.penalty;

    // Content analysis (if provided)
    let keywordDensity: Record<string, number> = {};
    let readabilityScore = 0;
    
    if (content) {
      keywordDensity = this.calculateKeywordDensity(content, pageData.keywords);
      readabilityScore = this.calculateReadabilityScore(content);
      
      const contentAnalysis = this.analyzeContent(content, pageData.keywords);
      issues.push(...contentAnalysis.issues);
      score -= contentAnalysis.penalty;
    }

    // Technical SEO
    const technicalSEO = {
      hasValidTitle: pageData.title.length >= 10 && pageData.title.length <= 60,
      hasValidDescription: pageData.description.length >= 120 && pageData.description.length <= 160,
      hasCanonical: true, // Assuming canonical is always set
      hasStructuredData: false, // To be implemented
      imageOptimization: pageData.images?.every(img => img.alt && img.alt.length > 0) || false,
      mobileFriendly: true, // Assuming responsive design
      pageSpeed: 85 // Placeholder - should come from performance monitoring
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      score: Math.max(0, Math.round(score)),
      issues,
      recommendations,
      keywordDensity,
      readabilityScore,
      technicalSEO
    };
  }

  private analyzeTitle(title: string): { issues: SEOIssue[]; penalty: number } {
    const issues: SEOIssue[] = [];
    let penalty = 0;

    if (!title || title.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'title',
        message: 'Missing page title',
        fix: 'Add a descriptive page title'
      });
      penalty += 20;
    } else {
      if (title.length < 10) {
        issues.push({
          type: 'warning',
          category: 'title',
          message: 'Title too short (less than 10 characters)',
          fix: 'Expand title to at least 10 characters'
        });
        penalty += 10;
      } else if (title.length > 60) {
        issues.push({
          type: 'warning',
          category: 'title',
          message: 'Title too long (more than 60 characters)',
          fix: 'Shorten title to under 60 characters'
        });
        penalty += 5;
      }

      // Check for duplicate words
      const words = title.toLowerCase().split(/\s+/);
      const duplicates = words.filter((word, index) => words.indexOf(word) !== index);
      if (duplicates.length > 0) {
        issues.push({
          type: 'info',
          category: 'title',
          message: 'Title contains duplicate words',
          fix: 'Remove duplicate words to improve clarity'
        });
        penalty += 2;
      }
    }

    return { issues, penalty };
  }

  private analyzeDescription(description: string): { issues: SEOIssue[]; penalty: number } {
    const issues: SEOIssue[] = [];
    let penalty = 0;

    if (!description || description.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'description',
        message: 'Missing meta description',
        fix: 'Add a compelling meta description'
      });
      penalty += 15;
    } else {
      if (description.length < 120) {
        issues.push({
          type: 'warning',
          category: 'description',
          message: 'Description too short (less than 120 characters)',
          fix: 'Expand description to at least 120 characters'
        });
        penalty += 8;
      } else if (description.length > 160) {
        issues.push({
          type: 'warning',
          category: 'description',
          message: 'Description too long (more than 160 characters)',
          fix: 'Shorten description to under 160 characters'
        });
        penalty += 5;
      }

      // Check for call-to-action
      const cta_patterns = /\b(play|join|try|start|discover|explore|win|get|claim)\b/i;
      if (!cta_patterns.test(description)) {
        issues.push({
          type: 'info',
          category: 'description',
          message: 'Description lacks call-to-action',
          fix: 'Add action words like "play", "join", or "try"'
        });
        penalty += 3;
      }
    }

    return { issues, penalty };
  }

  private analyzeKeywords(keywords: string[]): { issues: SEOIssue[]; penalty: number } {
    const issues: SEOIssue[] = [];
    let penalty = 0;

    if (!keywords || keywords.length === 0) {
      issues.push({
        type: 'warning',
        category: 'keywords',
        message: 'No keywords specified',
        fix: 'Add relevant keywords for better targeting'
      });
      penalty += 5;
    } else {
      if (keywords.length > 10) {
        issues.push({
          type: 'warning',
          category: 'keywords',
          message: 'Too many keywords (more than 10)',
          fix: 'Focus on 5-10 most relevant keywords'
        });
        penalty += 3;
      }

      // Check keyword length
      const longKeywords = keywords.filter(kw => kw.length > 50);
      if (longKeywords.length > 0) {
        issues.push({
          type: 'info',
          category: 'keywords',
          message: 'Some keywords are too long',
          fix: 'Use shorter, more focused keywords'
        });
        penalty += 2;
      }
    }

    return { issues, penalty };
  }

  private analyzeContent(content: string, keywords: string[]): { issues: SEOIssue[]; penalty: number } {
    const issues: SEOIssue[] = [];
    let penalty = 0;

    // Check content length
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 300) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'Content too short (less than 300 words)',
        fix: 'Add more descriptive content'
      });
      penalty += 10;
    }

    // Check keyword presence in content
    const missingKeywords = keywords.filter(keyword => 
      !content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (missingKeywords.length > 0) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: `Keywords not found in content: ${missingKeywords.join(', ')}`,
        fix: 'Include target keywords naturally in the content'
      });
      penalty += missingKeywords.length * 2;
    }

    return { issues, penalty };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density: Record<string, number> = {};

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const occurrences = content.toLowerCase().split(keywordLower).length - 1;
      density[keyword] = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;
    }

    return density;
  }

  private calculateReadabilityScore(content: string): number {
    // Simple Flesch Reading Ease approximation
    const sentences = content.split(/[.!?]+/).length - 1;
    const words = content.split(/\s+/).length;
    const syllables = this.countSyllables(content);

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/e$/, '')
      .replace(/[aeiouy]{2,}/g, 'a')
      .match(/[aeiouy]/g)?.length || 0;
  }

  private generateRecommendations(issues: SEOIssue[]): string[] {
    const recommendations: string[] = [];
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      recommendations.push('Fix critical SEO errors first - these have the biggest impact on rankings.');
    }

    if (warningCount > 0) {
      recommendations.push('Address SEO warnings to improve page optimization.');
    }

    // Category-specific recommendations
    const categories = [...new Set(issues.map(i => i.category))];
    
    if (categories.includes('title')) {
      recommendations.push('Optimize page titles for both users and search engines.');
    }
    
    if (categories.includes('description')) {
      recommendations.push('Craft compelling meta descriptions that encourage clicks.');
    }
    
    if (categories.includes('keywords')) {
      recommendations.push('Research and target relevant keywords for your audience.');
    }

    if (categories.includes('content')) {
      recommendations.push('Ensure content naturally incorporates target keywords.');
    }

    return recommendations;
  }
}

/**
 * Main Meta Tag Manager
 */
export class MetaTagManager {
  private static instance: MetaTagManager;
  private generator: MetaTagGenerator;
  private analyzer: SEOAnalyzer;
  private pageMetaCache: Map<string, { meta: string; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.generator = new MetaTagGenerator();
    this.analyzer = new SEOAnalyzer();
  }

  static getInstance(): MetaTagManager {
    if (!MetaTagManager.instance) {
      MetaTagManager.instance = new MetaTagManager();
    }
    return MetaTagManager.instance;
  }

  /**
   * Initialize meta tag manager
   */
  initialize(): void {
    console.log('Meta tag optimization system initialized');
    this.setupCacheCleaning();
  }

  /**
   * Generate meta tags for page
   */
  generatePageMeta(pageData: PageMetaData, template?: string): string {
    const cacheKey = `${pageData.path}_${template || 'default'}`;
    const cached = this.pageMetaCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.meta;
    }

    const meta = this.generator.generateMetaTags(pageData, template);
    
    this.pageMetaCache.set(cacheKey, {
      meta,
      timestamp: Date.now()
    });

    return meta;
  }

  /**
   * Generate game meta tags
   */
  generateGameMeta(gameData: GameMetaData): string {
    return this.generator.generateGameMetaTags(gameData);
  }

  /**
   * Analyze page SEO
   */
  analyzePage(pageData: PageMetaData, content?: string): SEOAnalysis {
    return this.analyzer.analyzePage(pageData, content);
  }

  /**
   * Bulk analyze pages
   */
  async analyzePages(pages: PageMetaData[]): Promise<Record<string, SEOAnalysis>> {
    const results: Record<string, SEOAnalysis> = {};
    
    for (const page of pages) {
      results[page.path] = this.analyzer.analyzePage(page);
    }
    
    return results;
  }

  /**
   * Clear meta tag cache
   */
  clearCache(): void {
    this.pageMetaCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.pageMetaCache.size,
      hitRate: 0 // Would need to implement hit tracking
    };
  }

  private setupCacheCleaning(): void {
    // Clean expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.pageMetaCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.pageMetaCache.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export convenience functions
export const metaTagManager = MetaTagManager.getInstance();

export const initializeMetaTags = () => metaTagManager.initialize();

export const generatePageMeta = (pageData: PageMetaData, template?: string) =>
  metaTagManager.generatePageMeta(pageData, template);

export const generateGameMeta = (gameData: GameMetaData) =>
  metaTagManager.generateGameMeta(gameData);

export const analyzePage = (pageData: PageMetaData, content?: string) =>
  metaTagManager.analyzePage(pageData, content);

// Default export
export default MetaTagManager;