/**
 * Advanced Focus Management System
 * Provides comprehensive focus management for complex UI interactions
 */

// Types for focus management
export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  isVisible: boolean;
  isEnabled: boolean;
  priority: number;
  context: string;
  trapId?: string;
}

export interface FocusTrap {
  id: string;
  container: HTMLElement;
  elements: HTMLElement[];
  currentIndex: number;
  isActive: boolean;
  options: FocusTrapOptions;
  cleanup: () => void;
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | 'first' | 'last';
  returnFocus?: HTMLElement | boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  allowOutsideClick?: boolean;
  setReturnFocus?: (element: HTMLElement) => void;
  onActivate?: (trap: FocusTrap) => void;
  onDeactivate?: (trap: FocusTrap) => void;
}

export interface FocusHistory {
  element: HTMLElement;
  timestamp: number;
  context: string;
  reason: 'user' | 'programmatic' | 'modal' | 'route';
}

export interface GameFocusConfig {
  gameId: string;
  focusOrder: string[]; // CSS selectors in tab order
  skipAreas?: string[]; // Areas to skip during game navigation
  customHandlers?: Record<string, (element: HTMLElement) => void>;
}

/**
 * Focus State Manager
 * Tracks and manages focus state across the application
 */
class FocusStateManager {
  private focusHistory: FocusHistory[] = [];
  private currentFocus: HTMLElement | null = null;
  private focusStack: HTMLElement[] = [];
  private maxHistorySize = 50;
  private observers = new Set<(element: HTMLElement | null, previous: HTMLElement | null) => void>();

  /**
   * Start tracking focus changes
   */
  startTracking(): void {
    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Track current focus
    this.updateCurrentFocus(document.activeElement as HTMLElement);
  }

  /**
   * Stop tracking focus changes
   */
  stopTracking(): void {
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Add focus change observer
   */
  addObserver(callback: (element: HTMLElement | null, previous: HTMLElement | null) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Get current focused element
   */
  getCurrentFocus(): HTMLElement | null {
    return this.currentFocus;
  }

  /**
   * Get focus history
   */
  getFocusHistory(): FocusHistory[] {
    return [...this.focusHistory];
  }

  /**
   * Push current focus to stack
   */
  pushFocus(reason: 'modal' | 'route' | 'programmatic' = 'programmatic'): void {
    if (this.currentFocus) {
      this.focusStack.push(this.currentFocus);
      this.addToHistory(this.currentFocus, reason);
    }
  }

  /**
   * Pop focus from stack and restore
   */
  popFocus(): boolean {
    const element = this.focusStack.pop();
    if (element && this.isElementFocusable(element)) {
      this.setFocus(element, 'programmatic');
      return true;
    }
    return false;
  }

  /**
   * Clear focus stack
   */
  clearFocusStack(): void {
    this.focusStack = [];
  }

  /**
   * Set focus programmatically
   */
  setFocus(element: HTMLElement, reason: FocusHistory['reason'] = 'programmatic'): boolean {
    if (!this.isElementFocusable(element)) {
      return false;
    }

    try {
      const previousFocus = this.currentFocus;
      element.focus();
      
      // Verify focus was successful
      if (document.activeElement === element) {
        this.updateCurrentFocus(element);
        this.addToHistory(element, reason);
        this.notifyObservers(element, previousFocus);
        return true;
      }
    } catch (error) {
      console.error('Failed to set focus:', error);
    }

    return false;
  }

  /**
   * Find next focusable element
   */
  findNextFocusable(from?: HTMLElement, container?: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    const currentIndex = from ? elements.indexOf(from) : -1;
    
    for (let i = currentIndex + 1; i < elements.length; i++) {
      if (this.isElementFocusable(elements[i])) {
        return elements[i];
      }
    }
    
    return null;
  }

  /**
   * Find previous focusable element
   */
  findPreviousFocusable(from?: HTMLElement, container?: HTMLElement): HTMLElement | null {
    const elements = this.getFocusableElements(container);
    const currentIndex = from ? elements.indexOf(from) : elements.length;
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (this.isElementFocusable(elements[i])) {
        return elements[i];
      }
    }
    
    return null;
  }

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]:not([aria-disabled="true"])',
      '[role="menuitem"]:not([aria-disabled="true"])',
      '[role="tab"]:not([aria-disabled="true"])'
    ];

    return (Array.from(container.querySelectorAll(selectors.join(','))) as HTMLElement[])
      .filter(element => this.isElementVisible(element))
      .sort(this.compareTabOrder);
  }

  private handleFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (target && target !== this.currentFocus) {
      const previousFocus = this.currentFocus;
      this.updateCurrentFocus(target);
      this.addToHistory(target, 'user');
      this.notifyObservers(target, previousFocus);
    }
  };

  private handleFocusOut = (event: FocusEvent): void => {
    // Handle focus out events if needed
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Track Tab navigation
    if (event.key === 'Tab') {
      const direction = event.shiftKey ? 'backward' : 'forward';
      this.addToHistory(this.currentFocus!, 'user', { direction });
    }
  };

  private updateCurrentFocus(element: HTMLElement | null): void {
    this.currentFocus = element;
  }

  private addToHistory(element: HTMLElement, reason: FocusHistory['reason'], metadata?: any): void {
    this.focusHistory.push({
      element,
      timestamp: Date.now(),
      context: this.getElementContext(element),
      reason
    });

    // Trim history if too large
    if (this.focusHistory.length > this.maxHistorySize) {
      this.focusHistory.shift();
    }
  }

  private notifyObservers(element: HTMLElement | null, previous: HTMLElement | null): void {
    this.observers.forEach(callback => {
      try {
        callback(element, previous);
      } catch (error) {
        console.error('Focus observer error:', error);
      }
    });
  }

  private isElementFocusable(element: HTMLElement): boolean {
    return (
      this.isElementVisible(element) &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-disabled') !== 'true' &&
      element.tabIndex >= 0
    );
  }

  private isElementVisible(element: HTMLElement): boolean {
    if (!element.offsetParent && element !== document.body) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  private getElementContext(element: HTMLElement): string {
    const gameContainer = element.closest('[data-game-id]');
    if (gameContainer) {
      return `game:${gameContainer.getAttribute('data-game-id')}`;
    }

    const modal = element.closest('[role="dialog"]');
    if (modal) {
      return 'modal';
    }

    const nav = element.closest('nav');
    if (nav) {
      return 'navigation';
    }

    return 'main';
  }

  private compareTabOrder = (a: HTMLElement, b: HTMLElement): number => {
    const aIndex = a.tabIndex;
    const bIndex = b.tabIndex;

    // Elements with explicit positive tabIndex come first
    if (aIndex > 0 && bIndex > 0) {
      return aIndex - bIndex;
    }

    // Elements with positive tabIndex come before elements with 0 or -1
    if (aIndex > 0 && bIndex <= 0) {
      return -1;
    }

    if (aIndex <= 0 && bIndex > 0) {
      return 1;
    }

    // For elements with the same tabIndex (0 or -1), use document order
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  };
}

/**
 * Focus Trap Manager
 */
class FocusTrapManager {
  private traps = new Map<string, FocusTrap>();
  private activeTrap: FocusTrap | null = null;
  private trapStack: FocusTrap[] = [];
  private focusStateManager: FocusStateManager;

  constructor(focusStateManager: FocusStateManager) {
    this.focusStateManager = focusStateManager;
  }

  /**
   * Create focus trap
   */
  createTrap(id: string, container: HTMLElement, options: FocusTrapOptions = {}): FocusTrap {
    const elements = this.focusStateManager.getFocusableElements(container);
    
    const trap: FocusTrap = {
      id,
      container,
      elements,
      currentIndex: 0,
      isActive: false,
      options: {
        initialFocus: 'first',
        returnFocus: true,
        escapeDeactivates: true,
        clickOutsideDeactivates: false,
        allowOutsideClick: false,
        ...options
      },
      cleanup: () => this.destroyTrap(id)
    };

    this.traps.set(id, trap);
    this.setupTrapListeners(trap);
    
    return trap;
  }

  /**
   * Activate focus trap
   */
  activateTrap(id: string): boolean {
    const trap = this.traps.get(id);
    if (!trap || trap.isActive) return false;

    // Deactivate current trap but keep it in stack
    if (this.activeTrap && this.activeTrap !== trap) {
      this.trapStack.push(this.activeTrap);
      this.deactivateTrap(this.activeTrap.id, false);
    }

    // Store return focus
    if (trap.options.returnFocus && typeof trap.options.returnFocus !== 'boolean') {
      // Already specified
    } else if (trap.options.returnFocus === true) {
      trap.options.setReturnFocus = () => {
        const current = this.focusStateManager.getCurrentFocus();
        if (current) {
          this.focusStateManager.pushFocus('modal');
        }
      };
    }

    // Activate trap
    trap.isActive = true;
    this.activeTrap = trap;
    
    // Set initial focus
    this.setInitialFocus(trap);
    
    // Call activation callback
    if (trap.options.onActivate) {
      trap.options.onActivate(trap);
    }

    console.log(`Focus trap activated: ${id}`);
    return true;
  }

  /**
   * Deactivate focus trap
   */
  deactivateTrap(id: string, restoreFocus = true): boolean {
    const trap = this.traps.get(id);
    if (!trap || !trap.isActive) return false;

    trap.isActive = false;

    // Restore focus if requested
    if (restoreFocus && trap.options.returnFocus) {
      this.focusStateManager.popFocus();
    }

    // Reactivate previous trap from stack
    if (this.trapStack.length > 0) {
      const previousTrap = this.trapStack.pop()!;
      this.activeTrap = previousTrap;
      previousTrap.isActive = true;
      this.setInitialFocus(previousTrap);
    } else {
      this.activeTrap = null;
    }

    // Call deactivation callback
    if (trap.options.onDeactivate) {
      trap.options.onDeactivate(trap);
    }

    console.log(`Focus trap deactivated: ${id}`);
    return true;
  }

  /**
   * Destroy focus trap
   */
  destroyTrap(id: string): void {
    const trap = this.traps.get(id);
    if (!trap) return;

    if (trap.isActive) {
      this.deactivateTrap(id);
    }

    this.traps.delete(id);
    this.removeTrapListeners(trap);
  }

  /**
   * Get active trap
   */
  getActiveTrap(): FocusTrap | null {
    return this.activeTrap;
  }

  /**
   * Check if focus is trapped
   */
  isFocusTrapped(): boolean {
    return this.activeTrap !== null && this.activeTrap.isActive;
  }

  private setInitialFocus(trap: FocusTrap): void {
    const { initialFocus } = trap.options;
    
    if (!initialFocus || initialFocus === 'first') {
      const firstElement = trap.elements[0];
      if (firstElement) {
        this.focusStateManager.setFocus(firstElement, 'modal');
      }
    } else if (initialFocus === 'last') {
      const lastElement = trap.elements[trap.elements.length - 1];
      if (lastElement) {
        this.focusStateManager.setFocus(lastElement, 'modal');
      }
    } else if (initialFocus instanceof HTMLElement) {
      this.focusStateManager.setFocus(initialFocus, 'modal');
    }
  }

  private setupTrapListeners(trap: FocusTrap): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!trap.isActive) return;

      if (event.key === 'Escape' && trap.options.escapeDeactivates) {
        event.preventDefault();
        this.deactivateTrap(trap.id);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        this.handleTabNavigation(trap, event.shiftKey);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!trap.isActive) return;

      const target = event.target as HTMLElement;
      if (!trap.container.contains(target)) {
        if (trap.options.clickOutsideDeactivates) {
          this.deactivateTrap(trap.id);
        } else if (!trap.options.allowOutsideClick) {
          event.preventDefault();
          // Focus back to trapped area
          const currentFocus = this.focusStateManager.getCurrentFocus();
          if (!currentFocus || !trap.container.contains(currentFocus)) {
            this.setInitialFocus(trap);
          }
        }
      }
    };

    trap.container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick, true);
    
    // Store cleanup references
    trap.cleanup = () => {
      trap.container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick, true);
    };
  }

  private removeTrapListeners(trap: FocusTrap): void {
    if (trap.cleanup) {
      trap.cleanup();
    }
  }

  private handleTabNavigation(trap: FocusTrap, reverse: boolean): void {
    const currentFocus = this.focusStateManager.getCurrentFocus();
    const currentIndex = currentFocus ? trap.elements.indexOf(currentFocus) : -1;
    
    let nextIndex: number;
    
    if (reverse) {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : trap.elements.length - 1;
    } else {
      nextIndex = currentIndex < trap.elements.length - 1 ? currentIndex + 1 : 0;
    }
    
    const nextElement = trap.elements[nextIndex];
    if (nextElement) {
      this.focusStateManager.setFocus(nextElement, 'user');
    }
  }
}

/**
 * Game Focus Manager
 * Specialized focus management for game interactions
 */
class GameFocusManager {
  private gameConfigs = new Map<string, GameFocusConfig>();
  private currentGame: string | null = null;
  private focusStateManager: FocusStateManager;

  constructor(focusStateManager: FocusStateManager) {
    this.focusStateManager = focusStateManager;
  }

  /**
   * Register game focus configuration
   */
  registerGame(config: GameFocusConfig): void {
    this.gameConfigs.set(config.gameId, config);
  }

  /**
   * Activate game focus management
   */
  activateGame(gameId: string, container: HTMLElement): void {
    const config = this.gameConfigs.get(gameId);
    if (!config) {
      console.warn(`No focus config found for game: ${gameId}`);
      return;
    }

    this.currentGame = gameId;
    this.setupGameFocusOrder(container, config);
    
    console.log(`Game focus management activated: ${gameId}`);
  }

  /**
   * Deactivate game focus management
   */
  deactivateGame(): void {
    this.currentGame = null;
  }

  /**
   * Navigate to next game control
   */
  navigateToNext(): boolean {
    if (!this.currentGame) return false;

    const currentFocus = this.focusStateManager.getCurrentFocus();
    const gameContainer = currentFocus?.closest(`[data-game-id="${this.currentGame}"]`);
    
    if (gameContainer) {
      const nextElement = this.focusStateManager.findNextFocusable(currentFocus!, gameContainer as HTMLElement);
      if (nextElement) {
        return this.focusStateManager.setFocus(nextElement, 'user');
      }
    }

    return false;
  }

  /**
   * Navigate to previous game control
   */
  navigateToPrevious(): boolean {
    if (!this.currentGame) return false;

    const currentFocus = this.focusStateManager.getCurrentFocus();
    const gameContainer = currentFocus?.closest(`[data-game-id="${this.currentGame}"]`);
    
    if (gameContainer) {
      const previousElement = this.focusStateManager.findPreviousFocusable(currentFocus!, gameContainer as HTMLElement);
      if (previousElement) {
        return this.focusStateManager.setFocus(previousElement, 'user');
      }
    }

    return false;
  }

  /**
   * Focus specific game control
   */
  focusControl(controlSelector: string): boolean {
    if (!this.currentGame) return false;

    const gameContainer = document.querySelector(`[data-game-id="${this.currentGame}"]`);
    if (!gameContainer) return false;

    const control = gameContainer.querySelector(controlSelector) as HTMLElement;
    if (control) {
      return this.focusStateManager.setFocus(control, 'programmatic');
    }

    return false;
  }

  private setupGameFocusOrder(container: HTMLElement, config: GameFocusConfig): void {
    // Set up custom tab order for game controls
    config.focusOrder.forEach((selector, index) => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => {
        (element as HTMLElement).tabIndex = index + 1;
      });
    });

    // Mark skip areas
    if (config.skipAreas) {
      config.skipAreas.forEach(selector => {
        const elements = container.querySelectorAll(selector);
        elements.forEach(element => {
          (element as HTMLElement).tabIndex = -1;
        });
      });
    }
  }
}

/**
 * Main Focus Management System
 */
export class FocusManager {
  private static instance: FocusManager;
  private stateManager: FocusStateManager;
  private trapManager: FocusTrapManager;
  private gameManager: GameFocusManager;
  private isEnabled = true;

  private constructor() {
    this.stateManager = new FocusStateManager();
    this.trapManager = new FocusTrapManager(this.stateManager);
    this.gameManager = new GameFocusManager(this.stateManager);
  }

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * Initialize focus management
   */
  initialize(): void {
    console.log('Initializing focus management...');
    
    this.stateManager.startTracking();
    this.setupGlobalFocusHandling();
    this.registerDefaultGameConfigs();
    
    console.log('Focus management initialized');
  }

  /**
   * Get focus state manager
   */
  getStateManager(): FocusStateManager {
    return this.stateManager;
  }

  /**
   * Get focus trap manager
   */
  getTrapManager(): FocusTrapManager {
    return this.trapManager;
  }

  /**
   * Get game focus manager
   */
  getGameManager(): GameFocusManager {
    return this.gameManager;
  }

  /**
   * Enable/disable focus management
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.stateManager.startTracking();
    } else {
      this.stateManager.stopTracking();
    }
  }

  /**
   * Check if focus management is enabled
   */
  isFocusManagementEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Create modal focus trap
   */
  createModalTrap(modalElement: HTMLElement, options: Partial<FocusTrapOptions> = {}): FocusTrap {
    const trapId = `modal-${Date.now()}`;
    
    return this.trapManager.createTrap(trapId, modalElement, {
      initialFocus: 'first',
      returnFocus: true,
      escapeDeactivates: true,
      clickOutsideDeactivates: true,
      ...options
    });
  }

  /**
   * Create game focus area
   */
  createGameFocusArea(gameId: string, container: HTMLElement): void {
    this.gameManager.activateGame(gameId, container);
  }

  private setupGlobalFocusHandling(): void {
    // Handle focus restoration on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isEnabled) {
        // Restore focus if needed
        const currentFocus = this.stateManager.getCurrentFocus();
        if (!currentFocus || !document.contains(currentFocus)) {
          // Find appropriate focus target
          const main = document.querySelector('main, [role="main"]') as HTMLElement;
          if (main) {
            const firstFocusable = this.stateManager.getFocusableElements(main)[0];
            if (firstFocusable) {
              this.stateManager.setFocus(firstFocusable, 'programmatic');
            }
          }
        }
      }
    });

    // Handle route changes
    window.addEventListener('popstate', () => {
      if (this.isEnabled) {
        this.stateManager.clearFocusStack();
      }
    });
  }

  private registerDefaultGameConfigs(): void {
    // Mines game focus configuration
    this.gameManager.registerGame({
      gameId: 'mines',
      focusOrder: [
        '.bet-input',
        '.mines-count-input',
        '.start-game-button',
        '.mines-grid .mine-tile',
        '.cash-out-button'
      ],
      skipAreas: ['.game-stats', '.game-history'],
      customHandlers: {
        'reveal-tile': (element) => {
          // Custom logic for tile reveal focus
          element.classList.add('focused');
        }
      }
    });

    // Crash game focus configuration
    this.gameManager.registerGame({
      gameId: 'crash',
      focusOrder: [
        '.bet-input',
        '.auto-cashout-input',
        '.place-bet-button',
        '.cash-out-button'
      ],
      skipAreas: ['.crash-chart', '.crash-history']
    });

    // Add other game configurations as needed
  }
}

// Export convenience functions
export const focusManager = FocusManager.getInstance();

export const initializeFocusManagement = () => focusManager.initialize();

export const createFocusTrap = (container: HTMLElement, options?: FocusTrapOptions) =>
  focusManager.createModalTrap(container, options);

export const setFocus = (element: HTMLElement) =>
  focusManager.getStateManager().setFocus(element);

export const getCurrentFocus = () =>
  focusManager.getStateManager().getCurrentFocus();

export const getFocusableElements = (container?: HTMLElement) =>
  focusManager.getStateManager().getFocusableElements(container);

// Default export
export default FocusManager;