/**
 * Twitter Cards Optimization System
 * Provides comprehensive Twitter Card meta tags for optimal Twitter sharing and engagement
 */

// Types for Twitter Cards
export interface TwitterCardConfig {
  card: TwitterCardType;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  site?: string;
  creator?: string;
  url?: string;
  domain?: string;
  customTags?: Record<string, string>;
}

export interface TwitterAppCard {
  name: TwitterAppPlatform;
  id: string;
  url?: string;
}

export interface TwitterPlayerCard {
  url: string;
  width: number;
  height: number;
  stream?: string;
  streamContentType?: string;
}

export type TwitterCardType = 
  | 'summary'
  | 'summary_large_image'
  | 'app'
  | 'player';

export type TwitterAppPlatform = 
  | 'iphone'
  | 'ipad'
  | 'googleplay';

export interface GameTwitterData {
  gameId: string;
  name: string;
  description: string;
  category: string;
  image: string;
  url: string;
  rtp?: number;
  minBet?: number;
  maxBet?: number;
  features?: string[];
  rating?: {
    value: number;
    count: number;
  };
}

export interface CategoryTwitterData {
  name: string;
  description: string;
  gameCount: number;
  url: string;
  image: string;
  topGames?: string[];
}

export interface TwitterValidation {
  isValid: boolean;
  errors: TwitterError[];
  warnings: TwitterWarning[];
  suggestions: string[];
  cardType: TwitterCardType | null;
}

export interface TwitterError {
  type: 'required' | 'format' | 'size' | 'content';
  field: string;
  message: string;
  fix: string;
}

export interface TwitterWarning {
  type: 'optimization' | 'compatibility' | 'best-practice';
  field: string;
  message: string;
  recommendation: string;
}

/**
 * Twitter Card Generator
 */
class TwitterCardGenerator {
  private baseUrl: string;
  private siteName: string;
  private defaultCreator: string;
  private defaultImage: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
    this.siteName = '@GamingPlatform';
    this.defaultCreator = '@GamingPlatform';
    this.defaultImage = `${this.baseUrl}/images/twitter-default.jpg`;
  }

  /**
   * Generate Twitter Card meta tags
   */
  generateTwitterCard(config: TwitterCardConfig): string {
    const tags: string[] = [];

    // Basic Twitter Card tags
    tags.push(this.createMetaTag('twitter:card', config.card));
    tags.push(this.createMetaTag('twitter:title', config.title));
    tags.push(this.createMetaTag('twitter:description', config.description));

    // Site and creator
    if (config.site || this.siteName) {
      tags.push(this.createMetaTag('twitter:site', config.site || this.siteName));
    }

    if (config.creator || this.defaultCreator) {
      tags.push(this.createMetaTag('twitter:creator', config.creator || this.defaultCreator));
    }

    // URL
    if (config.url) {
      tags.push(this.createMetaTag('twitter:url', config.url));
    }

    // Domain
    if (config.domain) {
      tags.push(this.createMetaTag('twitter:domain', config.domain));
    }

    // Image (for summary and summary_large_image cards)
    if (config.card !== 'app' && config.card !== 'player') {
      const imageUrl = config.image || this.defaultImage;
      tags.push(this.createMetaTag('twitter:image', imageUrl));
      
      if (config.imageAlt) {
        tags.push(this.createMetaTag('twitter:image:alt', config.imageAlt));
      }
    }

    // Custom tags
    if (config.customTags) {
      for (const [name, content] of Object.entries(config.customTags)) {
        tags.push(this.createMetaTag(name, content));
      }
    }

    return tags.join('\n');
  }

  /**
   * Generate Twitter Card for game pages
   */
  generateGameTwitterCard(game: GameTwitterData): string {
    const title = `${game.name} - Play Online`;
    const description = this.createGameDescription(game);
    const imageAlt = `${game.name} - ${game.category} Game Screenshot`;

    const config: TwitterCardConfig = {
      card: 'summary_large_image',
      title,
      description,
      image: game.image.startsWith('http') ? game.image : `${this.baseUrl}${game.image}`,
      imageAlt,
      url: game.url,
      site: this.siteName,
      creator: this.defaultCreator,
      domain: new URL(this.baseUrl).hostname,
      customTags: {
        'twitter:label1': 'Category',
        'twitter:data1': game.category,
        'twitter:label2': 'Min Bet',
        'twitter:data2': game.minBet ? `$${game.minBet}` : '$0.10',
        ...(game.rtp && {
          'twitter:label3': 'RTP',
          'twitter:data3': `${game.rtp}%`
        }),
        ...(game.rating && {
          'twitter:label4': 'Rating',
          'twitter:data4': `${game.rating.value}/5 (${game.rating.count} reviews)`
        })
      }
    };

    return this.generateTwitterCard(config);
  }

  /**
   * Generate Twitter Card for category pages
   */
  generateCategoryTwitterCard(category: CategoryTwitterData): string {
    const title = `${category.name} Games - Online Casino`;
    const description = `Discover ${category.gameCount} premium ${category.name.toLowerCase()} games. ${category.description}`;
    const imageAlt = `${category.name} Games Collection`;

    const config: TwitterCardConfig = {
      card: 'summary_large_image',
      title,
      description,
      image: category.image.startsWith('http') ? category.image : `${this.baseUrl}${category.image}`,
      imageAlt,
      url: category.url,
      site: this.siteName,
      creator: this.defaultCreator,
      domain: new URL(this.baseUrl).hostname,
      customTags: {
        'twitter:label1': 'Games',
        'twitter:data1': category.gameCount.toString(),
        'twitter:label2': 'Category',
        'twitter:data2': category.name,
        ...(category.topGames && category.topGames.length > 0 && {
          'twitter:label3': 'Popular',
          'twitter:data3': category.topGames.slice(0, 3).join(', ')
        })
      }
    };

    return this.generateTwitterCard(config);
  }

  /**
   * Generate Twitter Card for homepage
   */
  generateHomeTwitterCard(): string {
    const config: TwitterCardConfig = {
      card: 'summary_large_image',
      title: 'Gaming Platform - Premium Online Gaming',
      description: 'Experience the best online gaming platform with 100+ games, secure transactions, instant payouts, and exciting bonuses. Play now!',
      image: this.defaultImage,
      imageAlt: 'Gaming Platform - Premium Online Gaming Experience',
      url: this.baseUrl,
      site: this.siteName,
      creator: this.defaultCreator,
      domain: new URL(this.baseUrl).hostname,
      customTags: {
        'twitter:label1': 'Games',
        'twitter:data1': '100+',
        'twitter:label2': 'Rating',
        'twitter:data2': '4.8/5',
        'twitter:label3': 'Features',
        'twitter:data3': 'Secure Gaming',
        'twitter:label4': 'Support',
        'twitter:data4': '24/7'
      }
    };

    return this.generateTwitterCard(config);
  }

  /**
   * Generate app card for mobile app promotion
   */
  generateAppTwitterCard(
    appName: string,
    description: string,
    apps: TwitterAppCard[]
  ): string {
    const tags: string[] = [];

    tags.push(this.createMetaTag('twitter:card', 'app'));
    tags.push(this.createMetaTag('twitter:title', appName));
    tags.push(this.createMetaTag('twitter:description', description));
    tags.push(this.createMetaTag('twitter:site', this.siteName));

    // Add app-specific tags
    for (const app of apps) {
      switch (app.name) {
        case 'iphone':
          tags.push(this.createMetaTag('twitter:app:name:iphone', appName));
          tags.push(this.createMetaTag('twitter:app:id:iphone', app.id));
          if (app.url) {
            tags.push(this.createMetaTag('twitter:app:url:iphone', app.url));
          }
          break;
        case 'ipad':
          tags.push(this.createMetaTag('twitter:app:name:ipad', appName));
          tags.push(this.createMetaTag('twitter:app:id:ipad', app.id));
          if (app.url) {
            tags.push(this.createMetaTag('twitter:app:url:ipad', app.url));
          }
          break;
        case 'googleplay':
          tags.push(this.createMetaTag('twitter:app:name:googleplay', appName));
          tags.push(this.createMetaTag('twitter:app:id:googleplay', app.id));
          if (app.url) {
            tags.push(this.createMetaTag('twitter:app:url:googleplay', app.url));
          }
          break;
      }
    }

    return tags.join('\n');
  }

  /**
   * Generate player card for video content
   */
  generatePlayerTwitterCard(
    title: string,
    description: string,
    player: TwitterPlayerCard,
    image: string
  ): string {
    const tags: string[] = [];

    tags.push(this.createMetaTag('twitter:card', 'player'));
    tags.push(this.createMetaTag('twitter:title', title));
    tags.push(this.createMetaTag('twitter:description', description));
    tags.push(this.createMetaTag('twitter:site', this.siteName));
    tags.push(this.createMetaTag('twitter:image', image));

    // Player-specific tags
    tags.push(this.createMetaTag('twitter:player', player.url));
    tags.push(this.createMetaTag('twitter:player:width', player.width.toString()));
    tags.push(this.createMetaTag('twitter:player:height', player.height.toString()));

    if (player.stream) {
      tags.push(this.createMetaTag('twitter:player:stream', player.stream));
    }

    if (player.streamContentType) {
      tags.push(this.createMetaTag('twitter:player:stream:content_type', player.streamContentType));
    }

    return tags.join('\n');
  }

  /**
   * Generate static page Twitter Card
   */
  generateStaticPageTwitterCard(
    title: string,
    description: string,
    path: string,
    image?: string
  ): string {
    const config: TwitterCardConfig = {
      card: 'summary',
      title: `${title} - Gaming Platform`,
      description,
      image: image || this.defaultImage,
      imageAlt: title,
      url: `${this.baseUrl}${path}`,
      site: this.siteName,
      creator: this.defaultCreator,
      domain: new URL(this.baseUrl).hostname
    };

    return this.generateTwitterCard(config);
  }

  private createGameDescription(game: GameTwitterData): string {
    let description = `Play ${game.name} online! ${game.description}`;
    
    if (game.features && game.features.length > 0) {
      const featuresText = game.features.slice(0, 2).join(', ');
      description += ` Features: ${featuresText}.`;
    }
    
    if (game.minBet && game.maxBet) {
      description += ` Bets: $${game.minBet}-$${game.maxBet}.`;
    }
    
    if (game.rtp) {
      description += ` ${game.rtp}% RTP.`;
    }
    
    description += ' Join now! 🎮';
    
    // Ensure optimal length for Twitter (under 200 characters)
    return description.length > 200 ? description.substring(0, 197) + '...' : description;
  }

  private createMetaTag(name: string, content: string): string {
    const escapedContent = this.escapeHtml(content);
    return `<meta name="${name}" content="${escapedContent}">`;
  }

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
 * Twitter Card Validator
 */
class TwitterCardValidator {
  private cardRequirements: Record<TwitterCardType, string[]> = {
    summary: ['twitter:card', 'twitter:title', 'twitter:description'],
    summary_large_image: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'],
    app: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:app:name:iphone'],
    player: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:player', 'twitter:image']
  };

  private imageLimits = {
    summary: {
      minWidth: 144,
      minHeight: 144,
      maxSize: 5 * 1024 * 1024, // 5MB
      ratio: '1:1'
    },
    summary_large_image: {
      minWidth: 300,
      minHeight: 157,
      maxWidth: 4096,
      maxHeight: 4096,
      maxSize: 5 * 1024 * 1024, // 5MB
      ratio: '2:1'
    }
  };

  /**
   * Validate Twitter Card tags
   */
  validate(twitterTags: string): TwitterValidation {
    const errors: TwitterError[] = [];
    const warnings: TwitterWarning[] = [];
    const suggestions: string[] = [];

    const tags = this.parseTwitterTags(twitterTags);
    const cardType = tags['twitter:card'] as TwitterCardType;

    if (!cardType) {
      errors.push({
        type: 'required',
        field: 'twitter:card',
        message: 'Twitter card type is required',
        fix: 'Add twitter:card meta tag with value: summary, summary_large_image, app, or player'
      });
      
      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
        cardType: null
      };
    }

    // Validate required fields for card type
    const requiredFields = this.cardRequirements[cardType];
    if (requiredFields) {
      for (const field of requiredFields) {
        if (!tags[field]) {
          errors.push({
            type: 'required',
            field,
            message: `Required field missing for ${cardType} card`,
            fix: `Add ${field} meta tag`
          });
        }
      }
    }

    // Validate specific fields
    this.validateTitle(tags['twitter:title'], errors, warnings);
    this.validateDescription(tags['twitter:description'], errors, warnings);
    this.validateImage(tags, cardType, errors, warnings, suggestions);
    this.validateSite(tags['twitter:site'], warnings, suggestions);
    this.validateCreator(tags['twitter:creator'], warnings);

    // Card-specific validations
    if (cardType === 'player') {
      this.validatePlayer(tags, errors, warnings);
    } else if (cardType === 'app') {
      this.validateApp(tags, errors, warnings);
    }

    // General suggestions
    if (!tags['twitter:site']) {
      suggestions.push('Add twitter:site for better brand recognition');
    }

    if (!tags['twitter:creator']) {
      suggestions.push('Add twitter:creator to credit content author');
    }

    if (cardType === 'summary' && tags['twitter:image']) {
      suggestions.push('Consider using summary_large_image for better visual impact');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      cardType
    };
  }

  private parseTwitterTags(twitterTags: string): Record<string, string> {
    const tags: Record<string, string> = {};
    const metaRegex = /<meta\s+name="([^"]+)"\s+content="([^"]*)"/g;
    let match;

    while ((match = metaRegex.exec(twitterTags)) !== null) {
      if (match[1].startsWith('twitter:')) {
        tags[match[1]] = match[2];
      }
    }

    return tags;
  }

  private validateTitle(title: string, errors: TwitterError[], warnings: TwitterWarning[]): void {
    if (!title) return;

    if (title.length > 70) {
      warnings.push({
        type: 'optimization',
        field: 'twitter:title',
        message: 'Title too long (over 70 characters)',
        recommendation: 'Keep title under 70 characters for optimal display'
      });
    }

    if (title.length < 10) {
      warnings.push({
        type: 'optimization',
        field: 'twitter:title',
        message: 'Title too short (under 10 characters)',
        recommendation: 'Use descriptive titles of at least 10 characters'
      });
    }
  }

  private validateDescription(description: string, errors: TwitterError[], warnings: TwitterWarning[]): void {
    if (!description) return;

    if (description.length > 200) {
      warnings.push({
        type: 'optimization',
        field: 'twitter:description',
        message: 'Description too long (over 200 characters)',
        recommendation: 'Keep description under 200 characters for full display'
      });
    }

    if (description.length < 100) {
      warnings.push({
        type: 'optimization',
        field: 'twitter:description',
        message: 'Description too short (under 100 characters)',
        recommendation: 'Use more descriptive text to engage users'
      });
    }
  }

  private validateImage(
    tags: Record<string, string>,
    cardType: TwitterCardType,
    errors: TwitterError[],
    warnings: TwitterWarning[],
    suggestions: string[]
  ): void {
    const imageUrl = tags['twitter:image'];
    
    if ((cardType === 'summary' || cardType === 'summary_large_image') && !imageUrl) {
      errors.push({
        type: 'required',
        field: 'twitter:image',
        message: `Image required for ${cardType} card`,
        fix: 'Add twitter:image meta tag with image URL'
      });
      return;
    }

    if (!imageUrl) return;

    // Validate image URL format
    try {
      new URL(imageUrl);
    } catch {
      errors.push({
        type: 'format',
        field: 'twitter:image',
        message: 'Invalid image URL format',
        fix: 'Use valid absolute URL for image'
      });
      return;
    }

    // Check for HTTPS
    if (!imageUrl.startsWith('https://')) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:image',
        message: 'Image URL should use HTTPS',
        recommendation: 'Use HTTPS URLs for better security and compatibility'
      });
    }

    // Alt text validation
    if (!tags['twitter:image:alt']) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:image:alt',
        message: 'Missing image alt text',
        recommendation: 'Add twitter:image:alt for better accessibility'
      });
    }

    // Suggest image optimization based on card type
    if (cardType === 'summary_large_image') {
      suggestions.push('Use 1200x630px images for optimal summary_large_image display');
    } else if (cardType === 'summary') {
      suggestions.push('Use square images (minimum 144x144px) for summary cards');
    }
  }

  private validateSite(site: string, warnings: TwitterWarning[], suggestions: string[]): void {
    if (!site) return;

    if (!site.startsWith('@')) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:site',
        message: 'Site handle should start with @',
        recommendation: 'Use format @username for twitter:site'
      });
    }

    if (site.length > 15) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:site',
        message: 'Twitter handle too long',
        recommendation: 'Twitter handles are maximum 15 characters'
      });
    }
  }

  private validateCreator(creator: string, warnings: TwitterWarning[]): void {
    if (!creator) return;

    if (!creator.startsWith('@')) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:creator',
        message: 'Creator handle should start with @',
        recommendation: 'Use format @username for twitter:creator'
      });
    }

    if (creator.length > 15) {
      warnings.push({
        type: 'best-practice',
        field: 'twitter:creator',
        message: 'Twitter handle too long',
        recommendation: 'Twitter handles are maximum 15 characters'
      });
    }
  }

  private validatePlayer(tags: Record<string, string>, errors: TwitterError[], warnings: TwitterWarning[]): void {
    const playerUrl = tags['twitter:player'];
    const width = tags['twitter:player:width'];
    const height = tags['twitter:player:height'];

    if (!playerUrl) return;

    // Validate player URL
    try {
      const url = new URL(playerUrl);
      if (url.protocol !== 'https:') {
        errors.push({
          type: 'format',
          field: 'twitter:player',
          message: 'Player URL must use HTTPS',
          fix: 'Use HTTPS URL for twitter:player'
        });
      }
    } catch {
      errors.push({
        type: 'format',
        field: 'twitter:player',
        message: 'Invalid player URL format',
        fix: 'Use valid absolute HTTPS URL for player'
      });
    }

    // Validate dimensions
    if (!width || !height) {
      errors.push({
        type: 'required',
        field: 'twitter:player:width/height',
        message: 'Player dimensions required',
        fix: 'Add twitter:player:width and twitter:player:height'
      });
    } else {
      const widthNum = parseInt(width);
      const heightNum = parseInt(height);
      
      if (widthNum > 1920 || heightNum > 1920) {
        warnings.push({
          type: 'optimization',
          field: 'twitter:player dimensions',
          message: 'Player dimensions very large',
          recommendation: 'Consider smaller player dimensions for better performance'
        });
      }
    }
  }

  private validateApp(tags: Record<string, string>, errors: TwitterError[], warnings: TwitterWarning[]): void {
    const hasIphone = tags['twitter:app:name:iphone'] || tags['twitter:app:id:iphone'];
    const hasIpad = tags['twitter:app:name:ipad'] || tags['twitter:app:id:ipad'];
    const hasAndroid = tags['twitter:app:name:googleplay'] || tags['twitter:app:id:googleplay'];

    if (!hasIphone && !hasIpad && !hasAndroid) {
      errors.push({
        type: 'required',
        field: 'twitter:app',
        message: 'At least one app platform required for app card',
        fix: 'Add app information for iPhone, iPad, or Google Play'
      });
    }

    // Validate app URLs if present
    for (const platform of ['iphone', 'ipad', 'googleplay']) {
      const appUrl = tags[`twitter:app:url:${platform}`];
      if (appUrl) {
        try {
          new URL(appUrl);
        } catch {
          errors.push({
            type: 'format',
            field: `twitter:app:url:${platform}`,
            message: `Invalid app URL for ${platform}`,
            fix: 'Use valid URL format for app deep links'
          });
        }
      }
    }
  }
}

/**
 * Main Twitter Cards Manager
 */
export class TwitterCardsManager {
  private static instance: TwitterCardsManager;
  private generator: TwitterCardGenerator;
  private validator: TwitterCardValidator;
  private cache: Map<string, { tags: string; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.generator = new TwitterCardGenerator();
    this.validator = new TwitterCardValidator();
  }

  static getInstance(): TwitterCardsManager {
    if (!TwitterCardsManager.instance) {
      TwitterCardsManager.instance = new TwitterCardsManager();
    }
    return TwitterCardsManager.instance;
  }

  /**
   * Initialize Twitter Cards manager
   */
  initialize(): void {
    console.log('Twitter Cards generation system initialized');
    this.setupCacheCleaning();
  }

  /**
   * Generate Twitter Card for game
   */
  generateGameTwitterCard(game: GameTwitterData): string {
    const cacheKey = `game_${game.gameId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tags;
    }

    const tags = this.generator.generateGameTwitterCard(game);
    
    this.cache.set(cacheKey, {
      tags,
      timestamp: Date.now()
    });

    return tags;
  }

  /**
   * Generate Twitter Card for category
   */
  generateCategoryTwitterCard(category: CategoryTwitterData): string {
    return this.generator.generateCategoryTwitterCard(category);
  }

  /**
   * Generate Twitter Card for homepage
   */
  generateHomeTwitterCard(): string {
    const cacheKey = 'home_twitter';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tags;
    }

    const tags = this.generator.generateHomeTwitterCard();
    
    this.cache.set(cacheKey, {
      tags,
      timestamp: Date.now()
    });

    return tags;
  }

  /**
   * Generate app Twitter Card
   */
  generateAppTwitterCard(
    appName: string,
    description: string,
    apps: TwitterAppCard[]
  ): string {
    return this.generator.generateAppTwitterCard(appName, description, apps);
  }

  /**
   * Generate player Twitter Card
   */
  generatePlayerTwitterCard(
    title: string,
    description: string,
    player: TwitterPlayerCard,
    image: string
  ): string {
    return this.generator.generatePlayerTwitterCard(title, description, player, image);
  }

  /**
   * Generate static page Twitter Card
   */
  generateStaticPageTwitterCard(
    title: string,
    description: string,
    path: string,
    image?: string
  ): string {
    return this.generator.generateStaticPageTwitterCard(title, description, path, image);
  }

  /**
   * Validate Twitter Card tags
   */
  validateTwitterCard(twitterTags: string): TwitterValidation {
    return this.validator.validate(twitterTags);
  }

  /**
   * Clear Twitter Cards cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private setupCacheCleaning(): void {
    // Clean expired cache entries every hour
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
export const twitterCardsManager = TwitterCardsManager.getInstance();

export const initializeTwitterCards = () => twitterCardsManager.initialize();

export const generateGameTwitterCard = (game: GameTwitterData) => 
  twitterCardsManager.generateGameTwitterCard(game);

export const generateCategoryTwitterCard = (category: CategoryTwitterData) => 
  twitterCardsManager.generateCategoryTwitterCard(category);

export const generateHomeTwitterCard = () => twitterCardsManager.generateHomeTwitterCard();

export const generateAppTwitterCard = (
  appName: string,
  description: string,
  apps: TwitterAppCard[]
) => twitterCardsManager.generateAppTwitterCard(appName, description, apps);

export const validateTwitterCard = (twitterTags: string) => 
  twitterCardsManager.validateTwitterCard(twitterTags);

// Default export
export default TwitterCardsManager;