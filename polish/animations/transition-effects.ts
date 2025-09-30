/**
 * Smooth Page and Game Transition Effects System
 * Provides seamless transitions between different states and pages
 */

// Types for transition effects
export interface TransitionConfig {
  type: 'fade' | 'slide' | 'scale' | 'flip' | 'morph' | 'custom';
  direction?: 'up' | 'down' | 'left' | 'right' | 'in' | 'out';
  duration: number;
  easing: string;
  delay?: number;
  staggerChildren?: number;
}

export interface PageTransitionConfig extends TransitionConfig {
  preserveScroll?: boolean;
  preloadImages?: boolean;
  showProgress?: boolean;
}

export interface GameTransitionConfig extends TransitionConfig {
  gameId?: string;
  preserveGameState?: boolean;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export interface TransitionState {
  id: string;
  element: HTMLElement;
  type: string;
  startTime: number;
  duration: number;
  animation?: Animation;
}

/**
 * Transition Animation Engine
 */
class TransitionEngine {
  private activeTransitions = new Map<string, TransitionState>();
  private preloadCache = new Map<string, HTMLImageElement[]>();

  /**
   * Execute fade transition
   */
  async fade(
    element: HTMLElement,
    direction: 'in' | 'out',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const keyframes = direction === 'in'
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 1 }, { opacity: 0 }];

      const animation = element.animate(keyframes, {
        duration: config.duration || 300,
        easing: config.easing || 'ease-in-out',
        delay: config.delay || 0,
        fill: 'forwards'
      });

      const transitionId = this.generateId();
      this.activeTransitions.set(transitionId, {
        id: transitionId,
        element,
        type: 'fade',
        startTime: performance.now(),
        duration: config.duration || 300,
        animation
      });

      animation.addEventListener('finish', () => {
        this.activeTransitions.delete(transitionId);
        resolve();
      });
    });
  }

  /**
   * Execute slide transition
   */
  async slide(
    element: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const transforms = {
        up: ['translateY(100%)', 'translateY(0)'],
        down: ['translateY(-100%)', 'translateY(0)'],
        left: ['translateX(100%)', 'translateX(0)'],
        right: ['translateX(-100%)', 'translateX(0)']
      };

      const keyframes = [
        { transform: transforms[direction][0], opacity: 0 },
        { transform: transforms[direction][1], opacity: 1 }
      ];

      const animation = element.animate(keyframes, {
        duration: config.duration || 400,
        easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
        delay: config.delay || 0,
        fill: 'forwards'
      });

      const transitionId = this.generateId();
      this.activeTransitions.set(transitionId, {
        id: transitionId,
        element,
        type: 'slide',
        startTime: performance.now(),
        duration: config.duration || 400,
        animation
      });

      animation.addEventListener('finish', () => {
        this.activeTransitions.delete(transitionId);
        resolve();
      });
    });
  }

  /**
   * Execute scale transition
   */
  async scale(
    element: HTMLElement,
    direction: 'in' | 'out',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const keyframes = direction === 'in'
        ? [
            { transform: 'scale(0.8)', opacity: 0 },
            { transform: 'scale(1.02)', opacity: 0.8 },
            { transform: 'scale(1)', opacity: 1 }
          ]
        : [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(1.1)', opacity: 0.5 },
            { transform: 'scale(0.8)', opacity: 0 }
          ];

      const animation = element.animate(keyframes, {
        duration: config.duration || 500,
        easing: config.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        delay: config.delay || 0,
        fill: 'forwards'
      });

      const transitionId = this.generateId();
      this.activeTransitions.set(transitionId, {
        id: transitionId,
        element,
        type: 'scale',
        startTime: performance.now(),
        duration: config.duration || 500,
        animation
      });

      animation.addEventListener('finish', () => {
        this.activeTransitions.delete(transitionId);
        resolve();
      });
    });
  }

  /**
   * Execute flip transition
   */
  async flip(
    element: HTMLElement,
    axis: 'x' | 'y' = 'y',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const rotateProperty = axis === 'x' ? 'rotateX' : 'rotateY';
      
      const keyframes = [
        { transform: `perspective(1000px) ${rotateProperty}(0deg)`, opacity: 1 },
        { transform: `perspective(1000px) ${rotateProperty}(90deg)`, opacity: 0.5 },
        { transform: `perspective(1000px) ${rotateProperty}(180deg)`, opacity: 1 }
      ];

      const animation = element.animate(keyframes, {
        duration: config.duration || 600,
        easing: config.easing || 'ease-in-out',
        delay: config.delay || 0,
        fill: 'forwards'
      });

      const transitionId = this.generateId();
      this.activeTransitions.set(transitionId, {
        id: transitionId,
        element,
        type: 'flip',
        startTime: performance.now(),
        duration: config.duration || 600,
        animation
      });

      animation.addEventListener('finish', () => {
        this.activeTransitions.delete(transitionId);
        resolve();
      });
    });
  }

  /**
   * Execute morph transition (for complex shape changes)
   */
  async morph(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      // Get bounding rectangles
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      // Create morphing overlay
      const morphElement = document.createElement('div');
      morphElement.style.cssText = `
        position: fixed;
        top: ${fromRect.top}px;
        left: ${fromRect.left}px;
        width: ${fromRect.width}px;
        height: ${fromRect.height}px;
        background: ${getComputedStyle(fromElement).background || '#3b82f6'};
        border-radius: ${getComputedStyle(fromElement).borderRadius || '0px'};
        z-index: 10000;
        pointer-events: none;
      `;

      document.body.appendChild(morphElement);

      // Calculate scale and position differences
      const scaleX = toRect.width / fromRect.width;
      const scaleY = toRect.height / fromRect.height;
      const translateX = toRect.left - fromRect.left + (toRect.width - fromRect.width) / 2;
      const translateY = toRect.top - fromRect.top + (toRect.height - fromRect.height) / 2;

      const keyframes = [
        { 
          transform: 'translate(0, 0) scale(1)',
          borderRadius: getComputedStyle(fromElement).borderRadius || '0px'
        },
        { 
          transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
          borderRadius: getComputedStyle(toElement).borderRadius || '0px'
        }
      ];

      const animation = morphElement.animate(keyframes, {
        duration: config.duration || 500,
        easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      });

      // Hide original elements during morph
      fromElement.style.opacity = '0';
      toElement.style.opacity = '0';

      const transitionId = this.generateId();
      this.activeTransitions.set(transitionId, {
        id: transitionId,
        element: morphElement,
        type: 'morph',
        startTime: performance.now(),
        duration: config.duration || 500,
        animation
      });

      animation.addEventListener('finish', () => {
        // Show target element and clean up
        toElement.style.opacity = '1';
        fromElement.style.opacity = '1';
        morphElement.remove();
        this.activeTransitions.delete(transitionId);
        resolve();
      });
    });
  }

  /**
   * Execute staggered transition for multiple elements
   */
  async staggered(
    elements: NodeList | HTMLElement[],
    transitionType: 'fade' | 'slide' | 'scale',
    config: Partial<TransitionConfig> = {}
  ): Promise<void> {
    const elementsArray = Array.from(elements) as HTMLElement[];
    const staggerDelay = config.staggerChildren || 100;

    const promises = elementsArray.map((element, index) => {
      const elementConfig = {
        ...config,
        delay: (config.delay || 0) + (index * staggerDelay)
      };

      switch (transitionType) {
        case 'fade':
          return this.fade(element, 'in', elementConfig);
        case 'slide':
          return this.slide(element, config.direction as any || 'up', elementConfig);
        case 'scale':
          return this.scale(element, 'in', elementConfig);
        default:
          return this.fade(element, 'in', elementConfig);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Cancel active transition
   */
  cancelTransition(transitionId: string): void {
    const transition = this.activeTransitions.get(transitionId);
    if (transition && transition.animation) {
      transition.animation.cancel();
      this.activeTransitions.delete(transitionId);
    }
  }

  /**
   * Cancel all active transitions
   */
  cancelAllTransitions(): void {
    for (const [id, transition] of this.activeTransitions) {
      if (transition.animation) {
        transition.animation.cancel();
      }
    }
    this.activeTransitions.clear();
  }

  /**
   * Get active transition states
   */
  getActiveTransitions(): TransitionState[] {
    return Array.from(this.activeTransitions.values());
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

/**
 * Page Transition Manager
 */
class PageTransitionManager {
  private engine: TransitionEngine;
  private currentPage: HTMLElement | null = null;
  private isTransitioning = false;

  constructor() {
    this.engine = new TransitionEngine();
  }

  /**
   * Execute page transition
   */
  async transitionToPage(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    config: PageTransitionConfig
  ): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Page transition already in progress');
      return;
    }

    this.isTransitioning = true;
    const scrollPosition = config.preserveScroll ? window.scrollY : 0;

    try {
      // Preload images if requested
      if (config.preloadImages) {
        await this.preloadPageImages(toElement);
      }

      // Show progress if requested
      let progressElement: HTMLElement | null = null;
      if (config.showProgress) {
        progressElement = this.createProgressIndicator();
        document.body.appendChild(progressElement);
      }

      // Execute transition based on type
      switch (config.type) {
        case 'fade':
          await this.executeFadeTransition(fromElement, toElement, config);
          break;
        case 'slide':
          await this.executeSlideTransition(fromElement, toElement, config);
          break;
        case 'scale':
          await this.executeScaleTransition(fromElement, toElement, config);
          break;
        case 'morph':
          await this.engine.morph(fromElement, toElement, config);
          break;
        default:
          await this.executeFadeTransition(fromElement, toElement, config);
      }

      // Restore scroll position if requested
      if (config.preserveScroll) {
        window.scrollTo(0, scrollPosition);
      }

      // Remove progress indicator
      if (progressElement) {
        progressElement.remove();
      }

      this.currentPage = toElement;
    } finally {
      this.isTransitioning = false;
    }
  }

  private async executeFadeTransition(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    config: PageTransitionConfig
  ): Promise<void> {
    // Prepare elements
    toElement.style.position = 'absolute';
    toElement.style.top = '0';
    toElement.style.left = '0';
    toElement.style.width = '100%';
    toElement.style.opacity = '0';
    toElement.style.zIndex = '1';

    fromElement.parentElement?.appendChild(toElement);

    // Fade out old page and fade in new page
    await Promise.all([
      this.engine.fade(fromElement, 'out', { duration: config.duration / 2 }),
      this.engine.fade(toElement, 'in', { 
        duration: config.duration / 2,
        delay: config.duration / 2 
      })
    ]);

    // Clean up
    fromElement.remove();
    toElement.style.position = '';
    toElement.style.zIndex = '';
  }

  private async executeSlideTransition(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    config: PageTransitionConfig
  ): Promise<void> {
    const direction = config.direction || 'left';
    
    // Prepare elements
    toElement.style.position = 'absolute';
    toElement.style.top = '0';
    toElement.style.left = '0';
    toElement.style.width = '100%';
    toElement.style.zIndex = '1';

    const slideOutDirection = direction === 'left' ? 'right' : 
                             direction === 'right' ? 'left' :
                             direction === 'up' ? 'down' : 'up';

    fromElement.parentElement?.appendChild(toElement);

    // Slide out old page and slide in new page
    await Promise.all([
      this.engine.slide(fromElement, slideOutDirection as any, { duration: config.duration }),
      this.engine.slide(toElement, direction as any, { duration: config.duration })
    ]);

    // Clean up
    fromElement.remove();
    toElement.style.position = '';
    toElement.style.zIndex = '';
  }

  private async executeScaleTransition(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    config: PageTransitionConfig
  ): Promise<void> {
    // Prepare elements
    toElement.style.position = 'absolute';
    toElement.style.top = '0';
    toElement.style.left = '0';
    toElement.style.width = '100%';
    toElement.style.opacity = '0';
    toElement.style.zIndex = '1';

    fromElement.parentElement?.appendChild(toElement);

    // Scale out old page and scale in new page
    await Promise.all([
      this.engine.scale(fromElement, 'out', { duration: config.duration / 2 }),
      this.engine.scale(toElement, 'in', { 
        duration: config.duration / 2,
        delay: config.duration / 2 
      })
    ]);

    // Clean up
    fromElement.remove();
    toElement.style.position = '';
    toElement.style.zIndex = '';
  }

  private async preloadPageImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img[src], [style*="background-image"]');
    const preloadPromises: Promise<void>[] = [];

    images.forEach((img) => {
      let src = '';
      if (img.tagName === 'IMG') {
        src = (img as HTMLImageElement).src;
      } else {
        const bgImage = getComputedStyle(img).backgroundImage;
        const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match) src = match[1];
      }

      if (src) {
        preloadPromises.push(
          new Promise((resolve) => {
            const preloadImg = new Image();
            preloadImg.onload = () => resolve();
            preloadImg.onerror = () => resolve(); // Continue even if image fails
            preloadImg.src = src;
          })
        );
      }
    });

    await Promise.all(preloadPromises);
  }

  private createProgressIndicator(): HTMLElement {
    const progress = document.createElement('div');
    progress.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: rgba(59, 130, 246, 0.3);
      z-index: 10001;
    `;

    const bar = document.createElement('div');
    bar.style.cssText = `
      height: 100%;
      background: #3b82f6;
      width: 0;
      animation: progress-indeterminate 2s ease-in-out infinite;
    `;

    progress.appendChild(bar);
    return progress;
  }
}

/**
 * Game Transition Manager
 */
class GameTransitionManager {
  private engine: TransitionEngine;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.engine = new TransitionEngine();
    this.initAudioContext();
  }

  /**
   * Transition between game states
   */
  async transitionGameState(
    fromState: HTMLElement,
    toState: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    // Play transition sound if enabled
    if (config.soundEnabled) {
      this.playTransitionSound(config.type);
    }

    // Haptic feedback if enabled and supported
    if (config.hapticEnabled && 'vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }

    // Execute transition
    switch (config.type) {
      case 'fade':
        await this.executeGameFadeTransition(fromState, toState, config);
        break;
      case 'slide':
        await this.executeGameSlideTransition(fromState, toState, config);
        break;
      case 'flip':
        await this.engine.flip(fromState, 'y', config);
        await this.engine.fade(toState, 'in', { duration: config.duration / 2 });
        break;
      default:
        await this.executeGameFadeTransition(fromState, toState, config);
    }
  }

  /**
   * Transition to new game
   */
  async transitionToGame(
    currentGame: HTMLElement,
    newGame: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    // Show loading state for new game
    const loadingElement = this.createGameLoadingState(config.gameId || 'game');
    newGame.parentElement?.appendChild(loadingElement);

    // Transition out current game
    await this.engine.scale(currentGame, 'out', {
      duration: config.duration / 2,
      easing: 'ease-in'
    });

    // Hide current game
    currentGame.style.display = 'none';

    // Transition in loading state
    await this.engine.scale(loadingElement, 'in', {
      duration: config.duration / 2,
      easing: 'ease-out'
    });

    // Simulate game loading (in real implementation, wait for actual game load)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Transition out loading state and in new game
    await Promise.all([
      this.engine.fade(loadingElement, 'out', { duration: 300 }),
      this.engine.scale(newGame, 'in', { 
        duration: config.duration / 2,
        delay: 300,
        easing: 'ease-out'
      })
    ]);

    // Clean up
    loadingElement.remove();
    currentGame.remove();
  }

  private async executeGameFadeTransition(
    fromState: HTMLElement,
    toState: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    toState.style.position = 'absolute';
    toState.style.top = '0';
    toState.style.left = '0';
    toState.style.width = '100%';
    toState.style.height = '100%';
    toState.style.opacity = '0';

    await Promise.all([
      this.engine.fade(fromState, 'out', { duration: config.duration / 2 }),
      this.engine.fade(toState, 'in', { 
        duration: config.duration / 2,
        delay: config.duration / 2 
      })
    ]);

    toState.style.position = '';
    toState.style.top = '';
    toState.style.left = '';
    toState.style.width = '';
    toState.style.height = '';
  }

  private async executeGameSlideTransition(
    fromState: HTMLElement,
    toState: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    const direction = config.direction || 'left';
    
    toState.style.position = 'absolute';
    toState.style.top = '0';
    toState.style.left = '0';
    toState.style.width = '100%';
    toState.style.height = '100%';

    await this.engine.slide(toState, direction as any, config);

    fromState.style.display = 'none';
    toState.style.position = '';
    toState.style.top = '';
    toState.style.left = '';
    toState.style.width = '';
    toState.style.height = '';
  }

  private createGameLoadingState(gameId: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 400px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 12px;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 48px;
      height: 48px;
      border: 4px solid rgba(59, 130, 246, 0.2);
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const text = document.createElement('div');
    text.textContent = `Loading ${gameId}...`;
    text.style.cssText = `
      margin-top: 16px;
      font-size: 16px;
      color: #6b7280;
    `;

    container.appendChild(spinner);
    container.appendChild(text);

    return container;
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not supported');
    }
  }

  private playTransitionSound(type: string): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Different frequencies for different transition types
    const frequencies = {
      fade: 400,
      slide: 600,
      scale: 800,
      flip: 1000
    };

    oscillator.frequency.setValueAtTime(
      frequencies[type as keyof typeof frequencies] || 400, 
      this.audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }
}

/**
 * Main Transition Effects Manager
 */
export class TransitionEffectsManager {
  private static instance: TransitionEffectsManager;
  private engine: TransitionEngine;
  private pageManager: PageTransitionManager;
  private gameManager: GameTransitionManager;

  private constructor() {
    this.engine = new TransitionEngine();
    this.pageManager = new PageTransitionManager();
    this.gameManager = new GameTransitionManager();
  }

  static getInstance(): TransitionEffectsManager {
    if (!TransitionEffectsManager.instance) {
      TransitionEffectsManager.instance = new TransitionEffectsManager();
    }
    return TransitionEffectsManager.instance;
  }

  // Page transitions
  async transitionPage(
    from: HTMLElement,
    to: HTMLElement,
    config: PageTransitionConfig
  ): Promise<void> {
    return this.pageManager.transitionToPage(from, to, config);
  }

  // Game transitions
  async transitionGameState(
    from: HTMLElement,
    to: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    return this.gameManager.transitionGameState(from, to, config);
  }

  async transitionToGame(
    current: HTMLElement,
    next: HTMLElement,
    config: GameTransitionConfig
  ): Promise<void> {
    return this.gameManager.transitionToGame(current, next, config);
  }

  // Basic transitions
  async fade(element: HTMLElement, direction: 'in' | 'out', config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.fade(element, direction, config);
  }

  async slide(element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right', config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.slide(element, direction, config);
  }

  async scale(element: HTMLElement, direction: 'in' | 'out', config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.scale(element, direction, config);
  }

  async flip(element: HTMLElement, axis: 'x' | 'y', config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.flip(element, axis, config);
  }

  async morph(from: HTMLElement, to: HTMLElement, config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.morph(from, to, config);
  }

  async staggered(elements: NodeList | HTMLElement[], type: 'fade' | 'slide' | 'scale', config?: Partial<TransitionConfig>): Promise<void> {
    return this.engine.staggered(elements, type, config);
  }

  // Utility methods
  cancelAllTransitions(): void {
    this.engine.cancelAllTransitions();
  }

  getActiveTransitions(): TransitionState[] {
    return this.engine.getActiveTransitions();
  }
}

// Export convenience functions
export const transitions = TransitionEffectsManager.getInstance();

export const fadeIn = (element: HTMLElement, config?: Partial<TransitionConfig>) =>
  transitions.fade(element, 'in', config);

export const fadeOut = (element: HTMLElement, config?: Partial<TransitionConfig>) =>
  transitions.fade(element, 'out', config);

export const slideIn = (element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right', config?: Partial<TransitionConfig>) =>
  transitions.slide(element, direction, config);

export const scaleIn = (element: HTMLElement, config?: Partial<TransitionConfig>) =>
  transitions.scale(element, 'in', config);

// Default export
export default TransitionEffectsManager;