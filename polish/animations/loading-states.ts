/**
 * Beautiful Loading States and Skeleton Screen System
 * Provides engaging loading animations and skeleton screens for better UX
 */

// Types for loading states
export interface LoadingConfig {
  type: 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'wave' | 'custom';
  duration: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  thickness?: number;
  showProgress?: boolean;
  customContent?: HTMLElement | string;
}

export interface SkeletonConfig {
  rows: number;
  columns?: number;
  avatar?: boolean;
  rounded?: boolean;
  animated?: boolean;
  shimmer?: boolean;
  customLayout?: SkeletonLayout[];
}

export interface SkeletonLayout {
  type: 'text' | 'image' | 'button' | 'card' | 'custom';
  width: string | number;
  height: string | number;
  className?: string;
  rounded?: boolean;
}

export interface ProgressConfig {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  circular?: boolean;
  showLabel?: boolean;
  color?: string;
  trackColor?: string;
  thickness?: number;
}

/**
 * Loading Animation Generator
 */
class LoadingAnimationGenerator {
  private styleSheet: HTMLStyleElement | null = null;

  constructor() {
    this.injectStyles();
  }

  /**
   * Create spinner loading animation
   */
  createSpinner(config: Partial<LoadingConfig> = {}): HTMLElement {
    const spinner = document.createElement('div');
    const size = this.getSizeValue(config.size || 'medium');
    
    spinner.className = `loading-spinner loading-spinner--${config.size || 'medium'}`;
    spinner.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border: ${config.thickness || 2}px solid rgba(0,0,0,0.1);
      border-left: ${config.thickness || 2}px solid ${config.color || '#3b82f6'};
      border-radius: 50%;
      animation: spin ${config.duration || 1000}ms linear infinite;
    `;

    return spinner;
  }

  /**
   * Create progress bar
   */
  createProgressBar(config: Partial<ProgressConfig> = {}): HTMLElement {
    const container = document.createElement('div');
    const bar = document.createElement('div');
    const label = document.createElement('span');

    container.className = 'loading-progress';
    container.style.cssText = `
      width: 100%;
      height: ${config.thickness || 4}px;
      background: ${config.trackColor || '#e5e7eb'};
      border-radius: ${config.thickness || 4}px;
      overflow: hidden;
      position: relative;
    `;

    bar.className = 'loading-progress__bar';
    bar.style.cssText = `
      height: 100%;
      background: ${config.color || '#3b82f6'};
      border-radius: inherit;
      transition: width 0.3s ease;
      ${config.indeterminate 
        ? 'width: 30%; animation: progress-indeterminate 2s ease-in-out infinite;'
        : `width: ${((config.value || 0) / (config.max || 100)) * 100}%;`
      }
    `;

    if (config.showLabel && config.value !== undefined) {
      label.textContent = `${Math.round(config.value)}%`;
      label.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 500;
        color: #374151;
      `;
      container.appendChild(label);
    }

    container.appendChild(bar);
    return container;
  }

  /**
   * Create circular progress
   */
  createCircularProgress(config: Partial<ProgressConfig> = {}): HTMLElement {
    const size = this.getSizeValue(config.circular ? 'medium' : 'large');
    const thickness = config.thickness || 4;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = config.indeterminate ? 25 : ((config.value || 0) / (config.max || 100)) * 100;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.style.transform = 'rotate(-90deg)';

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', (size / 2).toString());
    bgCircle.setAttribute('cy', (size / 2).toString());
    bgCircle.setAttribute('r', radius.toString());
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', config.trackColor || '#e5e7eb');
    bgCircle.setAttribute('stroke-width', thickness.toString());

    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', (size / 2).toString());
    progressCircle.setAttribute('cy', (size / 2).toString());
    progressCircle.setAttribute('r', radius.toString());
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', config.color || '#3b82f6');
    progressCircle.setAttribute('stroke-width', thickness.toString());
    progressCircle.setAttribute('stroke-linecap', 'round');
    progressCircle.setAttribute('stroke-dasharray', circumference.toString());
    
    if (config.indeterminate) {
      progressCircle.setAttribute('stroke-dashoffset', (circumference * 0.75).toString());
      progressCircle.style.animation = 'circular-progress 1.5s ease-in-out infinite';
    } else {
      progressCircle.setAttribute('stroke-dashoffset', (circumference * (1 - progress / 100)).toString());
    }

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);

    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    `;

    container.appendChild(svg);

    // Add label if requested
    if (config.showLabel && !config.indeterminate && config.value !== undefined) {
      const label = document.createElement('div');
      label.textContent = `${Math.round(config.value)}%`;
      label.style.cssText = `
        position: absolute;
        font-size: ${size > 48 ? '14px' : '12px'};
        font-weight: 600;
        color: #374151;
      `;
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Create pulse animation
   */
  createPulse(config: Partial<LoadingConfig> = {}): HTMLElement {
    const pulse = document.createElement('div');
    const size = this.getSizeValue(config.size || 'medium');
    
    pulse.className = 'loading-pulse';
    pulse.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${config.color || '#3b82f6'};
      border-radius: 50%;
      animation: pulse ${config.duration || 1500}ms ease-in-out infinite;
    `;

    return pulse;
  }

  /**
   * Create wave animation
   */
  createWave(config: Partial<LoadingConfig> = {}): HTMLElement {
    const container = document.createElement('div');
    container.className = 'loading-wave';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 8px;
        height: 8px;
        background: ${config.color || '#3b82f6'};
        border-radius: 50%;
        animation: wave ${config.duration || 1400}ms ease-in-out ${i * 160}ms infinite;
      `;
      container.appendChild(dot);
    }

    return container;
  }

  private getSizeValue(size: string): number {
    const sizes = { small: 24, medium: 40, large: 56 };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  }

  private injectStyles(): void {
    if (this.styleSheet) return;

    this.styleSheet = document.createElement('style');
    this.styleSheet.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.1); }
      }

      @keyframes wave {
        0%, 40%, 100% { transform: translateY(0); }
        20% { transform: translateY(-10px); }
      }

      @keyframes progress-indeterminate {
        0% { left: -30%; }
        50% { left: 100%; }
        100% { left: 100%; }
      }

      @keyframes circular-progress {
        0% { stroke-dashoffset: 188.5px; transform: rotate(0deg); }
        50% { stroke-dashoffset: 47.1px; transform: rotate(135deg); }
        100% { stroke-dashoffset: 188.5px; transform: rotate(450deg); }
      }

      @keyframes skeleton-shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }

      .loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200px 100%;
        animation: skeleton-shimmer 1.5s infinite;
      }
    `;

    document.head.appendChild(this.styleSheet);
  }
}

/**
 * Skeleton Screen Generator
 */
class SkeletonGenerator {
  /**
   * Generate skeleton screen
   */
  generateSkeleton(config: SkeletonConfig): HTMLElement {
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    container.style.cssText = `
      padding: 16px;
      background: white;
      border-radius: 8px;
    `;

    if (config.avatar) {
      container.appendChild(this.createAvatarSkeleton());
    }

    if (config.customLayout) {
      config.customLayout.forEach(layout => {
        container.appendChild(this.createCustomElement(layout));
      });
    } else {
      // Generate default text rows
      for (let i = 0; i < config.rows; i++) {
        const row = this.createTextSkeleton({
          width: i === config.rows - 1 ? '60%' : '100%',
          height: 16
        });
        container.appendChild(row);
        
        if (i < config.rows - 1) {
          const spacer = document.createElement('div');
          spacer.style.height = '12px';
          container.appendChild(spacer);
        }
      }
    }

    if (config.animated !== false) {
      this.addShimmerAnimation(container);
    }

    return container;
  }

  /**
   * Create text skeleton
   */
  createTextSkeleton(config: { width: string | number; height: number; rounded?: boolean }): HTMLElement {
    const element = document.createElement('div');
    element.className = 'skeleton-text';
    element.style.cssText = `
      width: ${typeof config.width === 'number' ? config.width + 'px' : config.width};
      height: ${config.height}px;
      background: #e2e8f0;
      border-radius: ${config.rounded ? config.height / 2 : 4}px;
    `;
    return element;
  }

  /**
   * Create image skeleton
   */
  createImageSkeleton(config: { width: string | number; height: string | number; rounded?: boolean }): HTMLElement {
    const element = document.createElement('div');
    element.className = 'skeleton-image';
    element.style.cssText = `
      width: ${typeof config.width === 'number' ? config.width + 'px' : config.width};
      height: ${typeof config.height === 'number' ? config.height + 'px' : config.height};
      background: #e2e8f0;
      border-radius: ${config.rounded ? '50%' : '8px'};
    `;
    return element;
  }

  /**
   * Create avatar skeleton
   */
  createAvatarSkeleton(size: number = 48): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; margin-bottom: 16px;';

    const avatar = this.createImageSkeleton({
      width: size,
      height: size,
      rounded: true
    });

    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'margin-left: 12px; flex: 1;';

    const name = this.createTextSkeleton({ width: '40%', height: 16 });
    const subtitle = this.createTextSkeleton({ width: '60%', height: 12 });
    subtitle.style.marginTop = '8px';

    textContainer.appendChild(name);
    textContainer.appendChild(subtitle);
    container.appendChild(avatar);
    container.appendChild(textContainer);

    return container;
  }

  /**
   * Create button skeleton
   */
  createButtonSkeleton(config: { width: string | number; height: number }): HTMLElement {
    const element = document.createElement('div');
    element.className = 'skeleton-button';
    element.style.cssText = `
      width: ${typeof config.width === 'number' ? config.width + 'px' : config.width};
      height: ${config.height}px;
      background: #e2e8f0;
      border-radius: 6px;
    `;
    return element;
  }

  /**
   * Create card skeleton
   */
  createCardSkeleton(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.style.cssText = `
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    `;

    // Header
    const header = this.createImageSkeleton({ width: '100%', height: 200 });
    card.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.style.cssText = 'padding-top: 16px;';

    const title = this.createTextSkeleton({ width: '80%', height: 20 });
    const description1 = this.createTextSkeleton({ width: '100%', height: 14 });
    const description2 = this.createTextSkeleton({ width: '60%', height: 14 });

    description1.style.marginTop = '12px';
    description2.style.marginTop = '8px';

    content.appendChild(title);
    content.appendChild(description1);
    content.appendChild(description2);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-top: 16px;';

    const footerButton = this.createButtonSkeleton({ width: 80, height: 32 });
    const footerText = this.createTextSkeleton({ width: 60, height: 12 });

    footer.appendChild(footerText);
    footer.appendChild(footerButton);

    card.appendChild(content);
    card.appendChild(footer);

    return card;
  }

  private createCustomElement(layout: SkeletonLayout): HTMLElement {
    switch (layout.type) {
      case 'text':
        return this.createTextSkeleton({
          width: layout.width,
          height: typeof layout.height === 'number' ? layout.height : 16,
          rounded: layout.rounded
        });
      case 'image':
        return this.createImageSkeleton({
          width: layout.width,
          height: layout.height,
          rounded: layout.rounded
        });
      case 'button':
        return this.createButtonSkeleton({
          width: layout.width,
          height: typeof layout.height === 'number' ? layout.height : 36
        });
      case 'card':
        return this.createCardSkeleton();
      default:
        return this.createTextSkeleton({
          width: layout.width,
          height: typeof layout.height === 'number' ? layout.height : 16
        });
    }
  }

  private addShimmerAnimation(container: HTMLElement): void {
    const skeletonElements = container.querySelectorAll('.skeleton-text, .skeleton-image, .skeleton-button');
    skeletonElements.forEach(element => {
      (element as HTMLElement).classList.add('loading-skeleton');
    });
  }
}

/**
 * Loading State Manager
 */
export class LoadingStateManager {
  private static instance: LoadingStateManager;
  private animationGenerator: LoadingAnimationGenerator;
  private skeletonGenerator: SkeletonGenerator;
  private activeLoadings = new Map<string, HTMLElement>();

  private constructor() {
    this.animationGenerator = new LoadingAnimationGenerator();
    this.skeletonGenerator = new SkeletonGenerator();
  }

  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  /**
   * Show loading state
   */
  showLoading(
    container: HTMLElement | string,
    config: Partial<LoadingConfig> = {}
  ): string {
    const element = typeof container === 'string' 
      ? document.getElementById(container) || document.querySelector(container)
      : container;

    if (!element) {
      throw new Error('Container element not found');
    }

    const loadingId = this.generateId();
    let loadingElement: HTMLElement;

    switch (config.type || 'spinner') {
      case 'spinner':
        loadingElement = this.animationGenerator.createSpinner(config);
        break;
      case 'progress':
        loadingElement = this.animationGenerator.createProgressBar(config);
        break;
      case 'pulse':
        loadingElement = this.animationGenerator.createPulse(config);
        break;
      case 'wave':
        loadingElement = this.animationGenerator.createWave(config);
        break;
      case 'custom':
        if (config.customContent) {
          loadingElement = typeof config.customContent === 'string'
            ? this.createElementFromString(config.customContent)
            : config.customContent;
        } else {
          loadingElement = this.animationGenerator.createSpinner(config);
        }
        break;
      default:
        loadingElement = this.animationGenerator.createSpinner(config);
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    `;

    overlay.appendChild(loadingElement);

    // Ensure container has relative positioning
    const computedStyle = getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(overlay);
    this.activeLoadings.set(loadingId, overlay);

    return loadingId;
  }

  /**
   * Show skeleton screen
   */
  showSkeleton(
    container: HTMLElement | string,
    config: SkeletonConfig
  ): string {
    const element = typeof container === 'string' 
      ? document.getElementById(container) || document.querySelector(container)
      : container;

    if (!element) {
      throw new Error('Container element not found');
    }

    const loadingId = this.generateId();
    const skeleton = this.skeletonGenerator.generateSkeleton(config);

    skeleton.style.cssText += `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: white;
    `;

    // Ensure container has relative positioning
    const computedStyle = getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(skeleton);
    this.activeLoadings.set(loadingId, skeleton);

    return loadingId;
  }

  /**
   * Update progress (for progress bars)
   */
  updateProgress(loadingId: string, value: number): void {
    const overlay = this.activeLoadings.get(loadingId);
    if (!overlay) return;

    const progressBar = overlay.querySelector('.loading-progress__bar') as HTMLElement;
    const label = overlay.querySelector('span');

    if (progressBar) {
      progressBar.style.width = `${value}%`;
    }

    if (label) {
      label.textContent = `${Math.round(value)}%`;
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(loadingId: string): Promise<void> {
    return new Promise((resolve) => {
      const loadingElement = this.activeLoadings.get(loadingId);
      if (!loadingElement) {
        resolve();
        return;
      }

      // Fade out animation
      loadingElement.style.transition = 'opacity 0.3s ease';
      loadingElement.style.opacity = '0';

      setTimeout(() => {
        if (loadingElement.parentElement) {
          loadingElement.parentElement.removeChild(loadingElement);
        }
        this.activeLoadings.delete(loadingId);
        resolve();
      }, 300);
    });
  }

  /**
   * Hide all loading states
   */
  hideAllLoading(): Promise<void[]> {
    const hidePromises = Array.from(this.activeLoadings.keys())
      .map(id => this.hideLoading(id));
    
    return Promise.all(hidePromises);
  }

  /**
   * Create loading state for async operations
   */
  async withLoading<T>(
    container: HTMLElement | string,
    promise: Promise<T>,
    config: Partial<LoadingConfig> = {}
  ): Promise<T> {
    const loadingId = this.showLoading(container, config);
    
    try {
      const result = await promise;
      await this.hideLoading(loadingId);
      return result;
    } catch (error) {
      await this.hideLoading(loadingId);
      throw error;
    }
  }

  /**
   * Create skeleton screen for async operations
   */
  async withSkeleton<T>(
    container: HTMLElement | string,
    promise: Promise<T>,
    config: SkeletonConfig
  ): Promise<T> {
    const loadingId = this.showSkeleton(container, config);
    
    try {
      const result = await promise;
      await this.hideLoading(loadingId);
      return result;
    } catch (error) {
      await this.hideLoading(loadingId);
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private createElementFromString(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild as HTMLElement;
  }
}

// Export convenience functions
export const loadingManager = LoadingStateManager.getInstance();

export const showLoading = (container: HTMLElement | string, config?: Partial<LoadingConfig>) =>
  loadingManager.showLoading(container, config);

export const hideLoading = (loadingId: string) =>
  loadingManager.hideLoading(loadingId);

export const showSkeleton = (container: HTMLElement | string, config: SkeletonConfig) =>
  loadingManager.showSkeleton(container, config);

export const withLoading = <T>(
  container: HTMLElement | string,
  promise: Promise<T>,
  config?: Partial<LoadingConfig>
) => loadingManager.withLoading(container, promise, config);

// Default export
export default LoadingStateManager;