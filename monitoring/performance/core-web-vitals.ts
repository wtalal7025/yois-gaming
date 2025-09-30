/**
 * Core Web Vitals Tracking System
 * Specialized tracking for Google's Core Web Vitals metrics: LCP, FID, CLS
 */

// Types for Core Web Vitals
export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
  url: string;
  attribution?: WebVitalAttribution;
}

export interface WebVitalAttribution {
  // LCP attribution
  largestContentfulPaintEntry?: PerformanceEntry;
  lcpResourceEntry?: PerformanceResourceTiming;
  
  // FID attribution
  firstInputEntry?: PerformanceEventTiming;
  eventTarget?: string;
  eventType?: string;
  
  // CLS attribution
  largestShiftEntry?: LayoutShift;
  largestShiftSource?: LayoutShiftAttribution;
  largestShiftTarget?: string;
  
  // Common attribution
  loadState?: 'loading' | 'dom-interactive' | 'dom-content-loaded' | 'complete';
  navigationEntry?: PerformanceNavigationTiming;
}

export interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  lastInputTime: number;
  sources: LayoutShiftAttribution[];
}

export interface LayoutShiftAttribution {
  node?: Element;
  previousRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}

export interface WebVitalsConfig {
  reportAllChanges: boolean;
  thresholds: {
    LCP: { good: number; poor: number };
    FID: { good: number; poor: number };
    CLS: { good: number; poor: number };
  };
  attribution: boolean;
  debug: boolean;
}

/**
 * Web Vitals Thresholds (Google recommended)
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
};

/**
 * Utility Functions
 */
class WebVitalsUtils {
  /**
   * Get rating based on thresholds
   */
  static getRating(
    metricName: WebVitalMetric['name'],
    value: number
  ): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = WEB_VITALS_THRESHOLDS[metricName];
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get navigation type
   */
  static getNavigationType(): WebVitalMetric['navigationType'] {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return 'navigate';
    }

    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      return navigationEntry.type as WebVitalMetric['navigationType'];
    }

    return 'navigate';
  }

  /**
   * Get load state
   */
  static getLoadState(): 'loading' | 'dom-interactive' | 'dom-content-loaded' | 'complete' {
    if (document.readyState === 'loading') return 'loading';
    if (document.readyState === 'interactive') return 'dom-interactive';
    return 'complete';
  }

  /**
   * Get element selector
   */
  static getElementSelector(element: Element | null): string {
    if (!element) return 'unknown';

    // Use ID if available
    if (element.id) return `#${element.id}`;

    // Use class names
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    // Use tag name
    const tagName = element.tagName.toLowerCase();
    
    // Add nth-child if there are siblings
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName.toLowerCase() === tagName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        return `${tagName}:nth-child(${index})`;
      }
    }

    return tagName;
  }

  /**
   * Generate unique ID for metric
   */
  static generateMetricId(name: string): string {
    return `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Largest Contentful Paint (LCP) Tracker
 */
class LCPTracker {
  private value = 0;
  private observer?: PerformanceObserver;
  private callback: (metric: WebVitalMetric) => void;
  private config: WebVitalsConfig;

  constructor(callback: (metric: WebVitalMetric) => void, config: WebVitalsConfig) {
    this.callback = callback;
    this.config = config;
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        const newValue = lastEntry.startTime;
        const delta = newValue - this.value;

        if (this.config.reportAllChanges || newValue > this.value) {
          this.value = newValue;
          this.reportLCP(newValue, delta, lastEntry);
        }
      });

      this.observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to initialize LCP observer:', error);
      }
    }
  }

  private reportLCP(value: number, delta: number, entry: PerformanceEntry): void {
    const metric: WebVitalMetric = {
      name: 'LCP',
      value,
      rating: WebVitalsUtils.getRating('LCP', value),
      delta,
      id: WebVitalsUtils.generateMetricId('LCP'),
      timestamp: Date.now(),
      navigationType: WebVitalsUtils.getNavigationType(),
      url: window.location.href,
    };

    if (this.config.attribution) {
      metric.attribution = this.getLCPAttribution(entry);
    }

    this.callback(metric);
  }

  private getLCPAttribution(entry: PerformanceEntry): WebVitalAttribution {
    const attribution: WebVitalAttribution = {
      largestContentfulPaintEntry: entry,
      loadState: WebVitalsUtils.getLoadState(),
    };

    // Try to get the resource entry for LCP element
    const lcpEntry = entry as any;
    if (lcpEntry.element) {
      const resourceName = lcpEntry.element.src || lcpEntry.element.href;
      if (resourceName) {
        const resourceEntries = performance.getEntriesByName(resourceName);
        if (resourceEntries.length > 0) {
          attribution.lcpResourceEntry = resourceEntries[0] as PerformanceResourceTiming;
        }
      }
    }

    return attribution;
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}

/**
 * First Input Delay (FID) Tracker
 */
class FIDTracker {
  private observer?: PerformanceObserver;
  private callback: (metric: WebVitalMetric) => void;
  private config: WebVitalsConfig;

  constructor(callback: (metric: WebVitalMetric) => void, config: WebVitalsConfig) {
    this.callback = callback;
    this.config = config;
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          const value = fidEntry.processingStart - fidEntry.startTime;
          
          this.reportFID(value, value, fidEntry);
        }
      });

      this.observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to initialize FID observer:', error);
      }
    }
  }

  private reportFID(value: number, delta: number, entry: PerformanceEventTiming): void {
    const metric: WebVitalMetric = {
      name: 'FID',
      value,
      rating: WebVitalsUtils.getRating('FID', value),
      delta,
      id: WebVitalsUtils.generateMetricId('FID'),
      timestamp: Date.now(),
      navigationType: WebVitalsUtils.getNavigationType(),
      url: window.location.href,
    };

    if (this.config.attribution) {
      metric.attribution = this.getFIDAttribution(entry);
    }

    this.callback(metric);
  }

  private getFIDAttribution(entry: PerformanceEventTiming): WebVitalAttribution {
    return {
      firstInputEntry: entry,
      eventTarget: WebVitalsUtils.getElementSelector(entry.target as Element),
      eventType: entry.name,
      loadState: WebVitalsUtils.getLoadState(),
    };
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}

/**
 * Cumulative Layout Shift (CLS) Tracker
 */
class CLSTracker {
  private value = 0;
  private observer?: PerformanceObserver;
  private callback: (metric: WebVitalMetric) => void;
  private config: WebVitalsConfig;
  private largestShift?: LayoutShift;

  constructor(callback: (metric: WebVitalMetric) => void, config: WebVitalsConfig) {
    this.callback = callback;
    this.config = config;
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShift;
          
          // Only count layout shifts that don't have recent input
          if (!layoutShift.hadRecentInput) {
            const delta = layoutShift.value;
            this.value += delta;

            // Track the largest shift for attribution
            if (!this.largestShift || layoutShift.value > this.largestShift.value) {
              this.largestShift = layoutShift;
            }

            if (this.config.reportAllChanges || delta > 0) {
              this.reportCLS(this.value, delta);
            }
          }
        }
      });

      this.observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to initialize CLS observer:', error);
      }
    }
  }

  private reportCLS(value: number, delta: number): void {
    const metric: WebVitalMetric = {
      name: 'CLS',
      value,
      rating: WebVitalsUtils.getRating('CLS', value),
      delta,
      id: WebVitalsUtils.generateMetricId('CLS'),
      timestamp: Date.now(),
      navigationType: WebVitalsUtils.getNavigationType(),
      url: window.location.href,
    };

    if (this.config.attribution && this.largestShift) {
      metric.attribution = this.getCLSAttribution(this.largestShift);
    }

    this.callback(metric);
  }

  private getCLSAttribution(largestShift: LayoutShift): WebVitalAttribution {
    const attribution: WebVitalAttribution = {
      largestShiftEntry: largestShift,
      loadState: WebVitalsUtils.getLoadState(),
    };

    if (largestShift.sources && largestShift.sources.length > 0) {
      const largestSource = largestShift.sources.reduce((prev, current) =>
        (current.currentRect.width * current.currentRect.height) > 
        (prev.currentRect.width * prev.currentRect.height) ? current : prev
      );

      attribution.largestShiftSource = largestSource;
      attribution.largestShiftTarget = WebVitalsUtils.getElementSelector(largestSource.node || null);
    }

    return attribution;
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}

/**
 * First Contentful Paint (FCP) Tracker
 */
class FCPTracker {
  private callback: (metric: WebVitalMetric) => void;
  private config: WebVitalsConfig;
  private observer?: PerformanceObserver;

  constructor(callback: (metric: WebVitalMetric) => void, config: WebVitalsConfig) {
    this.callback = callback;
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');

    if (fcpEntry) {
      this.reportFCP(fcpEntry.startTime, fcpEntry);
    } else if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.reportFCP(entry.startTime, entry);
              this.observer?.disconnect();
            }
          }
        });

        this.observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        if (this.config.debug) {
          console.error('Failed to observe FCP:', error);
        }
      }
    }
  }

  private reportFCP(value: number, entry: PerformanceEntry): void {
    const metric: WebVitalMetric = {
      name: 'FCP',
      value,
      rating: WebVitalsUtils.getRating('FCP', value),
      delta: value,
      id: WebVitalsUtils.generateMetricId('FCP'),
      timestamp: Date.now(),
      navigationType: WebVitalsUtils.getNavigationType(),
      url: window.location.href,
    };

    this.callback(metric);
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}

/**
 * Main Core Web Vitals Manager
 */
export class CoreWebVitalsTracker {
  private static instance: CoreWebVitalsTracker;
  private config: WebVitalsConfig;
  private trackers: {
    lcp?: LCPTracker;
    fid?: FIDTracker;
    cls?: CLSTracker;
    fcp?: FCPTracker;
  } = {};
  private callbacks: Array<(metric: WebVitalMetric) => void> = [];
  private isInitialized = false;

  private constructor(config: WebVitalsConfig) {
    this.config = config;
  }

  static getInstance(config?: WebVitalsConfig): CoreWebVitalsTracker {
    if (!CoreWebVitalsTracker.instance && config) {
      CoreWebVitalsTracker.instance = new CoreWebVitalsTracker(config);
    }
    return CoreWebVitalsTracker.instance;
  }

  /**
   * Initialize tracking
   */
  initialize(): void {
    if (this.isInitialized) return;

    const callback = this.handleMetric.bind(this);

    // Initialize all trackers
    this.trackers.lcp = new LCPTracker(callback, this.config);
    this.trackers.fid = new FIDTracker(callback, this.config);
    this.trackers.cls = new CLSTracker(callback, this.config);
    this.trackers.fcp = new FCPTracker(callback, this.config);

    // Setup final reporting on page hide
    this.setupFinalReporting();

    this.isInitialized = true;
    
    if (this.config.debug) {
      console.log('Core Web Vitals tracking initialized');
    }
  }

  /**
   * Add callback for metrics
   */
  onMetric(callback: (metric: WebVitalMetric) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  offMetric(callback: (metric: WebVitalMetric) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Get current metric values
   */
  getCurrentMetrics(): Partial<Record<WebVitalMetric['name'], number>> {
    const metrics: Partial<Record<WebVitalMetric['name'], number>> = {};

    // Get paint timings
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      metrics.FCP = fcpEntry.startTime;
    }

    // Other metrics are tracked by observers and reported via callbacks
    return metrics;
  }

  /**
   * Destroy all trackers
   */
  destroy(): void {
    Object.values(this.trackers).forEach(tracker => tracker?.destroy());
    this.trackers = {};
    this.callbacks = [];
    this.isInitialized = false;
  }

  private handleMetric(metric: WebVitalMetric): void {
    if (this.config.debug) {
      console.log(`Web Vital: ${metric.name}`, metric);
    }

    this.callbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Error in Web Vitals callback:', error);
      }
    });
  }

  private setupFinalReporting(): void {
    // Report final values when page is hidden
    const reportFinalMetrics = () => {
      // CLS final value is typically the most important for final reporting
      // Other metrics should have been reported already
    };

    // Use the Page Visibility API for reliable final reporting
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportFinalMetrics();
      }
    });

    // Fallback for older browsers
    window.addEventListener('beforeunload', reportFinalMetrics);
  }
}

// Default configuration
export const defaultWebVitalsConfig: WebVitalsConfig = {
  reportAllChanges: false, // Only report final values
  thresholds: WEB_VITALS_THRESHOLDS,
  attribution: true,
  debug: false,
};

// Export convenience functions
export const initializeWebVitals = (config: Partial<WebVitalsConfig> = {}) => {
  const finalConfig = { ...defaultWebVitalsConfig, ...config };
  const tracker = CoreWebVitalsTracker.getInstance(finalConfig);
  tracker.initialize();
  return tracker;
};

export const onWebVital = (callback: (metric: WebVitalMetric) => void) => {
  const tracker = CoreWebVitalsTracker.getInstance();
  tracker?.onMetric(callback);
};

// Default export
export default CoreWebVitalsTracker;