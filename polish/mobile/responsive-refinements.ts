/**
 * Mobile-First Responsive Design Improvements System
 * Provides advanced responsive design optimizations for mobile gaming platform
 */

// Types for responsive system
export interface BreakpointConfig {
  name: string;
  minWidth: number;
  maxWidth?: number;
  orientation?: 'portrait' | 'landscape';
}

export interface ResponsiveConfig {
  breakpoints: BreakpointConfig[];
  enableContainerQueries: boolean;
  enableFluidTypography: boolean;
  enableDynamicViewport: boolean;
  enableOrientationHandling: boolean;
  enableHighDensityDisplay: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
  ratio: number;
  orientation: 'portrait' | 'landscape';
  densityRatio: number;
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ResponsiveElement {
  element: HTMLElement;
  rules: ResponsiveRule[];
  observer?: ResizeObserver;
}

export interface ResponsiveRule {
  breakpoint: string;
  properties: { [key: string]: string | number };
  condition?: string;
}

/**
 * Breakpoint Manager
 */
class BreakpointManager {
  private breakpoints: BreakpointConfig[];
  private activeBreakpoint: BreakpointConfig | null = null;
  private mediaQueries = new Map<string, MediaQueryList>();
  private listeners = new Set<(breakpoint: BreakpointConfig) => void>();

  constructor(breakpoints: BreakpointConfig[]) {
    this.breakpoints = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
    this.initializeMediaQueries();
    this.updateActiveBreakpoint();
  }

  /**
   * Get current active breakpoint
   */
  getActiveBreakpoint(): BreakpointConfig | null {
    return this.activeBreakpoint;
  }

  /**
   * Check if breakpoint matches current viewport
   */
  matches(breakpointName: string): boolean {
    const mediaQuery = this.mediaQueries.get(breakpointName);
    return mediaQuery ? mediaQuery.matches : false;
  }

  /**
   * Add listener for breakpoint changes
   */
  addListener(callback: (breakpoint: BreakpointConfig) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (breakpoint: BreakpointConfig) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Get breakpoint by name
   */
  getBreakpoint(name: string): BreakpointConfig | undefined {
    return this.breakpoints.find(bp => bp.name === name);
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints(): BreakpointConfig[] {
    return [...this.breakpoints];
  }

  private initializeMediaQueries(): void {
    this.breakpoints.forEach(breakpoint => {
      const query = this.createMediaQuery(breakpoint);
      const mediaQuery = window.matchMedia(query);
      
      this.mediaQueries.set(breakpoint.name, mediaQuery);
      
      mediaQuery.addEventListener('change', () => {
        this.updateActiveBreakpoint();
      });
    });
  }

  private createMediaQuery(breakpoint: BreakpointConfig): string {
    let query = `(min-width: ${breakpoint.minWidth}px)`;
    
    if (breakpoint.maxWidth) {
      query += ` and (max-width: ${breakpoint.maxWidth}px)`;
    }
    
    if (breakpoint.orientation) {
      query += ` and (orientation: ${breakpoint.orientation})`;
    }
    
    return query;
  }

  private updateActiveBreakpoint(): void {
    // Find the largest matching breakpoint
    let newActiveBreakpoint: BreakpointConfig | null = null;
    
    for (let i = this.breakpoints.length - 1; i >= 0; i--) {
      const breakpoint = this.breakpoints[i];
      if (this.matches(breakpoint.name)) {
        newActiveBreakpoint = breakpoint;
        break;
      }
    }

    if (newActiveBreakpoint !== this.activeBreakpoint) {
      this.activeBreakpoint = newActiveBreakpoint;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    if (this.activeBreakpoint) {
      this.listeners.forEach(callback => {
        try {
          callback(this.activeBreakpoint!);
        } catch (error) {
          console.error('Error in breakpoint callback:', error);
        }
      });
    }
  }
}

/**
 * Viewport Information Manager
 */
class ViewportManager {
  private currentViewport: ViewportInfo;
  private listeners = new Set<(viewport: ViewportInfo) => void>();
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.currentViewport = this.calculateViewportInfo();
    this.setupViewportListeners();
    this.setupSafeAreaDetection();
  }

  /**
   * Get current viewport information
   */
  getViewportInfo(): ViewportInfo {
    return { ...this.currentViewport };
  }

  /**
   * Add viewport change listener
   */
  addListener(callback: (viewport: ViewportInfo) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove viewport change listener
   */
  removeListener(callback: (viewport: ViewportInfo) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Check if viewport is mobile size
   */
  isMobile(): boolean {
    return this.currentViewport.width <= 768;
  }

  /**
   * Check if viewport is tablet size
   */
  isTablet(): boolean {
    return this.currentViewport.width > 768 && this.currentViewport.width <= 1024;
  }

  /**
   * Check if viewport is desktop size
   */
  isDesktop(): boolean {
    return this.currentViewport.width > 1024;
  }

  /**
   * Get safe area insets
   */
  getSafeArea(): ViewportInfo['safeArea'] {
    return { ...this.currentViewport.safeArea };
  }

  private calculateViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      ratio: width / height,
      orientation: width > height ? 'landscape' : 'portrait',
      densityRatio: window.devicePixelRatio || 1,
      safeArea: this.calculateSafeArea()
    };
  }

  private calculateSafeArea(): ViewportInfo['safeArea'] {
    // Try to get safe area insets from CSS environment variables
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-top)')),
      bottom: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')),
      left: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-left)')),
      right: this.parseCSSValue(computedStyle.getPropertyValue('env(safe-area-inset-right)'))
    };
  }

  private parseCSSValue(value: string): number {
    const match = value.match(/(\d+(?:\.\d+)?)px/);
    return match ? parseFloat(match[1]) : 0;
  }

  private setupViewportListeners(): void {
    const updateViewport = () => {
      const newViewport = this.calculateViewportInfo();
      const hasChanged = 
        newViewport.width !== this.currentViewport.width ||
        newViewport.height !== this.currentViewport.height ||
        newViewport.orientation !== this.currentViewport.orientation;

      if (hasChanged) {
        this.currentViewport = newViewport;
        this.notifyListeners();
      }
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => {
      // Delay to ensure viewport dimensions are updated
      setTimeout(updateViewport, 100);
    });

    // Watch for visual viewport changes (e.g., virtual keyboard)
    if ('visualViewport' in window) {
      window.visualViewport!.addEventListener('resize', updateViewport);
    }
  }

  private setupSafeAreaDetection(): void {
    // Create a test element to detect safe area support
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 0);
      left: env(safe-area-inset-left, 0);
      width: 1px;
      height: 1px;
      pointer-events: none;
      opacity: 0;
    `;
    
    document.body.appendChild(testElement);
    
    // Check if safe area is supported
    const rect = testElement.getBoundingClientRect();
    if (rect.top > 0 || rect.left > 0) {
      document.documentElement.classList.add('has-safe-area');
    }
    
    document.body.removeChild(testElement);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentViewport);
      } catch (error) {
        console.error('Error in viewport callback:', error);
      }
    });
  }
}

/**
 * Fluid Typography Manager
 */
class FluidTypographyManager {
  private elements = new Map<HTMLElement, { min: number; max: number; minVw: number; maxVw: number }>();

  /**
   * Apply fluid typography to element
   */
  applyFluidTypography(
    element: HTMLElement,
    minSize: number,
    maxSize: number,
    minViewport = 320,
    maxViewport = 1200
  ): void {
    const config = { min: minSize, max: maxSize, minVw: minViewport, maxVw: maxViewport };
    this.elements.set(element, config);
    
    this.updateElementTypography(element, config);
  }

  /**
   * Remove fluid typography from element
   */
  removeFluidTypography(element: HTMLElement): void {
    this.elements.delete(element);
    element.style.fontSize = '';
  }

  /**
   * Update all fluid typography elements
   */
  updateAll(): void {
    this.elements.forEach((config, element) => {
      this.updateElementTypography(element, config);
    });
  }

  private updateElementTypography(
    element: HTMLElement,
    config: { min: number; max: number; minVw: number; maxVw: number }
  ): void {
    const { min, max, minVw, maxVw } = config;
    
    // Calculate clamp() values
    const slope = (max - min) / (maxVw - minVw);
    const yAxisIntersection = -minVw * slope + min;
    
    const preferredValue = `${yAxisIntersection.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw`;
    
    element.style.fontSize = `clamp(${min}rem, ${preferredValue}, ${max}rem)`;
  }
}

/**
 * Container Query Manager
 */
class ContainerQueryManager {
  private containers = new Map<HTMLElement, ResizeObserver>();
  private rules = new Map<HTMLElement, ResponsiveRule[]>();

  /**
   * Register container for query watching
   */
  registerContainer(element: HTMLElement, rules: ResponsiveRule[]): void {
    // Store rules
    this.rules.set(element, rules);
    
    // Create resize observer
    const observer = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        this.updateContainerStyles(entry.target as HTMLElement);
      });
    });
    
    observer.observe(element);
    this.containers.set(element, observer);
    
    // Apply initial styles
    this.updateContainerStyles(element);
  }

  /**
   * Unregister container
   */
  unregisterContainer(element: HTMLElement): void {
    const observer = this.containers.get(element);
    if (observer) {
      observer.unobserve(element);
      observer.disconnect();
      this.containers.delete(element);
    }
    
    this.rules.delete(element);
  }

  private updateContainerStyles(element: HTMLElement): void {
    const rules = this.rules.get(element);
    if (!rules) return;
    
    const rect = element.getBoundingClientRect();
    
    rules.forEach(rule => {
      const shouldApply = this.evaluateCondition(rule.condition || '', rect.width, rect.height);
      
      if (shouldApply) {
        Object.entries(rule.properties).forEach(([property, value]) => {
          (element.style as any)[property] = value;
        });
        element.classList.add(`container-${rule.breakpoint}`);
      } else {
        element.classList.remove(`container-${rule.breakpoint}`);
      }
    });
  }

  private evaluateCondition(condition: string, width: number, height: number): boolean {
    if (!condition) return true;
    
    // Simple condition parser (min-width: 300px, max-height: 500px, etc.)
    const conditions = condition.split(' and ').map(c => c.trim());
    
    return conditions.every(cond => {
      const match = cond.match(/^(min|max)-(width|height):\s*(\d+)px$/);
      if (!match) return true;
      
      const [, minMax, dimension, valueStr] = match;
      const value = parseInt(valueStr);
      const actual = dimension === 'width' ? width : height;
      
      return minMax === 'min' ? actual >= value : actual <= value;
    });
  }
}

/**
 * Orientation Handler
 */
class OrientationHandler {
  private listeners = new Set<(orientation: 'portrait' | 'landscape') => void>();
  private currentOrientation: 'portrait' | 'landscape';
  private lockSupported: boolean;

  constructor() {
    this.currentOrientation = this.getCurrentOrientation();
    this.lockSupported = 'orientation' in screen && 'lock' in screen.orientation;
    this.setupListeners();
  }

  /**
   * Get current orientation
   */
  getOrientation(): 'portrait' | 'landscape' {
    return this.currentOrientation;
  }

  /**
   * Check if orientation lock is supported
   */
  isLockSupported(): boolean {
    return this.lockSupported;
  }

  /**
   * Lock orientation (if supported)
   */
  async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<boolean> {
    if (!this.lockSupported) return false;
    
    try {
      await (screen.orientation as any).lock(
        orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary'
      );
      return true;
    } catch (error) {
      console.warn('Failed to lock orientation:', error);
      return false;
    }
  }

  /**
   * Unlock orientation (if supported)
   */
  unlockOrientation(): void {
    if (!this.lockSupported) return;
    
    try {
      (screen.orientation as any).unlock();
    } catch (error) {
      console.warn('Failed to unlock orientation:', error);
    }
  }

  /**
   * Add orientation change listener
   */
  addListener(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove orientation change listener
   */
  removeListener(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.listeners.delete(callback);
  }

  private getCurrentOrientation(): 'portrait' | 'landscape' {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  private setupListeners(): void {
    const handleOrientationChange = () => {
      const newOrientation = this.getCurrentOrientation();
      if (newOrientation !== this.currentOrientation) {
        this.currentOrientation = newOrientation;
        this.notifyListeners();
        this.updateDocumentClass();
      }
    };

    window.addEventListener('orientationchange', () => {
      // Delay to ensure dimensions are updated
      setTimeout(handleOrientationChange, 100);
    });
    
    window.addEventListener('resize', handleOrientationChange);
    
    // Initial setup
    this.updateDocumentClass();
  }

  private updateDocumentClass(): void {
    document.documentElement.classList.remove('portrait', 'landscape');
    document.documentElement.classList.add(this.currentOrientation);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentOrientation);
      } catch (error) {
        console.error('Error in orientation callback:', error);
      }
    });
  }
}

/**
 * High Density Display Manager
 */
class HighDensityDisplayManager {
  private densityRatio: number;
  private isHighDensity: boolean;

  constructor() {
    this.densityRatio = window.devicePixelRatio || 1;
    this.isHighDensity = this.densityRatio >= 2;
    this.setupDensityClasses();
    this.setupDensityListeners();
  }

  /**
   * Get device pixel ratio
   */
  getDensityRatio(): number {
    return this.densityRatio;
  }

  /**
   * Check if display is high density
   */
  isHighDensityDisplay(): boolean {
    return this.isHighDensity;
  }

  /**
   * Get optimized image source for density
   */
  getOptimizedImageSrc(baseSrc: string, options?: { format?: 'webp' | 'avif'; quality?: number }): string {
    const { format = 'webp', quality = 85 } = options || {};
    
    if (!this.isHighDensity) {
      return baseSrc;
    }
    
    // For high density displays, use 2x images
    const extension = baseSrc.split('.').pop();
    const baseWithoutExt = baseSrc.replace(`.${extension}`, '');
    
    return `${baseWithoutExt}@2x.${format || extension}?q=${quality}`;
  }

  /**
   * Apply high density optimizations to images in container
   */
  optimizeImages(container: HTMLElement): void {
    const images = container.querySelectorAll('img[data-src-2x], img[data-optimize]');
    
    images.forEach(img => {
      const image = img as HTMLImageElement;
      
      if (this.isHighDensity) {
        const highDensitySrc = image.dataset.src2x || 
                              this.getOptimizedImageSrc(image.src);
        
        if (highDensitySrc !== image.src) {
          image.src = highDensitySrc;
        }
      }
    });
  }

  private setupDensityClasses(): void {
    document.documentElement.classList.add(
      this.isHighDensity ? 'high-density' : 'normal-density'
    );
    
    document.documentElement.style.setProperty('--device-pixel-ratio', this.densityRatio.toString());
  }

  private setupDensityListeners(): void {
    // Watch for changes in device pixel ratio (rare, but possible with external monitors)
    const mediaQuery = window.matchMedia(`(resolution: ${this.densityRatio}dppx)`);
    
    mediaQuery.addEventListener('change', () => {
      const newRatio = window.devicePixelRatio || 1;
      const newIsHighDensity = newRatio >= 2;
      
      if (newRatio !== this.densityRatio || newIsHighDensity !== this.isHighDensity) {
        this.densityRatio = newRatio;
        this.isHighDensity = newIsHighDensity;
        this.setupDensityClasses();
      }
    });
  }
}

/**
 * Main Responsive Refinements Manager
 */
export class ResponsiveRefinementsManager {
  private static instance: ResponsiveRefinementsManager;
  private config: ResponsiveConfig;
  private breakpointManager: BreakpointManager;
  private viewportManager: ViewportManager;
  private fluidTypographyManager: FluidTypographyManager;
  private containerQueryManager: ContainerQueryManager;
  private orientationHandler: OrientationHandler;
  private highDensityManager: HighDensityDisplayManager;
  private responsiveElements = new Map<HTMLElement, ResponsiveElement>();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.breakpointManager = new BreakpointManager(this.config.breakpoints);
    this.viewportManager = new ViewportManager();
    this.fluidTypographyManager = new FluidTypographyManager();
    this.containerQueryManager = new ContainerQueryManager();
    this.orientationHandler = new OrientationHandler();
    this.highDensityManager = new HighDensityDisplayManager();
    
    this.setupGlobalStyles();
    this.setupViewportMeta();
  }

  static getInstance(): ResponsiveRefinementsManager {
    if (!ResponsiveRefinementsManager.instance) {
      ResponsiveRefinementsManager.instance = new ResponsiveRefinementsManager();
    }
    return ResponsiveRefinementsManager.instance;
  }

  /**
   * Initialize responsive system
   */
  initialize(config?: Partial<ResponsiveConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
      this.breakpointManager = new BreakpointManager(this.config.breakpoints);
    }
    
    // Apply responsive optimizations to document
    this.optimizeDocument();
  }

  /**
   * Make element responsive
   */
  makeResponsive(element: HTMLElement, rules: ResponsiveRule[]): void {
    const responsiveElement: ResponsiveElement = {
      element,
      rules
    };
    
    // Apply container queries if enabled
    if (this.config.enableContainerQueries) {
      this.containerQueryManager.registerContainer(element, rules);
    }
    
    this.responsiveElements.set(element, responsiveElement);
    this.applyResponsiveRules(element, rules);
  }

  /**
   * Apply fluid typography to element
   */
  applyFluidTypography(
    element: HTMLElement,
    minSize: number,
    maxSize: number,
    minViewport?: number,
    maxViewport?: number
  ): void {
    if (this.config.enableFluidTypography) {
      this.fluidTypographyManager.applyFluidTypography(
        element,
        minSize,
        maxSize,
        minViewport,
        maxViewport
      );
    }
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): BreakpointConfig | null {
    return this.breakpointManager.getActiveBreakpoint();
  }

  /**
   * Get viewport information
   */
  getViewportInfo(): ViewportInfo {
    return this.viewportManager.getViewportInfo();
  }

  /**
   * Check if breakpoint matches
   */
  matches(breakpointName: string): boolean {
    return this.breakpointManager.matches(breakpointName);
  }

  /**
   * Add breakpoint change listener
   */
  onBreakpointChange(callback: (breakpoint: BreakpointConfig) => void): void {
    this.breakpointManager.addListener(callback);
  }

  /**
   * Add viewport change listener
   */
  onViewportChange(callback: (viewport: ViewportInfo) => void): void {
    this.viewportManager.addListener(callback);
  }

  /**
   * Add orientation change listener
   */
  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.orientationHandler.addListener(callback);
  }

  /**
   * Lock orientation (mobile only)
   */
  async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<boolean> {
    return this.orientationHandler.lockOrientation(orientation);
  }

  /**
   * Optimize images for high density displays
   */
  optimizeImagesForDensity(container: HTMLElement): void {
    if (this.config.enableHighDensityDisplay) {
      this.highDensityManager.optimizeImages(container);
    }
  }

  /**
   * Remove responsive behavior from element
   */
  removeResponsive(element: HTMLElement): void {
    const responsiveElement = this.responsiveElements.get(element);
    if (responsiveElement) {
      this.containerQueryManager.unregisterContainer(element);
      this.fluidTypographyManager.removeFluidTypography(element);
      this.responsiveElements.delete(element);
    }
  }

  private applyResponsiveRules(element: HTMLElement, rules: ResponsiveRule[]): void {
    rules.forEach(rule => {
      const matches = this.breakpointManager.matches(rule.breakpoint);
      
      if (matches) {
        Object.entries(rule.properties).forEach(([property, value]) => {
          (element.style as any)[property] = value;
        });
        element.classList.add(`responsive-${rule.breakpoint}`);
      } else {
        element.classList.remove(`responsive-${rule.breakpoint}`);
      }
    });
  }

  private optimizeDocument(): void {
    // Add responsive classes to document
    const viewport = this.viewportManager.getViewportInfo();
    document.documentElement.classList.add(
      viewport.width <= 768 ? 'mobile' : 
      viewport.width <= 1024 ? 'tablet' : 'desktop'
    );
    
    // Optimize existing images
    if (this.config.enableHighDensityDisplay) {
      this.highDensityManager.optimizeImages(document.body);
    }
    
    // Update on viewport changes
    this.viewportManager.addListener((newViewport) => {
      document.documentElement.classList.remove('mobile', 'tablet', 'desktop');
      document.documentElement.classList.add(
        newViewport.width <= 768 ? 'mobile' : 
        newViewport.width <= 1024 ? 'tablet' : 'desktop'
      );
    });
  }

  private setupGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Safe area support */
      .has-safe-area {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
      
      /* High density display optimizations */
      .high-density img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }
      
      /* Orientation-specific styles */
      .landscape .hide-landscape { display: none !important; }
      .portrait .hide-portrait { display: none !important; }
      
      /* Mobile-first responsive utilities */
      @media (max-width: 768px) {
        .mobile-hidden { display: none !important; }
        .mobile-full-width { width: 100% !important; }
      }
      
      @media (min-width: 769px) {
        .desktop-hidden { display: none !important; }
      }
    `;
    
    document.head.appendChild(style);
  }

  private setupViewportMeta(): void {
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    
    // Enhanced viewport meta for better mobile experience
    viewportMeta.content = [
      'width=device-width',
      'initial-scale=1.0',
      'maximum-scale=1.0',
      'user-scalable=no',
      'viewport-fit=cover'
    ].join(', ');
  }

  private getDefaultConfig(): ResponsiveConfig {
    return {
      breakpoints: [
        { name: 'mobile', minWidth: 0, maxWidth: 768, orientation: 'portrait' },
        { name: 'mobile-landscape', minWidth: 0, maxWidth: 768, orientation: 'landscape' },
        { name: 'tablet', minWidth: 769, maxWidth: 1024 },
        { name: 'tablet-landscape', minWidth: 769, maxWidth: 1024, orientation: 'landscape' },
        { name: 'desktop', minWidth: 1025 },
        { name: 'desktop-large', minWidth: 1440 }
      ],
      enableContainerQueries: true,
      enableFluidTypography: true,
      enableDynamicViewport: true,
      enableOrientationHandling: true,
      enableHighDensityDisplay: true
    };
  }
}

// Export convenience functions
export const responsiveManager = ResponsiveRefinementsManager.getInstance();

export const makeResponsive = (element: HTMLElement, rules: ResponsiveRule[]) =>
  responsiveManager.makeResponsive(element, rules);

export const applyFluidTypography = (
  element: HTMLElement,
  minSize: number,
  maxSize: number,
  minViewport?: number,
  maxViewport?: number
) => responsiveManager.applyFluidTypography(element, minSize, maxSize, minViewport, maxViewport);

export const getCurrentBreakpoint = () => responsiveManager.getCurrentBreakpoint();

export const getViewportInfo = () => responsiveManager.getViewportInfo();

export const onBreakpointChange = (callback: (breakpoint: BreakpointConfig) => void) =>
  responsiveManager.onBreakpointChange(callback);

// Default export
export default ResponsiveRefinementsManager;