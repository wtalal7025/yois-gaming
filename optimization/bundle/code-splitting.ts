/**
 * Advanced Code Splitting Optimization
 * Implements intelligent code splitting strategies for optimal bundle performance
 *
 * @fileoverview Code splitting utilities and optimization strategies
 * @author Gaming Platform Team
 * @version 1.0.0
 */

// Type definitions (compatible with React if available)
type ComponentType<P = {}> = (props: P) => any;
type ReactElement = any;

interface RouteObject {
  path: string;
  element?: any;
  handle?: any;
}

/**
 * Code splitting configuration options
 */
interface CodeSplittingOptions {
  /** Delay before showing loading fallback (prevents flash) */
  loadingDelay?: number;
  /** Retry attempts for failed chunk loads */
  retryAttempts?: number;
  /** Preload strategy for routes */
  preloadStrategy?: 'hover' | 'visible' | 'idle' | 'none';
  /** Enable chunk prefetching */
  enablePrefetch?: boolean;
}

/**
 * Route-based code splitting configuration
 */
interface RouteConfig {
  path: string;
  component: () => Promise<{ default: ComponentType<any> }>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Advanced code splitting utility class
 */
class CodeSplittingOptimizer {
  private static instance: CodeSplittingOptimizer;
  private loadedChunks = new Set<string>();
  private preloadedChunks = new Set<string>();
  private chunkLoadPromises = new Map<string, Promise<any>>();
  private options: Required<CodeSplittingOptions>;

  constructor(options: CodeSplittingOptions = {}) {
    this.options = {
      loadingDelay: 200,
      retryAttempts: 3,
      preloadStrategy: 'hover',
      enablePrefetch: true,
      ...options
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: CodeSplittingOptions): CodeSplittingOptimizer {
    if (!CodeSplittingOptimizer.instance) {
      CodeSplittingOptimizer.instance = new CodeSplittingOptimizer(options);
    }
    return CodeSplittingOptimizer.instance;
  }

  /**
   * Creates a lazy-loaded module with enhanced error handling and retry logic
   * @param importFn - Dynamic import function
   * @param retryAttempts - Number of retry attempts
   * @returns Promise-wrapped lazy loader with retry capability
   */
  createLazyLoader<T>(
    importFn: () => Promise<{ default: T }>,
    retryAttempts = this.options.retryAttempts
  ) {
    const chunkName = this.getChunkName(importFn);
    
    return {
      load: () => this.retryImport(importFn, retryAttempts),
      chunkName,
      isLoaded: () => this.loadedChunks.has(chunkName)
    };
  }

  /**
   * Implements retry logic for failed dynamic imports
   * @param importFn - Import function to retry
   * @param retries - Number of retries remaining
   * @returns Promise resolving to the imported module
   */
  private async retryImport<T>(
    importFn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    try {
      const moduleExports = await importFn();
      return moduleExports;
    } catch (error) {
      console.warn(`Chunk load failed, ${retries} retries remaining:`, error);
      
      if (retries > 0) {
        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, this.options.retryAttempts - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryImport(importFn, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Preloads a route component when conditions are met
   * @param routePath - Route path to preload
   * @param importFn - Dynamic import function
   * @param strategy - Preload strategy override
   */
  async preloadRoute(
    routePath: string,
    importFn: () => Promise<any>,
    strategy = this.options.preloadStrategy
  ): Promise<void> {
    if (this.preloadedChunks.has(routePath)) {
      return;
    }

    try {
      this.preloadedChunks.add(routePath);
      
      switch (strategy) {
        case 'idle':
          // Preload during browser idle time
          if ('requestIdleCallback' in window) {
            return new Promise(resolve => {
              (window as any).requestIdleCallback(async () => {
                await importFn();
                resolve();
              });
            });
          }
          break;
          
        case 'visible':
          // Preload when element becomes visible
          this.preloadOnVisible(routePath, importFn);
          break;
          
        case 'hover':
          // Preload on hover (implemented in component)
          break;
          
        default:
          // Immediate preload
          await importFn();
      }
    } catch (error) {
      console.warn(`Failed to preload route ${routePath}:`, error);
      this.preloadedChunks.delete(routePath);
    }
  }

  /**
   * Preloads route when associated element becomes visible
   * @param routePath - Route path
   * @param importFn - Import function
   */
  private preloadOnVisible(routePath: string, importFn: () => Promise<any>): void {
    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            await importFn();
            break;
          }
        }
      },
      { threshold: 0.1 }
    );

    // Find navigation elements for this route
    const navElements = document.querySelectorAll(`[href*="${routePath}"]`);
    navElements.forEach(element => observer.observe(element));
  }

  /**
   * Creates optimized route configuration with code splitting
   * @param routes - Route configurations
   * @returns Optimized route objects with lazy loading
   */
  createOptimizedRoutes(routes: RouteConfig[]): RouteObject[] {
    return routes.map(route => {
      const lazyLoader = this.createLazyLoader(route.component);
      
      // Preload high priority routes immediately
      if (route.priority === 'high' && route.preload !== false) {
        this.preloadRoute(route.path, route.component, 'none');
      }
      
      return {
        path: route.path,
        element: null, // Will be populated by framework-specific implementation
        handle: {
          priority: route.priority,
          preload: route.preload,
          chunkName: lazyLoader.chunkName,
          loader: lazyLoader
        }
      };
    });
  }

  /**
   * Implements smart prefetching based on user behavior
   * @param routes - Available routes
   */
  enableSmartPrefetch(routes: RouteConfig[]): void {
    if (!this.options.enablePrefetch) return;

    // Track user interactions for prefetch prediction
    this.trackUserBehavior(routes);
    
    // Prefetch during idle time
    this.prefetchDuringIdle(routes);
  }

  /**
   * Tracks user behavior to predict next navigation
   * @param routes - Available routes
   */
  private trackUserBehavior(routes: RouteConfig[]): void {
    // Track hover events on navigation elements
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        const route = routes.find(r => link.pathname.includes(r.path));
        if (route && !this.preloadedChunks.has(route.path)) {
          // Debounce hover preloading
          setTimeout(() => {
            if (link.matches(':hover')) {
              this.preloadRoute(route.path, route.component, 'none');
            }
          }, 50);
        }
      }
    });
  }

  /**
   * Prefetches low-priority routes during idle periods
   * @param routes - Routes to prefetch
   */
  private prefetchDuringIdle(routes: RouteConfig[]): void {
    const lowPriorityRoutes = routes.filter(r => 
      r.priority === 'low' && !this.preloadedChunks.has(r.path)
    );

    if (lowPriorityRoutes.length === 0) return;

    const prefetchNext = () => {
      const route = lowPriorityRoutes.shift();
      if (!route) return;

      this.preloadRoute(route.path, route.component, 'idle')
        .then(() => {
          // Continue prefetching if browser is still idle
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(prefetchNext);
          }
        });
    };

    // Start prefetching after initial page load
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchNext);
    } else {
      setTimeout(prefetchNext, 2000);
    }
  }

  /**
   * Extracts chunk name from import function
   * @param importFn - Dynamic import function
   * @returns Chunk name or hash
   */
  private getChunkName(importFn: () => Promise<any>): string {
    const fnString = importFn.toString();
    const match = fnString.match(/import\(['"](.+)['"]\)/);
    return match ? match[1].split('/').pop()?.replace(/\.\w+$/, '') || 'unknown' : 'unknown';
  }

  /**
   * Monitors chunk loading performance
   */
  monitorChunkPerformance(): void {
    // Monitor chunk load times
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.name.includes('chunk') && entry.entryType === 'navigation') {
          console.log(`Chunk ${entry.name} loaded in ${entry.duration}ms`);
          
          // Track slow chunk loads
          if (entry.duration > 3000) {
            console.warn(`Slow chunk load detected: ${entry.name}`);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }

  /**
   * Gets chunk loading statistics
   * @returns Chunk performance metrics
   */
  getChunkMetrics(): {
    loadedChunks: number;
    preloadedChunks: number;
    failedChunks: number;
  } {
    return {
      loadedChunks: this.loadedChunks.size,
      preloadedChunks: this.preloadedChunks.size,
      failedChunks: 0 // TODO: Track failed chunks
    };
  }
}

/**
 * Hook for managing code splitting in components
 */
export function useCodeSplitting(options?: CodeSplittingOptions) {
  const optimizer = CodeSplittingOptimizer.getInstance(options);
  
  return {
    createLazyLoader: optimizer.createLazyLoader.bind(optimizer),
    preloadRoute: optimizer.preloadRoute.bind(optimizer),
    getMetrics: optimizer.getChunkMetrics.bind(optimizer)
  };
}

/**
 * Utility function for creating lazy-loaded modules
 */
export function createLazyModule<T>(
  importFn: () => Promise<{ default: T }>
) {
  const optimizer = CodeSplittingOptimizer.getInstance();
  return optimizer.createLazyLoader(importFn);
}

// Export the main class and utilities
export { CodeSplittingOptimizer };
export type { CodeSplittingOptions, RouteConfig };

// Default export for convenience
export default CodeSplittingOptimizer;