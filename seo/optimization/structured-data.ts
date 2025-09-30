/**
 * Rich Structured Data Generation System
 * Provides comprehensive Schema.org structured data for enhanced search results
 */

// Types for structured data
export interface StructuredDataConfig {
  type: SchemaType;
  required: boolean;
  context?: string;
  data: Record<string, any>;
}

export interface GameStructuredData {
  gameId: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  image: string;
  url: string;
  rtp?: number;
  minBet?: number;
  maxBet?: number;
  features?: string[];
  releaseDate?: string;
  rating?: {
    value: number;
    count: number;
    bestRating?: number;
    worstRating?: number;
  };
}

export interface OrganizationData {
  name: string;
  description: string;
  url: string;
  logo: string;
  contactPoint: {
    type: string;
    telephone: string;
    email: string;
    availableLanguage: string[];
    areaServed: string;
  };
  sameAs: string[];
  foundingDate: string;
  numberOfEmployees: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}

export interface BreadcrumbData {
  items: Array<{
    position: number;
    name: string;
    url: string;
    image?: string;
  }>;
}

export interface FAQData {
  questions: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
}

export interface ReviewData {
  itemReviewed: {
    type: string;
    name: string;
    url?: string;
  };
  author: {
    name: string;
    url?: string;
  };
  reviewRating: {
    ratingValue: number;
    bestRating: number;
    worstRating: number;
  };
  reviewBody: string;
  datePublished: string;
  publisher?: {
    type: string;
    name: string;
  };
}

export type SchemaType = 
  | 'Organization'
  | 'WebSite'
  | 'WebPage'
  | 'Game'
  | 'SoftwareApplication'
  | 'BreadcrumbList'
  | 'FAQPage'
  | 'Review'
  | 'AggregateRating'
  | 'Product'
  | 'Service'
  | 'Article'
  | 'VideoGame'
  | 'GameServer'
  | 'Brand'
  | 'LocalBusiness'
  | 'EntertainmentBusiness';

/**
 * Structured Data Generator
 */
class StructuredDataGenerator {
  private context = 'https://schema.org';
  private baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  private siteName = 'Gaming Platform';

  /**
   * Generate organization structured data
   */
  generateOrganization(data: OrganizationData): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'Organization',
      '@id': `${this.baseUrl}/#organization`,
      name: data.name,
      description: data.description,
      url: data.url,
      logo: {
        '@type': 'ImageObject',
        url: data.logo,
        width: 512,
        height: 512
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: data.contactPoint.type,
        telephone: data.contactPoint.telephone,
        email: data.contactPoint.email,
        availableLanguage: data.contactPoint.availableLanguage,
        areaServed: data.contactPoint.areaServed
      },
      sameAs: data.sameAs,
      foundingDate: data.foundingDate,
      numberOfEmployees: data.numberOfEmployees,
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.address.streetAddress,
        addressLocality: data.address.addressLocality,
        addressRegion: data.address.addressRegion,
        postalCode: data.address.postalCode,
        addressCountry: data.address.addressCountry
      }
    };
  }

  /**
   * Generate website structured data
   */
  generateWebSite(): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'WebSite',
      '@id': `${this.baseUrl}/#website`,
      name: this.siteName,
      description: 'Premium online gaming platform with secure games and instant payouts',
      url: this.baseUrl,
      publisher: {
        '@id': `${this.baseUrl}/#organization`
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      inLanguage: 'en-US',
      copyrightYear: new Date().getFullYear(),
      genre: ['Gaming', 'Entertainment', 'Casino']
    };
  }

  /**
   * Generate game structured data
   */
  generateGame(data: GameStructuredData): Record<string, any> {
    const game: Record<string, any> = {
      '@context': this.context,
      '@type': 'VideoGame',
      '@id': `${this.baseUrl}/games/${data.gameId}`,
      name: data.name,
      description: data.description,
      url: data.url,
      image: {
        '@type': 'ImageObject',
        url: data.image,
        width: 800,
        height: 600
      },
      genre: data.category,
      publisher: {
        '@type': 'Organization',
        name: data.provider
      },
      applicationCategory: 'Game',
      operatingSystem: ['Web Browser', 'iOS', 'Android'],
      offers: {
        '@type': 'Offer',
        price: data.minBet?.toString() || '0.10',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString()
      },
      inLanguage: 'en-US',
      isAccessibleForFree: false,
      requiresSubscription: false
    };

    // Add optional fields
    if (data.releaseDate) {
      game.datePublished = data.releaseDate;
    }

    if (data.features && data.features.length > 0) {
      game.keywords = data.features.join(', ');
      game.applicationSubCategory = data.features;
    }

    if (data.rating) {
      game.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.rating.value,
        reviewCount: data.rating.count,
        bestRating: data.rating.bestRating || 5,
        worstRating: data.rating.worstRating || 1
      };
    }

    if (data.rtp) {
      game.additionalProperty = [
        {
          '@type': 'PropertyValue',
          name: 'RTP',
          value: `${data.rtp}%`,
          description: 'Return to Player percentage'
        }
      ];
    }

    return game;
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumb(data: BreadcrumbData): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'BreadcrumbList',
      itemListElement: data.items.map(item => ({
        '@type': 'ListItem',
        position: item.position,
        name: item.name,
        item: {
          '@type': 'WebPage',
          '@id': item.url,
          name: item.name,
          url: item.url,
          ...(item.image && {
            image: {
              '@type': 'ImageObject',
              url: item.image
            }
          })
        }
      }))
    };
  }

  /**
   * Generate FAQ structured data
   */
  generateFAQ(data: FAQData): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'FAQPage',
      mainEntity: data.questions.map(qa => ({
        '@type': 'Question',
        name: qa.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: qa.answer
        },
        ...(qa.category && {
          about: {
            '@type': 'Thing',
            name: qa.category
          }
        })
      }))
    };
  }

  /**
   * Generate review structured data
   */
  generateReview(data: ReviewData): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'Review',
      itemReviewed: {
        '@type': data.itemReviewed.type,
        name: data.itemReviewed.name,
        ...(data.itemReviewed.url && { url: data.itemReviewed.url })
      },
      author: {
        '@type': 'Person',
        name: data.author.name,
        ...(data.author.url && { url: data.author.url })
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: data.reviewRating.ratingValue,
        bestRating: data.reviewRating.bestRating,
        worstRating: data.reviewRating.worstRating
      },
      reviewBody: data.reviewBody,
      datePublished: data.datePublished,
      ...(data.publisher && {
        publisher: {
          '@type': data.publisher.type,
          name: data.publisher.name
        }
      })
    };
  }

  /**
   * Generate gaming service structured data
   */
  generateGamingService(): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'Service',
      '@id': `${this.baseUrl}/#service`,
      name: 'Online Gaming Services',
      description: 'Professional online gaming platform with secure transactions and fair play',
      provider: {
        '@id': `${this.baseUrl}/#organization`
      },
      serviceType: 'Entertainment',
      category: ['Gaming', 'Casino', 'Entertainment'],
      areaServed: {
        '@type': 'Country',
        name: 'Global'
      },
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: this.baseUrl,
        serviceSmsNumber: '+1-800-GAMING',
        servicePhone: '+1-800-426-4641'
      },
      offers: {
        '@type': 'Offer',
        description: 'Premium gaming experience with instant payouts',
        availability: 'https://schema.org/InStock',
        priceRange: '$0.10 - $10,000'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 2547,
        bestRating: 5,
        worstRating: 1
      }
    };
  }

  /**
   * Generate software application structured data
   */
  generateSoftwareApplication(): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'SoftwareApplication',
      '@id': `${this.baseUrl}/#app`,
      name: this.siteName,
      description: 'Advanced gaming platform application for secure online gaming',
      applicationCategory: 'GameApplication',
      operatingSystem: ['Web Browser', 'Progressive Web App'],
      url: this.baseUrl,
      downloadUrl: this.baseUrl,
      installUrl: this.baseUrl,
      screenshot: [
        `${this.baseUrl}/images/screenshots/lobby.jpg`,
        `${this.baseUrl}/images/screenshots/games.jpg`,
        `${this.baseUrl}/images/screenshots/wallet.jpg`
      ],
      featureList: [
        'Secure Gaming Environment',
        'Instant Deposits and Withdrawals',
        'Multiple Game Categories',
        'Live Customer Support',
        'Mobile Responsive Design',
        'Advanced Security Features'
      ],
      publisher: {
        '@id': `${this.baseUrl}/#organization`
      },
      datePublished: '2024-01-01',
      version: '1.0.0',
      inLanguage: 'en-US',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      }
    };
  }

  /**
   * Generate local business structured data
   */
  generateLocalBusiness(): Record<string, any> {
    return {
      '@context': this.context,
      '@type': 'EntertainmentBusiness',
      '@id': `${this.baseUrl}/#business`,
      name: this.siteName,
      description: 'Premier online gaming and entertainment platform',
      url: this.baseUrl,
      telephone: '+1-800-426-4641',
      email: 'support@gamingplatform.com',
      priceRange: '$0.10 - $10,000',
      currenciesAccepted: ['USD', 'EUR', 'GBP', 'CAD'],
      paymentAccepted: ['Credit Card', 'Cryptocurrency', 'Bank Transfer'],
      openingHours: 'Mo-Su 00:00-24:00',
      serviceArea: {
        '@type': 'GeoCircle',
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          latitude: 40.7128,
          longitude: -74.0060
        },
        geoRadius: 'Global'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 2547,
        bestRating: 5,
        worstRating: 1
      },
      sameAs: [
        'https://facebook.com/gamingplatform',
        'https://twitter.com/gamingplatform',
        'https://instagram.com/gamingplatform'
      ]
    };
  }
}

/**
 * Structured Data Validator
 */
class StructuredDataValidator {
  private requiredFields: Record<SchemaType, string[]> = {
    Organization: ['@type', 'name', 'url'],
    WebSite: ['@type', 'name', 'url'],
    WebPage: ['@type', 'name', 'url'],
    Game: ['@type', 'name', 'description'],
    SoftwareApplication: ['@type', 'name', 'applicationCategory'],
    BreadcrumbList: ['@type', 'itemListElement'],
    FAQPage: ['@type', 'mainEntity'],
    Review: ['@type', 'itemReviewed', 'author', 'reviewRating'],
    AggregateRating: ['@type', 'ratingValue', 'reviewCount'],
    Product: ['@type', 'name', 'description'],
    Service: ['@type', 'name', 'provider'],
    Article: ['@type', 'headline', 'author'],
    VideoGame: ['@type', 'name', 'genre'],
    GameServer: ['@type', 'name', 'game'],
    Brand: ['@type', 'name'],
    LocalBusiness: ['@type', 'name', 'address'],
    EntertainmentBusiness: ['@type', 'name', 'address']
  };

  /**
   * Validate structured data
   */
  validate(data: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required @context
    if (!data['@context']) {
      errors.push('Missing required @context field');
    } else if (data['@context'] !== 'https://schema.org') {
      warnings.push('Unexpected @context value, should be "https://schema.org"');
    }

    // Check for required @type
    if (!data['@type']) {
      errors.push('Missing required @type field');
      return { isValid: false, errors, warnings };
    }

    const schemaType = data['@type'] as SchemaType;
    const requiredFields = this.requiredFields[schemaType];

    if (!requiredFields) {
      warnings.push(`Unknown schema type: ${schemaType}`);
      return { isValid: true, errors, warnings };
    }

    // Check required fields for this schema type
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type-specific validations
    this.validateSpecificType(data, schemaType, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSpecificType(
    data: Record<string, any>,
    type: SchemaType,
    errors: string[],
    warnings: string[]
  ): void {
    switch (type) {
      case 'Organization':
        this.validateOrganization(data, errors, warnings);
        break;
      case 'Game':
      case 'VideoGame':
        this.validateGame(data, errors, warnings);
        break;
      case 'Review':
        this.validateReview(data, errors, warnings);
        break;
      case 'AggregateRating':
        this.validateRating(data, errors, warnings);
        break;
      case 'BreadcrumbList':
        this.validateBreadcrumb(data, errors, warnings);
        break;
    }
  }

  private validateOrganization(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (data.contactPoint && !data.contactPoint['@type']) {
      errors.push('Organization contactPoint missing @type');
    }
    
    if (data.address && !data.address['@type']) {
      errors.push('Organization address missing @type');
    }
    
    if (!data.logo) {
      warnings.push('Organization missing logo for better rich results');
    }
  }

  private validateGame(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!data.image) {
      warnings.push('Game missing image for rich results');
    }
    
    if (!data.offers) {
      warnings.push('Game missing offers information');
    }
    
    if (data.aggregateRating) {
      const rating = data.aggregateRating;
      if (!rating.ratingValue || !rating.reviewCount) {
        errors.push('AggregateRating missing required fields');
      }
    }
  }

  private validateReview(data: Record<string, any>, errors: string[], warnings: string[]): void {
    const rating = data.reviewRating;
    if (rating) {
      if (typeof rating.ratingValue !== 'number') {
        errors.push('Review rating value must be a number');
      }
      
      if (rating.ratingValue < rating.worstRating || rating.ratingValue > rating.bestRating) {
        errors.push('Review rating value out of range');
      }
    }
    
    if (!data.datePublished) {
      warnings.push('Review missing datePublished for better visibility');
    }
  }

  private validateRating(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (typeof data.ratingValue !== 'number') {
      errors.push('Rating value must be a number');
    }
    
    if (typeof data.reviewCount !== 'number') {
      errors.push('Review count must be a number');
    }
    
    if (data.bestRating && data.worstRating && data.bestRating <= data.worstRating) {
      errors.push('Best rating must be greater than worst rating');
    }
  }

  private validateBreadcrumb(data: Record<string, any>, errors: string[], warnings: string[]): void {
    if (!Array.isArray(data.itemListElement)) {
      errors.push('Breadcrumb itemListElement must be an array');
      return;
    }
    
    for (let i = 0; i < data.itemListElement.length; i++) {
      const item = data.itemListElement[i];
      
      if (!item['@type'] || item['@type'] !== 'ListItem') {
        errors.push(`Breadcrumb item ${i} missing @type ListItem`);
      }
      
      if (typeof item.position !== 'number') {
        errors.push(`Breadcrumb item ${i} position must be a number`);
      }
      
      if (!item.name) {
        errors.push(`Breadcrumb item ${i} missing name`);
      }
    }
  }
}

/**
 * Main Structured Data Manager
 */
export class StructuredDataManager {
  private static instance: StructuredDataManager;
  private generator: StructuredDataGenerator;
  private validator: StructuredDataValidator;
  private schemaCache: Map<string, { data: Record<string, any>; timestamp: number }> = new Map();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.generator = new StructuredDataGenerator();
    this.validator = new StructuredDataValidator();
  }

  static getInstance(): StructuredDataManager {
    if (!StructuredDataManager.instance) {
      StructuredDataManager.instance = new StructuredDataManager();
    }
    return StructuredDataManager.instance;
  }

  /**
   * Initialize structured data manager
   */
  initialize(): void {
    console.log('Structured data generation system initialized');
    this.setupCacheCleaning();
  }

  /**
   * Generate and validate structured data
   */
  generateStructuredData(type: SchemaType, data: any): {
    json: Record<string, any>;
    jsonLd: string;
    validation: ReturnType<StructuredDataValidator['validate']>;
  } {
    const cacheKey = `${type}_${JSON.stringify(data)}`;
    const cached = this.schemaCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      const validation = this.validator.validate(cached.data);
      return {
        json: cached.data,
        jsonLd: this.toJsonLd(cached.data),
        validation
      };
    }

    let json: Record<string, any> = {};

    switch (type) {
      case 'Organization':
        json = this.generator.generateOrganization(data);
        break;
      case 'WebSite':
        json = this.generator.generateWebSite();
        break;
      case 'Game':
      case 'VideoGame':
        json = this.generator.generateGame(data);
        break;
      case 'BreadcrumbList':
        json = this.generator.generateBreadcrumb(data);
        break;
      case 'FAQPage':
        json = this.generator.generateFAQ(data);
        break;
      case 'Review':
        json = this.generator.generateReview(data);
        break;
      case 'Service':
        json = this.generator.generateGamingService();
        break;
      case 'SoftwareApplication':
        json = this.generator.generateSoftwareApplication();
        break;
      case 'EntertainmentBusiness':
        json = this.generator.generateLocalBusiness();
        break;
      default:
        throw new Error(`Unsupported schema type: ${type}`);
    }

    // Cache the result
    this.schemaCache.set(cacheKey, {
      data: json,
      timestamp: Date.now()
    });

    const validation = this.validator.validate(json);

    return {
      json,
      jsonLd: this.toJsonLd(json),
      validation
    };
  }

  /**
   * Generate all core structured data for the site
   */
  generateCoreStructuredData(): Record<string, any> {
    const organization = this.generateStructuredData('Organization', {
      name: 'Gaming Platform',
      description: 'Premier online gaming platform with secure transactions',
      url: process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com',
      logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/logo.png`,
      contactPoint: {
        type: 'Customer Service',
        telephone: '+1-800-426-4641',
        email: 'support@gamingplatform.com',
        availableLanguage: ['en', 'es', 'fr'],
        areaServed: 'Worldwide'
      },
      sameAs: [
        'https://facebook.com/gamingplatform',
        'https://twitter.com/gamingplatform'
      ],
      foundingDate: '2024-01-01',
      numberOfEmployees: '51-200',
      address: {
        streetAddress: '123 Gaming Street',
        addressLocality: 'Las Vegas',
        addressRegion: 'NV',
        postalCode: '89101',
        addressCountry: 'US'
      }
    });

    const website = this.generateStructuredData('WebSite', {});
    const service = this.generateStructuredData('Service', {});
    const app = this.generateStructuredData('SoftwareApplication', {});

    return {
      organization: organization.json,
      website: website.json,
      service: service.json,
      application: app.json
    };
  }

  /**
   * Validate structured data
   */
  validate(data: Record<string, any>) {
    return this.validator.validate(data);
  }

  /**
   * Convert to JSON-LD script tag
   */
  toJsonLd(data: Record<string, any>): string {
    return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  private setupCacheCleaning(): void {
    // Clean expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.schemaCache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.schemaCache.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export convenience functions
export const structuredDataManager = StructuredDataManager.getInstance();

export const initializeStructuredData = () => structuredDataManager.initialize();

export const generateStructuredData = (type: SchemaType, data: any) =>
  structuredDataManager.generateStructuredData(type, data);

export const generateCoreStructuredData = () =>
  structuredDataManager.generateCoreStructuredData();

export const validateStructuredData = (data: Record<string, any>) =>
  structuredDataManager.validate(data);

// Default export
export default StructuredDataManager;