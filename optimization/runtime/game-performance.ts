/**
 * Game Performance Optimization
 * 60fps game optimization, frame rate monitoring, and performance tuning
 * 
 * @fileoverview Advanced game performance optimization utilities
 * @author Gaming Platform Team
 * @version 1.0.0
 */

/**
 * Performance metrics for frame tracking
 */
interface FrameMetrics {
  fps: number;
  frameTime: number;
  dropped: number;
  timestamp: number;
  memoryUsage?: number;
}

/**
 * Game performance configuration
 */
interface GamePerformanceConfig {
  targetFps: number;
  maxFrameTime: number;
  enableAdaptiveQuality: boolean;
  memoryThreshold: number;
  debugMode: boolean;
}

/**
 * Performance optimization level
 */
type PerformanceTier = 'high' | 'medium' | 'low' | 'potato';

/**
 * Game animation frame manager
 */
interface AnimationManager {
  start(): void;
  stop(): void;
  addCallback(id: string, callback: (deltaTime: number) => void): void;
  removeCallback(id: string): void;
  setPriority(id: string, priority: number): void;
}

/**
 * Advanced game performance optimizer
 */
class GamePerformanceOptimizer {
  private static instance: GamePerformanceOptimizer;
  private config: GamePerformanceConfig;
  private frameMetrics: FrameMetrics[] = [];
  private animationCallbacks = new Map<string, { callback: (deltaTime: number) => void; priority: number }>();
  private isRunning = false;
  private animationFrameId?: number;
  private lastFrameTime = 0;
  private droppedFrames = 0;
  private currentTier: PerformanceTier = 'high';
  private adaptiveQualityEnabled = true;

  constructor(config: Partial<GamePerformanceConfig> = {}) {
    this.config = {
      targetFps: 60,
      maxFrameTime: 16.67, // ~60fps
      enableAdaptiveQuality: true,
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      debugMode: false,
      ...config
    };

    this.setupPerformanceObserver();
    this.detectDeviceCapabilities();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<GamePerformanceConfig>): GamePerformanceOptimizer {
    if (!GamePerformanceOptimizer.instance) {
      GamePerformanceOptimizer.instance = new GamePerformanceOptimizer(config);
    }
    return GamePerformanceOptimizer.instance;
  }

  /**
   * Starts the game performance optimization loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();

    if (this.config.debugMode) {
      console.log('🎮 Game performance optimization started');
    }
  }

  /**
   * Stops the performance optimization loop
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.config.debugMode) {
      console.log('🎮 Game performance optimization stopped');
    }
  }

  /**
   * Main game loop with performance monitoring
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Record frame metrics
    this.recordFrameMetrics(currentTime, deltaTime);
    
    // Check for dropped frames
    if (deltaTime > this.config.maxFrameTime * 1.5) {
      this.droppedFrames++;
      
      // Trigger adaptive quality adjustment if enabled
      if (this.config.enableAdaptiveQuality) {
        this.adjustQualityLevel();
      }
    }

    // Execute animation callbacks by priority
    this.executeAnimationCallbacks(deltaTime);
    
    // Update last frame time
    this.lastFrameTime = currentTime;
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Records frame performance metrics
   * @param timestamp - Current timestamp
   * @param deltaTime - Time since last frame
   */
  private recordFrameMetrics(timestamp: number, deltaTime: number): void {
    const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
    const memoryUsage = this.getMemoryUsage();

    const metrics: FrameMetrics = {
      fps,
      frameTime: deltaTime,
      dropped: this.droppedFrames,
      timestamp,
      memoryUsage
    };

    this.frameMetrics.push(metrics);

    // Keep only last 300 frames (~5 seconds at 60fps)
    if (this.frameMetrics.length > 300) {
      this.frameMetrics.shift();
    }

    // Debug logging for performance issues
    if (this.config.debugMode && fps < this.config.targetFps * 0.8) {
      console.warn(`⚠️ Low FPS detected: ${fps.toFixed(1)}fps (target: ${this.config.targetFps}fps)`);
    }
  }

  /**
   * Gets current memory usage if available
   * @returns Memory usage in bytes or undefined
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Executes animation callbacks in priority order
   * @param deltaTime - Time since last frame
   */
  private executeAnimationCallbacks(deltaTime: number): void {
    // Sort callbacks by priority (higher priority first)
    const sortedCallbacks = Array.from(this.animationCallbacks.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);

    const maxExecutionTime = this.config.maxFrameTime * 0.8; // Reserve 20% for browser
    const startTime = performance.now();

    for (const [id, { callback }] of sortedCallbacks) {
      try {
        callback(deltaTime);
        
        // Check if we're running out of frame time
        const elapsed = performance.now() - startTime;
        if (elapsed > maxExecutionTime) {
          if (this.config.debugMode) {
            console.warn(`⏱️ Frame time budget exceeded, skipping remaining callbacks`);
          }
          break;
        }
      } catch (error) {
        console.error(`❌ Error in animation callback ${id}:`, error);
        // Remove faulty callback to prevent repeated errors
        this.animationCallbacks.delete(id);
      }
    }
  }

  /**
   * Adds an animation callback with priority
   * @param id - Unique identifier for the callback
   * @param callback - Function to execute each frame
   * @param priority - Execution priority (higher = earlier)
   */
  addAnimationCallback(id: string, callback: (deltaTime: number) => void, priority = 0): void {
    this.animationCallbacks.set(id, { callback, priority });
  }

  /**
   * Removes an animation callback
   * @param id - Callback identifier to remove
   */
  removeAnimationCallback(id: string): void {
    this.animationCallbacks.delete(id);
  }

  /**
   * Updates callback priority
   * @param id - Callback identifier
   * @param priority - New priority level
   */
  setCallbackPriority(id: string, priority: number): void {
    const callback = this.animationCallbacks.get(id);
    if (callback) {
      callback.priority = priority;
    }
  }

  /**
   * Detects device capabilities and sets initial performance tier
   */
  private detectDeviceCapabilities(): void {
    // Basic device capability detection
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    let tier: PerformanceTier = 'medium';

    // Check for hardware acceleration
    if (gl && 'getParameter' in gl) {
      try {
        const renderer = gl.getParameter(gl.RENDERER) as string;
        const vendor = gl.getParameter(gl.VENDOR) as string;
        
        // Simple heuristics for performance tier detection
        if (renderer && renderer.includes('Intel')) {
          tier = 'low';
        } else if (renderer && (renderer.includes('NVIDIA') || renderer.includes('AMD'))) {
          tier = 'high';
        }
      } catch (error) {
        // WebGL parameter access failed, stick with default tier
        if (this.config.debugMode) {
          console.warn('Failed to detect GPU info:', error);
        }
      }
    }

    // Check device memory if available
    if ('deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory;
      if (memory <= 2) tier = 'potato';
      else if (memory <= 4) tier = 'low';
      else if (memory <= 8) tier = 'medium';
      else tier = 'high';
    }

    // Check CPU cores
    if ('hardwareConcurrency' in navigator) {
      const cores = navigator.hardwareConcurrency;
      if (cores <= 2) {
        tier = tier === 'high' ? 'medium' : 'low';
      }
    }

    this.currentTier = tier;
    
    if (this.config.debugMode) {
      console.log(`🔍 Device performance tier detected: ${tier}`);
    }
  }

  /**
   * Adjusts quality level based on performance metrics
   */
  private adjustQualityLevel(): void {
    if (!this.adaptiveQualityEnabled) return;

    const recentMetrics = this.frameMetrics.slice(-60); // Last 60 frames (~1 second)
    if (recentMetrics.length < 30) return; // Need sufficient data

    const avgFps = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const targetFps = this.config.targetFps;

    // Determine if we need to adjust quality
    if (avgFps < targetFps * 0.8) {
      // Performance is poor, reduce quality
      this.lowerQualityLevel();
    } else if (avgFps > targetFps * 0.95 && this.currentTier !== 'high') {
      // Performance is good, maybe we can increase quality
      this.raiseQualityLevel();
    }
  }

  /**
   * Lowers the current quality/performance tier
   */
  private lowerQualityLevel(): void {
    const tiers: PerformanceTier[] = ['high', 'medium', 'low', 'potato'];
    const currentIndex = tiers.indexOf(this.currentTier);
    
    if (currentIndex < tiers.length - 1) {
      this.currentTier = tiers[currentIndex + 1];
      this.broadcastQualityChange();
      
      if (this.config.debugMode) {
        console.log(`📉 Quality lowered to: ${this.currentTier}`);
      }
    }
  }

  /**
   * Raises the current quality/performance tier
   */
  private raiseQualityLevel(): void {
    const tiers: PerformanceTier[] = ['high', 'medium', 'low', 'potato'];
    const currentIndex = tiers.indexOf(this.currentTier);
    
    if (currentIndex > 0) {
      this.currentTier = tiers[currentIndex - 1];
      this.broadcastQualityChange();
      
      if (this.config.debugMode) {
        console.log(`📈 Quality raised to: ${this.currentTier}`);
      }
    }
  }

  /**
   * Broadcasts quality change to listeners
   */
  private broadcastQualityChange(): void {
    const event = new CustomEvent('qualitychange', {
      detail: { tier: this.currentTier }
    });
    window.dispatchEvent(event);
  }

  /**
   * Sets up performance observer for additional metrics
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.includes('game')) {
              // Track custom game performance measures
              if (entry.duration > this.config.maxFrameTime && this.config.debugMode) {
                console.warn(`🐌 Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
              }
            }
          });
        });

        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        // Performance observer not supported or failed to initialize
        if (this.config.debugMode) {
          console.warn('Performance Observer not available');
        }
      }
    }
  }

  /**
   * Creates a performance-aware timeout that respects frame budget
   * @param callback - Function to execute
   * @param delay - Minimum delay in milliseconds
   * @returns Timeout handle for cancellation
   */
  createFrameAwareTimeout(callback: () => void, delay: number): { cancel: () => void } {
    let cancelled = false;
    let timeoutId: number;

    const executeCallback = () => {
      if (cancelled) return;

      const frameTime = performance.now() - this.lastFrameTime;
      const remainingTime = this.config.maxFrameTime - frameTime;

      if (remainingTime > 2) { // At least 2ms remaining
        callback();
      } else {
        // Defer to next frame
        timeoutId = window.setTimeout(executeCallback, 0);
      }
    };

    timeoutId = window.setTimeout(executeCallback, delay);

    return {
      cancel: () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Gets current performance statistics
   * @returns Performance metrics and statistics
   */
  getPerformanceStats(): {
    currentFps: number;
    averageFps: number;
    droppedFrames: number;
    performanceTier: PerformanceTier;
    memoryUsage?: number;
    frameTimeMs: number;
  } {
    const recentMetrics = this.frameMetrics.slice(-60);
    const currentFps = recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1].fps : 0;
    const averageFps = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length 
      : 0;
    const frameTimeMs = recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1].frameTime : 0;
    const memoryUsage = this.getMemoryUsage();

    return {
      currentFps: Math.round(currentFps),
      averageFps: Math.round(averageFps),
      droppedFrames: this.droppedFrames,
      performanceTier: this.currentTier,
      memoryUsage,
      frameTimeMs: Math.round(frameTimeMs * 100) / 100
    };
  }

  /**
   * Gets performance recommendations based on current metrics
   * @returns Array of performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const stats = this.getPerformanceStats();
    const recommendations: string[] = [];

    if (stats.averageFps < this.config.targetFps * 0.8) {
      recommendations.push('Consider reducing visual effects or animation complexity');
      recommendations.push('Enable adaptive quality if not already active');
    }

    if (stats.droppedFrames > 10) {
      recommendations.push('High number of dropped frames detected - optimize render loop');
    }

    if (stats.memoryUsage && stats.memoryUsage > this.config.memoryThreshold) {
      recommendations.push('High memory usage - implement memory cleanup strategies');
    }

    if (this.animationCallbacks.size > 20) {
      recommendations.push('Many active animation callbacks - consider consolidation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - no immediate issues detected');
    }

    return recommendations;
  }

  /**
   * Enables or disables adaptive quality
   * @param enabled - Whether to enable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
    
    if (this.config.debugMode) {
      console.log(`🎛️ Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Manually sets the performance tier
   * @param tier - Performance tier to set
   */
  setPerformanceTier(tier: PerformanceTier): void {
    this.currentTier = tier;
    this.broadcastQualityChange();
    
    if (this.config.debugMode) {
      console.log(`🎮 Performance tier manually set to: ${tier}`);
    }
  }

  /**
   * Creates an animation manager for a specific game
   * @param gameId - Unique identifier for the game
   * @returns Animation manager instance
   */
  createAnimationManager(gameId: string): AnimationManager {
    const callbacks = new Map<string, { callback: (deltaTime: number) => void; priority: number }>();
    
    return {
      start: () => {
        if (!this.isRunning) {
          this.start();
        }
      },
      
      stop: () => {
        // Remove all game callbacks
        for (const id of callbacks.keys()) {
          this.removeAnimationCallback(`${gameId}-${id}`);
        }
        callbacks.clear();
      },
      
      addCallback: (id: string, callback: (deltaTime: number) => void) => {
        const fullId = `${gameId}-${id}`;
        const callbackData = { callback, priority: 0 };
        callbacks.set(id, callbackData);
        this.addAnimationCallback(fullId, callback, 0);
      },
      
      removeCallback: (id: string) => {
        const fullId = `${gameId}-${id}`;
        callbacks.delete(id);
        this.removeAnimationCallback(fullId);
      },
      
      setPriority: (id: string, priority: number) => {
        const fullId = `${gameId}-${id}`;
        const callbackData = callbacks.get(id);
        if (callbackData) {
          callbackData.priority = priority;
          this.setCallbackPriority(fullId, priority);
        }
      }
    };
  }
}

/**
 * Hook for using game performance optimization in components
 */
export function useGamePerformance() {
  const optimizer = GamePerformanceOptimizer.getInstance();
  
  return {
    start: optimizer.start.bind(optimizer),
    stop: optimizer.stop.bind(optimizer),
    addCallback: optimizer.addAnimationCallback.bind(optimizer),
    removeCallback: optimizer.removeAnimationCallback.bind(optimizer),
    getStats: optimizer.getPerformanceStats.bind(optimizer),
    getRecommendations: optimizer.getPerformanceRecommendations.bind(optimizer),
    setTier: optimizer.setPerformanceTier.bind(optimizer),
    createManager: optimizer.createAnimationManager.bind(optimizer)
  };
}

// Export main class and types
export { GamePerformanceOptimizer };
export type { FrameMetrics, GamePerformanceConfig, PerformanceTier, AnimationManager };

// Default export
export default GamePerformanceOptimizer;