/**
 * Open Graph Tags Generation System
 * Provides comprehensive Open Graph meta tags for optimal social media sharing
 */

// Types for Open Graph tags
export interface OGTagsConfig {
  title: string;
  description: string;
  type: OGType;
  url: string;
  image: OGImage | OGImage[];
  siteName: string;
  locale?: string;
  alternateLocales?: string[];
  video?: OGVideo;
  audio?: OGAudio;
  article?: OGArticle;
  book?: OGBook;
  profile?: OGProfile;
  website?: OGWebsite;
  customTags?: Record<string, string>;
}

export interface OGImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
  secureUrl?: string;
}

export interface OGVideo {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
  image?: string;
  duration?: number;
  releaseDate?: string;
  tags?: string[];
}

export interface OGAudio {
  url: string;
  secureUrl?: string;
  type?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

export interface OGArticle {
  publishedTime?: string;
  modifiedTime?: string;
  expirationTime?: string;
  author?: string[];
  section?: string;
  tag?: string[];
}

export interface OGBook {
  author?: string[];
  isbn?: string;
  releaseDate?: string;
  tag?: string[];
}

export interface OGProfile {
  firstName?: string;
  lastName?: string;
  username?: string;
  gender?: string;
}

export interface OGWebsite {
  title?: string;
  description?: string;
  image?: OGImage;
}

export type OGType = 
  | 'website'
  | 'article'
  | 'book'
  | 'profile'
  | 'music.song'
  | 'music.album'
  | 'music.playlist'
  | 'music.radio_station'
  | 'video.movie'
  | 'video.episode'
  | 'video.tv_show'
  | 'video.other'
  | 'game'
  | 'product'
  | 'place'
  | 'business'
  | 'fitness.course'
  | 'restaurant.menu'
  | 'restaurant.menu_item';

export interface GameOGData {
  gameId: string;
  name: string;
  description: string;
  category: string;
  images: string[];
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

export interface CategoryOGData {
  name: string;
  description: string;
  gameCount: number;
  url: string;
  image: string;
  topGames?: string[];
}

/**
 * Open Graph Generator
 */
class OpenGraphGenerator {
  private baseUrl: string;
  private siteName: string;
  private defaultImage: OGImage;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
    this.siteName = 'Gaming Platform';
    this.defaultImage = {
      url: `${this.baseUrl}/images/og-default.jpg`,
      width: 1200,
      height: 630,
      alt: 'Gaming Platform - Premium Online Gaming Experience',
      type: 'image/jpeg'
    };
  }

  /**
   * Generate Open Graph tags
   */
  generateOGTags(config: OGTagsConfig): string {
    const tags: string[] = [];

    // Basic Open Graph tags
    tags.push(this.createMetaTag('og:title', config.title));
    tags.push(this.createMetaTag('og:description', config.description));
    tags.push(this.createMetaTag('og:type', config.type));
    tags.push(this.createMetaTag('og:url', config.url));
    tags.push(this.createMetaTag('og:site_name', config.siteName));

    // Locale tags
    if (config.locale) {
      tags.push(this.createMetaTag('og:locale', config.locale));
    }

    if (config.alternateLocales) {
      for (const locale of config.alternateLocales) {
        tags.push(this.createMetaTag('og:locale:alternate', locale));
      }
    }

    // Image tags
    const images = Array.isArray(config.image) ? config.image : [config.image];
    for (const image of images) {
      tags.push(...this.generateImageTags(image));
    }

    // Video tags
    if (config.video) {
      tags.push(...this.generateVideoTags(config.video));
    }

    // Audio tags
    if (config.audio) {
      tags.push(...this.generateAudioTags(config.audio));
    }

    // Type-specific tags
    switch (config.type) {
      case 'article':
        if (config.article) {
          tags.push(...this.generateArticleTags(config.article));
        }
        break;
      case 'book':
        if (config.book) {
          tags.push(...this.generateBookTags(config.book));
        }
        break;
      case 'profile':
        if (config.profile) {
          tags.push(...this.generateProfileTags(config.profile));
        }
        break;
      case 'website':
        if (config.website) {
          tags.push(...this.generateWebsiteTags(config.website));
        }
        break;
    }

    // Custom tags
    if (config.customTags) {
      for (const [property, content] of Object.entries(config.customTags)) {
        tags.push(this.createMetaTag(property, content));
      }
    }

    return tags.join('\n');
  }

  /**
   * Generate Open Graph tags for game pages
   */
  generateGameOG(game: GameOGData): string {
    const title = `${game.name} - Play Online | ${this.siteName}`;
    const description = this.createGameDescription(game);
    const images = game.images.map(imageUrl => ({
      url: imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`,
      width: 1200,
      height: 630,
      alt: `${game.name} - ${game.category} Game Screenshot`,
      type: 'image/jpeg'
    }));

    const config: OGTagsConfig = {
      title,
      description,
      type: 'game',
      url: game.url,
      image: images.length > 0 ? images : [this.defaultImage],
      siteName: this.siteName,
      locale: 'en_US',
      customTags: {
        'og:game:category': game.category,
        'og:game:min_bet': game.minBet?.toString() || '0.10',
        'og:game:max_bet': game.maxBet?.toString() || '500',
        ...(game.rtp && { 'og:game:rtp': `${game.rtp}%` }),
        ...(game.features && { 'og:game:features': game.features.join(', ') }),
        ...(game.rating && {
          'og:game:rating': game.rating.value.toString(),
          'og:game:rating_count': game.rating.count.toString()
        })
      }
    };

    return this.generateOGTags(config);
  }

  /**
   * Generate Open Graph tags for category pages
   */
  generateCategoryOG(category: CategoryOGData): string {
    const title = `${category.name} Games - Online Casino | ${this.siteName}`;
    const description = `Discover ${category.gameCount} premium ${category.name.toLowerCase()} games. ${category.description}`;

    const config: OGTagsConfig = {
      title,
      description,
      type: 'website',
      url: category.url,
      image: [{
        url: category.image.startsWith('http') ? category.image : `${this.baseUrl}${category.image}`,
        width: 1200,
        height: 630,
        alt: `${category.name} Games Collection`,
        type: 'image/jpeg'
      }],
      siteName: this.siteName,
      locale: 'en_US',
      customTags: {
        'og:category:name': category.name,
        'og:category:game_count': category.gameCount.toString(),
        ...(category.topGames && {
          'og:category:top_games': category.topGames.join(', ')
        })
      }
    };

    return this.generateOGTags(config);
  }

  /**
   * Generate Open Graph tags for homepage
   */
  generateHomeOG(): string {
    const config: OGTagsConfig = {
      title: `${this.siteName} - Premium Online Gaming Experience`,
      description: 'Experience the best online gaming platform with 100+ games, secure transactions, instant payouts, and exciting bonuses. Play now!',
      type: 'website',
      url: this.baseUrl,
      image: [this.defaultImage],
      siteName: this.siteName,
      locale: 'en_US',
      alternateLocales: ['es_ES', 'fr_FR', 'de_DE'],
      customTags: {
        'og:game_count': '100+',
        'og:features': 'Secure Gaming, Instant Payouts, 24/7 Support',
        'og:rating': '4.8',
        'og:established': '2024'
      }
    };

    return this.generateOGTags(config);
  }

  /**
   * Generate Open Graph tags for static pages
   */
  generateStaticPageOG(
    title: string,
    description: string,
    path: string,
    image?: OGImage
  ): string {
    const config: OGTagsConfig = {
      title: `${title} - ${this.siteName}`,
      description,
      type: 'website',
      url: `${this.baseUrl}${path}`,
      image: [image || this.defaultImage],
      siteName: this.siteName,
      locale: 'en_US'
    };

    return this.generateOGTags(config);
  }

  private generateImageTags(image: OGImage): string[] {
    const tags: string[] = [];

    tags.push(this.createMetaTag('og:image', image.url));
    
    if (image.secureUrl) {
      tags.push(this.createMetaTag('og:image:secure_url', image.secureUrl));
    }
    
    if (image.type) {
      tags.push(this.createMetaTag('og:image:type', image.type));
    }
    
    if (image.width) {
      tags.push(this.createMetaTag('og:image:width', image.width.toString()));
    }
    
    if (image.height) {
      tags.push(this.createMetaTag('og:image:height', image.height.toString()));
    }
    
    if (image.alt) {
      tags.push(this.createMetaTag('og:image:alt', image.alt));
    }

    return tags;
  }

  private generateVideoTags(video: OGVideo): string[] {
    const tags: string[] = [];

    tags.push(this.createMetaTag('og:video', video.url));
    
    if (video.secureUrl) {
      tags.push(this.createMetaTag('og:video:secure_url', video.secureUrl));
    }
    
    if (video.type) {
      tags.push(this.createMetaTag('og:video:type', video.type));
    }
    
    if (video.width) {
      tags.push(this.createMetaTag('og:video:width', video.width.toString()));
    }
    
    if (video.height) {
      tags.push(this.createMetaTag('og:video:height', video.height.toString()));
    }
    
    if (video.duration) {
      tags.push(this.createMetaTag('og:video:duration', video.duration.toString()));
    }
    
    if (video.releaseDate) {
      tags.push(this.createMetaTag('og:video:release_date', video.releaseDate));
    }
    
    if (video.tags) {
      tags.push(this.createMetaTag('og:video:tag', video.tags.join(', ')));
    }

    return tags;
  }

  private generateAudioTags(audio: OGAudio): string[] {
    const tags: string[] = [];

    tags.push(this.createMetaTag('og:audio', audio.url));
    
    if (audio.secureUrl) {
      tags.push(this.createMetaTag('og:audio:secure_url', audio.secureUrl));
    }
    
    if (audio.type) {
      tags.push(this.createMetaTag('og:audio:type', audio.type));
    }
    
    if (audio.title) {
      tags.push(this.createMetaTag('og:audio:title', audio.title));
    }
    
    if (audio.artist) {
      tags.push(this.createMetaTag('og:audio:artist', audio.artist));
    }
    
    if (audio.album) {
      tags.push(this.createMetaTag('og:audio:album', audio.album));
    }
    
    if (audio.duration) {
      tags.push(this.createMetaTag('og:audio:duration', audio.duration.toString()));
    }

    return tags;
  }

  private generateArticleTags(article: OGArticle): string[] {
    const tags: string[] = [];

    if (article.publishedTime) {
      tags.push(this.createMetaTag('article:published_time', article.publishedTime));
    }
    
    if (article.modifiedTime) {
      tags.push(this.createMetaTag('article:modified_time', article.modifiedTime));
    }
    
    if (article.expirationTime) {
      tags.push(this.createMetaTag('article:expiration_time', article.expirationTime));
    }
    
    if (article.author) {
      for (const author of article.author) {
        tags.push(this.createMetaTag('article:author', author));
      }
    }
    
    if (article.section) {
      tags.push(this.createMetaTag('article:section', article.section));
    }
    
    if (article.tag) {
      for (const tag of article.tag) {
        tags.push(this.createMetaTag('article:tag', tag));
      }
    }

    return tags;
  }

  private generateBookTags(book: OGBook): string[] {
    const tags: string[] = [];

    if (book.author) {
      for (const author of book.author) {
        tags.push(this.createMetaTag('book:author', author));
      }
    }
    
    if (book.isbn) {
      tags.push(this.createMetaTag('book:isbn', book.isbn));
    }
    
    if (book.releaseDate) {
      tags.push(this.createMetaTag('book:release_date', book.releaseDate));
    }
    
    if (book.tag) {
      for (const tag of book.tag) {
        tags.push(this.createMetaTag('book:tag', tag));
      }
    }

    return tags;
  }

  private generateProfileTags(profile: OGProfile): string[] {
    const tags: string[] = [];

    if (profile.firstName) {
      tags.push(this.createMetaTag('profile:first_name', profile.firstName));
    }
    
    if (profile.lastName) {
      tags.push(this.createMetaTag('profile:last_name', profile.lastName));
    }
    
    if (profile.username) {
      tags.push(this.createMetaTag('profile:username', profile.username));
    }
    
    if (profile.gender) {
      tags.push(this.createMetaTag('profile:gender', profile.gender));
    }

    return tags;
  }

  private generateWebsiteTags(website: OGWebsite): string[] {
    const tags: string[] = [];

    if (website.title) {
      tags.push(this.createMetaTag('og:site_name', website.title));
    }
    
    if (website.description) {
      tags.push(this.createMetaTag('og:description', website.description));
    }
    
    if (website.image) {
      tags.push(...this.generateImageTags(website.image));
    }

    return tags;
  }

  private createGameDescription(game: GameOGData): string {
    let description = `Play ${game.name} online with real money. ${game.description}`;
    
    if (game.features && game.features.length > 0) {
      description += ` Features: ${game.features.join(', ')}.`;
    }
    
    if (game.minBet && game.maxBet) {
      description += ` Min bet: $${game.minBet}, Max bet: $${game.maxBet}.`;
    }
    
    if (game.rtp) {
      description += ` RTP: ${game.rtp}%.`;
    }
    
    if (game.rating) {
      description += ` Rated ${game.rating.value}/5 by ${game.rating.count} players.`;
    }
    
    description += ' Join now for exclusive bonuses!';
    
    // Ensure optimal length (150-160 characters for descriptions)
    return description.length > 160 ? description.substring(0, 157) + '...' : description;
  }

  private createMetaTag(property: string, content: string): string {
    const escapedContent = this.escapeHtml(content);
    return `<meta property="${property}" content="${escapedContent}">`;
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
 * Open Graph Validator
 */
class OpenGraphValidator {
  private requiredProperties = ['og:title', 'og:description', 'og:type', 'og:url', 'og:image'];
  private imageRequirements = {
    minWidth: 200,
    minHeight: 200,
    recommendedWidth: 1200,
    recommendedHeight: 630,
    maxAspectRatio: 3.0
  };

  /**
   * Validate Open Graph tags
   */
  validate(ogTags: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const tags = this.parseOGTags(ogTags);

    // Check required properties
    for (const required of this.requiredProperties) {
      if (!tags[required]) {
        errors.push(`Missing required property: ${required}`);
      }
    }

    // Validate specific properties
    this.validateTitle(tags['og:title'], errors, warnings);
    this.validateDescription(tags['og:description'], errors, warnings);
    this.validateType(tags['og:type'], warnings);
    this.validateURL(tags['og:url'], errors, warnings);
    this.validateImage(tags, errors, warnings, suggestions);

    // General suggestions
    if (!tags['og:site_name']) {
      suggestions.push('Add og:site_name for better brand recognition');
    }

    if (!tags['og:locale']) {
      suggestions.push('Add og:locale for better localization support');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private parseOGTags(ogTags: string): Record<string, string> {
    const tags: Record<string, string> = {};
    const metaRegex = /<meta\s+property="([^"]+)"\s+content="([^"]*)"/g;
    let match;

    while ((match = metaRegex.exec(ogTags)) !== null) {
      tags[match[1]] = match[2];
    }

    return tags;
  }

  private validateTitle(title: string, errors: string[], warnings: string[]): void {
    if (!title) return;

    if (title.length < 10) {
      warnings.push('Title too short (less than 10 characters)');
    } else if (title.length > 60) {
      warnings.push('Title too long (more than 60 characters)');
    }

    if (!title.includes('|') && !title.includes('-')) {
      warnings.push('Consider adding site name separator in title');
    }
  }

  private validateDescription(description: string, errors: string[], warnings: string[]): void {
    if (!description) return;

    if (description.length < 100) {
      warnings.push('Description too short (less than 100 characters)');
    } else if (description.length > 300) {
      warnings.push('Description too long (more than 300 characters)');
    }
  }

  private validateType(type: string, warnings: string[]): void {
    if (!type) return;

    const validTypes = [
      'website', 'article', 'book', 'profile', 'music.song', 'music.album', 
      'video.movie', 'video.episode', 'game', 'product'
    ];

    if (!validTypes.includes(type)) {
      warnings.push(`Unknown or uncommon og:type: ${type}`);
    }
  }

  private validateURL(url: string, errors: string[], warnings: string[]): void {
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol !== 'https:') {
        warnings.push('URL should use HTTPS for better security');
      }
    } catch {
      errors.push('Invalid URL format');
    }
  }

  private validateImage(
    tags: Record<string, string>, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    const imageUrl = tags['og:image'];
    if (!imageUrl) return;

    try {
      new URL(imageUrl);
    } catch {
      errors.push('Invalid image URL format');
      return;
    }

    const width = parseInt(tags['og:image:width']);
    const height = parseInt(tags['og:image:height']);

    if (width && height) {
      if (width < this.imageRequirements.minWidth || height < this.imageRequirements.minHeight) {
        warnings.push(`Image too small (${width}x${height}). Minimum: ${this.imageRequirements.minWidth}x${this.imageRequirements.minHeight}`);
      }

      const aspectRatio = width / height;
      if (aspectRatio > this.imageRequirements.maxAspectRatio) {
        warnings.push('Image aspect ratio too wide. Recommended: 1.91:1 (1200x630)');
      }

      if (width !== this.imageRequirements.recommendedWidth || height !== this.imageRequirements.recommendedHeight) {
        suggestions.push(`Consider using recommended image size: ${this.imageRequirements.recommendedWidth}x${this.imageRequirements.recommendedHeight}`);
      }
    } else {
      warnings.push('Missing image dimensions (og:image:width, og:image:height)');
    }

    if (!tags['og:image:alt']) {
      warnings.push('Missing image alt text (og:image:alt)');
    }

    if (!tags['og:image:type']) {
      suggestions.push('Add image type (og:image:type) for better compatibility');
    }
  }
}

/**
 * Main Open Graph Manager
 */
export class OpenGraphManager {
  private static instance: OpenGraphManager;
  private generator: OpenGraphGenerator;
  private validator: OpenGraphValidator;
  private cache: Map<string, { tags: string; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.generator = new OpenGraphGenerator();
    this.validator = new OpenGraphValidator();
  }

  static getInstance(): OpenGraphManager {
    if (!OpenGraphManager.instance) {
      OpenGraphManager.instance = new OpenGraphManager();
    }
    return OpenGraphManager.instance;
  }

  /**
   * Initialize Open Graph manager
   */
  initialize(): void {
    console.log('Open Graph tags generation system initialized');
    this.setupCacheCleaning();
  }

  /**
   * Generate Open Graph tags for game
   */
  generateGameOG(game: GameOGData): string {
    const cacheKey = `game_${game.gameId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tags;
    }

    const tags = this.generator.generateGameOG(game);
    
    this.cache.set(cacheKey, {
      tags,
      timestamp: Date.now()
    });

    return tags;
  }

  /**
   * Generate Open Graph tags for category
   */
  generateCategoryOG(category: CategoryOGData): string {
    return this.generator.generateCategoryOG(category);
  }

  /**
   * Generate Open Graph tags for homepage
   */
  generateHomeOG(): string {
    const cacheKey = 'home';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tags;
    }

    const tags = this.generator.generateHomeOG();
    
    this.cache.set(cacheKey, {
      tags,
      timestamp: Date.now()
    });

    return tags;
  }

  /**
   * Generate Open Graph tags for static page
   */
  generateStaticPageOG(
    title: string,
    description: string,
    path: string,
    image?: OGImage
  ): string {
    return this.generator.generateStaticPageOG(title, description, path, image);
  }

  /**
   * Validate Open Graph tags
   */
  validateOG(ogTags: string) {
    return this.validator.validate(ogTags);
  }

  /**
   * Clear Open Graph cache
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
export const openGraphManager = OpenGraphManager.getInstance();

export const initializeOpenGraph = () => openGraphManager.initialize();

export const generateGameOG = (game: GameOGData) => openGraphManager.generateGameOG(game);

export const generateCategoryOG = (category: CategoryOGData) => openGraphManager.generateCategoryOG(category);

export const generateHomeOG = () => openGraphManager.generateHomeOG();

export const generateStaticPageOG = (
  title: string,
  description: string,
  path: string,
  image?: OGImage
) => openGraphManager.generateStaticPageOG(title, description, path, image);

export const validateOG = (ogTags: string) => openGraphManager.validateOG(ogTags);

// Default export
export default OpenGraphManager;