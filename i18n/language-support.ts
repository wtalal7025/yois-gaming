/**
 * Multi-language support system
 * Provides comprehensive internationalization capabilities for the gaming platform
 */

// Types for internationalization
interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  enabled: boolean;
  completion: number; // Percentage of translations completed
}

interface TranslationKey {
  key: string;
  defaultValue: string;
  namespace: string;
  pluralKey?: string;
  context?: string;
}

interface TranslationValue {
  value: string;
  pluralValue?: string;
  context?: Record<string, string>;
}

interface LanguageConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  autoDetect: boolean;
  persistLanguage: boolean;
  loadNamespaces: string[];
  interpolation: InterpolationConfig;
}

interface InterpolationConfig {
  escapeValue: boolean;
  prefix: string;
  suffix: string;
  formatSeparator: string;
  format?: (value: any, format: string, lng: string, options: any) => string;
}

interface PluralRule {
  language: string;
  rule: (count: number) => number;
}

/**
 * Language registry and management
 */
class LanguageRegistry {
  private languages: Map<string, Language> = new Map();
  private pluralRules: Map<string, PluralRule> = new Map();

  constructor() {
    this.initializeLanguages();
    this.initializePluralRules();
  }

  private initializeLanguages(): void {
    const languages: Language[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        rtl: false,
        enabled: true,
        completion: 100
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        rtl: false,
        enabled: true,
        completion: 85
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        rtl: false,
        enabled: true,
        completion: 78
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        rtl: false,
        enabled: true,
        completion: 72
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        flag: '🇮🇹',
        rtl: false,
        enabled: true,
        completion: 65
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇵🇹',
        rtl: false,
        enabled: true,
        completion: 68
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
        rtl: false,
        enabled: true,
        completion: 45
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        flag: '🇰🇷',
        rtl: false,
        enabled: true,
        completion: 42
      },
      {
        code: 'zh',
        name: 'Chinese (Simplified)',
        nativeName: '简体中文',
        flag: '🇨🇳',
        rtl: false,
        enabled: true,
        completion: 55
      },
      {
        code: 'zh-TW',
        name: 'Chinese (Traditional)',
        nativeName: '繁體中文',
        flag: '🇹🇼',
        rtl: false,
        enabled: true,
        completion: 48
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        flag: '🇸🇦',
        rtl: true,
        enabled: true,
        completion: 35
      },
      {
        code: 'he',
        name: 'Hebrew',
        nativeName: 'עברית',
        flag: '🇮🇱',
        rtl: true,
        enabled: true,
        completion: 30
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        flag: '🇷🇺',
        rtl: false,
        enabled: true,
        completion: 58
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳',
        rtl: false,
        enabled: false,
        completion: 15
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        flag: '🇹🇷',
        rtl: false,
        enabled: true,
        completion: 62
      }
    ];

    languages.forEach(lang => {
      this.languages.set(lang.code, lang);
    });
  }

  private initializePluralRules(): void {
    // English and most Germanic languages
    this.pluralRules.set('en', {
      language: 'en',
      rule: (count: number) => count === 1 ? 0 : 1
    });

    // Romance languages (Spanish, French, Italian, Portuguese)
    const romanceRule = (count: number) => count === 1 ? 0 : 1;
    ['es', 'fr', 'it', 'pt'].forEach(lang => {
      this.pluralRules.set(lang, { language: lang, rule: romanceRule });
    });

    // German
    this.pluralRules.set('de', {
      language: 'de',
      rule: (count: number) => count === 1 ? 0 : 1
    });

    // Russian (complex plural rules)
    this.pluralRules.set('ru', {
      language: 'ru',
      rule: (count: number) => {
        const mod10 = count % 10;
        const mod100 = count % 100;
        
        if (mod10 === 1 && mod100 !== 11) return 0;
        if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 1;
        return 2;
      }
    });

    // Arabic (complex plural rules)
    this.pluralRules.set('ar', {
      language: 'ar',
      rule: (count: number) => {
        if (count === 0) return 0;
        if (count === 1) return 1;
        if (count === 2) return 2;
        if (count % 100 >= 3 && count % 100 <= 10) return 3;
        if (count % 100 >= 11) return 4;
        return 5;
      }
    });

    // Asian languages (no plurals)
    ['ja', 'ko', 'zh', 'zh-TW'].forEach(lang => {
      this.pluralRules.set(lang, {
        language: lang,
        rule: () => 0 // No plural forms
      });
    });

    // Hebrew
    this.pluralRules.set('he', {
      language: 'he',
      rule: (count: number) => {
        if (count === 1) return 0;
        if (count === 2) return 1;
        if (count > 2 && count < 21) return 2;
        return 1;
      }
    });
  }

  public getLanguage(code: string): Language | undefined {
    return this.languages.get(code);
  }

  public getAllLanguages(): Language[] {
    return Array.from(this.languages.values());
  }

  public getEnabledLanguages(): Language[] {
    return this.getAllLanguages().filter(lang => lang.enabled);
  }

  public getRTLLanguages(): Language[] {
    return this.getAllLanguages().filter(lang => lang.rtl);
  }

  public getPluralRule(language: string): PluralRule | undefined {
    return this.pluralRules.get(language);
  }

  public enableLanguage(code: string): void {
    const language = this.languages.get(code);
    if (language) {
      language.enabled = true;
      this.languages.set(code, language);
    }
  }

  public disableLanguage(code: string): void {
    const language = this.languages.get(code);
    if (language && code !== 'en') { // Can't disable English
      language.enabled = false;
      this.languages.set(code, language);
    }
  }

  public updateCompletion(code: string, completion: number): void {
    const language = this.languages.get(code);
    if (language) {
      language.completion = Math.max(0, Math.min(100, completion));
      this.languages.set(code, language);
    }
  }

  public getLanguageStats(): {
    total: number;
    enabled: number;
    rtl: number;
    avgCompletion: number;
  } {
    const all = this.getAllLanguages();
    const enabled = this.getEnabledLanguages();
    const rtl = this.getRTLLanguages();
    const avgCompletion = enabled.reduce((sum, lang) => sum + lang.completion, 0) / enabled.length;

    return {
      total: all.length,
      enabled: enabled.length,
      rtl: rtl.length,
      avgCompletion: Math.round(avgCompletion)
    };
  }
}

/**
 * Translation namespace manager
 */
class NamespaceManager {
  private namespaces: Map<string, Set<string>> = new Map();
  private loadedNamespaces: Set<string> = new Set();

  public registerKey(namespace: string, key: string): void {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(key);
  }

  public getNamespaceKeys(namespace: string): string[] {
    return Array.from(this.namespaces.get(namespace) || []);
  }

  public getAllNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  public markAsLoaded(namespace: string): void {
    this.loadedNamespaces.add(namespace);
  }

  public isLoaded(namespace: string): boolean {
    return this.loadedNamespaces.has(namespace);
  }

  public getLoadedNamespaces(): string[] {
    return Array.from(this.loadedNamespaces);
  }

  public getNamespaceStats(): Record<string, { keys: number; loaded: boolean }> {
    const stats: Record<string, { keys: number; loaded: boolean }> = {};
    
    this.namespaces.forEach((keys, namespace) => {
      stats[namespace] = {
        keys: keys.size,
        loaded: this.isLoaded(namespace)
      };
    });

    return stats;
  }
}

/**
 * Main language support system
 */
export class LanguageSupport {
  private static instance: LanguageSupport;
  
  private registry: LanguageRegistry;
  private namespaceManager: NamespaceManager;
  private config: LanguageConfig;
  private currentLanguage: string;
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private changeListeners: Set<(language: string) => void> = new Set();

  private constructor() {
    this.registry = new LanguageRegistry();
    this.namespaceManager = new NamespaceManager();
    this.config = this.createDefaultConfig();
    this.currentLanguage = this.config.defaultLanguage;
    
    this.initializeNamespaces();
  }

  public static getInstance(): LanguageSupport {
    if (!LanguageSupport.instance) {
      LanguageSupport.instance = new LanguageSupport();
    }
    return LanguageSupport.instance;
  }

  private createDefaultConfig(): LanguageConfig {
    return {
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru'],
      autoDetect: true,
      persistLanguage: true,
      loadNamespaces: ['common', 'games', 'auth', 'wallet'],
      interpolation: {
        escapeValue: false,
        prefix: '{{',
        suffix: '}}',
        formatSeparator: ','
      }
    };
  }

  private initializeNamespaces(): void {
    // Register common namespaces and their keys
    const commonNamespaces = {
      common: [
        'welcome', 'loading', 'error', 'success', 'cancel', 'save', 'delete',
        'edit', 'create', 'update', 'back', 'next', 'previous', 'close',
        'menu', 'home', 'settings', 'help', 'about', 'contact'
      ],
      games: [
        'play', 'bet', 'win', 'lose', 'jackpot', 'multiplier', 'round',
        'mines', 'crash', 'limbo', 'dragon-tower', 'bars', 'sugar-rush',
        'start-game', 'cash-out', 'auto-play', 'max-bet', 'min-bet'
      ],
      auth: [
        'login', 'logout', 'register', 'password', 'email', 'username',
        'forgot-password', 'reset-password', 'confirm-password',
        'sign-in', 'sign-up', 'account', 'profile'
      ],
      wallet: [
        'balance', 'deposit', 'withdraw', 'transaction', 'history',
        'amount', 'currency', 'payment', 'pending', 'completed', 'failed'
      ]
    };

    Object.entries(commonNamespaces).forEach(([namespace, keys]) => {
      keys.forEach(key => {
        this.namespaceManager.registerKey(namespace, key);
      });
    });
  }

  public configure(config: Partial<LanguageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public async setLanguage(languageCode: string, force: boolean = false): Promise<void> {
    const language = this.registry.getLanguage(languageCode);
    
    if (!language) {
      throw new Error(`Language ${languageCode} not found`);
    }

    if (!language.enabled && !force) {
      throw new Error(`Language ${languageCode} is not enabled`);
    }

    if (this.currentLanguage === languageCode) {
      return;
    }

    // Load required namespaces
    await this.loadNamespaces(languageCode, this.config.loadNamespaces);

    this.currentLanguage = languageCode;

    // Persist language if configured
    if (this.config.persistLanguage) {
      try {
        localStorage.setItem('preferred-language', languageCode);
      } catch (error) {
        console.warn('Failed to persist language preference:', error);
      }
    }

    // Update document direction for RTL languages
    document.dir = language.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = languageCode;

    // Notify listeners
    this.changeListeners.forEach(listener => {
      try {
        listener(languageCode);
      } catch (error) {
        console.error('Error in language change listener:', error);
      }
    });
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getCurrentLanguageInfo(): Language {
    return this.registry.getLanguage(this.currentLanguage)!;
  }

  public getSupportedLanguages(): Language[] {
    return this.config.supportedLanguages
      .map(code => this.registry.getLanguage(code))
      .filter((lang): lang is Language => lang !== undefined && lang.enabled);
  }

  public isRTL(languageCode?: string): boolean {
    const language = this.registry.getLanguage(languageCode || this.currentLanguage);
    return language?.rtl || false;
  }

  public async loadNamespaces(languageCode: string, namespaces: string[]): Promise<void> {
    const loadPromises = namespaces.map(namespace => 
      this.loadNamespace(languageCode, namespace)
    );

    await Promise.all(loadPromises);
  }

  private async loadNamespace(languageCode: string, namespace: string): Promise<void> {
    const key = `${languageCode}:${namespace}`;
    
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const promise = this.doLoadNamespace(languageCode, namespace);
    this.loadingPromises.set(key, promise);

    try {
      await promise;
      this.namespaceManager.markAsLoaded(namespace);
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async doLoadNamespace(languageCode: string, namespace: string): Promise<void> {
    try {
      // In a real implementation, this would load from files or API
      const response = await fetch(`/api/translations/${languageCode}/${namespace}.json`);
      
      if (!response.ok) {
        // Fall back to default language
        if (languageCode !== this.config.fallbackLanguage) {
          await this.doLoadNamespace(this.config.fallbackLanguage, namespace);
        }
        return;
      }

      const translations = await response.json();
      
      // Store translations (would be integrated with translation manager)
      console.log(`Loaded ${namespace} translations for ${languageCode}:`, translations);
      
    } catch (error) {
      console.error(`Failed to load namespace ${namespace} for ${languageCode}:`, error);
      
      // Fall back to default language
      if (languageCode !== this.config.fallbackLanguage) {
        await this.doLoadNamespace(this.config.fallbackLanguage, namespace);
      }
    }
  }

  public onLanguageChange(listener: (language: string) => void): () => void {
    this.changeListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  public getPersistedLanguage(): string | null {
    try {
      return localStorage.getItem('preferred-language');
    } catch {
      return null;
    }
  }

  public detectBrowserLanguage(): string {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    const shortCode = browserLang.split('-')[0];
    
    // Check if we support the exact language code
    const supportedCodes = this.config.supportedLanguages;
    if (supportedCodes.includes(browserLang)) {
      return browserLang;
    }
    
    // Check if we support the short code
    if (supportedCodes.includes(shortCode)) {
      return shortCode;
    }
    
    return this.config.defaultLanguage;
  }

  public async initializeFromBrowser(): Promise<void> {
    let targetLanguage = this.config.defaultLanguage;

    // Try persisted language first
    if (this.config.persistLanguage) {
      const persisted = this.getPersistedLanguage();
      if (persisted && this.config.supportedLanguages.includes(persisted)) {
        targetLanguage = persisted;
      }
    }

    // Try browser detection if auto-detect is enabled
    if (this.config.autoDetect && targetLanguage === this.config.defaultLanguage) {
      targetLanguage = this.detectBrowserLanguage();
    }

    await this.setLanguage(targetLanguage);
  }

  public getPluralForm(count: number, languageCode?: string): number {
    const language = languageCode || this.currentLanguage;
    const rule = this.registry.getPluralRule(language);
    
    if (!rule) {
      // Default English rule
      return count === 1 ? 0 : 1;
    }
    
    return rule.rule(count);
  }

  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.currentLanguage, options).format(value);
    } catch {
      return value.toString();
    }
  }

  public formatCurrency(value: number, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat(this.currentLanguage, {
        style: 'currency',
        currency
      }).format(value);
    } catch {
      return `${currency} ${value}`;
    }
  }

  public formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
    } catch {
      return date.toISOString();
    }
  }

  public formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    try {
      const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: 'auto' });
      return rtf.format(value, unit);
    } catch {
      return `${value} ${unit}`;
    }
  }

  public getLanguageStats(): {
    current: Language;
    supported: number;
    loaded: string[];
    completion: number;
    rtl: boolean;
  } {
    const current = this.getCurrentLanguageInfo();
    const supported = this.getSupportedLanguages().length;
    const loaded = this.namespaceManager.getLoadedNamespaces();
    
    return {
      current,
      supported,
      loaded,
      completion: current.completion,
      rtl: current.rtl
    };
  }

  public exportConfiguration(): {
    config: LanguageConfig;
    languages: Language[];
    namespaces: Record<string, { keys: number; loaded: boolean }>;
  } {
    return {
      config: this.config,
      languages: this.registry.getAllLanguages(),
      namespaces: this.namespaceManager.getNamespaceStats()
    };
  }
}

// Global language support instance
export const languageSupport = LanguageSupport.getInstance();

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).languageSupport = languageSupport;
  console.log('🌍 Language Support loaded. Available: window.languageSupport');
}