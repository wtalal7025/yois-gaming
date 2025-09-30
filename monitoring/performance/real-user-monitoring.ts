/**
 * Real User Monitoring (RUM) Implementation
 * Provides comprehensive performance monitoring for real user experiences
 */

// Types for RUM metrics
export interface RUMMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface NavigationTiming {
  navigationStart: number;
  domContentLoadedEventEnd: number;
  loadEventEnd: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

export interface ResourceTiming {
  name: string;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  initiatorType: string;
}

export interface UserExperience {
  sessionId: string;
  userId?: string;
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  engagementScore: number;
  conversionEvents: string[];
  errorCount: number;
  performanceScore: number;
}

export interface RUMConfig {
  apiEndpoint: string;
  sampleRate: number;
  enabledMetrics: {
    coreWebVitals: boolean;
    resourceTiming: boolean;
    navigationTiming: boolean;
    userBehavior: boolean;
    errorTracking: boolean;
  };
  privacy: {
    anonymizeIPs: boolean;
    respectDNT: boolean;
    consentRequired: boolean;
  };
  buffering: {
    maxBufferSize: number;
    flushInterval: number;
    flushOnUnload: boolean;
  };
}

/**
 * Performance Observer Wrapper
 */
class PerformanceObserverWrapper {
  private observers: Map<string, PerformanceObserver> = new Map();

  /**
   * Observe performance entries
   */
  observe(
    entryTypes: string[],
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      const observerId = entryTypes.join(',');
      
      observer.observe({ entryTypes });
      this.observers.set(observerId, observer);
    } catch (error) {
      console.error('Failed to create PerformanceObserver:', error);
    }
  }

  /**
   * Disconnect all observers
   */
  disconnectAll(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Get specific observer
   */
  getObserver(entryTypes: string[]): PerformanceObserver | undefined {
    const observerId = entryTypes.join(',');
    return this.observers.get(observerId);
  }
}

/**
 * Core Web Vitals Collector
 */
class CoreWebVitalsCollector {
  private metrics: Map<string, number> = new Map();
  private callbacks: Array<(metric: RUMMetric) => void> = [];

  constructor() {
    this.initializeLCP();
    this.initializeFID();
    this.initializeCLS();
  }

  /**
   * Add metric callback
   */
  onMetric(callback: (metric: RUMMetric) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Get current metrics
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries());
  }

  private initializeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            const lcp = entry.startTime;
            this.metrics.set('LCP', lcp);
            this.emitMetric('LCP', lcp);
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.error('Failed to observe LCP:', error);
    }
  }

  private initializeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            this.metrics.set('FID', fid);
            this.emitMetric('FID', fid);
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.error('Failed to observe FID:', error);
    }
  }

  private initializeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsScore = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        }
        
        this.metrics.set('CLS', clsScore);
        this.emitMetric('CLS', clsScore);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.error('Failed to observe CLS:', error);
    }
  }

  private emitMetric(name: string, value: number): void {
    const metric: RUMMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    this.callbacks.forEach(callback => callback(metric));
  }

  private getSessionId(): string {
    // Simple session ID generation - in production, use a proper session management
    let sessionId = sessionStorage.getItem('rum-session-id');
    if (!sessionId) {
      sessionId = `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('rum-session-id', sessionId);
    }
    return sessionId;
  }
}

/**
 * Resource Performance Tracker
 */
class ResourcePerformanceTracker {
  private observedResources: Set<string> = new Set();
  private callbacks: Array<(resources: ResourceTiming[]) => void> = [];

  constructor() {
    this.initializeResourceObserver();
  }

  /**
   * Add resource callback
   */
  onResources(callback: (resources: ResourceTiming[]) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Get resource timings
   */
  getResourceTimings(): ResourceTiming[] {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return entries.map(entry => ({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      initiatorType: entry.initiatorType
    }));
  }

  private initializeResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const newResources: ResourceTiming[] = [];
        
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          if (!this.observedResources.has(resource.name)) {
            this.observedResources.add(resource.name);
            
            newResources.push({
              name: resource.name,
              startTime: resource.startTime,
              duration: resource.duration,
              transferSize: resource.transferSize || 0,
              encodedBodySize: resource.encodedBodySize || 0,
              decodedBodySize: resource.decodedBodySize || 0,
              initiatorType: resource.initiatorType
            });
          }
        }
        
        if (newResources.length > 0) {
          this.callbacks.forEach(callback => callback(newResources));
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.error('Failed to observe resources:', error);
    }
  }
}

/**
 * Navigation Performance Tracker
 */
class NavigationPerformanceTracker {
  /**
   * Get navigation timing metrics
   */
  getNavigationTiming(): NavigationTiming | null {
    if (!performance.timing) return null;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    return {
      navigationStart,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd - navigationStart,
      loadEventEnd: timing.loadEventEnd - navigationStart,
      // Additional metrics would be calculated here
    };
  }

  /**
   * Get paint timing metrics
   */
  getPaintTiming(): { firstPaint?: number; firstContentfulPaint?: number } {
    const paintEntries = performance.getEntriesByType('paint');
    const result: { firstPaint?: number; firstContentfulPaint?: number } = {};

    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        result.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        result.firstContentfulPaint = entry.startTime;
      }
    }

    return result;
  }
}

/**
 * RUM Data Buffer
 */
class RUMDataBuffer {
  private buffer: RUMMetric[] = [];
  private config: RUMConfig['buffering'];
  private flushTimer?: NodeJS.Timeout;
  private onFlush: (metrics: RUMMetric[]) => void;

  constructor(
    config: RUMConfig['buffering'],
    onFlush: (metrics: RUMMetric[]) => void
  ) {
    this.config = config;
    this.onFlush = onFlush;
    this.startFlushTimer();
    this.setupUnloadHandler();
  }

  /**
   * Add metric to buffer
   */
  add(metric: RUMMetric): void {
    this.buffer.push(metric);

    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffer
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const metricsToFlush = [...this.buffer];
    this.buffer = [];
    
    try {
      this.onFlush(metricsToFlush);
    } catch (error) {
      console.error('Failed to flush RUM metrics:', error);
      // Re-add metrics to buffer for retry
      this.buffer.unshift(...metricsToFlush);
    }
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupUnloadHandler(): void {
    if (this.config.flushOnUnload) {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Use sendBeacon for reliable unload sending
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

/**
 * Main RUM Manager
 */
export class RealUserMonitoring {
  private static instance: RealUserMonitoring;
  private config: RUMConfig;
  private buffer: RUMDataBuffer;
  private coreWebVitals: CoreWebVitalsCollector;
  private resourceTracker: ResourcePerformanceTracker;
  private navigationTracker: NavigationPerformanceTracker;
  private performanceObserver: PerformanceObserverWrapper;
  private isInitialized = false;

  private constructor(config: RUMConfig) {
    this.config = config;
    this.buffer = new RUMDataBuffer(config.buffering, this.sendMetrics.bind(this));
    this.coreWebVitals = new CoreWebVitalsCollector();
    this.resourceTracker = new ResourcePerformanceTracker();
    this.navigationTracker = new NavigationPerformanceTracker();
    this.performanceObserver = new PerformanceObserverWrapper();
  }

  static getInstance(config?: RUMConfig): RealUserMonitoring {
    if (!RealUserMonitoring.instance && config) {
      RealUserMonitoring.instance = new RealUserMonitoring(config);
    }
    return RealUserMonitoring.instance;
  }

  /**
   * Initialize RUM tracking
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Check privacy settings
    if (this.config.privacy.respectDNT && navigator.doNotTrack === '1') {
      console.log('RUM: Respecting Do Not Track setting');
      return;
    }

    if (this.config.privacy.consentRequired && !this.hasUserConsent()) {
      console.log('RUM: Waiting for user consent');
      return;
    }

    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      console.log('RUM: Skipping due to sampling rate');
      return;
    }

    this.setupMetricCollection();
    this.isInitialized = true;
    console.log('RUM: Initialized successfully');
  }

  /**
   * Track custom metric
   */
  trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    if (!this.isInitialized) return;

    const metric: RUMMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      metadata
    };

    this.buffer.add(metric);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): Record<string, number> {
    const metrics = {
      ...this.coreWebVitals.getMetrics(),
      ...this.getBasicTimings()
    };

    return metrics;
  }

  /**
   * Destroy RUM instance
   */
  destroy(): void {
    this.buffer.destroy();
    this.performanceObserver.disconnectAll();
    this.isInitialized = false;
  }

  private setupMetricCollection(): void {
    if (this.config.enabledMetrics.coreWebVitals) {
      this.coreWebVitals.onMetric((metric) => {
        this.buffer.add(metric);
      });
    }

    if (this.config.enabledMetrics.resourceTiming) {
      this.resourceTracker.onResources((resources) => {
        resources.forEach(resource => {
          this.trackMetric(`resource.${resource.initiatorType}.duration`, resource.duration, {
            name: resource.name,
            transferSize: resource.transferSize
          });
        });
      });
    }

    if (this.config.enabledMetrics.navigationTiming) {
      // Track navigation timing on page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigationTiming = this.navigationTracker.getNavigationTiming();
          if (navigationTiming) {
            this.trackMetric('navigation.domContentLoaded', navigationTiming.domContentLoadedEventEnd);
            this.trackMetric('navigation.loadComplete', navigationTiming.loadEventEnd);
          }

          const paintTiming = this.navigationTracker.getPaintTiming();
          if (paintTiming.firstPaint) {
            this.trackMetric('paint.first', paintTiming.firstPaint);
          }
          if (paintTiming.firstContentfulPaint) {
            this.trackMetric('paint.firstContentful', paintTiming.firstContentfulPaint);
          }
        }, 100);
      });
    }
  }

  private getBasicTimings(): Record<string, number> {
    const timings: Record<string, number> = {};

    if (performance.timing) {
      const t = performance.timing;
      const navigationStart = t.navigationStart;

      timings['timing.dns'] = t.domainLookupEnd - t.domainLookupStart;
      timings['timing.connect'] = t.connectEnd - t.connectStart;
      timings['timing.request'] = t.responseStart - t.requestStart;
      timings['timing.response'] = t.responseEnd - t.responseStart;
      timings['timing.dom'] = t.domComplete - t.domLoading;
    }

    return timings;
  }

  private async sendMetrics(metrics: RUMMetric[]): Promise<void> {
    try {
      // Use sendBeacon for reliability, fallback to fetch
      const payload = JSON.stringify(metrics);
      
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(this.config.apiEndpoint, payload);
        if (!success) {
          throw new Error('sendBeacon failed');
        }
      } else {
        await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
          keepalive: true
        });
      }
    } catch (error) {
      console.error('Failed to send RUM metrics:', error);
      throw error;
    }
  }

  private hasUserConsent(): boolean {
    // Check for consent - this would integrate with your consent management platform
    return localStorage.getItem('rum-consent') === 'granted';
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('rum-session-id');
    if (!sessionId) {
      sessionId = `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('rum-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    // Get user ID from your authentication system
    return localStorage.getItem('user-id') || undefined;
  }
}

// Default configuration
export const defaultRUMConfig: RUMConfig = {
  apiEndpoint: '/api/analytics/rum',
  sampleRate: 1.0, // 100% sampling for development
  enabledMetrics: {
    coreWebVitals: true,
    resourceTiming: true,
    navigationTiming: true,
    userBehavior: true,
    errorTracking: true,
  },
  privacy: {
    anonymizeIPs: true,
    respectDNT: true,
    consentRequired: false, // Set to true in production
  },
  buffering: {
    maxBufferSize: 50,
    flushInterval: 30000, // 30 seconds
    flushOnUnload: true,
  },
};

// Export convenience functions
export const initializeRUM = (config: Partial<RUMConfig> = {}) => {
  const finalConfig = { ...defaultRUMConfig, ...config };
  const rum = RealUserMonitoring.getInstance(finalConfig);
  rum.initialize();
  return rum;
};

export const trackRUMMetric = (name: string, value: number, metadata?: Record<string, any>) => {
  const rum = RealUserMonitoring.getInstance();
  rum?.trackMetric(name, value, metadata);
};

// Default export
export default RealUserMonitoring;