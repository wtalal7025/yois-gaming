/**
 * Enhanced Lazy Loading Optimization
 * Advanced lazy loading strategies for games, components, and assets
 * 
 * @fileoverview Lazy loading utilities with priority-based loading and preloading
 * @author Gaming Platform Team
 * @version 1.0.0
 */

/**
 * Loading priority levels
 */
type LoadingPriority = 'critical' | 'high' | 'medium' | 'low' | 'idle';

/**
 * Lazy loading configuration options
 */
interface LazyLoadingOptions {
  /** Loading priority */
  priority?: LoadingPriority;
  /** Intersection observer root margin */
  rootMargin?: string;
  /** Intersection threshold for triggering load */
  threshold?: number;
  /** Enable retry on failure */
  retryOnError?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Preload strategy */
  preloadStrategy?: 'none' | 'hover' | 'visible' | 'idle';
  /** Custom loading placeholder */
  placeholder?: string | (() => HTMLElement);
}

/**
 * Lazy loadable resource interface
 */
interface LazyResource {
  id: string;
  url: string;
  type: 'image' | 'script' | 'style' | 'component' | 'audio' | 'video';
  priority: LoadingPriority;
  size?: number;
  dependencies?: string[];
}

/**
 * Loading queue item
 */
interface LoadingQueueItem {
  resource: LazyResource;
  options: LazyLoadingOptions;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  attempts: number;
  startTime: number;
}

/**
 * Advanced lazy loading manager
 */
class LazyLoadingManager {
  private static instance: LazyLoadingManager;
  private loadingQueue: Map<LoadingPriority, LoadingQueueItem[]> = new Map();
  private loadedResources = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private preloadedResources = new Set<string>();
  private intersectionObserver?: IntersectionObserver;
  private isProcessingQueue = false;

  /**
   * Priority order (highest to lowest)
   */
  private readonly priorityOrder: LoadingPriority[] = [
    'critical',
    'high', 
    'medium',
    'low',
    'idle'
  ];

  constructor() {
    this.initializeQueues();
    this.setupIntersectionObserver();
    this.setupIdleCallbackProcessing();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LazyLoadingManager {
    if (!LazyLoadingManager.instance) {
      LazyLoadingManager.instance = new LazyLoadingManager();
    }
    return LazyLoadingManager.instance;
  }

  /**
   * Initialize loading queues for each priority
   */
  private initializeQueues(): void {
    this.priorityOrder.forEach(priority => {
      this.loadingQueue.set(priority, []);
    });
  }

  /**
   * Setup intersection observer for visibility-based loading
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return; // Fallback for environments without IntersectionObserver
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const resourceId = element.dataset.lazyId;
            
            if (resourceId && !this.loadedResources.has(resourceId)) {
              this.prioritizeResource(resourceId, 'high');
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  /**
   * Setup idle callback for low-priority processing
   */
  private setupIdleCallbackProcessing(): void {
    const processIdleQueue = () => {
      if (this.loadingQueue.get('idle')!.length > 0) {
        this.processQueue();
      }
      
      // Schedule next idle processing
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processIdleQueue, { timeout: 5000 });
      } else {
        setTimeout(processIdleQueue, 1000);
      }
    };

    // Start idle processing
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(processIdleQueue);
    } else {
      setTimeout(processIdleQueue, 1000);
    }
  }

  /**
   * Lazy loads a resource with specified options
   * @param resource - Resource to load
   * @param options - Loading options
   * @returns Promise resolving to loaded resource
   */
  async lazyLoad<T = any>(
    resource: LazyResource, 
    options: LazyLoadingOptions = {}
  ): Promise<T> {
    // Return cached resource if already loaded
    if (this.loadedResources.has(resource.id)) {
      return this.loadedResources.get(resource.id);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(resource.id)) {
      return this.loadingPromises.get(resource.id);
    }

    // Create loading promise
    const loadingPromise = new Promise<T>((resolve, reject) => {
      const queueItem: LoadingQueueItem = {
        resource,
        options: {
          priority: 'medium',
          rootMargin: '50px',
          threshold: 0.1,
          retryOnError: true,
          maxRetries: 3,
          preloadStrategy: 'none',
          ...options
        },
        resolve,
        reject,
        attempts: 0,
        startTime: Date.now()
      };

      // Add to appropriate priority queue
      const priority = queueItem.options.priority!;
      this.loadingQueue.get(priority)!.push(queueItem);
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });

    this.loadingPromises.set(resource.id, loadingPromise);
    return loadingPromise;
  }

  /**
   * Processes the loading queue by priority
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Process queues in priority order
      for (const priority of this.priorityOrder) {
        const queue = this.loadingQueue.get(priority)!;
        
        while (queue.length > 0) {
          const item = queue.shift()!;
          
          try {
            const result = await this.loadResource(item);
            this.loadedResources.set(item.resource.id, result);
            this.loadingPromises.delete(item.resource.id);
            item.resolve(result);
          } catch (error) {
            // Handle retry logic
            if (item.options.retryOnError && item.attempts < item.options.maxRetries!) {
              item.attempts++;
              queue.push(item); // Re-queue for retry
              console.warn(`Retrying load for ${item.resource.id}, attempt ${item.attempts}`);
            } else {
              this.loadingPromises.delete(item.resource.id);
              item.reject(error as Error);
            }
          }

          // Yield control for high-priority items
          if (priority === 'low' || priority === 'idle') {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Loads a specific resource based on its type
   * @param item - Queue item containing resource and options
   * @returns Promise resolving to loaded resource
   */
  private async loadResource(item: LoadingQueueItem): Promise<any> {
    const { resource } = item;

    switch (resource.type) {
      case 'image':
        return this.loadImage(resource);
      
      case 'script':
        return this.loadScript(resource);
      
      case 'style':
        return this.loadStylesheet(resource);
      
      case 'component':
        return this.loadComponent(resource);
      
      case 'audio':
        return this.loadAudio(resource);
      
      case 'video':
        return this.loadVideo(resource);
      
      default:
        throw new Error(`Unsupported resource type: ${resource.type}`);
    }
  }

  /**
   * Loads an image resource
   */
  private loadImage(resource: LazyResource): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${resource.url}`));
      
      img.src = resource.url;
    });
  }

  /**
   * Loads a script resource
   */
  private loadScript(resource: LazyResource): Promise<HTMLScriptElement> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Failed to load script: ${resource.url}`));
      
      script.src = resource.url;
      script.async = true;
      
      document.head.appendChild(script);
    });
  }

  /**
   * Loads a stylesheet resource
   */
  private loadStylesheet(resource: LazyResource): Promise<HTMLLinkElement> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${resource.url}`));
      
      link.rel = 'stylesheet';
      link.href = resource.url;
      
      document.head.appendChild(link);
    });
  }

  /**
   * Loads a dynamic component
   */
  private async loadComponent(resource: LazyResource): Promise<any> {
    try {
      const module = await import(resource.url);
      return module.default || module;
    } catch (error) {
      throw new Error(`Failed to load component: ${resource.url}`);
    }
  }

  /**
   * Loads an audio resource
   */
  private loadAudio(resource: LazyResource): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Failed to load audio: ${resource.url}`));
      
      audio.src = resource.url;
      audio.preload = 'metadata';
    });
  }

  /**
   * Loads a video resource
   */
  private loadVideo(resource: LazyResource): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      
      video.oncanplaythrough = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to load video: ${resource.url}`));
      
      video.src = resource.url;
      video.preload = 'metadata';
    });
  }

  /**
   * Preloads resources based on strategy
   * @param resources - Resources to preload
   * @param strategy - Preloading strategy
   */
  async preloadResources(
    resources: LazyResource[], 
    strategy: 'hover' | 'visible' | 'idle' = 'idle'
  ): Promise<void> {
    const preloadPromises = resources.map(async resource => {
      if (this.preloadedResources.has(resource.id)) {
        return;
      }

      this.preloadedResources.add(resource.id);

      switch (strategy) {
        case 'idle':
          // Preload during idle time with low priority
          await this.lazyLoad(resource, { priority: 'idle' });
          break;
        
        case 'visible':
          // Preload when elements become visible
          await this.lazyLoad(resource, { priority: 'low', preloadStrategy: 'visible' });
          break;
        
        case 'hover':
          // Preload on hover events
          await this.lazyLoad(resource, { priority: 'medium', preloadStrategy: 'hover' });
          break;
      }
    });

    await Promise.all(preloadPromises);
  }

  /**
   * Increases priority of a specific resource
   * @param resourceId - Resource ID to prioritize
   * @param newPriority - New priority level
   */
  prioritizeResource(resourceId: string, newPriority: LoadingPriority): void {
    // Find and move resource to higher priority queue
    for (const [priority, queue] of this.loadingQueue.entries()) {
      const itemIndex = queue.findIndex(item => item.resource.id === resourceId);
      
      if (itemIndex !== -1) {
        const item = queue.splice(itemIndex, 1)[0];
        item.options.priority = newPriority;
        this.loadingQueue.get(newPriority)!.unshift(item);
        
        // Process queue if higher priority
        if (!this.isProcessingQueue && 
            this.priorityOrder.indexOf(newPriority) < this.priorityOrder.indexOf(priority)) {
          this.processQueue();
        }
        break;
      }
    }
  }

  /**
   * Sets up lazy loading for DOM elements
   * @param selector - CSS selector for elements to lazy load
   * @param options - Lazy loading options
   */
  observeElements(selector: string, options: LazyLoadingOptions = {}): void {
    if (!this.intersectionObserver) return;

    const elements = document.querySelectorAll(selector);
    
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      
      // Store lazy loading configuration
      htmlElement.dataset.lazyOptions = JSON.stringify(options);
      
      // Observe element
      this.intersectionObserver!.observe(element);
    });
  }

  /**
   * Gets loading statistics and performance metrics
   */
  getLoadingMetrics(): {
    totalLoaded: number;
    totalPreloaded: number;
    queueSizes: Record<LoadingPriority, number>;
    averageLoadTime: number;
  } {
    const queueSizes = {} as Record<LoadingPriority, number>;
    this.loadingQueue.forEach((queue, priority) => {
      queueSizes[priority] = queue.length;
    });

    return {
      totalLoaded: this.loadedResources.size,
      totalPreloaded: this.preloadedResources.size,
      queueSizes,
      averageLoadTime: 0 // TODO: Implement average load time tracking
    };
  }

  /**
   * Clears all caches and resets the manager
   */
  reset(): void {
    this.loadedResources.clear();
    this.loadingPromises.clear();
    this.preloadedResources.clear();
    this.initializeQueues();
  }
}

/**
 * Convenience function for lazy loading resources
 */
export function lazyLoad<T = any>(
  resource: LazyResource,
  options?: LazyLoadingOptions
): Promise<T> {
  const manager = LazyLoadingManager.getInstance();
  return manager.lazyLoad<T>(resource, options);
}

/**
 * Convenience function for preloading resources
 */
export function preloadResources(
  resources: LazyResource[],
  strategy?: 'hover' | 'visible' | 'idle'
): Promise<void> {
  const manager = LazyLoadingManager.getInstance();
  return manager.preloadResources(resources, strategy);
}

/**
 * Hook for managing lazy loading in components
 */
export function useLazyLoading() {
  const manager = LazyLoadingManager.getInstance();
  
  return {
    lazyLoad: manager.lazyLoad.bind(manager),
    preload: manager.preloadResources.bind(manager),
    prioritize: manager.prioritizeResource.bind(manager),
    observe: manager.observeElements.bind(manager),
    metrics: manager.getLoadingMetrics.bind(manager)
  };
}

// Export types and main class
export { LazyLoadingManager };
export type { LazyResource, LazyLoadingOptions, LoadingPriority };

// Default export
export default LazyLoadingManager;