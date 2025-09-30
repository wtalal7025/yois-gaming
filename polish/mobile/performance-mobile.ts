/**
 * Mobile-Specific Performance Optimization System
 * Provides specialized performance optimizations for mobile devices and gaming
 */

// Types for mobile performance
export interface MobilePerformanceConfig {
  enableBatteryOptimization: boolean;
  enableNetworkOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableRenderingOptimization: boolean;
  enableTouchOptimization: boolean;
  frameRateTarget: number;
  batteryThresholds: {
    low: number;
    critical: number;
  };
  networkThresholds: {
    slow: number;
    fast: number;
  };
}

export interface MobileMetrics {
  battery: {
    level: number;
    charging: boolean;
    supported: boolean;
  };
  network: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    supported: boolean;
  };
  device: {
    memory: number;
    cores: number;
    platform: string;
    supported: boolean;
  };
  performance: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    loadTime: number;
  };
}

export interface OptimizationStrategy {
  name: string;
  condition: (metrics: MobileMetrics) => boolean;
  apply: () => Promise<void>;
  revert: () => Promise<void>;
  priority: number;
}

/**
 * Battery Status Monitor
 */
class BatteryMonitor {
  private battery: any = null;
  private listeners = new Set<(battery: { level: number; charging: boolean }) => void>();
  private isSupported = false;

  constructor() {
    this.initializeBatteryAPI();
  }

  /**
   * Get current battery status
   */
  async getBatteryStatus(): Promise<{ level: number; charging: boolean; supported: boolean }> {
    if (!this.isSupported) {
      return { level: 1, charging: true, supported: false };
    }

    if (!this.battery) {
      await this.initializeBatteryAPI();
    }

    return {
      level: this.battery?.level || 1,
      charging: this.battery?.charging || false,
      supported: this.isSupported
    };
  }

  /**
   * Add battery change listener
   */
  addListener(callback: (battery: { level: number; charging: boolean }) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove battery change listener
   */
  removeListener(callback: (battery: { level: number; charging: boolean }) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Check if battery API is supported
   */
  isBatteryAPISupported(): boolean {
    return this.isSupported;
  }

  private async initializeBatteryAPI(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.battery = await (navigator as any).getBattery();
        this.isSupported = true;
        this.setupBatteryListeners();
      } catch (error) {
        console.warn('Battery API not available:', error);
        this.isSupported = false;
      }
    } else if ('battery' in navigator) {
      this.battery = (navigator as any).battery;
      this.isSupported = true;
      this.setupBatteryListeners();
    }
  }

  private setupBatteryListeners(): void {
    if (!this.battery) return;

    const notifyListeners = () => {
      const status = {
        level: this.battery.level,
        charging: this.battery.charging
      };
      
      this.listeners.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in battery callback:', error);
        }
      });
    };

    this.battery.addEventListener('levelchange', notifyListeners);
    this.battery.addEventListener('chargingchange', notifyListeners);
  }
}

/**
 * Network Information Monitor
 */
class NetworkMonitor {
  private connection: any = null;
  private listeners = new Set<(network: { effectiveType: string; downlink: number; rtt: number }) => void>();
  private isSupported = false;

  constructor() {
    this.initializeNetworkAPI();
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): { effectiveType: string; downlink: number; rtt: number; supported: boolean } {
    if (!this.isSupported || !this.connection) {
      return {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        supported: false
      };
    }

    return {
      effectiveType: this.connection.effectiveType || '4g',
      downlink: this.connection.downlink || 10,
      rtt: this.connection.rtt || 100,
      supported: this.isSupported
    };
  }

  /**
   * Add network change listener
   */
  addListener(callback: (network: { effectiveType: string; downlink: number; rtt: number }) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove network change listener
   */
  removeListener(callback: (network: { effectiveType: string; downlink: number; rtt: number }) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Check if network API is supported
   */
  isNetworkAPISupported(): boolean {
    return this.isSupported;
  }

  private initializeNetworkAPI(): void {
    this.connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

    this.isSupported = !!this.connection;

    if (this.isSupported) {
      this.setupNetworkListeners();
    }
  }

  private setupNetworkListeners(): void {
    if (!this.connection) return;

    const notifyListeners = () => {
      const status = {
        effectiveType: this.connection.effectiveType || '4g',
        downlink: this.connection.downlink || 10,
        rtt: this.connection.rtt || 100
      };
      
      this.listeners.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in network callback:', error);
        }
      });
    };

    this.connection.addEventListener('change', notifyListeners);
  }
}

/**
 * Device Capability Detector
 */
class DeviceDetector {
  private deviceInfo: { memory: number; cores: number; platform: string; supported: boolean };

  constructor() {
    this.deviceInfo = this.detectDeviceCapabilities();
  }

  /**
   * Get device capabilities
   */
  getDeviceInfo(): { memory: number; cores: number; platform: string; supported: boolean } {
    return { ...this.deviceInfo };
  }

  /**
   * Check if device is low-end
   */
  isLowEndDevice(): boolean {
    return this.deviceInfo.memory <= 4 || this.deviceInfo.cores <= 2;
  }

  /**
   * Check if device is high-end
   */
  isHighEndDevice(): boolean {
    return this.deviceInfo.memory >= 8 && this.deviceInfo.cores >= 4;
  }

  /**
   * Get device performance tier
   */
  getPerformanceTier(): 'low' | 'medium' | 'high' {
    if (this.isLowEndDevice()) return 'low';
    if (this.isHighEndDevice()) return 'high';
    return 'medium';
  }

  private detectDeviceCapabilities(): { memory: number; cores: number; platform: string; supported: boolean } {
    const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not supported
    const cores = navigator.hardwareConcurrency || 4; // Default to 4 cores
    const platform = navigator.platform || 'unknown';
    const supported = 'deviceMemory' in navigator && 'hardwareConcurrency' in navigator;

    return { memory, cores, platform, supported };
  }
}

/**
 * Frame Rate Monitor
 */
class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTimeHistory: number[] = [];
  private isRunning = false;
  private animationId: number | null = null;

  /**
   * Start monitoring frame rate
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameTimeHistory = [];
    
    this.measure();
  }

  /**
   * Stop monitoring frame rate
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return Math.round(this.fps);
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 16.67; // 60fps baseline
    
    const sum = this.frameTimeHistory.reduce((acc, time) => acc + time, 0);
    return sum / this.frameTimeHistory.length;
  }

  /**
   * Check if performance is acceptable
   */
  isPerformanceAcceptable(targetFPS = 30): boolean {
    return this.fps >= targetFPS;
  }

  private measure(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frameCount++;
    this.frameTimeHistory.push(deltaTime);
    
    // Keep only last 60 frames for rolling average
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    // Update FPS every second
    if (deltaTime >= 1000) {
      this.fps = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    this.animationId = requestAnimationFrame(() => this.measure());
  }
}

/**
 * Mobile Optimization Strategies
 */
class OptimizationStrategies {
  private appliedStrategies = new Set<string>();

  /**
   * Get all available optimization strategies
   */
  getStrategies(): OptimizationStrategy[] {
    return [
      {
        name: 'battery-saver',
        priority: 1,
        condition: (metrics) => metrics.battery.level < 0.2 && !metrics.battery.charging,
        apply: async () => this.applyBatterySaverMode(),
        revert: async () => this.revertBatterySaverMode()
      },
      {
        name: 'low-bandwidth',
        priority: 2,
        condition: (metrics) => {
          const slow = ['slow-2g', '2g', 'slow-3g'].includes(metrics.network.effectiveType);
          return slow || metrics.network.downlink < 1;
        },
        apply: async () => this.applyLowBandwidthMode(),
        revert: async () => this.revertLowBandwidthMode()
      },
      {
        name: 'low-memory',
        priority: 3,
        condition: (metrics) => metrics.device.memory <= 2,
        apply: async () => this.applyLowMemoryMode(),
        revert: async () => this.revertLowMemoryMode()
      },
      {
        name: 'low-performance',
        priority: 4,
        condition: (metrics) => metrics.performance.fps < 30,
        apply: async () => this.applyLowPerformanceMode(),
        revert: async () => this.revertLowPerformanceMode()
      },
      {
        name: 'high-performance',
        priority: 5,
        condition: (metrics) => {
          return metrics.battery.level > 0.5 && 
                 metrics.battery.charging && 
                 metrics.device.memory >= 8 &&
                 metrics.performance.fps >= 55;
        },
        apply: async () => this.applyHighPerformanceMode(),
        revert: async () => this.revertHighPerformanceMode()
      }
    ];
  }

  /**
   * Check if strategy is currently applied
   */
  isStrategyApplied(name: string): boolean {
    return this.appliedStrategies.has(name);
  }

  /**
   * Mark strategy as applied
   */
  markStrategyApplied(name: string): void {
    this.appliedStrategies.add(name);
  }

  /**
   * Mark strategy as reverted
   */
  markStrategyReverted(name: string): void {
    this.appliedStrategies.delete(name);
  }

  private async applyBatterySaverMode(): Promise<void> {
    console.log('Applying battery saver mode');
    
    // Reduce animation frame rate
    this.setMaxFrameRate(30);
    
    // Reduce visual effects
    document.documentElement.classList.add('battery-saver');
    
    // Disable non-essential animations
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    
    // Reduce particle effects
    this.setGraphicsQuality('low');
  }

  private async revertBatterySaverMode(): Promise<void> {
    console.log('Reverting battery saver mode');
    
    this.setMaxFrameRate(60);
    document.documentElement.classList.remove('battery-saver');
    document.documentElement.style.removeProperty('--animation-duration');
    this.setGraphicsQuality('medium');
  }

  private async applyLowBandwidthMode(): Promise<void> {
    console.log('Applying low bandwidth mode');
    
    // Reduce image quality
    this.setImageQuality('low');
    
    // Disable preloading
    document.documentElement.classList.add('low-bandwidth');
    
    // Compress API requests
    this.enableRequestCompression();
    
    // Reduce update frequency
    this.setUpdateFrequency('low');
  }

  private async revertLowBandwidthMode(): Promise<void> {
    console.log('Reverting low bandwidth mode');
    
    this.setImageQuality('medium');
    document.documentElement.classList.remove('low-bandwidth');
    this.disableRequestCompression();
    this.setUpdateFrequency('normal');
  }

  private async applyLowMemoryMode(): Promise<void> {
    console.log('Applying low memory mode');
    
    // Clear caches more aggressively
    this.setCachePolicy('aggressive');
    
    // Reduce texture quality
    this.setTextureQuality('low');
    
    // Limit concurrent operations
    document.documentElement.classList.add('low-memory');
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private async revertLowMemoryMode(): Promise<void> {
    console.log('Reverting low memory mode');
    
    this.setCachePolicy('normal');
    this.setTextureQuality('medium');
    document.documentElement.classList.remove('low-memory');
  }

  private async applyLowPerformanceMode(): Promise<void> {
    console.log('Applying low performance mode');
    
    // Reduce rendering quality
    this.setRenderingQuality('low');
    
    // Limit complex animations
    document.documentElement.classList.add('low-performance');
    
    // Reduce physics accuracy
    this.setPhysicsAccuracy('low');
    
    // Lower frame rate target
    this.setMaxFrameRate(30);
  }

  private async revertLowPerformanceMode(): Promise<void> {
    console.log('Reverting low performance mode');
    
    this.setRenderingQuality('medium');
    document.documentElement.classList.remove('low-performance');
    this.setPhysicsAccuracy('medium');
    this.setMaxFrameRate(60);
  }

  private async applyHighPerformanceMode(): Promise<void> {
    console.log('Applying high performance mode');
    
    // Enable enhanced graphics
    this.setGraphicsQuality('high');
    
    // Increase frame rate target
    this.setMaxFrameRate(60);
    
    // Enable advanced features
    document.documentElement.classList.add('high-performance');
    
    // Preload resources
    this.enableResourcePreloading();
  }

  private async revertHighPerformanceMode(): Promise<void> {
    console.log('Reverting high performance mode');
    
    this.setGraphicsQuality('medium');
    this.setMaxFrameRate(60);
    document.documentElement.classList.remove('high-performance');
    this.disableResourcePreloading();
  }

  // Helper methods for applying optimizations
  private setMaxFrameRate(fps: number): void {
    document.documentElement.style.setProperty('--max-fps', fps.toString());
    // Emit custom event for frame rate change
    window.dispatchEvent(new CustomEvent('frameratechange', { detail: { fps } }));
  }

  private setGraphicsQuality(quality: 'low' | 'medium' | 'high'): void {
    document.documentElement.classList.remove('graphics-low', 'graphics-medium', 'graphics-high');
    document.documentElement.classList.add(`graphics-${quality}`);
  }

  private setImageQuality(quality: 'low' | 'medium' | 'high'): void {
    document.documentElement.classList.remove('images-low', 'images-medium', 'images-high');
    document.documentElement.classList.add(`images-${quality}`);
  }

  private setTextureQuality(quality: 'low' | 'medium' | 'high'): void {
    document.documentElement.classList.remove('textures-low', 'textures-medium', 'textures-high');
    document.documentElement.classList.add(`textures-${quality}`);
  }

  private setRenderingQuality(quality: 'low' | 'medium' | 'high'): void {
    document.documentElement.classList.remove('rendering-low', 'rendering-medium', 'rendering-high');
    document.documentElement.classList.add(`rendering-${quality}`);
  }

  private setCachePolicy(policy: 'normal' | 'aggressive'): void {
    document.documentElement.setAttribute('data-cache-policy', policy);
  }

  private setUpdateFrequency(frequency: 'low' | 'normal' | 'high'): void {
    document.documentElement.setAttribute('data-update-frequency', frequency);
  }

  private setPhysicsAccuracy(accuracy: 'low' | 'medium' | 'high'): void {
    document.documentElement.setAttribute('data-physics-accuracy', accuracy);
  }

  private enableRequestCompression(): void {
    document.documentElement.setAttribute('data-compress-requests', 'true');
  }

  private disableRequestCompression(): void {
    document.documentElement.removeAttribute('data-compress-requests');
  }

  private enableResourcePreloading(): void {
    document.documentElement.setAttribute('data-preload-resources', 'true');
  }

  private disableResourcePreloading(): void {
    document.documentElement.removeAttribute('data-preload-resources');
  }
}

/**
 * Main Mobile Performance Manager
 */
export class MobilePerformanceManager {
  private static instance: MobilePerformanceManager;
  private config: MobilePerformanceConfig;
  private batteryMonitor: BatteryMonitor;
  private networkMonitor: NetworkMonitor;
  private deviceDetector: DeviceDetector;
  private frameRateMonitor: FrameRateMonitor;
  private optimizationStrategies: OptimizationStrategies;
  private metricsCache: MobileMetrics | null = null;
  private optimizationTimer: number | null = null;
  private isOptimizationActive = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.batteryMonitor = new BatteryMonitor();
    this.networkMonitor = new NetworkMonitor();
    this.deviceDetector = new DeviceDetector();
    this.frameRateMonitor = new FrameRateMonitor();
    this.optimizationStrategies = new OptimizationStrategies();
    
    this.setupGlobalOptimizations();
  }

  static getInstance(): MobilePerformanceManager {
    if (!MobilePerformanceManager.instance) {
      MobilePerformanceManager.instance = new MobilePerformanceManager();
    }
    return MobilePerformanceManager.instance;
  }

  /**
   * Initialize mobile performance optimization
   */
  async initialize(config?: Partial<MobilePerformanceConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Start monitoring systems
    if (this.config.enableBatteryOptimization) {
      this.batteryMonitor.addListener(() => this.evaluateOptimizations());
    }

    if (this.config.enableNetworkOptimization) {
      this.networkMonitor.addListener(() => this.evaluateOptimizations());
    }

    if (this.config.enableRenderingOptimization) {
      this.frameRateMonitor.start();
    }

    // Start optimization evaluation
    this.startOptimizationLoop();
    
    console.log('Mobile performance optimization initialized');
  }

  /**
   * Get current mobile metrics
   */
  async getCurrentMetrics(): Promise<MobileMetrics> {
    if (this.metricsCache) {
      return { ...this.metricsCache };
    }

    const battery = await this.batteryMonitor.getBatteryStatus();
    const network = this.networkMonitor.getNetworkStatus();
    const device = this.deviceDetector.getDeviceInfo();
    
    const performance = {
      fps: this.frameRateMonitor.getFPS(),
      frameTime: this.frameRateMonitor.getAverageFrameTime(),
      memoryUsage: this.getMemoryUsage(),
      loadTime: this.getLoadTime()
    };

    this.metricsCache = { battery, network, device, performance };
    
    // Cache for 5 seconds to avoid excessive calculations
    setTimeout(() => {
      this.metricsCache = null;
    }, 5000);

    return { ...this.metricsCache };
  }

  /**
   * Manually trigger optimization evaluation
   */
  async evaluateOptimizations(): Promise<void> {
    if (this.isOptimizationActive) return;

    this.isOptimizationActive = true;
    
    try {
      const metrics = await this.getCurrentMetrics();
      const strategies = this.optimizationStrategies.getStrategies()
        .sort((a, b) => a.priority - b.priority);

      for (const strategy of strategies) {
        const shouldApply = strategy.condition(metrics);
        const isApplied = this.optimizationStrategies.isStrategyApplied(strategy.name);

        if (shouldApply && !isApplied) {
          console.log(`Applying optimization strategy: ${strategy.name}`);
          await strategy.apply();
          this.optimizationStrategies.markStrategyApplied(strategy.name);
        } else if (!shouldApply && isApplied) {
          console.log(`Reverting optimization strategy: ${strategy.name}`);
          await strategy.revert();
          this.optimizationStrategies.markStrategyReverted(strategy.name);
        }
      }
    } catch (error) {
      console.error('Error during optimization evaluation:', error);
    } finally {
      this.isOptimizationActive = false;
    }
  }

  /**
   * Get device performance tier
   */
  getPerformanceTier(): 'low' | 'medium' | 'high' {
    return this.deviceDetector.getPerformanceTier();
  }

  /**
   * Check if device is low-end
   */
  isLowEndDevice(): boolean {
    return this.deviceDetector.isLowEndDevice();
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.frameRateMonitor.getFPS();
  }

  /**
   * Stop optimization system
   */
  stop(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    this.frameRateMonitor.stop();
    console.log('Mobile performance optimization stopped');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MobilePerformanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private startOptimizationLoop(): void {
    // Evaluate optimizations every 10 seconds
    this.optimizationTimer = window.setInterval(() => {
      this.evaluateOptimizations();
    }, 10000);

    // Initial evaluation
    this.evaluateOptimizations();
  }

  private setupGlobalOptimizations(): void {
    // Add CSS for various optimization modes
    const style = document.createElement('style');
    style.textContent = `
      /* Battery saver optimizations */
      .battery-saver * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
      
      .battery-saver .particle-effect,
      .battery-saver .complex-animation {
        display: none !important;
      }
      
      /* Low bandwidth optimizations */
      .low-bandwidth img {
        image-rendering: pixelated;
      }
      
      .low-bandwidth video {
        filter: blur(1px);
      }
      
      /* Low memory optimizations */
      .low-memory .cache-heavy,
      .low-memory .memory-intensive {
        display: none !important;
      }
      
      /* Low performance optimizations */
      .low-performance .gpu-intensive,
      .low-performance .complex-shader {
        display: none !important;
      }
      
      /* High performance enhancements */
      .high-performance .enhanced-effects {
        display: block !important;
      }
      
      /* Graphics quality levels */
      .graphics-low .shadow { display: none !important; }
      .graphics-low .reflection { display: none !important; }
      .graphics-medium .advanced-shadow { display: none !important; }
    `;
    
    document.head.appendChild(style);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.totalJSHeapSize;
    }
    return 0.5; // Default estimate
  }

  private getLoadTime(): number {
    if ('navigation' in performance) {
      const navigation = performance.navigation;
      return performance.now(); // Simplified load time
    }
    return 1000; // Default estimate
  }

  private getDefaultConfig(): MobilePerformanceConfig {
    return {
      enableBatteryOptimization: true,
      enableNetworkOptimization: true,
      enableMemoryOptimization: true,
      enableRenderingOptimization: true,
      enableTouchOptimization: true,
      frameRateTarget: 60,
      batteryThresholds: {
        low: 0.2,
        critical: 0.1
      },
      networkThresholds: {
        slow: 1.0, // 1 Mbps
        fast: 10.0 // 10 Mbps
      }
    };
  }
}

// Export convenience functions
export const mobilePerformance = MobilePerformanceManager.getInstance();

export const initializeMobilePerformance = (config?: Partial<MobilePerformanceConfig>) =>
  mobilePerformance.initialize(config);

export const getCurrentMetrics = () => mobilePerformance.getCurrentMetrics();

export const getPerformanceTier = () => mobilePerformance.getPerformanceTier();

export const isLowEndDevice = () => mobilePerformance.isLowEndDevice();

// Default export
export default MobilePerformanceManager;