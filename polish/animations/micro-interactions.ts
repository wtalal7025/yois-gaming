/**
 * Enhanced Micro-Interactions System
 * Provides delightful micro-interactions throughout the gaming platform
 */

// Types for micro-interactions
export interface InteractionConfig {
  duration: number;
  easing: string;
  delay?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
}

export interface HoverEffect {
  name: string;
  enterConfig: InteractionConfig;
  exitConfig: InteractionConfig;
  requiresGpu?: boolean;
}

export interface ClickEffect {
  name: string;
  config: InteractionConfig;
  ripple?: boolean;
  feedback?: 'haptic' | 'sound' | 'both';
  customAnimation?: (element: HTMLElement) => Promise<void>;
}

export interface InteractionMetrics {
  totalInteractions: number;
  averageResponseTime: number;
  failedAnimations: number;
  performanceScore: number;
}

/**
 * Advanced Animation Controller
 */
class AnimationController {
  private activeAnimations = new Map<HTMLElement, Animation[]>();
  private performanceMonitor: PerformanceMonitor;
  private reducedMotion = false;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.detectMotionPreference();
    this.setupPerformanceMonitoring();
  }

  /**
   * Create optimized CSS animation
   */
  animate(
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions & { priority?: 'high' | 'medium' | 'low' } = {}
  ): Animation | null {
    if (this.reducedMotion && options.priority !== 'high') {
      return null;
    }

    const startTime = performance.now();
    
    try {
      // Optimize keyframes for GPU acceleration
      const optimizedKeyframes = this.optimizeKeyframes(keyframes);
      
      // Create animation with performance considerations
      const animation = element.animate(optimizedKeyframes, {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
        ...options
      });

      // Track active animations for cleanup
      if (!this.activeAnimations.has(element)) {
        this.activeAnimations.set(element, []);
      }
      this.activeAnimations.get(element)!.push(animation);

      // Cleanup on completion
      animation.addEventListener('finish', () => {
        this.cleanupAnimation(element, animation);
        this.performanceMonitor.recordAnimation(performance.now() - startTime);
      });

      animation.addEventListener('cancel', () => {
        this.cleanupAnimation(element, animation);
      });

      return animation;
    } catch (error) {
      console.warn('Animation failed:', error);
      this.performanceMonitor.recordFailedAnimation();
      return null;
    }
  }

  /**
   * Cancel all animations for an element
   */
  cancelAnimations(element: HTMLElement): void {
    const animations = this.activeAnimations.get(element);
    if (animations) {
      animations.forEach(animation => animation.cancel());
      this.activeAnimations.delete(element);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): InteractionMetrics {
    return this.performanceMonitor.getMetrics();
  }

  private optimizeKeyframes(keyframes: Keyframe[] | PropertyIndexedKeyframes): Keyframe[] | PropertyIndexedKeyframes {
    // Convert to GPU-accelerated properties when possible
    if (Array.isArray(keyframes)) {
      return keyframes.map(frame => {
        const optimized = { ...frame };
        
        // Convert left/top to transform for better performance
        if ('left' in frame || 'top' in frame) {
          const x = (frame as any).left || 0;
          const y = (frame as any).top || 0;
          optimized.transform = `translate3d(${x}px, ${y}px, 0)`;
          delete (optimized as any).left;
          delete (optimized as any).top;
        }

        return optimized;
      });
    }

    return keyframes;
  }

  private cleanupAnimation(element: HTMLElement, animation: Animation): void {
    const animations = this.activeAnimations.get(element);
    if (animations) {
      const index = animations.indexOf(animation);
      if (index > -1) {
        animations.splice(index, 1);
        if (animations.length === 0) {
          this.activeAnimations.delete(element);
        }
      }
    }
  }

  private detectMotionPreference(): void {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = mediaQuery.matches;
      
      mediaQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
      });
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor frame drops and adjust animation quality
    let frameCount = 0;
    let lastTime = performance.now();
    
    const checkPerformance = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Adjust animation complexity based on FPS
        if (fps < 50) {
          this.performanceMonitor.adjustComplexity('reduce');
        } else if (fps > 55) {
          this.performanceMonitor.adjustComplexity('increase');
        }
      }
      
      requestAnimationFrame(checkPerformance);
    };
    
    requestAnimationFrame(checkPerformance);
  }
}

/**
 * Performance monitoring for animations
 */
class PerformanceMonitor {
  private metrics = {
    totalAnimations: 0,
    totalTime: 0,
    failedAnimations: 0,
    complexity: 1.0 // 0.5 = reduced, 1.0 = normal, 1.5 = enhanced
  };

  recordAnimation(duration: number): void {
    this.metrics.totalAnimations++;
    this.metrics.totalTime += duration;
  }

  recordFailedAnimation(): void {
    this.metrics.failedAnimations++;
  }

  adjustComplexity(direction: 'increase' | 'reduce'): void {
    if (direction === 'reduce' && this.metrics.complexity > 0.5) {
      this.metrics.complexity -= 0.1;
    } else if (direction === 'increase' && this.metrics.complexity < 1.5) {
      this.metrics.complexity += 0.1;
    }
  }

  getMetrics(): InteractionMetrics {
    return {
      totalInteractions: this.metrics.totalAnimations,
      averageResponseTime: this.metrics.totalAnimations > 0 
        ? this.metrics.totalTime / this.metrics.totalAnimations 
        : 0,
      failedAnimations: this.metrics.failedAnimations,
      performanceScore: Math.max(0, 100 - (this.metrics.failedAnimations / Math.max(1, this.metrics.totalAnimations)) * 100)
    };
  }

  getComplexityMultiplier(): number {
    return this.metrics.complexity;
  }
}

/**
 * Micro-Interactions Manager
 */
export class MicroInteractionsManager {
  private static instance: MicroInteractionsManager;
  private animationController: AnimationController;
  private registeredEffects = new Map<string, HoverEffect | ClickEffect>();
  private observer: IntersectionObserver | null = null;

  private constructor() {
    this.animationController = new AnimationController();
    this.setupDefaultEffects();
    this.setupIntersectionObserver();
  }

  static getInstance(): MicroInteractionsManager {
    if (!MicroInteractionsManager.instance) {
      MicroInteractionsManager.instance = new MicroInteractionsManager();
    }
    return MicroInteractionsManager.instance;
  }

  /**
   * Apply hover effect to element
   */
  applyHoverEffect(element: HTMLElement, effectName: string = 'gentle-scale'): void {
    const effect = this.registeredEffects.get(effectName) as HoverEffect;
    if (!effect) {
      console.warn(`Hover effect '${effectName}' not found`);
      return;
    }

    const handleMouseEnter = () => {
      this.animationController.animate(element, this.buildKeyframes(effect.enterConfig), {
        duration: effect.enterConfig.duration,
        easing: effect.enterConfig.easing,
        priority: 'medium'
      });
    };

    const handleMouseLeave = () => {
      this.animationController.animate(element, this.buildKeyframes(effect.exitConfig), {
        duration: effect.exitConfig.duration,
        easing: effect.exitConfig.easing,
        priority: 'medium'
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Store cleanup function
    (element as any)._hoverCleanup = () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }

  /**
   * Apply click effect to element
   */
  applyClickEffect(element: HTMLElement, effectName: string = 'ripple-scale'): void {
    const effect = this.registeredEffects.get(effectName) as ClickEffect;
    if (!effect) {
      console.warn(`Click effect '${effectName}' not found`);
      return;
    }

    const handleClick = async (event: MouseEvent) => {
      // Custom animation if provided
      if (effect.customAnimation) {
        await effect.customAnimation(element);
        return;
      }

      // Ripple effect
      if (effect.ripple) {
        this.createRippleEffect(element, event);
      }

      // Main click animation
      const animation = this.animationController.animate(element, this.buildKeyframes(effect.config), {
        duration: effect.config.duration,
        easing: effect.config.easing,
        priority: 'high'
      });

      // Haptic feedback
      if (effect.feedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (effect.feedback === 'haptic' || effect.feedback === 'both') {
          navigator.vibrate(50);
        }
      }

      // Return to original state
      if (animation) {
        animation.addEventListener('finish', () => {
          this.animationController.animate(element, [
            this.buildKeyframes(effect.config)[0],
            {}
          ], {
            duration: effect.config.duration * 0.5,
            easing: 'ease-out',
            priority: 'high'
          });
        });
      }
    };

    element.addEventListener('click', handleClick);

    // Store cleanup function
    (element as any)._clickCleanup = () => {
      element.removeEventListener('click', handleClick);
    };
  }

  /**
   * Apply entrance animation
   */
  applyEntranceAnimation(element: HTMLElement, type: 'fadeIn' | 'slideUp' | 'bounceIn' | 'custom' = 'fadeIn'): Promise<void> {
    return new Promise((resolve) => {
      let keyframes: Keyframe[];
      let duration = 600;

      switch (type) {
        case 'fadeIn':
          keyframes = [
            { opacity: 0, transform: 'translateY(20px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ];
          break;
        case 'slideUp':
          keyframes = [
            { transform: 'translateY(100%)' },
            { transform: 'translateY(0)' }
          ];
          break;
        case 'bounceIn':
          keyframes = [
            { transform: 'scale(0.3) translateY(-100px)', opacity: 0 },
            { transform: 'scale(1.05) translateY(-10px)', opacity: 0.8 },
            { transform: 'scale(0.95) translateY(0)', opacity: 1 },
            { transform: 'scale(1) translateY(0)', opacity: 1 }
          ];
          duration = 800;
          break;
        default:
          keyframes = [
            { opacity: 0 },
            { opacity: 1 }
          ];
      }

      const animation = this.animationController.animate(element, keyframes, {
        duration,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        priority: 'high'
      });

      if (animation) {
        animation.addEventListener('finish', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Create staggered entrance animations for multiple elements
   */
  applyStaggeredEntrance(
    elements: NodeList | HTMLElement[], 
    delay: number = 100,
    type: 'fadeIn' | 'slideUp' | 'bounceIn' = 'fadeIn'
  ): Promise<void[]> {
    const elementsArray = Array.from(elements) as HTMLElement[];
    
    return Promise.all(
      elementsArray.map((element, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            this.applyEntranceAnimation(element, type).then(resolve);
          }, index * delay);
        });
      })
    );
  }

  /**
   * Register custom effect
   */
  registerEffect(name: string, effect: HoverEffect | ClickEffect): void {
    this.registeredEffects.set(name, effect);
  }

  /**
   * Remove all effects from element
   */
  removeEffects(element: HTMLElement): void {
    // Cancel active animations
    this.animationController.cancelAnimations(element);

    // Remove event listeners
    if ((element as any)._hoverCleanup) {
      (element as any)._hoverCleanup();
      delete (element as any)._hoverCleanup;
    }

    if ((element as any)._clickCleanup) {
      (element as any)._clickCleanup();
      delete (element as any)._clickCleanup;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): InteractionMetrics {
    return this.animationController.getMetrics();
  }

  private setupDefaultEffects(): void {
    // Hover effects
    this.registerEffect('gentle-scale', {
      name: 'gentle-scale',
      enterConfig: { duration: 200, easing: 'ease-out', scale: 1.05 },
      exitConfig: { duration: 200, easing: 'ease-out', scale: 1 }
    });

    this.registerEffect('glow', {
      name: 'glow',
      enterConfig: { duration: 300, easing: 'ease-out', opacity: 0.8, blur: 0 },
      exitConfig: { duration: 300, easing: 'ease-out', opacity: 1, blur: 0 }
    });

    this.registerEffect('lift', {
      name: 'lift',
      enterConfig: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', scale: 1.02 },
      exitConfig: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', scale: 1 }
    });

    // Click effects
    this.registerEffect('ripple-scale', {
      name: 'ripple-scale',
      config: { duration: 150, easing: 'ease-out', scale: 0.95 },
      ripple: true,
      feedback: 'haptic'
    });

    this.registerEffect('bounce-click', {
      name: 'bounce-click',
      config: { duration: 300, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', scale: 1.1 }
    });
  }

  private buildKeyframes(config: InteractionConfig): Keyframe[] {
    const keyframe: Keyframe = {};
    
    if (config.scale !== undefined) {
      keyframe.transform = `scale(${config.scale})`;
    }
    
    if (config.rotation !== undefined) {
      keyframe.transform = (keyframe.transform || '') + ` rotate(${config.rotation}deg)`;
    }
    
    if (config.opacity !== undefined) {
      keyframe.opacity = config.opacity;
    }

    return [{}, keyframe];
  }

  private createRippleEffect(element: HTMLElement, event: MouseEvent): void {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
      z-index: 1000;
    `;

    const elementStyle = getComputedStyle(element);
    if (elementStyle.position === 'static') {
      element.style.position = 'relative';
    }
    element.style.overflow = 'hidden';

    element.appendChild(ripple);

    // Animate ripple
    this.animationController.animate(ripple, [
      { transform: 'scale(0)', opacity: 0.6 },
      { transform: 'scale(1)', opacity: 0 }
    ], {
      duration: 600,
      easing: 'ease-out',
      priority: 'high'
    })?.addEventListener('finish', () => {
      ripple.remove();
    });
  }

  private setupIntersectionObserver(): void {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        
        if (entry.isIntersecting && element.dataset.entranceAnimation) {
          const animationType = element.dataset.entranceAnimation as 'fadeIn' | 'slideUp' | 'bounceIn';
          this.applyEntranceAnimation(element, animationType);
          element.removeAttribute('data-entrance-animation');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
  }

  /**
   * Auto-apply entrance animation when element enters viewport
   */
  observeForEntrance(element: HTMLElement, type: 'fadeIn' | 'slideUp' | 'bounceIn' = 'fadeIn'): void {
    if (!this.observer) return;

    element.dataset.entranceAnimation = type;
    element.style.opacity = '0';
    this.observer.observe(element);
  }
}

// Export convenience functions
export const microInteractions = MicroInteractionsManager.getInstance();

export const applyHover = (element: HTMLElement, effect: string = 'gentle-scale') => 
  microInteractions.applyHoverEffect(element, effect);

export const applyClick = (element: HTMLElement, effect: string = 'ripple-scale') => 
  microInteractions.applyClickEffect(element, effect);

export const animateEntrance = (element: HTMLElement, type?: 'fadeIn' | 'slideUp' | 'bounceIn') => 
  microInteractions.applyEntranceAnimation(element, type);

// Default export
export default MicroInteractionsManager;