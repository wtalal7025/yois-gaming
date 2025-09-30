/**
 * Translation management system
 * Provides comprehensive translation loading, caching, and interpolation
 */

import { languageSupport } from './language-support';

// Types for translation management
interface TranslationResource {
  [key: string]: string | TranslationResource | string[];
}

interface InterpolationData {
  [key: string]: string | number | boolean | Date;
}

interface TranslationOptions {
  defaultValue?: string;
  count?: number;
  context?: string;
  interpolation?: InterpolationData;
  returnObjects?: boolean;
  fallbackLng?: string[];
  ns?: string | string[];
}

interface TranslationCache {
  [language: string]: {
    [namespace: string]: TranslationResource;
  };
}

interface MissingTranslation {
  key: string;
  namespace: string;
  language: string;
  defaultValue?: string;
  timestamp: number;
}

interface TranslationStats {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completionPercentage: number;
  lastUpdated: number;
}

/**
 * Translation interpolation engine
 */
class InterpolationEngine {
  private interpolationRegex: RegExp;
  private formatters: Map<string, (value: any, lng: string, options: any) => string> = new Map();

  constructor(prefix: string = '{{', suffix: string = '}}') {
    this.interpolationRegex = new RegExp(`${this.escapeRegex(prefix)}([^${this.escapeRegex(suffix)}]+)${this.escapeRegex(suffix)}`, 'g');
    this.initializeFormatters();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private initializeFormatters(): void {
    // Number formatter
    this.formatters.set('number', (value: number, lng: string, options: any) => {
      const formatOptions = options?.formatParams?.number || {};
      return new Intl.NumberFormat(lng, formatOptions).format(value);
    });

    // Currency formatter
    this.formatters.set('currency', (value: number, lng: string, options: any) => {
      const currency = options?.formatParams?.currency?.currency || 'USD';
      return new Intl.NumberFormat(lng, {
        style: 'currency',
        currency
      }).format(value);
    });

    // Date formatter
    this.formatters.set('date', (value: Date | string | number, lng: string, options: any) => {
      const date = value instanceof Date ? value : new Date(value);
      const formatOptions = options?.formatParams?.date || {};
      return new Intl.DateTimeFormat(lng, formatOptions).format(date);
    });

    // Relative time formatter
    this.formatters.set('relative', (value: number, lng: string, options: any) => {
      const unit = options?.formatParams?.relative?.unit || 'day';
      try {
        const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });
        return rtf.format(value, unit);
      } catch {
        return `${value} ${unit}${Math.abs(value) !== 1 ? 's' : ''}`;
      }
    });

    // Uppercase formatter
    this.formatters.set('uppercase', (value: string) => {
      return String(value).toUpperCase();
    });

    // Lowercase formatter
    this.formatters.set('lowercase', (value: string) => {
      return String(value).toLowerCase();
    });

    // Capitalize formatter
    this.formatters.set('capitalize', (value: string) => {
      return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
    });

    // Truncate formatter
    this.formatters.set('truncate', (value: string, lng: string, options: any) => {
      const maxLength = options?.formatParams?.truncate?.length || 50;
      const suffix = options?.formatParams?.truncate?.suffix || '...';
      
      if (String(value).length <= maxLength) {
        return String(value);
      }
      
      return String(value).substring(0, maxLength - suffix.length) + suffix;
    });
  }

  public interpolate(
    str: string,
    data: InterpolationData = {},
    lng: string = 'en',
    options: any = {}
  ): string {
    return str.replace(this.interpolationRegex, (match, expression) => {
      const [key, formatter] = expression.trim().split(',').map((s: string) => s.trim());
      
      let value = this.getValue(data, key);
      
      if (value === undefined || value === null) {
        return match; // Return original if no value found
      }

      // Apply formatter if specified
      if (formatter && this.formatters.has(formatter)) {
        const formatterFn = this.formatters.get(formatter)!;
        value = formatterFn(value, lng, options);
      }

      return String(value);
    });
  }

  private getValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  public addFormatter(name: string, formatter: (value: any, lng: string, options: any) => string): void {
    this.formatters.set(name, formatter);
  }

  public removeFormatter(name: string): void {
    this.formatters.delete(name);
  }

  public getAvailableFormatters(): string[] {
    return Array.from(this.formatters.keys());
  }
}

/**
 * Translation loader and cacher
 */
class TranslationLoader {
  private cache: TranslationCache = {};
  private loadingPromises: Map<string, Promise<TranslationResource>> = new Map();
  private missingKeys: Set<string> = new Set();

  public async loadNamespace(language: string, namespace: string): Promise<TranslationResource> {
    const cacheKey = `${language}:${namespace}`;
    
    // Return cached version if available
    if (this.cache[language]?.[namespace]) {
      return this.cache[language][namespace];
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Start new loading process
    const loadingPromise = this.doLoadNamespace(language, namespace);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      // Cache the result
      if (!this.cache[language]) {
        this.cache[language] = {};
      }
      this.cache[language][namespace] = result;
      
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async doLoadNamespace(language: string, namespace: string): Promise<TranslationResource> {
    try {
      // Try to load from server
      const response = await fetch(`/api/translations/${language}/${namespace}.json`);
      
      if (response.ok) {
        return await response.json();
      }
      
      // If not found and not the fallback language, try fallback
      const fallbackLang = languageSupport.exportConfiguration().config.fallbackLanguage;
      if (language !== fallbackLang) {
        console.warn(`Translation not found for ${language}:${namespace}, falling back to ${fallbackLang}`);
        return this.loadNamespace(fallbackLang, namespace);
      }
      
      // Return empty object if all else fails
      console.warn(`No translations found for ${language}:${namespace}`);
      return {};
      
    } catch (error) {
      console.error(`Failed to load translations for ${language}:${namespace}:`, error);
      
      // Try fallback language
      const fallbackLang = languageSupport.exportConfiguration().config.fallbackLanguage;
      if (language !== fallbackLang) {
        return this.loadNamespace(fallbackLang, namespace);
      }
      
      return {};
    }
  }

  public preloadLanguage(language: string, namespaces: string[]): Promise<void[]> {
    return Promise.all(
      namespaces.map(namespace => 
        this.loadNamespace(language, namespace).then(() => {})
      )
    );
  }

  public getValue(
    language: string,
    namespace: string,
    key: string,
    defaultValue?: string
  ): string | undefined {
    const resource = this.cache[language]?.[namespace];
    if (!resource) return defaultValue;

    const value = this.getNestedValue(resource, key);
    
    if (value === undefined) {
      // Track missing key
      this.missingKeys.add(`${language}:${namespace}:${key}`);
      return defaultValue;
    }

    return value;
  }

  private getNestedValue(obj: TranslationResource, path: string): string | undefined {
    return path.split('.').reduce((current: any, key) => {
      return current?.[key];
    }, obj) as string | undefined;
  }

  public getMissingKeys(): string[] {
    return Array.from(this.missingKeys);
  }

  public clearMissingKeys(): void {
    this.missingKeys.clear();
  }

  public getCachedLanguages(): string[] {
    return Object.keys(this.cache);
  }

  public getCachedNamespaces(language: string): string[] {
    return Object.keys(this.cache[language] || {});
  }

  public clearCache(language?: string, namespace?: string): void {
    if (!language) {
      this.cache = {};
      return;
    }

    if (!namespace) {
      delete this.cache[language];
      return;
    }

    if (this.cache[language]) {
      delete this.cache[language][namespace];
    }
  }

  public getCacheStats(): {
    languages: number;
    namespaces: number;
    totalKeys: number;
    memoryUsage: number;
  } {
    const languages = Object.keys(this.cache).length;
    let namespaces = 0;
    let totalKeys = 0;

    Object.values(this.cache).forEach(langCache => {
      namespaces += Object.keys(langCache).length;
      Object.values(langCache).forEach(resource => {
        totalKeys += this.countKeys(resource);
      });
    });

    // Rough memory usage estimation
    const memoryUsage = JSON.stringify(this.cache).length * 2; // 2 bytes per character (UTF-16)

    return {
      languages,
      namespaces,
      totalKeys,
      memoryUsage
    };
  }

  private countKeys(obj: any, count = 0): number {
    Object.values(obj).forEach(value => {
      if (typeof value === 'string') {
        count++;
      } else if (typeof value === 'object' && value !== null) {
        count = this.countKeys(value, count);
      }
    });
    return count;
  }
}

/**
 * Main translation manager
 */
export class TranslationManager {
  private static instance: TranslationManager;
  
  private loader: TranslationLoader;
  private interpolationEngine: InterpolationEngine;
  private missingTranslations: Map<string, MissingTranslation> = new Map();
  private missingHandlers: Set<(missing: MissingTranslation) => void> = new Set();

  private constructor() {
    this.loader = new TranslationLoader();
    this.interpolationEngine = new InterpolationEngine();
  }

  public static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  public async t(
    key: string,
    options: TranslationOptions = {}
  ): Promise<string> {
    const {
      defaultValue = key,
      count,
      context,
      interpolation = {},
      ns = 'common',
      fallbackLng
    } = options;

    const currentLang = languageSupport.getCurrentLanguage();
    const namespace = Array.isArray(ns) ? ns[0] : ns;

    // Ensure namespace is loaded
    await this.loader.loadNamespace(currentLang, namespace);

    // Handle plural forms
    let translationKey = key;
    if (count !== undefined) {
      const pluralForm = languageSupport.getPluralForm(count, currentLang);
      translationKey = `${key}_${pluralForm}`;
    }

    // Add context if provided
    if (context) {
      translationKey = `${translationKey}_${context}`;
    }

    // Get translation value
    let value = this.loader.getValue(currentLang, namespace, translationKey, defaultValue);

    // If not found and count was provided, try without plural
    if (value === defaultValue && count !== undefined) {
      value = this.loader.getValue(currentLang, namespace, key, defaultValue);
    }

    // If still not found, try fallback languages
    if (value === defaultValue && fallbackLng) {
      const fallbackLangs = Array.isArray(fallbackLng) ? fallbackLng : [fallbackLng];
      
      for (const fallback of fallbackLangs) {
        await this.loader.loadNamespace(fallback, namespace);
        value = this.loader.getValue(fallback, namespace, translationKey);
        if (value && value !== defaultValue) break;
      }
    }

    // Track missing translation
    if (value === defaultValue) {
      this.trackMissingTranslation({
        key: translationKey,
        namespace,
        language: currentLang,
        defaultValue,
        timestamp: Date.now()
      });
    }

    // Apply interpolation
    if (value && Object.keys(interpolation).length > 0) {
      const interpolationData = count !== undefined
        ? { ...interpolation, count }
        : interpolation;
      
      value = this.interpolationEngine.interpolate(
        value,
        interpolationData,
        currentLang,
        options
      );
    }

    return value || defaultValue;
  }

  // Synchronous version for when translations are already loaded
  public tSync(
    key: string,
    options: TranslationOptions = {}
  ): string {
    const {
      defaultValue = key,
      count,
      context,
      interpolation = {},
      ns = 'common'
    } = options;

    const currentLang = languageSupport.getCurrentLanguage();
    const namespace = Array.isArray(ns) ? ns[0] : ns;

    // Handle plural forms
    let translationKey = key;
    if (count !== undefined) {
      const pluralForm = languageSupport.getPluralForm(count, currentLang);
      translationKey = `${key}_${pluralForm}`;
    }

    // Add context if provided
    if (context) {
      translationKey = `${translationKey}_${context}`;
    }

    // Get translation value
    let value = this.loader.getValue(currentLang, namespace, translationKey, defaultValue);

    // If not found and count was provided, try without plural
    if (value === defaultValue && count !== undefined) {
      value = this.loader.getValue(currentLang, namespace, key, defaultValue);
    }

    // Track missing translation
    if (value === defaultValue) {
      this.trackMissingTranslation({
        key: translationKey,
        namespace,
        language: currentLang,
        defaultValue,
        timestamp: Date.now()
      });
    }

    // Apply interpolation
    if (value && Object.keys(interpolation).length > 0) {
      const interpolationData = count !== undefined
        ? { ...interpolation, count }
        : interpolation;
      
      value = this.interpolationEngine.interpolate(
        value,
        interpolationData,
        currentLang,
        options
      );
    }

    return value || defaultValue;
  }

  public async loadNamespaces(namespaces: string[], language?: string): Promise<void> {
    const targetLang = language || languageSupport.getCurrentLanguage();
    await this.loader.preloadLanguage(targetLang, namespaces);
  }

  public exists(key: string, namespace: string = 'common', language?: string): boolean {
    const targetLang = language || languageSupport.getCurrentLanguage();
    const value = this.loader.getValue(targetLang, namespace, key);
    return value !== undefined;
  }

  public addMissingHandler(handler: (missing: MissingTranslation) => void): () => void {
    this.missingHandlers.add(handler);
    
    return () => {
      this.missingHandlers.delete(handler);
    };
  }

  private trackMissingTranslation(missing: MissingTranslation): void {
    const key = `${missing.language}:${missing.namespace}:${missing.key}`;
    this.missingTranslations.set(key, missing);

    // Notify handlers
    this.missingHandlers.forEach(handler => {
      try {
        handler(missing);
      } catch (error) {
        console.error('Error in missing translation handler:', error);
      }
    });
  }

  public getMissingTranslations(): MissingTranslation[] {
    return Array.from(this.missingTranslations.values());
  }

  public clearMissingTranslations(): void {
    this.missingTranslations.clear();
    this.loader.clearMissingKeys();
  }

  public addFormatter(name: string, formatter: (value: any, lng: string, options: any) => string): void {
    this.interpolationEngine.addFormatter(name, formatter);
  }

  public getAvailableFormatters(): string[] {
    return this.interpolationEngine.getAvailableFormatters();
  }

  public getTranslationStats(language?: string, namespace?: string): TranslationStats {
    const targetLang = language || languageSupport.getCurrentLanguage();
    const missing = this.getMissingTranslations()
      .filter(m => !language || m.language === targetLang)
      .filter(m => !namespace || m.namespace === namespace);

    const cacheStats = this.loader.getCacheStats();
    const missingKeys = missing.length;
    const translatedKeys = Math.max(0, cacheStats.totalKeys - missingKeys);
    const totalKeys = cacheStats.totalKeys;

    return {
      totalKeys,
      translatedKeys,
      missingKeys,
      completionPercentage: totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 100,
      lastUpdated: Date.now()
    };
  }

  public exportMissingTranslations(format: 'json' | 'csv' = 'json'): string {
    const missing = this.getMissingTranslations();

    if (format === 'csv') {
      const headers = ['Key', 'Namespace', 'Language', 'Default Value', 'Timestamp'];
      const rows = missing.map(m => [
        m.key,
        m.namespace,
        m.language,
        m.defaultValue || '',
        new Date(m.timestamp).toISOString()
      ]);

      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    return JSON.stringify(missing, null, 2);
  }

  public clearCache(language?: string, namespace?: string): void {
    this.loader.clearCache(language, namespace);
  }

  public getCacheInfo(): {
    stats: ReturnType<TranslationLoader['getCacheStats']>;
    languages: string[];
    namespaces: Record<string, string[]>;
  } {
    const stats = this.loader.getCacheStats();
    const languages = this.loader.getCachedLanguages();
    const namespaces: Record<string, string[]> = {};

    languages.forEach(lang => {
      namespaces[lang] = this.loader.getCachedNamespaces(lang);
    });

    return {
      stats,
      languages,
      namespaces
    };
  }
}

// Global translation manager instance
export const translationManager = TranslationManager.getInstance();

// Convenience functions
export const t = (key: string, options?: TranslationOptions) => 
  translationManager.t(key, options);

export const tSync = (key: string, options?: TranslationOptions) => 
  translationManager.tSync(key, options);

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).translationManager = translationManager;
  (window as any).t = t;
  (window as any).tSync = tSync;
  console.log('🌐 Translation Manager loaded. Available: window.translationManager, window.t, window.tSync');
}