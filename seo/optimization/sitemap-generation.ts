/**
 * Dynamic Sitemap Generation System
 * Provides comprehensive XML sitemap generation with priority optimization and change frequency management
 */

// Types for sitemap generation
export interface SitemapEntry {
  url: string;
  lastmod?: Date;
  changefreq?: ChangeFrequency;
  priority?: number;
  images?: SitemapImage[];
  videos?: SitemapVideo[];
  alternates?: SitemapAlternate[];
}

export interface SitemapImage {
  url: string;
  caption?: string;
  geoLocation?: string;
  title?: string;
  license?: string;
}

export interface SitemapVideo {
  thumbnailUrl: string;
  title: string;
  description: string;
  contentUrl?: string;
  playerUrl?: string;
  duration?: number;
  expirationDate?: Date;
  rating?: number;
  viewCount?: number;
  publicationDate?: Date;
  familyFriendly?: boolean;
  tags?: string[];
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapConfig {
  baseUrl: string;
  defaultChangeFreq: ChangeFrequency;
  defaultPriority: number;
  maxEntries: number;
  excludePatterns: RegExp[];
  includeImages: boolean;
  includeVideos: boolean;
  includeAlternates: boolean;
}

export interface SitemapIndex {
  sitemaps: Array<{
    url: string;
    lastmod: Date;
    entryCount?: number;
  }>;
}

export type ChangeFrequency = 
  | 'always' 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'yearly' 
  | 'never';

export interface GameSitemapData {
  gameId: string;
  slug: string;
  name: string;
  category: string;
  lastModified: Date;
  isActive: boolean;
  images?: string[];
  popularity?: number;
}

export interface CategorySitemapData {
  slug: string;
  name: string;
  gameCount: number;
  lastModified: Date;
  priority?: number;
}

/**
 * Sitemap URL Builder
 */
class SitemapUrlBuilder {
  private baseUrl: string;
  private routes: Map<string, { pattern: string; priority: number; changefreq: ChangeFrequency }> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.initializeRoutes();
  }

  /**
   * Build sitemap entry for a URL
   */
  buildEntry(
    path: string, 
    lastmod?: Date, 
    customPriority?: number, 
    customChangefreq?: ChangeFrequency
  ): SitemapEntry {
    const url = `${this.baseUrl}${path}`;
    const routeConfig = this.getRouteConfig(path);

    return {
      url,
      lastmod: lastmod || new Date(),
      changefreq: customChangefreq || routeConfig.changefreq,
      priority: customPriority || routeConfig.priority
    };
  }

  /**
   * Build game sitemap entry
   */
  buildGameEntry(game: GameSitemapData): SitemapEntry {
    const path = `/games/${game.slug}`;
    const priority = this.calculateGamePriority(game);
    const changefreq = game.isActive ? 'weekly' : 'monthly';

    const entry: SitemapEntry = {
      url: `${this.baseUrl}${path}`,
      lastmod: game.lastModified,
      changefreq: changefreq as ChangeFrequency,
      priority
    };

    // Add images if available
    if (game.images && game.images.length > 0) {
      entry.images = game.images.map(imageUrl => ({
        url: imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`,
        title: `${game.name} Screenshot`,
        caption: `Play ${game.name} online - ${game.category} game`
      }));
    }

    return entry;
  }

  /**
   * Build category sitemap entry
   */
  buildCategoryEntry(category: CategorySitemapData): SitemapEntry {
    const path = `/games/category/${category.slug}`;
    const priority = category.priority || this.calculateCategoryPriority(category);

    return {
      url: `${this.baseUrl}${path}`,
      lastmod: category.lastModified,
      changefreq: 'daily',
      priority
    };
  }

  /**
   * Build static page entry
   */
  buildStaticPageEntry(
    path: string, 
    title: string, 
    lastmod?: Date
  ): SitemapEntry {
    return this.buildEntry(path, lastmod);
  }

  private initializeRoutes(): void {
    // Define priority and change frequency for different route patterns
    this.routes.set('/', { pattern: '^/$', priority: 1.0, changefreq: 'daily' });
    this.routes.set('/games', { pattern: '^/games$', priority: 0.9, changefreq: 'daily' });
    this.routes.set('/games/category', { pattern: '^/games/category/', priority: 0.8, changefreq: 'daily' });
    this.routes.set('/games/game', { pattern: '^/games/', priority: 0.7, changefreq: 'weekly' });
    this.routes.set('/profile', { pattern: '^/profile', priority: 0.3, changefreq: 'monthly' });
    this.routes.set('/wallet', { pattern: '^/wallet', priority: 0.3, changefreq: 'monthly' });
    this.routes.set('/support', { pattern: '^/support', priority: 0.6, changefreq: 'monthly' });
    this.routes.set('/about', { pattern: '^/about', priority: 0.5, changefreq: 'yearly' });
    this.routes.set('/terms', { pattern: '^/terms', priority: 0.4, changefreq: 'yearly' });
    this.routes.set('/privacy', { pattern: '^/privacy', priority: 0.4, changefreq: 'yearly' });
  }

  private getRouteConfig(path: string): { priority: number; changefreq: ChangeFrequency } {
    for (const [, config] of this.routes) {
      if (new RegExp(config.pattern).test(path)) {
        return { priority: config.priority, changefreq: config.changefreq };
      }
    }
    
    // Default values for unknown routes
    return { priority: 0.5, changefreq: 'weekly' };
  }

  private calculateGamePriority(game: GameSitemapData): number {
    let priority = 0.7; // Base priority for games

    // Adjust based on popularity
    if (game.popularity) {
      if (game.popularity > 80) priority = 0.9;
      else if (game.popularity > 60) priority = 0.8;
      else if (game.popularity > 40) priority = 0.7;
      else if (game.popularity > 20) priority = 0.6;
      else priority = 0.5;
    }

    // Boost active games
    if (game.isActive) {
      priority += 0.1;
    }

    // Recent games get a boost
    const daysSinceModified = Math.floor((Date.now() - game.lastModified.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceModified < 7) {
      priority += 0.1;
    }

    return Math.min(1.0, Math.round(priority * 10) / 10);
  }

  private calculateCategoryPriority(category: CategorySitemapData): number {
    let priority = 0.8; // Base priority for categories

    // Adjust based on game count
    if (category.gameCount > 20) priority = 0.9;
    else if (category.gameCount > 10) priority = 0.8;
    else if (category.gameCount > 5) priority = 0.7;
    else priority = 0.6;

    return Math.min(1.0, Math.round(priority * 10) / 10);
  }
}

/**
 * XML Sitemap Generator
 */
class XMLSitemapGenerator {
  private config: SitemapConfig;

  constructor(config: SitemapConfig) {
    this.config = config;
  }

  /**
   * Generate XML sitemap from entries
   */
  generateSitemap(entries: SitemapEntry[]): string {
    // Filter and limit entries
    const filteredEntries = this.filterEntries(entries);
    const limitedEntries = filteredEntries.slice(0, this.config.maxEntries);

    const xml = this.buildXMLDocument(limitedEntries);
    return this.formatXML(xml);
  }

  /**
   * Generate sitemap index XML
   */
  generateSitemapIndex(index: SitemapIndex): string {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    for (const sitemap of index.sitemaps) {
      xml.push('  <sitemap>');
      xml.push(`    <loc>${this.escapeXML(sitemap.url)}</loc>`);
      xml.push(`    <lastmod>${sitemap.lastmod.toISOString()}</lastmod>`);
      xml.push('  </sitemap>');
    }

    xml.push('</sitemapindex>');
    return xml.join('\n');
  }

  /**
   * Generate robots.txt compatible sitemap references
   */
  generateRobotsReferences(sitemapUrls: string[]): string {
    return sitemapUrls.map(url => `Sitemap: ${url}`).join('\n');
  }

  private buildXMLDocument(entries: SitemapEntry[]): string[] {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    ];

    // Add namespaces if needed
    if (this.config.includeImages) {
      xml[1] += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }
    if (this.config.includeVideos) {
      xml[1] += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
    }
    if (this.config.includeAlternates) {
      xml[1] += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
    }

    xml[1] += '>';

    // Add URL entries
    for (const entry of entries) {
      xml.push(...this.buildUrlEntry(entry));
    }

    xml.push('</urlset>');
    return xml;
  }

  private buildUrlEntry(entry: SitemapEntry): string[] {
    const xml = ['  <url>'];
    
    xml.push(`    <loc>${this.escapeXML(entry.url)}</loc>`);
    
    if (entry.lastmod) {
      xml.push(`    <lastmod>${entry.lastmod.toISOString()}</lastmod>`);
    }
    
    if (entry.changefreq) {
      xml.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    
    if (entry.priority !== undefined) {
      xml.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    }

    // Add images
    if (entry.images && this.config.includeImages) {
      for (const image of entry.images) {
        xml.push('    <image:image>');
        xml.push(`      <image:loc>${this.escapeXML(image.url)}</image:loc>`);
        if (image.caption) {
          xml.push(`      <image:caption>${this.escapeXML(image.caption)}</image:caption>`);
        }
        if (image.title) {
          xml.push(`      <image:title>${this.escapeXML(image.title)}</image:title>`);
        }
        if (image.geoLocation) {
          xml.push(`      <image:geo_location>${this.escapeXML(image.geoLocation)}</image:geo_location>`);
        }
        if (image.license) {
          xml.push(`      <image:license>${this.escapeXML(image.license)}</image:license>`);
        }
        xml.push('    </image:image>');
      }
    }

    // Add videos
    if (entry.videos && this.config.includeVideos) {
      for (const video of entry.videos) {
        xml.push('    <video:video>');
        xml.push(`      <video:thumbnail_loc>${this.escapeXML(video.thumbnailUrl)}</video:thumbnail_loc>`);
        xml.push(`      <video:title>${this.escapeXML(video.title)}</video:title>`);
        xml.push(`      <video:description>${this.escapeXML(video.description)}</video:description>`);
        
        if (video.contentUrl) {
          xml.push(`      <video:content_loc>${this.escapeXML(video.contentUrl)}</video:content_loc>`);
        }
        if (video.playerUrl) {
          xml.push(`      <video:player_loc>${this.escapeXML(video.playerUrl)}</video:player_loc>`);
        }
        if (video.duration) {
          xml.push(`      <video:duration>${video.duration}</video:duration>`);
        }
        if (video.publicationDate) {
          xml.push(`      <video:publication_date>${video.publicationDate.toISOString()}</video:publication_date>`);
        }
        if (video.familyFriendly !== undefined) {
          xml.push(`      <video:family_friendly>${video.familyFriendly ? 'yes' : 'no'}</video:family_friendly>`);
        }
        if (video.tags) {
          xml.push(`      <video:tag>${video.tags.join(', ')}</video:tag>`);
        }
        
        xml.push('    </video:video>');
      }
    }

    // Add alternate language links
    if (entry.alternates && this.config.includeAlternates) {
      for (const alternate of entry.alternates) {
        xml.push(`    <xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${this.escapeXML(alternate.href)}" />`);
      }
    }

    xml.push('  </url>');
    return xml;
  }

  private filterEntries(entries: SitemapEntry[]): SitemapEntry[] {
    return entries.filter(entry => {
      // Apply exclude patterns
      for (const pattern of this.config.excludePatterns) {
        if (pattern.test(entry.url)) {
          return false;
        }
      }
      
      // Filter out entries with priority 0 or invalid URLs
      if (entry.priority === 0 || !this.isValidUrl(entry.url)) {
        return false;
      }
      
      return true;
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatXML(xml: string[]): string {
    return xml.join('\n');
  }
}

/**
 * Sitemap Data Provider
 */
class SitemapDataProvider {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get static page entries
   */
  getStaticPages(): SitemapEntry[] {
    const staticPages = [
      { path: '/', lastmod: new Date(), priority: 1.0, changefreq: 'daily' as ChangeFrequency },
      { path: '/games', lastmod: new Date(), priority: 0.9, changefreq: 'daily' as ChangeFrequency },
      { path: '/about', lastmod: new Date('2024-01-01'), priority: 0.5, changefreq: 'yearly' as ChangeFrequency },
      { path: '/support', lastmod: new Date('2024-06-01'), priority: 0.6, changefreq: 'monthly' as ChangeFrequency },
      { path: '/terms', lastmod: new Date('2024-01-01'), priority: 0.4, changefreq: 'yearly' as ChangeFrequency },
      { path: '/privacy', lastmod: new Date('2024-01-01'), priority: 0.4, changefreq: 'yearly' as ChangeFrequency },
      { path: '/responsible-gaming', lastmod: new Date('2024-01-01'), priority: 0.5, changefreq: 'yearly' as ChangeFrequency }
    ];

    return staticPages.map(page => ({
      url: `${this.baseUrl}${page.path}`,
      lastmod: page.lastmod,
      priority: page.priority,
      changefreq: page.changefreq
    }));
  }

  /**
   * Get game entries from database/API
   */
  async getGameEntries(): Promise<SitemapEntry[]> {
    // This would typically fetch from database
    // For now, return mock data structure
    const mockGames: GameSitemapData[] = [
      {
        gameId: '1',
        slug: 'mines',
        name: 'Mines',
        category: 'Strategy',
        lastModified: new Date('2024-08-15'),
        isActive: true,
        images: ['/images/games/mines/screenshot1.jpg'],
        popularity: 85
      },
      {
        gameId: '2',
        slug: 'crash',
        name: 'Crash',
        category: 'Arcade',
        lastModified: new Date('2024-08-10'),
        isActive: true,
        images: ['/images/games/crash/screenshot1.jpg'],
        popularity: 90
      }
    ];

    const urlBuilder = new SitemapUrlBuilder(this.baseUrl);
    return mockGames.map(game => urlBuilder.buildGameEntry(game));
  }

  /**
   * Get category entries
   */
  async getCategoryEntries(): Promise<SitemapEntry[]> {
    const mockCategories: CategorySitemapData[] = [
      {
        slug: 'strategy',
        name: 'Strategy Games',
        gameCount: 15,
        lastModified: new Date('2024-08-15'),
        priority: 0.8
      },
      {
        slug: 'arcade',
        name: 'Arcade Games', 
        gameCount: 25,
        lastModified: new Date('2024-08-20'),
        priority: 0.9
      },
      {
        slug: 'slots',
        name: 'Slot Games',
        gameCount: 30,
        lastModified: new Date('2024-08-18'),
        priority: 0.9
      }
    ];

    const urlBuilder = new SitemapUrlBuilder(this.baseUrl);
    return mockCategories.map(category => urlBuilder.buildCategoryEntry(category));
  }

  /**
   * Get user-generated content entries (if public)
   */
  async getUserContentEntries(): Promise<SitemapEntry[]> {
    // This could include public user profiles, reviews, etc.
    // For gaming platform, this might be limited for privacy
    return [];
  }
}

/**
 * Main Sitemap Manager
 */
export class SitemapManager {
  private static instance: SitemapManager;
  private config: SitemapConfig;
  private urlBuilder: SitemapUrlBuilder;
  private xmlGenerator: XMLSitemapGenerator;
  private dataProvider: SitemapDataProvider;
  private cache: Map<string, { data: string; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com',
      defaultChangeFreq: 'weekly',
      defaultPriority: 0.5,
      maxEntries: 50000, // Google sitemap limit
      excludePatterns: [
        /\/api\//,
        /\/admin\//,
        /\/auth\//,
        /\/profile\//,
        /\/wallet\//,
        /\?/,
        /#/
      ],
      includeImages: true,
      includeVideos: false,
      includeAlternates: true
    };

    this.urlBuilder = new SitemapUrlBuilder(this.config.baseUrl);
    this.xmlGenerator = new XMLSitemapGenerator(this.config);
    this.dataProvider = new SitemapDataProvider(this.config.baseUrl);
  }

  static getInstance(): SitemapManager {
    if (!SitemapManager.instance) {
      SitemapManager.instance = new SitemapManager();
    }
    return SitemapManager.instance;
  }

  /**
   * Initialize sitemap manager
   */
  initialize(customConfig?: Partial<SitemapConfig>): void {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
      this.urlBuilder = new SitemapUrlBuilder(this.config.baseUrl);
      this.xmlGenerator = new XMLSitemapGenerator(this.config);
      this.dataProvider = new SitemapDataProvider(this.config.baseUrl);
    }

    console.log('Sitemap generation system initialized');
    this.setupCacheClearing();
  }

  /**
   * Generate main sitemap
   */
  async generateMainSitemap(): Promise<string> {
    const cacheKey = 'main_sitemap';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const entries: SitemapEntry[] = [];
    
    // Add static pages
    entries.push(...this.dataProvider.getStaticPages());
    
    // Add dynamic content
    entries.push(...await this.dataProvider.getGameEntries());
    entries.push(...await this.dataProvider.getCategoryEntries());
    entries.push(...await this.dataProvider.getUserContentEntries());

    // Sort by priority (highest first)
    entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const sitemap = this.xmlGenerator.generateSitemap(entries);
    
    this.cache.set(cacheKey, {
      data: sitemap,
      timestamp: Date.now()
    });

    return sitemap;
  }

  /**
   * Generate games sitemap
   */
  async generateGamesSitemap(): Promise<string> {
    const cacheKey = 'games_sitemap';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const entries = await this.dataProvider.getGameEntries();
    const sitemap = this.xmlGenerator.generateSitemap(entries);
    
    this.cache.set(cacheKey, {
      data: sitemap,
      timestamp: Date.now()
    });

    return sitemap;
  }

  /**
   * Generate sitemap index
   */
  async generateSitemapIndex(): Promise<string> {
    const sitemaps = [
      {
        url: `${this.config.baseUrl}/sitemap.xml`,
        lastmod: new Date(),
        entryCount: 0 // Would be calculated in real implementation
      },
      {
        url: `${this.config.baseUrl}/sitemap-games.xml`,
        lastmod: new Date(),
        entryCount: 0 // Would be calculated in real implementation
      }
    ];

    const index: SitemapIndex = { sitemaps };
    return this.xmlGenerator.generateSitemapIndex(index);
  }

  /**
   * Generate robots.txt sitemap references
   */
  generateRobotsReferences(): string {
    const sitemapUrls = [
      `${this.config.baseUrl}/sitemap.xml`,
      `${this.config.baseUrl}/sitemap-games.xml`
    ];

    return this.xmlGenerator.generateRobotsReferences(sitemapUrls);
  }

  /**
   * Validate sitemap
   */
  validateSitemap(xml: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    entryCount: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic XML structure validation
    if (!xml.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }

    if (!xml.includes('<urlset')) {
      errors.push('Missing urlset element');
    }

    if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
      errors.push('Missing or incorrect sitemap namespace');
    }

    // Count entries
    const urlMatches = xml.match(/<url>/g);
    const entryCount = urlMatches ? urlMatches.length : 0;

    if (entryCount === 0) {
      warnings.push('Sitemap contains no URLs');
    }

    if (entryCount > 50000) {
      errors.push('Sitemap contains more than 50,000 URLs (Google limit)');
    }

    // Check file size (approximate)
    const sizeInMB = Buffer.byteLength(xml, 'utf8') / (1024 * 1024);
    if (sizeInMB > 50) {
      errors.push('Sitemap file size exceeds 50MB (Google limit)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      entryCount
    };
  }

  /**
   * Clear sitemap cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  private setupCacheClearing(): void {
    // Clear expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export convenience functions
export const sitemapManager = SitemapManager.getInstance();

export const initializeSitemap = (config?: Partial<SitemapConfig>) => 
  sitemapManager.initialize(config);

export const generateMainSitemap = () => sitemapManager.generateMainSitemap();

export const generateGamesSitemap = () => sitemapManager.generateGamesSitemap();

export const generateSitemapIndex = () => sitemapManager.generateSitemapIndex();

export const validateSitemap = (xml: string) => sitemapManager.validateSitemap(xml);

// Default export
export default SitemapManager;