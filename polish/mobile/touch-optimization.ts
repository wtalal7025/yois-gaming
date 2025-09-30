/**
 * Touch Gesture Optimization System for Mobile Games
 * Provides enhanced touch interactions, gestures, and haptic feedback for mobile gaming
 */

// Types for touch optimization
export interface TouchConfig {
  enableGestures: boolean;
  enableHaptics: boolean;
  touchSensitivity: number;
  preventScrolling: boolean;
  minimumTouchTarget: number;
  doubleTapDelay: number;
  longPressDelay: number;
}

export interface GestureConfig {
  swipe: {
    enabled: boolean;
    minDistance: number;
    maxTime: number;
    directions: ('up' | 'down' | 'left' | 'right')[];
  };
  pinch: {
    enabled: boolean;
    minScale: number;
    maxScale: number;
  };
  rotate: {
    enabled: boolean;
    minAngle: number;
  };
  pan: {
    enabled: boolean;
    threshold: number;
  };
}

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startTime: number;
  startX: number;
  startY: number;
  force?: number;
}

export interface GestureEvent {
  type: 'tap' | 'doubletap' | 'longpress' | 'swipe' | 'pinch' | 'rotate' | 'pan';
  touches: TouchPoint[];
  center: { x: number; y: number };
  direction?: string;
  distance?: number;
  angle?: number;
  scale?: number;
  velocity?: { x: number; y: number };
  preventDefault: () => void;
  target: HTMLElement;
}

/**
 * Touch Point Tracker
 */
class TouchTracker {
  private activeTouches = new Map<number, TouchPoint>();
  private touchHistory: TouchPoint[][] = [];
  private config: TouchConfig;

  constructor(config: TouchConfig) {
    this.config = config;
  }

  /**
   * Add touch point
   */
  addTouch(touch: Touch): TouchPoint {
    const touchPoint: TouchPoint = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      startTime: Date.now(),
      startX: touch.clientX,
      startY: touch.clientY,
      force: (touch as any).force || 1.0
    };

    this.activeTouches.set(touch.identifier, touchPoint);
    return touchPoint;
  }

  /**
   * Update touch point
   */
  updateTouch(touch: Touch): TouchPoint | null {
    const touchPoint = this.activeTouches.get(touch.identifier);
    if (touchPoint) {
      touchPoint.x = touch.clientX;
      touchPoint.y = touch.clientY;
      touchPoint.force = (touch as any).force || 1.0;
    }
    return touchPoint || null;
  }

  /**
   * Remove touch point
   */
  removeTouch(touchId: number): TouchPoint | null {
    const touchPoint = this.activeTouches.get(touchId);
    if (touchPoint) {
      this.activeTouches.delete(touchId);
      this.addToHistory();
    }
    return touchPoint || null;
  }

  /**
   * Get active touches
   */
  getActiveTouches(): TouchPoint[] {
    return Array.from(this.activeTouches.values());
  }

  /**
   * Get touch by ID
   */
  getTouch(id: number): TouchPoint | null {
    return this.activeTouches.get(id) || null;
  }

  /**
   * Calculate touch center
   */
  getTouchCenter(): { x: number; y: number } {
    const touches = this.getActiveTouches();
    if (touches.length === 0) return { x: 0, y: 0 };

    const sum = touches.reduce(
      (acc, touch) => ({ x: acc.x + touch.x, y: acc.y + touch.y }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / touches.length,
      y: sum.y / touches.length
    };
  }

  /**
   * Clear all touches
   */
  clear(): void {
    this.activeTouches.clear();
  }

  private addToHistory(): void {
    this.touchHistory.push([...this.getActiveTouches()]);
    if (this.touchHistory.length > 10) {
      this.touchHistory.shift();
    }
  }
}

/**
 * Gesture Recognizer
 */
class GestureRecognizer {
  private config: GestureConfig;
  private touchTracker: TouchTracker;
  private lastTapTime = 0;
  private longPressTimer: number | null = null;
  private initialPinchDistance = 0;
  private initialRotationAngle = 0;

  constructor(config: GestureConfig, touchTracker: TouchTracker) {
    this.config = config;
    this.touchTracker = touchTracker;
  }

  /**
   * Process touch start
   */
  processTouchStart(event: TouchEvent, touchConfig: TouchConfig): GestureEvent | null {
    const touches = Array.from(event.touches);
    const touchPoints = touches.map(touch => this.touchTracker.addTouch(touch));

    // Clear existing long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Start long press detection for single touch
    if (touchPoints.length === 1) {
      this.longPressTimer = window.setTimeout(() => {
        this.longPressTimer = null;
        // Emit long press event (would be handled by the manager)
      }, touchConfig.longPressDelay);
    }

    // Initialize multi-touch gestures
    if (touchPoints.length === 2) {
      this.initializePinchGesture(touchPoints);
    }

    return null; // No immediate gesture on touch start
  }

  /**
   * Process touch move
   */
  processTouchMove(event: TouchEvent): GestureEvent | null {
    const touches = Array.from(event.touches);
    const touchPoints = touches.map(touch => this.touchTracker.updateTouch(touch)).filter(Boolean) as TouchPoint[];

    // Cancel long press if touch moves too much
    if (this.longPressTimer && touchPoints.length === 1) {
      const touch = touchPoints[0];
      const distance = Math.sqrt(
        Math.pow(touch.x - touch.startX, 2) + Math.pow(touch.y - touch.startY, 2)
      );
      
      if (distance > 10) { // 10px threshold
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Process pan gesture
    if (this.config.pan.enabled && touchPoints.length === 1) {
      return this.processPanGesture(touchPoints[0], event.target as HTMLElement);
    }

    // Process pinch gesture
    if (this.config.pinch.enabled && touchPoints.length === 2) {
      return this.processPinchGesture(touchPoints, event.target as HTMLElement);
    }

    return null;
  }

  /**
   * Process touch end
   */
  processTouchEnd(event: TouchEvent, touchConfig: TouchConfig): GestureEvent | null {
    const changedTouches = Array.from(event.changedTouches);
    const endedTouchPoints = changedTouches.map(touch => this.touchTracker.removeTouch(touch.identifier)).filter(Boolean) as TouchPoint[];

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Process tap and double tap
    if (endedTouchPoints.length === 1 && this.touchTracker.getActiveTouches().length === 0) {
      return this.processTapGesture(endedTouchPoints[0], touchConfig, event.target as HTMLElement);
    }

    // Process swipe gesture
    if (this.config.swipe.enabled && endedTouchPoints.length === 1) {
      const swipeGesture = this.processSwipeGesture(endedTouchPoints[0], event.target as HTMLElement);
      if (swipeGesture) return swipeGesture;
    }

    return null;
  }

  private processTapGesture(touchPoint: TouchPoint, config: TouchConfig, target: HTMLElement): GestureEvent | null {
    const now = Date.now();
    const timeSinceStart = now - touchPoint.startTime;
    const distance = Math.sqrt(
      Math.pow(touchPoint.x - touchPoint.startX, 2) + Math.pow(touchPoint.y - touchPoint.startY, 2)
    );

    // Must be quick and not move much to be a tap
    if (timeSinceStart < 300 && distance < 10) {
      const timeSinceLastTap = now - this.lastTapTime;
      
      if (timeSinceLastTap < config.doubleTapDelay) {
        // Double tap
        this.lastTapTime = 0; // Reset to prevent triple tap
        return {
          type: 'doubletap',
          touches: [touchPoint],
          center: { x: touchPoint.x, y: touchPoint.y },
          preventDefault: () => {},
          target
        };
      } else {
        // Single tap
        this.lastTapTime = now;
        return {
          type: 'tap',
          touches: [touchPoint],
          center: { x: touchPoint.x, y: touchPoint.y },
          preventDefault: () => {},
          target
        };
      }
    }

    return null;
  }

  private processSwipeGesture(touchPoint: TouchPoint, target: HTMLElement): GestureEvent | null {
    const duration = Date.now() - touchPoint.startTime;
    const deltaX = touchPoint.x - touchPoint.startX;
    const deltaY = touchPoint.y - touchPoint.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (duration < this.config.swipe.maxTime && distance > this.config.swipe.minDistance) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      let direction = '';

      // Determine direction
      if (angle >= -45 && angle <= 45) direction = 'right';
      else if (angle > 45 && angle <= 135) direction = 'down';
      else if (angle > 135 || angle <= -135) direction = 'left';
      else direction = 'up';

      if (this.config.swipe.directions.includes(direction as any)) {
        const velocity = {
          x: deltaX / duration,
          y: deltaY / duration
        };

        return {
          type: 'swipe',
          touches: [touchPoint],
          center: { x: touchPoint.x, y: touchPoint.y },
          direction,
          distance,
          velocity,
          preventDefault: () => {},
          target
        };
      }
    }

    return null;
  }

  private processPanGesture(touchPoint: TouchPoint, target: HTMLElement): GestureEvent | null {
    const deltaX = touchPoint.x - touchPoint.startX;
    const deltaY = touchPoint.y - touchPoint.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.config.pan.threshold) {
      return {
        type: 'pan',
        touches: [touchPoint],
        center: { x: touchPoint.x, y: touchPoint.y },
        distance,
        preventDefault: () => {},
        target
      };
    }

    return null;
  }

  private initializePinchGesture(touchPoints: TouchPoint[]): void {
    if (touchPoints.length === 2) {
      const dx = touchPoints[1].x - touchPoints[0].x;
      const dy = touchPoints[1].y - touchPoints[0].y;
      this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      this.initialRotationAngle = Math.atan2(dy, dx);
    }
  }

  private processPinchGesture(touchPoints: TouchPoint[], target: HTMLElement): GestureEvent | null {
    if (touchPoints.length !== 2) return null;

    const dx = touchPoints[1].x - touchPoints[0].x;
    const dy = touchPoints[1].y - touchPoints[0].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scale = distance / this.initialPinchDistance;

    const center = {
      x: (touchPoints[0].x + touchPoints[1].x) / 2,
      y: (touchPoints[0].y + touchPoints[1].y) / 2
    };

    // Check if scale is within bounds
    if (scale >= this.config.pinch.minScale && scale <= this.config.pinch.maxScale) {
      return {
        type: 'pinch',
        touches: touchPoints,
        center,
        scale,
        preventDefault: () => {},
        target
      };
    }

    return null;
  }
}

/**
 * Haptic Feedback Manager
 */
class HapticManager {
  private isSupported: boolean;
  private patterns = {
    light: [10],
    medium: [20],
    heavy: [50],
    tap: [10, 50, 10],
    success: [20, 100, 20],
    error: [50, 100, 50, 100, 50],
    notification: [30, 200, 30]
  };

  constructor() {
    this.isSupported = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  /**
   * Play haptic feedback
   */
  play(pattern: keyof typeof this.patterns | number[]): void {
    if (!this.isSupported) return;

    const vibrationPattern = Array.isArray(pattern) 
      ? pattern 
      : this.patterns[pattern] || this.patterns.light;

    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Play custom pattern
   */
  playCustom(pattern: number[]): void {
    if (!this.isSupported) return;
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Custom haptic feedback failed:', error);
    }
  }
}

/**
 * Touch Area Optimizer
 */
class TouchAreaOptimizer {
  private minimumSize: number;

  constructor(minimumSize = 44) { // 44px is Apple's recommended minimum
    this.minimumSize = minimumSize;
  }

  /**
   * Optimize touch targets
   */
  optimizeTouchTargets(container: HTMLElement): void {
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, [tabindex], [onclick], .touchable'
    );

    interactiveElements.forEach(element => {
      this.optimizeElement(element as HTMLElement);
    });
  }

  /**
   * Optimize individual element
   */
  optimizeElement(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const computedStyle = getComputedStyle(element);

    // Check if element is too small
    if (rect.width < this.minimumSize || rect.height < this.minimumSize) {
      // Add padding to reach minimum size
      const paddingX = Math.max(0, (this.minimumSize - rect.width) / 2);
      const paddingY = Math.max(0, (this.minimumSize - rect.height) / 2);

      element.style.padding = `${paddingY}px ${paddingX}px`;
      element.setAttribute('data-touch-optimized', 'true');
    }

    // Ensure adequate spacing between touch targets
    this.ensureAdequateSpacing(element);

    // Improve touch feedback
    this.addTouchFeedback(element);
  }

  private ensureAdequateSpacing(element: HTMLElement): void {
    const minSpacing = 8; // 8px minimum spacing
    const rect = element.getBoundingClientRect();
    const siblings = Array.from(element.parentElement?.children || [])
      .filter(sibling => sibling !== element && this.isInteractiveElement(sibling as HTMLElement));

    let needsSpacing = false;
    
    siblings.forEach(sibling => {
      const siblingRect = (sibling as HTMLElement).getBoundingClientRect();
      const distance = this.calculateDistance(rect, siblingRect);
      
      if (distance < minSpacing) {
        needsSpacing = true;
      }
    });

    if (needsSpacing) {
      element.style.margin = `${minSpacing / 2}px`;
    }
  }

  private addTouchFeedback(element: HTMLElement): void {
    // Add visual feedback for touch
    element.style.transition = element.style.transition 
      ? `${element.style.transition}, background-color 0.1s ease`
      : 'background-color 0.1s ease';

    // Store original background
    const originalBg = getComputedStyle(element).backgroundColor;
    element.setAttribute('data-original-bg', originalBg);

    // Add touch feedback listeners
    element.addEventListener('touchstart', () => {
      element.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    });

    element.addEventListener('touchend', () => {
      element.style.backgroundColor = originalBg;
    });

    element.addEventListener('touchcancel', () => {
      element.style.backgroundColor = originalBg;
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    const tag = element.tagName.toLowerCase();
    
    return interactiveTags.includes(tag) || 
           element.hasAttribute('tabindex') || 
           element.hasAttribute('onclick') ||
           element.classList.contains('touchable');
  }

  private calculateDistance(rect1: DOMRect, rect2: DOMRect): number {
    const dx = Math.max(0, Math.max(rect1.left - rect2.right, rect2.left - rect1.right));
    const dy = Math.max(0, Math.max(rect1.top - rect2.bottom, rect2.top - rect1.bottom));
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Main Touch Optimization Manager
 */
export class TouchOptimizationManager {
  private static instance: TouchOptimizationManager;
  private config: TouchConfig;
  private gestureConfig: GestureConfig;
  private touchTracker: TouchTracker;
  private gestureRecognizer: GestureRecognizer;
  private hapticManager: HapticManager;
  private touchAreaOptimizer: TouchAreaOptimizer;
  private eventListeners = new Map<HTMLElement, { [key: string]: EventListener }>();
  private gestureCallbacks = new Map<string, Set<(event: GestureEvent) => void>>();

  private constructor() {
    this.config = this.getDefaultTouchConfig();
    this.gestureConfig = this.getDefaultGestureConfig();
    this.touchTracker = new TouchTracker(this.config);
    this.gestureRecognizer = new GestureRecognizer(this.gestureConfig, this.touchTracker);
    this.hapticManager = new HapticManager();
    this.touchAreaOptimizer = new TouchAreaOptimizer(this.config.minimumTouchTarget);
  }

  static getInstance(): TouchOptimizationManager {
    if (!TouchOptimizationManager.instance) {
      TouchOptimizationManager.instance = new TouchOptimizationManager();
    }
    return TouchOptimizationManager.instance;
  }

  /**
   * Initialize touch optimization for an element
   */
  initializeTouch(element: HTMLElement, config?: Partial<TouchConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Optimize touch targets
    this.touchAreaOptimizer.optimizeTouchTargets(element);

    // Prevent default behaviors if configured
    if (this.config.preventScrolling) {
      element.style.touchAction = 'none';
    }

    // Add touch event listeners
    this.addTouchListeners(element);

    // Mark as initialized
    element.setAttribute('data-touch-initialized', 'true');
  }

  /**
   * Enable gesture recognition for an element
   */
  enableGestures(element: HTMLElement, config?: Partial<GestureConfig>): void {
    if (config) {
      this.gestureConfig = { ...this.gestureConfig, ...config };
    }

    // Update gesture recognizer with new config
    this.gestureRecognizer = new GestureRecognizer(this.gestureConfig, this.touchTracker);

    // Mark gestures as enabled
    element.setAttribute('data-gestures-enabled', 'true');
  }

  /**
   * Add gesture event listener
   */
  onGesture(gestureType: string, callback: (event: GestureEvent) => void): void {
    if (!this.gestureCallbacks.has(gestureType)) {
      this.gestureCallbacks.set(gestureType, new Set());
    }
    this.gestureCallbacks.get(gestureType)!.add(callback);
  }

  /**
   * Remove gesture event listener
   */
  offGesture(gestureType: string, callback: (event: GestureEvent) => void): void {
    const callbacks = this.gestureCallbacks.get(gestureType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Play haptic feedback
   */
  playHaptic(pattern: keyof typeof this.hapticManager['patterns'] | number[]): void {
    if (this.config.enableHaptics) {
      this.hapticManager.play(pattern);
    }
  }

  /**
   * Check if device supports haptic feedback
   */
  supportsHaptics(): boolean {
    return this.hapticManager.isHapticSupported();
  }

  /**
   * Update touch configuration
   */
  updateConfig(config: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...config };
    this.touchTracker = new TouchTracker(this.config);
    this.gestureRecognizer = new GestureRecognizer(this.gestureConfig, this.touchTracker);
  }

  /**
   * Remove touch optimization from element
   */
  cleanup(element: HTMLElement): void {
    // Remove event listeners
    const listeners = this.eventListeners.get(element);
    if (listeners) {
      Object.entries(listeners).forEach(([event, listener]) => {
        element.removeEventListener(event, listener);
      });
      this.eventListeners.delete(element);
    }

    // Clear attributes
    element.removeAttribute('data-touch-initialized');
    element.removeAttribute('data-gestures-enabled');
    element.removeAttribute('data-touch-optimized');
  }

  private addTouchListeners(element: HTMLElement): void {
    const listeners: { [key: string]: EventListener } = {
      touchstart: (event: Event) => this.handleTouchStart(event as TouchEvent),
      touchmove: (event: Event) => this.handleTouchMove(event as TouchEvent),
      touchend: (event: Event) => this.handleTouchEnd(event as TouchEvent),
      touchcancel: (event: Event) => this.handleTouchCancel(event as TouchEvent)
    };

    Object.entries(listeners).forEach(([event, listener]) => {
      element.addEventListener(event, listener, { passive: false });
    });

    this.eventListeners.set(element, listeners);
  }

  private handleTouchStart(event: TouchEvent): void {
    const gestureEvent = this.gestureRecognizer.processTouchStart(event, this.config);
    if (gestureEvent) {
      this.emitGesture(gestureEvent);
    }

    // Play light haptic feedback on touch start
    if (this.config.enableHaptics) {
      this.hapticManager.play('light');
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    const gestureEvent = this.gestureRecognizer.processTouchMove(event);
    if (gestureEvent) {
      this.emitGesture(gestureEvent);
    }

    // Prevent scrolling if configured
    if (this.config.preventScrolling) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const gestureEvent = this.gestureRecognizer.processTouchEnd(event, this.config);
    if (gestureEvent) {
      this.emitGesture(gestureEvent);
      
      // Play appropriate haptic feedback
      if (this.config.enableHaptics) {
        switch (gestureEvent.type) {
          case 'tap':
            this.hapticManager.play('light');
            break;
          case 'doubletap':
            this.hapticManager.play('tap');
            break;
          case 'swipe':
            this.hapticManager.play('medium');
            break;
          case 'longpress':
            this.hapticManager.play('heavy');
            break;
        }
      }
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    // Clear all active touches
    Array.from(event.changedTouches).forEach(touch => {
      this.touchTracker.removeTouch(touch.identifier);
    });
  }

  private emitGesture(event: GestureEvent): void {
    const callbacks = this.gestureCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in gesture callback for ${event.type}:`, error);
        }
      });
    }
  }

  private getDefaultTouchConfig(): TouchConfig {
    return {
      enableGestures: true,
      enableHaptics: true,
      touchSensitivity: 1.0,
      preventScrolling: false,
      minimumTouchTarget: 44,
      doubleTapDelay: 300,
      longPressDelay: 500
    };
  }

  private getDefaultGestureConfig(): GestureConfig {
    return {
      swipe: {
        enabled: true,
        minDistance: 30,
        maxTime: 500,
        directions: ['up', 'down', 'left', 'right']
      },
      pinch: {
        enabled: true,
        minScale: 0.5,
        maxScale: 3.0
      },
      rotate: {
        enabled: false,
        minAngle: 15
      },
      pan: {
        enabled: true,
        threshold: 10
      }
    };
  }
}

// Export convenience functions
export const touchOptimization = TouchOptimizationManager.getInstance();

export const initializeTouch = (element: HTMLElement, config?: Partial<TouchConfig>) =>
  touchOptimization.initializeTouch(element, config);

export const enableGestures = (element: HTMLElement, config?: Partial<GestureConfig>) =>
  touchOptimization.enableGestures(element, config);

export const onGesture = (type: string, callback: (event: GestureEvent) => void) =>
  touchOptimization.onGesture(type, callback);

export const playHaptic = (pattern: string | number[]) =>
  touchOptimization.playHaptic(pattern as any);

// Default export
export default TouchOptimizationManager;