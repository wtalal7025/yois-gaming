/**
 * Automatic locale detection and switching
 * Provides intelligent locale detection based on multiple sources
 */

import { languageSupport } from './language-support';
import { translationManager } from './translations';

// Types for locale detection
interface LocaleDetectionConfig {
  enabled: boolean;
  sources: LocaleSource[];
  fallbackChain: string[];
  autoSwitch: boolean;
  persistPreference: boolean;
  respectUserChoice: boolean;
  detectFromURL: boolean;
  detectFromSubdomain: boolean;
  detectFromDomain: boolean;
  detectFromIP: boolean;
  detectFromAcceptLanguage: boolean;
  detectFromNavigator: boolean;
}

interface LocaleSource {
  name: string;
  priority: number;
  enabled: boolean;
  detector: () => Promise<string | null> | string | null;
}

interface DetectionResult {
  source: string;
  locale: string;
  confidence: number;
  timestamp: number;
}

interface GeoLocationData {
  country: string;
  region: string;
  city: string;
  timezone: string;
  languages: string[];
}

interface UserPreference {
  locale: string;
  source: string;
  timestamp: number;
  explicit: boolean; // User explicitly chose this locale
}

/**
 * Browser-based locale detection
 */
class BrowserDetector {
  public detectFromNavigator(): string | null {
    // Get languages from navigator in order of preference
    const languages = this.getNavigatorLanguages();
    
    if (languages.length === 0) return null;

    // Find first supported language
    const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
    
    for (const lang of languages) {
      // Try exact match first
      if (supportedLanguages.includes(lang)) {
        return lang;
      }
      
      // Try language family match (e.g., 'en-US' -> 'en')
      const baseLanguage = lang.split('-')[0];
      if (supportedLanguages.includes(baseLanguage)) {
        return baseLanguage;
      }
    }

    return null;
  }

  private getNavigatorLanguages(): string[] {
    const languages: string[] = [];

    // Modern browsers
    if (navigator.languages && navigator.languages.length > 0) {
      languages.push(...navigator.languages);
    }

    // Fallback for older browsers
    if (navigator.language) {
      languages.push(navigator.language);
    }

    // IE fallback
    const userLanguage = (navigator as any).userLanguage;
    if (userLanguage) {
      languages.push(userLanguage);
    }

    // Remove duplicates and normalize
    return [...new Set(languages)].map(lang => this.normalizeLanguageCode(lang));
  }

  private normalizeLanguageCode(code: string): string {
    return code.toLowerCase().replace('_', '-');
  }

  public detectFromAcceptLanguage(acceptLanguageHeader?: string): string | null {
    const header = acceptLanguageHeader || this.getAcceptLanguageHeader();
    if (!header) return null;

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
    const languages = header
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: this.normalizeLanguageCode(code),
          quality: qValue ? parseFloat(qValue) : 1.0
        };
      })
      .sort((a, b) => b.quality - a.quality);

    const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);

    for (const { code } of languages) {
      // Try exact match
      if (supportedLanguages.includes(code)) {
        return code;
      }
      
      // Try base language
      const baseLanguage = code.split('-')[0];
      if (supportedLanguages.includes(baseLanguage)) {
        return baseLanguage;
      }
    }

    return null;
  }

  private getAcceptLanguageHeader(): string | null {
    // In browser environment, we can't directly access Accept-Language header
    // This would typically be passed from server-side or obtained via API
    return null;
  }

  public detectFromTimezone(): string | null {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Map timezones to likely languages
      const timezoneLanguageMap: Record<string, string[]> = {
        // Europe
        'Europe/London': ['en'],
        'Europe/Paris': ['fr'],
        'Europe/Berlin': ['de'],
        'Europe/Madrid': ['es'],
        'Europe/Rome': ['it'],
        'Europe/Moscow': ['ru'],
        'Europe/Istanbul': ['tr'],
        
        // Americas
        'America/New_York': ['en'],
        'America/Chicago': ['en'],
        'America/Denver': ['en'],
        'America/Los_Angeles': ['en'],
        'America/Mexico_City': ['es'],
        'America/Sao_Paulo': ['pt'],
        'America/Buenos_Aires': ['es'],
        
        // Asia
        'Asia/Tokyo': ['ja'],
        'Asia/Shanghai': ['zh'],
        'Asia/Seoul': ['ko'],
        'Asia/Dubai': ['ar'],
        'Asia/Kolkata': ['hi'],
        
        // Others
        'Australia/Sydney': ['en'],
        'Africa/Cairo': ['ar'],
        'Africa/Johannesburg': ['en']
      };

      const languages = timezoneLanguageMap[timezone];
      if (!languages) return null;

      const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
      
      for (const lang of languages) {
        if (supportedLanguages.includes(lang)) {
          return lang;
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}

/**
 * URL-based locale detection
 */
class URLDetector {
  public detectFromURL(): string | null {
    const url = new URL(window.location.href);
    
    // Check URL path (e.g., /en/games, /fr/about)
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0].toLowerCase();
      const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
      
      if (supportedLanguages.includes(firstSegment)) {
        return firstSegment;
      }
    }

    // Check URL parameters (e.g., ?lang=en, ?locale=fr)
    const langParam = url.searchParams.get('lang') || url.searchParams.get('locale');
    if (langParam) {
      const normalizedLang = langParam.toLowerCase();
      const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
      
      if (supportedLanguages.includes(normalizedLang)) {
        return normalizedLang;
      }
    }

    return null;
  }

  public detectFromSubdomain(): string | null {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0].toLowerCase();
    
    // Check if subdomain matches a supported language
    const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
    
    if (supportedLanguages.includes(subdomain)) {
      return subdomain;
    }

    return null;
  }

  public detectFromDomain(): string | null {
    const hostname = window.location.hostname;
    const tld = hostname.split('.').pop()?.toLowerCase();
    
    // Map TLDs to languages
    const tldLanguageMap: Record<string, string> = {
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'it': 'it',
      'jp': 'ja',
      'kr': 'ko',
      'cn': 'zh',
      'ru': 'ru',
      'ar': 'ar',
      'br': 'pt'
    };

    const language = tld ? tldLanguageMap[tld] : null;
    if (!language) return null;

    const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
    return supportedLanguages.includes(language) ? language : null;
  }
}

/**
 * Geolocation-based detection
 */
class GeolocationDetector {
  private cache: GeoLocationData | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  public async detectFromIP(): Promise<string | null> {
    try {
      const geoData = await this.getGeolocationData();
      if (!geoData || !geoData.languages) return null;

      const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);

      // Find first supported language
      for (const lang of geoData.languages) {
        const normalizedLang = lang.toLowerCase();
        
        if (supportedLanguages.includes(normalizedLang)) {
          return normalizedLang;
        }
        
        const baseLanguage = normalizedLang.split('-')[0];
        if (supportedLanguages.includes(baseLanguage)) {
          return baseLanguage;
        }
      }

      // Fallback based on country
      const countryLanguageMap: Record<string, string> = {
        'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en',
        'FR': 'fr', 'BE': 'fr', 'CH': 'fr',
        'DE': 'de', 'AT': 'de',
        'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es',
        'IT': 'it',
        'PT': 'pt', 'BR': 'pt',
        'JP': 'ja',
        'KR': 'ko',
        'CN': 'zh', 'TW': 'zh-TW', 'HK': 'zh',
        'RU': 'ru',
        'TR': 'tr',
        'SA': 'ar', 'AE': 'ar', 'EG': 'ar'
      };

      const language = countryLanguageMap[geoData.country];
      return language && supportedLanguages.includes(language) ? language : null;
      
    } catch (error) {
      console.warn('Failed to detect locale from IP:', error);
      return null;
    }
  }

  private async getGeolocationData(): Promise<GeoLocationData | null> {
    // Check cache
    if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Try multiple geolocation services
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://geoip-db.com/json/'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            this.cache = this.normalizeGeoData(data);
            this.cacheTimestamp = Date.now();
            return this.cache;
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${service}:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get geolocation data:', error);
      return null;
    }
  }

  private normalizeGeoData(data: any): GeoLocationData {
    return {
      country: data.country_code || data.countryCode || data.country || '',
      region: data.region || data.regionName || '',
      city: data.city || '',
      timezone: data.timezone || '',
      languages: data.languages || []
    };
  }
}

/**
 * Main locale detection system
 */
export class LocaleDetection {
  private static instance: LocaleDetection;
  
  private config: LocaleDetectionConfig;
  private browserDetector: BrowserDetector;
  private urlDetector: URLDetector;
  private geolocationDetector: GeolocationDetector;
  private detectionHistory: DetectionResult[] = [];
  private userPreference: UserPreference | null = null;

  private constructor() {
    this.config = this.createDefaultConfig();
    this.browserDetector = new BrowserDetector();
    this.urlDetector = new URLDetector();
    this.geolocationDetector = new GeolocationDetector();
    
    this.loadUserPreference();
    this.setupDetectionSources();
  }

  public static getInstance(): LocaleDetection {
    if (!LocaleDetection.instance) {
      LocaleDetection.instance = new LocaleDetection();
    }
    return LocaleDetection.instance;
  }

  private createDefaultConfig(): LocaleDetectionConfig {
    return {
      enabled: true,
      sources: [],
      fallbackChain: ['en'],
      autoSwitch: true,
      persistPreference: true,
      respectUserChoice: true,
      detectFromURL: true,
      detectFromSubdomain: true,
      detectFromDomain: false,
      detectFromIP: true,
      detectFromAcceptLanguage: true,
      detectFromNavigator: true
    };
  }

  private setupDetectionSources(): void {
    this.config.sources = [
      {
        name: 'user-preference',
        priority: 1,
        enabled: this.config.respectUserChoice,
        detector: () => this.userPreference?.locale || null
      },
      {
        name: 'url-path',
        priority: 2,
        enabled: this.config.detectFromURL,
        detector: () => this.urlDetector.detectFromURL()
      },
      {
        name: 'url-subdomain',
        priority: 3,
        enabled: this.config.detectFromSubdomain,
        detector: () => this.urlDetector.detectFromSubdomain()
      },
      {
        name: 'navigator-languages',
        priority: 4,
        enabled: this.config.detectFromNavigator,
        detector: () => this.browserDetector.detectFromNavigator()
      },
      {
        name: 'accept-language',
        priority: 5,
        enabled: this.config.detectFromAcceptLanguage,
        detector: () => this.browserDetector.detectFromAcceptLanguage()
      },
      {
        name: 'timezone',
        priority: 6,
        enabled: true,
        detector: () => this.browserDetector.detectFromTimezone()
      },
      {
        name: 'domain-tld',
        priority: 7,
        enabled: this.config.detectFromDomain,
        detector: () => this.urlDetector.detectFromDomain()
      },
      {
        name: 'geolocation-ip',
        priority: 8,
        enabled: this.config.detectFromIP,
        detector: () => this.geolocationDetector.detectFromIP()
      }
    ];
  }

  public async detectLocale(): Promise<string> {
    if (!this.config.enabled) {
      return languageSupport.exportConfiguration().config.defaultLanguage;
    }

    // Get enabled sources sorted by priority
    const enabledSources = this.config.sources
      .filter(source => source.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Try each source in order
    for (const source of enabledSources) {
      try {
        const result = await source.detector();
        if (result) {
          this.recordDetection({
            source: source.name,
            locale: result,
            confidence: this.calculateConfidence(source.name),
            timestamp: Date.now()
          });

          return result;
        }
      } catch (error) {
        console.warn(`Detection failed for source ${source.name}:`, error);
      }
    }

    // Use fallback chain
    for (const fallback of this.config.fallbackChain) {
      const supportedLanguages = languageSupport.getSupportedLanguages().map(lang => lang.code);
      if (supportedLanguages.includes(fallback)) {
        return fallback;
      }
    }

    // Final fallback
    return languageSupport.exportConfiguration().config.defaultLanguage;
  }

  private calculateConfidence(source: string): number {
    const confidenceMap: Record<string, number> = {
      'user-preference': 1.0,
      'url-path': 0.9,
      'url-subdomain': 0.8,
      'navigator-languages': 0.7,
      'accept-language': 0.6,
      'timezone': 0.4,
      'domain-tld': 0.5,
      'geolocation-ip': 0.3
    };

    return confidenceMap[source] || 0.1;
  }

  private recordDetection(result: DetectionResult): void {
    this.detectionHistory.push(result);
    
    // Keep only last 10 detection results
    if (this.detectionHistory.length > 10) {
      this.detectionHistory.shift();
    }
  }

  public async autoDetectAndSwitch(): Promise<void> {
    if (!this.config.autoSwitch) return;

    try {
      const detectedLocale = await this.detectLocale();
      const currentLocale = languageSupport.getCurrentLanguage();

      if (detectedLocale !== currentLocale) {
        await languageSupport.setLanguage(detectedLocale);
        
        // Load translations for new language
        await translationManager.loadNamespaces(['common', 'games', 'auth', 'wallet'], detectedLocale);
      }
    } catch (error) {
      console.error('Auto-detection and switch failed:', error);
    }
  }

  public setUserPreference(locale: string, explicit: boolean = true): void {
    this.userPreference = {
      locale,
      source: 'user-selection',
      timestamp: Date.now(),
      explicit
    };

    if (this.config.persistPreference) {
      try {
        localStorage.setItem('user-locale-preference', JSON.stringify(this.userPreference));
      } catch (error) {
        console.warn('Failed to persist user locale preference:', error);
      }
    }
  }

  private loadUserPreference(): void {
    if (!this.config.persistPreference) return;

    try {
      const stored = localStorage.getItem('user-locale-preference');
      if (stored) {
        this.userPreference = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user locale preference:', error);
    }
  }

  public clearUserPreference(): void {
    this.userPreference = null;
    
    if (this.config.persistPreference) {
      try {
        localStorage.removeItem('user-locale-preference');
      } catch (error) {
        console.warn('Failed to clear user locale preference:', error);
      }
    }
  }

  public configure(config: Partial<LocaleDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.setupDetectionSources();
  }

  public getDetectionHistory(): DetectionResult[] {
    return [...this.detectionHistory];
  }

  public getLastDetection(): DetectionResult | null {
    return this.detectionHistory.length > 0 
      ? this.detectionHistory[this.detectionHistory.length - 1] 
      : null;
  }

  public getUserPreference(): UserPreference | null {
    return this.userPreference ? { ...this.userPreference } : null;
  }

  public getBestMatch(): {
    locale: string;
    sources: DetectionResult[];
    confidence: number;
  } {
    if (this.detectionHistory.length === 0) {
      return {
        locale: languageSupport.exportConfiguration().config.defaultLanguage,
        sources: [],
        confidence: 0
      };
    }

    // Group by locale and calculate combined confidence
    const localeGroups = new Map<string, DetectionResult[]>();
    
    this.detectionHistory.forEach(result => {
      if (!localeGroups.has(result.locale)) {
        localeGroups.set(result.locale, []);
      }
      localeGroups.get(result.locale)!.push(result);
    });

    let bestMatch = {
      locale: '',
      sources: [] as DetectionResult[],
      confidence: 0
    };

    localeGroups.forEach((sources, locale) => {
      const combinedConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;
      
      if (combinedConfidence > bestMatch.confidence) {
        bestMatch = {
          locale,
          sources,
          confidence: combinedConfidence
        };
      }
    });

    return bestMatch;
  }

  public getDetectionSources(): LocaleSource[] {
    return [...this.config.sources];
  }

  public enableSource(sourceName: string): void {
    const source = this.config.sources.find(s => s.name === sourceName);
    if (source) {
      source.enabled = true;
    }
  }

  public disableSource(sourceName: string): void {
    const source = this.config.sources.find(s => s.name === sourceName);
    if (source) {
      source.enabled = false;
    }
  }

  public getConfiguration(): LocaleDetectionConfig {
    return { ...this.config };
  }

  public getDetectionReport(): {
    config: LocaleDetectionConfig;
    userPreference: UserPreference | null;
    history: DetectionResult[];
    bestMatch: ReturnType<LocaleDetection['getBestMatch']>;
    sources: LocaleSource[];
  } {
    return {
      config: this.getConfiguration(),
      userPreference: this.getUserPreference(),
      history: this.getDetectionHistory(),
      bestMatch: this.getBestMatch(),
      sources: this.getDetectionSources()
    };
  }
}

// Global locale detection instance
export const localeDetection = LocaleDetection.getInstance();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      localeDetection.autoDetectAndSwitch();
    });
  } else {
    // DOM is already ready
    setTimeout(() => localeDetection.autoDetectAndSwitch(), 0);
  }
}

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).localeDetection = localeDetection;
  console.log('🌐 Locale Detection loaded. Available: window.localeDetection');
}