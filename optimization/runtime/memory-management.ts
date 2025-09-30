/**
 * Memory Management Optimization
 * Memory leak detection, prevention, and cleanup strategies for optimal performance
 * 
 * @fileoverview Advanced memory management utilities for web applications
 * @author Gaming Platform Team
 * @version 1.0.0
 */

/**
 * Memory leak types that can be detected
 */
type MemoryLeakType = 'dom' | 'event' | 'timer' | 'closure' | 'cache' | 'worker' | 'websocket';

/**
 * Memory usage metrics
 */
interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  leakSuspicion: boolean;
}

/**
 * Memory leak detection result
 */
interface MemoryLeakDetection {
  type: MemoryLeakType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  recommendation: string;
  detectedAt: number;
}

/**
 * Memory cleanup registration
 */
interface CleanupRegistration {
  id: string;
  cleanup: () => void;
  description: string;
  priority: number;
}

/**
 * Advanced memory management system
 */
class MemoryManager {
  private static instance: MemoryManager;
  private memoryMetrics: MemoryMetrics[] = [];
  private cleanupRegistry = new Map<string, CleanupRegistration>();
  private activeTimers = new Set<number>();
  private activeIntervals = new Set<number>();
  private eventListeners = new Map<string, Array<{ element: Element | Document | Window; event: string; handler: EventListener }>>();
  private monitoringActive = false;
  private monitoringInterval?: number;
  private memoryThreshold = 50 * 1024 * 1024; // 50MB threshold for memory alerts

  constructor() {
    this.setupBeforeUnloadCleanup();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Starts continuous memory monitoring
   * @param interval - Monitoring interval in milliseconds
   */
  startMemoryMonitoring(interval = 5000): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    this.monitoringInterval = window.setInterval(() => {
      this.recordMemoryMetrics();
      this.detectMemoryLeaks();
    }, interval);

    console.log('🧠 Memory monitoring started');
  }

  /**
   * Stops memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (!this.monitoringActive) return;

    this.monitoringActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('🧠 Memory monitoring stopped');
  }

  /**
   * Records current memory usage metrics
   */
  private recordMemoryMetrics(): void {
    if (!('memory' in performance)) {
      console.warn('Performance memory API not available');
      return;
    }

    const memory = (performance as any).memory;
    const metrics: MemoryMetrics = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
      leakSuspicion: false
    };

    // Keep only last 100 metrics to prevent memory buildup
    this.memoryMetrics.push(metrics);
    if (this.memoryMetrics.length > 100) {
      this.memoryMetrics.shift();
    }

    // Check for memory threshold breach
    if (metrics.usedJSHeapSize > this.memoryThreshold) {
      console.warn('⚠️ Memory usage above threshold:', this.formatBytes(metrics.usedJSHeapSize));
      this.triggerMemoryOptimization();
    }
  }

  /**
   * Detects potential memory leaks based on usage patterns
   */
  private detectMemoryLeaks(): void {
    if (this.memoryMetrics.length < 10) return; // Need sufficient data

    const recent = this.memoryMetrics.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    // Check for consistent memory growth
    const growthRate = (newest.usedJSHeapSize - oldest.usedJSHeapSize) / oldest.usedJSHeapSize;
    
    if (growthRate > 0.1) { // 10% growth over monitoring period
      newest.leakSuspicion = true;
      this.reportMemoryLeak({
        type: 'cache',
        severity: growthRate > 0.3 ? 'high' : 'medium',
        description: `Memory usage increased by ${(growthRate * 100).toFixed(1)}% over monitoring period`,
        source: 'Memory growth pattern analysis',
        recommendation: 'Check for unreleased objects, growing caches, or event listener leaks',
        detectedAt: Date.now()
      });
    }
  }

  /**
   * Reports a detected memory leak
   * @param leak - Memory leak detection details
   */
  private reportMemoryLeak(leak: MemoryLeakDetection): void {
    console.warn('🔍 Memory leak detected:', leak);
    
    // Dispatch custom event for application-level handling
    const event = new CustomEvent('memoryleak', { detail: leak });
    window.dispatchEvent(event);
  }

  /**
   * Triggers memory optimization procedures
   */
  private triggerMemoryOptimization(): void {
    console.log('🔧 Triggering memory optimization...');
    
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window) {
      (window as any).gc();
    }

    // Run registered cleanup procedures
    this.runCleanupProcedures();

    // Clear old memory metrics
    this.memoryMetrics = this.memoryMetrics.slice(-20);
  }

  /**
   * Registers a cleanup procedure
   * @param id - Unique identifier for the cleanup
   * @param cleanup - Cleanup function
   * @param description - Description of what gets cleaned up
   * @param priority - Priority level (higher numbers run first)
   */
  registerCleanup(id: string, cleanup: () => void, description: string, priority = 0): void {
    this.cleanupRegistry.set(id, {
      id,
      cleanup,
      description,
      priority
    });
  }

  /**
   * Unregisters a cleanup procedure
   * @param id - Cleanup identifier to remove
   */
  unregisterCleanup(id: string): void {
    this.cleanupRegistry.delete(id);
  }

  /**
   * Runs all registered cleanup procedures
   */
  runCleanupProcedures(): void {
    const cleanups = Array.from(this.cleanupRegistry.values())
      .sort((a, b) => b.priority - a.priority);

    for (const cleanup of cleanups) {
      try {
        console.log(`🧹 Running cleanup: ${cleanup.description}`);
        cleanup.cleanup();
      } catch (error) {
        console.error(`❌ Cleanup failed for ${cleanup.id}:`, error);
      }
    }
  }

  /**
   * Creates a managed timeout that tracks itself for cleanup
   * @param callback - Function to execute
   * @param delay - Delay in milliseconds
   * @returns Timer ID
   */
  setTimeout(callback: () => void, delay = 0): number {
    const id = window.setTimeout(() => {
      this.activeTimers.delete(id);
      callback();
    }, delay);
    this.activeTimers.add(id);
    return id;
  }

  /**
   * Creates a managed interval that tracks itself for cleanup
   * @param callback - Function to execute repeatedly
   * @param delay - Delay between executions
   * @returns Timer ID
   */
  setInterval(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay);
    this.activeIntervals.add(id);
    return id;
  }

  /**
   * Clears a managed timeout
   * @param id - Timer ID to clear
   */
  clearTimeout(id: number): void {
    this.activeTimers.delete(id);
    window.clearTimeout(id);
  }

  /**
   * Clears a managed interval
   * @param id - Timer ID to clear
   */
  clearInterval(id: number): void {
    this.activeIntervals.delete(id);
    window.clearInterval(id);
  }

  /**
   * Enhanced event listener management
   * @param element - Element to attach listener to
   * @param event - Event type
   * @param handler - Event handler
   * @param options - Event listener options
   */
  addEventListener(
    element: Element | Document | Window, 
    event: string, 
    handler: EventListener, 
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);

    // Track for cleanup
    const key = this.getElementKey(element);
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key)!.push({ element, event, handler });
  }

  /**
   * Removes tracked event listener
   * @param element - Element to remove listener from
   * @param event - Event type
   * @param handler - Event handler
   */
  removeEventListener(element: Element | Document | Window, event: string, handler: EventListener): void {
    element.removeEventListener(event, handler);

    // Remove from tracking
    const key = this.getElementKey(element);
    const listeners = this.eventListeners.get(key);
    if (listeners) {
      const index = listeners.findIndex(l => l.event === event && l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.eventListeners.delete(key);
        }
      }
    }
  }

  /**
   * Generates a unique key for DOM elements
   * @param element - Element to generate key for
   * @returns Unique string key
   */
  private getElementKey(element: Element | Document | Window): string {
    if (element === window) return 'window';
    if (element === document) return 'document';
    
    const el = element as Element;
    return `${el.tagName || 'unknown'}-${el.id || 'no-id'}-${Date.now()}`;
  }

  /**
   * Sets up cleanup on page unload
   */
  private setupBeforeUnloadCleanup(): void {
    window.addEventListener('beforeunload', () => {
      this.cleanupAll();
    });
  }

  /**
   * Comprehensive cleanup of all tracked resources
   */
  cleanupAll(): void {
    console.log('🧹 Running comprehensive memory cleanup...');

    // Clear all timers
    this.activeTimers.forEach(id => clearTimeout(id));
    this.activeIntervals.forEach(id => clearInterval(id));
    this.activeTimers.clear();
    this.activeIntervals.clear();

    // Remove all tracked event listeners
    for (const [key, listeners] of this.eventListeners.entries()) {
      listeners.forEach(({ element, event, handler }) => {
        try {
          element.removeEventListener(event, handler);
        } catch (error) {
          console.warn(`Failed to remove event listener for ${key}:`, error);
        }
      });
    }
    this.eventListeners.clear();

    // Run registered cleanup procedures
    this.runCleanupProcedures();

    // Stop monitoring
    this.stopMemoryMonitoring();

    console.log('✅ Memory cleanup completed');
  }

  /**
   * Creates a memory-aware cache with automatic cleanup
   * @param maxSize - Maximum number of items in cache
   * @param maxAge - Maximum age of items in milliseconds
   * @returns Cache instance with built-in memory management
   */
  createManagedCache<K, V>(maxSize = 100, maxAge = 300000): Map<K, { value: V; timestamp: number }> {
    const cache = new Map<K, { value: V; timestamp: number }>();
    
    // Register cleanup for this cache
    const cacheId = `cache-${Date.now()}`;
    this.registerCleanup(cacheId, () => {
      // Remove expired items
      const now = Date.now();
      for (const [key, item] of cache.entries()) {
        if (now - item.timestamp > maxAge) {
          cache.delete(key);
        }
      }

      // Trim to max size
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, cache.size - maxSize);
        toRemove.forEach(([key]) => cache.delete(key));
      }
    }, 'Managed cache cleanup', 5);

    return cache;
  }

  /**
   * Gets current memory statistics
   * @returns Memory usage information
   */
  getMemoryStats(): {
    current: MemoryMetrics | null;
    peak: MemoryMetrics | null;
    average: number;
    leakSuspicions: number;
    activeTimers: number;
    activeIntervals: number;
    eventListeners: number;
  } {
    const current = this.memoryMetrics[this.memoryMetrics.length - 1] || null;
    const peak = this.memoryMetrics.reduce((max, metrics) => 
      metrics.usedJSHeapSize > (max?.usedJSHeapSize || 0) ? metrics : max, null as MemoryMetrics | null);
    
    const average = this.memoryMetrics.length > 0 
      ? this.memoryMetrics.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / this.memoryMetrics.length
      : 0;
    
    const leakSuspicions = this.memoryMetrics.filter(m => m.leakSuspicion).length;
    const eventListenersCount = Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0);

    return {
      current,
      peak,
      average,
      leakSuspicions,
      activeTimers: this.activeTimers.size,
      activeIntervals: this.activeIntervals.size,
      eventListeners: eventListenersCount
    };
  }

  /**
   * Formats bytes into human readable format
   * @param bytes - Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generates a comprehensive memory report
   * @returns HTML report of memory usage and potential issues
   */
  generateMemoryReport(): string {
    const stats = this.getMemoryStats();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Memory Management Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .good { background: #d1e7dd; border-left: 4px solid #198754; }
    </style>
</head>
<body>
    <h1>🧠 Memory Management Report</h1>
    
    <div class="metric ${stats.current && stats.current.usedJSHeapSize > this.memoryThreshold ? 'warning' : 'good'}">
        <h3>Current Memory Usage</h3>
        <p><strong>Used Heap:</strong> ${stats.current ? this.formatBytes(stats.current.usedJSHeapSize) : 'N/A'}</p>
        <p><strong>Total Heap:</strong> ${stats.current ? this.formatBytes(stats.current.totalJSHeapSize) : 'N/A'}</p>
        <p><strong>Heap Limit:</strong> ${stats.current ? this.formatBytes(stats.current.jsHeapSizeLimit) : 'N/A'}</p>
    </div>

    <div class="metric">
        <h3>Memory Statistics</h3>
        <p><strong>Peak Usage:</strong> ${stats.peak ? this.formatBytes(stats.peak.usedJSHeapSize) : 'N/A'}</p>
        <p><strong>Average Usage:</strong> ${this.formatBytes(stats.average)}</p>
        <p><strong>Leak Suspicions:</strong> ${stats.leakSuspicions}</p>
    </div>

    <div class="metric ${stats.activeTimers > 10 || stats.activeIntervals > 5 ? 'warning' : 'good'}">
        <h3>Active Resources</h3>
        <p><strong>Active Timers:</strong> ${stats.activeTimers}</p>
        <p><strong>Active Intervals:</strong> ${stats.activeIntervals}</p>
        <p><strong>Event Listeners:</strong> ${stats.eventListeners}</p>
    </div>

    <div class="metric">
        <h3>Recommendations</h3>
        <ul>
            ${stats.leakSuspicions > 0 ? '<li>⚠️ Memory leak patterns detected - investigate growing memory usage</li>' : ''}
            ${stats.activeTimers > 10 ? '<li>⚠️ High number of active timers - consider cleanup optimization</li>' : ''}
            ${stats.eventListeners > 50 ? '<li>⚠️ Many event listeners registered - ensure proper cleanup</li>' : ''}
            <li>✅ Continue monitoring memory usage patterns</li>
            <li>✅ Regular cleanup procedures are in place</li>
        </ul>
    </div>
</body>
</html>`;
  }
}

/**
 * Convenience hook for memory management in components
 */
export function useMemoryManager() {
  const manager = MemoryManager.getInstance();
  
  return {
    startMonitoring: manager.startMemoryMonitoring.bind(manager),
    stopMonitoring: manager.stopMemoryMonitoring.bind(manager),
    registerCleanup: manager.registerCleanup.bind(manager),
    addEventListener: manager.addEventListener.bind(manager),
    removeEventListener: manager.removeEventListener.bind(manager),
    createCache: manager.createManagedCache.bind(manager),
    getStats: manager.getMemoryStats.bind(manager),
    cleanup: manager.cleanupAll.bind(manager)
  };
}

// Export main class and types
export { MemoryManager };
export type { MemoryMetrics, MemoryLeakDetection, CleanupRegistration };

// Default export
export default MemoryManager;