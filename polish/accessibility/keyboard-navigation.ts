/**
 * Keyboard Navigation System
 * Provides comprehensive keyboard navigation support for all platform interactions
 */

// Types for keyboard navigation
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  context?: string;
  preventDefault?: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  priority: number;
  context: string;
  skipReason?: string;
}

export interface NavigationContext {
  name: string;
  elements: HTMLElement[];
  currentIndex: number;
  wrap: boolean;
  orientation: 'horizontal' | 'vertical' | 'both';
}

export interface GameNavigationConfig {
  gameId: string;
  controls: Record<string, string[]>; // control name -> key combinations
  customHandlers: Record<string, (event: KeyboardEvent) => void>;
}

/**
 * Focus Manager
 * Manages focus tracking and restoration
 */
class FocusManager {
  private focusStack: HTMLElement[] = [];
  private lastFocusedElement: HTMLElement | null = null;
  private focusableSelectors = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[role="option"]'
  ];

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const elements = Array.from(
      container.querySelectorAll(this.focusableSelectors.join(','))
    ) as HTMLElement[];

    return elements.filter(element => {
      return this.isVisible(element) && !this.isDisabled(element);
    });
  }

  /**
   * Get prioritized focusable elements
   */
  getPrioritizedElements(container: HTMLElement): FocusableElement[] {
    const elements = this.getFocusableElements(container);
    
    return elements.map(element => ({
      element,
      priority: this.getFocusPriority(element),
      context: this.getElementContext(element)
    })).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Focus element safely
   */
  focusElement(element: HTMLElement): boolean {
    if (!element || !this.canReceiveFocus(element)) {
      return false;
    }

    try {
      this.lastFocusedElement = document.activeElement as HTMLElement;
      element.focus();
      
      // Scroll into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });

      return document.activeElement === element;
    } catch (error) {
      console.error('Failed to focus element:', error);
      return false;
    }
  }

  /**
   * Push current focus to stack
   */
  pushFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  /**
   * Restore focus from stack
   */
  popFocus(): boolean {
    const element = this.focusStack.pop();
    if (element) {
      return this.focusElement(element);
    }
    return false;
  }

  /**
   * Get last focused element
   */
  getLastFocused(): HTMLElement | null {
    return this.lastFocusedElement;
  }

  /**
   * Create focus trap within container
   */
  createFocusTrap(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          this.focusElement(lastElement);
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          this.focusElement(firstElement);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstElement) {
      this.focusElement(firstElement);
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  private isDisabled(element: HTMLElement): boolean {
    return (
      element.hasAttribute('disabled') ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('tabindex') === '-1'
    );
  }

  private canReceiveFocus(element: HTMLElement): boolean {
    return this.isVisible(element) && !this.isDisabled(element);
  }

  private getFocusPriority(element: HTMLElement): number {
    // Higher priority for interactive elements
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    if (tagName === 'button' || role === 'button') return 10;
    if (tagName === 'a' && element.hasAttribute('href')) return 9;
    if (tagName === 'input') return 8;
    if (tagName === 'select') return 7;
    if (tagName === 'textarea') return 6;
    if (element.hasAttribute('tabindex')) {
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
      return tabIndex > 0 ? tabIndex : 5;
    }
    
    return 1;
  }

  private getElementContext(element: HTMLElement): string {
    const closest = element.closest('[data-context], [role], section, nav, main, aside');
    return closest?.getAttribute('data-context') || 
           closest?.getAttribute('role') || 
           closest?.tagName.toLowerCase() || 
           'general';
  }
}

/**
 * Keyboard Shortcut Manager
 */
class ShortcutManager {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private contexts = new Set<string>();
  private currentContext = 'global';
  private enabled = true;

  /**
   * Register keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
    
    if (shortcut.context) {
      this.contexts.add(shortcut.context);
    }
  }

  /**
   * Unregister keyboard shortcut
   */
  unregister(key: string, context?: string): void {
    const shortcutKey = context ? `${context}:${key}` : key;
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Set current context
   */
  setContext(context: string): void {
    this.currentContext = context;
  }

  /**
   * Get current context
   */
  getContext(): string {
    return this.currentContext;
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Handle keyboard event
   */
  handleKeyEvent(event: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    const shortcuts = this.getMatchingShortcuts(event);
    
    for (const shortcut of shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        
        try {
          shortcut.action();
          return true;
        } catch (error) {
          console.error('Error executing shortcut:', error);
        }
      }
    }

    return false;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(context?: string): KeyboardShortcut[] {
    const shortcuts = Array.from(this.shortcuts.values());
    
    if (context) {
      return shortcuts.filter(s => s.context === context || !s.context);
    }
    
    return shortcuts;
  }

  /**
   * Get shortcut help text
   */
  getHelpText(context?: string): string {
    const shortcuts = this.getShortcuts(context);
    
    return shortcuts
      .map(s => `${this.formatShortcut(s)}: ${s.description}`)
      .join('\n');
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.metaKey) parts.push('meta');
    
    parts.push(shortcut.key.toLowerCase());
    
    const key = parts.join('+');
    return shortcut.context ? `${shortcut.context}:${key}` : key;
  }

  private getMatchingShortcuts(event: KeyboardEvent): KeyboardShortcut[] {
    const shortcuts = [];
    
    // Get context-specific shortcuts
    const contextKey = `${this.currentContext}:${this.getEventKey(event)}`;
    const contextShortcut = this.shortcuts.get(contextKey);
    if (contextShortcut) {
      shortcuts.push(contextShortcut);
    }
    
    // Get global shortcuts
    const globalKey = this.getEventKey(event);
    const globalShortcut = this.shortcuts.get(globalKey);
    if (globalShortcut) {
      shortcuts.push(globalShortcut);
    }
    
    return shortcuts;
  }

  private getEventKey(event: KeyboardEvent): string {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  private formatShortcut(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.metaKey) parts.push('Cmd');
    
    parts.push(shortcut.key);
    
    return parts.join('+');
  }
}

/**
 * Arrow Key Navigation Manager
 */
class ArrowNavigationManager {
  private contexts = new Map<string, NavigationContext>();
  private currentContext: string | null = null;

  /**
   * Create navigation context
   */
  createContext(name: string, container: HTMLElement, orientation: 'horizontal' | 'vertical' | 'both' = 'both'): void {
    const focusManager = new FocusManager();
    const elements = focusManager.getFocusableElements(container);
    
    this.contexts.set(name, {
      name,
      elements,
      currentIndex: 0,
      wrap: true,
      orientation
    });
  }

  /**
   * Activate navigation context
   */
  activateContext(name: string): boolean {
    const context = this.contexts.get(name);
    if (!context) return false;

    this.currentContext = name;
    
    // Focus first element if none is focused
    const activeElement = document.activeElement;
    if (!context.elements.includes(activeElement as HTMLElement)) {
      const focusManager = new FocusManager();
      focusManager.focusElement(context.elements[0]);
      context.currentIndex = 0;
    } else {
      context.currentIndex = context.elements.indexOf(activeElement as HTMLElement);
    }

    return true;
  }

  /**
   * Deactivate current context
   */
  deactivateContext(): void {
    this.currentContext = null;
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowKey(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): boolean {
    if (!this.currentContext) return false;

    const context = this.contexts.get(this.currentContext);
    if (!context) return false;

    const direction = this.getDirection(key, context.orientation);
    if (!direction) return false;

    return this.navigateInDirection(context, direction);
  }

  /**
   * Update context elements
   */
  updateContext(name: string, container: HTMLElement): void {
    const context = this.contexts.get(name);
    if (!context) return;

    const focusManager = new FocusManager();
    context.elements = focusManager.getFocusableElements(container);
    context.currentIndex = 0;
  }

  /**
   * Remove navigation context
   */
  removeContext(name: string): void {
    this.contexts.delete(name);
    if (this.currentContext === name) {
      this.currentContext = null;
    }
  }

  private getDirection(key: string, orientation: string): 'next' | 'prev' | null {
    switch (key) {
      case 'ArrowRight':
        return orientation === 'vertical' ? null : 'next';
      case 'ArrowLeft':
        return orientation === 'vertical' ? null : 'prev';
      case 'ArrowDown':
        return orientation === 'horizontal' ? null : 'next';
      case 'ArrowUp':
        return orientation === 'horizontal' ? null : 'prev';
      default:
        return null;
    }
  }

  private navigateInDirection(context: NavigationContext, direction: 'next' | 'prev'): boolean {
    const { elements, currentIndex, wrap } = context;
    let newIndex;

    if (direction === 'next') {
      newIndex = currentIndex + 1;
      if (newIndex >= elements.length) {
        newIndex = wrap ? 0 : elements.length - 1;
      }
    } else {
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = wrap ? elements.length - 1 : 0;
      }
    }

    const targetElement = elements[newIndex];
    if (targetElement) {
      const focusManager = new FocusManager();
      if (focusManager.focusElement(targetElement)) {
        context.currentIndex = newIndex;
        return true;
      }
    }

    return false;
  }
}

/**
 * Game Keyboard Navigation Manager
 */
class GameKeyboardManager {
  private gameConfigs = new Map<string, GameNavigationConfig>();
  private shortcutManager: ShortcutManager;
  private currentGame: string | null = null;

  constructor(shortcutManager: ShortcutManager) {
    this.shortcutManager = shortcutManager;
  }

  /**
   * Register game navigation
   */
  registerGame(config: GameNavigationConfig): void {
    this.gameConfigs.set(config.gameId, config);
    
    // Register game-specific shortcuts
    Object.entries(config.controls).forEach(([control, keys]) => {
      keys.forEach(key => {
        this.shortcutManager.register({
          key,
          context: config.gameId,
          description: `${control} in ${config.gameId}`,
          action: () => this.executeGameAction(config.gameId, control),
          preventDefault: true
        });
      });
    });
  }

  /**
   * Activate game navigation
   */
  activateGame(gameId: string): void {
    this.currentGame = gameId;
    this.shortcutManager.setContext(gameId);
  }

  /**
   * Deactivate game navigation
   */
  deactivateGame(): void {
    this.currentGame = null;
    this.shortcutManager.setContext('global');
  }

  /**
   * Execute game action
   */
  executeGameAction(gameId: string, action: string): void {
    const config = this.gameConfigs.get(gameId);
    if (!config) return;

    const handler = config.customHandlers[action];
    if (handler) {
      handler(new KeyboardEvent('keydown'));
      return;
    }

    // Default actions
    const element = document.querySelector(`[data-game-action="${action}"]`) as HTMLElement;
    if (element) {
      element.click();
    }
  }

  /**
   * Get game shortcuts help
   */
  getGameHelp(gameId: string): string {
    const config = this.gameConfigs.get(gameId);
    if (!config) return '';

    const shortcuts = Object.entries(config.controls)
      .map(([control, keys]) => `${keys.join(' or ')}: ${control}`)
      .join('\n');

    return `${gameId} shortcuts:\n${shortcuts}`;
  }
}

/**
 * Main Keyboard Navigation Manager
 */
export class KeyboardNavigationManager {
  private static instance: KeyboardNavigationManager;
  private focusManager: FocusManager;
  private shortcutManager: ShortcutManager;
  private arrowNavManager: ArrowNavigationManager;
  private gameManager: GameKeyboardManager;
  private isEnabled = true;

  private constructor() {
    this.focusManager = new FocusManager();
    this.shortcutManager = new ShortcutManager();
    this.arrowNavManager = new ArrowNavigationManager();
    this.gameManager = new GameKeyboardManager(this.shortcutManager);
  }

  static getInstance(): KeyboardNavigationManager {
    if (!KeyboardNavigationManager.instance) {
      KeyboardNavigationManager.instance = new KeyboardNavigationManager();
    }
    return KeyboardNavigationManager.instance;
  }

  /**
   * Initialize keyboard navigation
   */
  initialize(): void {
    console.log('Initializing keyboard navigation...');
    
    // Setup global keyboard event handlers
    this.setupGlobalHandlers();
    
    // Register default shortcuts
    this.registerDefaultShortcuts();
    
    // Setup game navigation configs
    this.setupGameConfigs();
    
    console.log('Keyboard navigation initialized');
  }

  /**
   * Get focus manager
   */
  getFocusManager(): FocusManager {
    return this.focusManager;
  }

  /**
   * Get shortcut manager
   */
  getShortcutManager(): ShortcutManager {
    return this.shortcutManager;
  }

  /**
   * Get arrow navigation manager
   */
  getArrowNavigationManager(): ArrowNavigationManager {
    return this.arrowNavManager;
  }

  /**
   * Get game keyboard manager
   */
  getGameManager(): GameKeyboardManager {
    return this.gameManager;
  }

  /**
   * Enable/disable keyboard navigation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.shortcutManager.setEnabled(enabled);
  }

  /**
   * Check if keyboard navigation is enabled
   */
  isKeyboardNavigationEnabled(): boolean {
    return this.isEnabled;
  }

  private setupGlobalHandlers(): void {
    // Main keyboard event handler
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled) return;

      // Handle shortcuts first
      if (this.shortcutManager.handleKeyEvent(event)) {
        return;
      }

      // Handle arrow key navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        if (this.arrowNavManager.handleArrowKey(event.key as any)) {
          event.preventDefault();
          return;
        }
      }

      // Handle Escape key
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
    });

    // Focus tracking
    document.addEventListener('focusin', (event) => {
      if (!this.isEnabled) return;
      
      const target = event.target as HTMLElement;
      this.updateFocusContext(target);
    });
  }

  private registerDefaultShortcuts(): void {
    // Global navigation shortcuts
    this.shortcutManager.register({
      key: 'h',
      altKey: true,
      description: 'Go to home page',
      action: () => window.location.href = '/'
    });

    this.shortcutManager.register({
      key: 'g',
      altKey: true,
      description: 'Go to games lobby',
      action: () => window.location.href = '/games'
    });

    // Skip to main content
    this.shortcutManager.register({
      key: 'm',
      altKey: true,
      description: 'Skip to main content',
      action: () => {
        const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement;
        if (main) {
          this.focusManager.focusElement(main);
        }
      }
    });

    // Help shortcut
    this.shortcutManager.register({
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts help',
      action: () => this.showKeyboardHelp()
    });
  }

  private setupGameConfigs(): void {
    // Mines game
    this.gameManager.registerGame({
      gameId: 'mines',
      controls: {
        'bet-increase': ['=', '+'],
        'bet-decrease': ['-', '_'],
        'start-game': ['space', 'enter'],
        'cash-out': ['c']
      },
      customHandlers: {
        'start-game': () => this.triggerGameAction('start-game'),
        'cash-out': () => this.triggerGameAction('cash-out')
      }
    });

    // Crash game
    this.gameManager.registerGame({
      gameId: 'crash',
      controls: {
        'bet-increase': ['=', '+'],
        'bet-decrease': ['-', '_'],
        'place-bet': ['space'],
        'cash-out': ['enter', 'c'],
        'auto-cash-out': ['a']
      },
      customHandlers: {
        'cash-out': () => this.triggerGameAction('cash-out')
      }
    });
  }

  private handleEscapeKey(): void {
    // Close modals first
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], .close-button') as HTMLElement;
      if (closeButton) {
        closeButton.click();
        return;
      }
    }

    // Restore focus
    this.focusManager.popFocus();
  }

  private updateFocusContext(element: HTMLElement): void {
    // Determine context from focused element
    const gameContainer = element.closest('[data-game-id]');
    if (gameContainer) {
      const gameId = gameContainer.getAttribute('data-game-id');
      if (gameId) {
        this.gameManager.activateGame(gameId);
        return;
      }
    }

    // Check for other contexts
    const nav = element.closest('nav');
    if (nav) {
      this.shortcutManager.setContext('navigation');
      return;
    }

    const form = element.closest('form');
    if (form) {
      this.shortcutManager.setContext('form');
      return;
    }

    // Default to global context
    this.shortcutManager.setContext('global');
  }

  private triggerGameAction(action: string): void {
    const button = document.querySelector(`[data-action="${action}"], .${action}-button`) as HTMLElement;
    if (button && !button.hasAttribute('disabled')) {
      button.click();
    }
  }

  private showKeyboardHelp(): void {
    const context = this.shortcutManager.getContext();
    const helpText = this.shortcutManager.getHelpText(context);
    
    // Create help modal or use existing one
    let helpModal = document.getElementById('keyboard-help-modal');
    if (!helpModal) {
      helpModal = this.createHelpModal();
      document.body.appendChild(helpModal);
    }

    const helpContent = helpModal.querySelector('.help-content');
    if (helpContent) {
      helpContent.textContent = helpText;
    }

    // Show modal
    helpModal.removeAttribute('aria-hidden');
    helpModal.style.display = 'flex';
    
    // Focus first element in modal
    const firstFocusable = this.focusManager.getFocusableElements(helpModal)[0];
    if (firstFocusable) {
      this.focusManager.focusElement(firstFocusable);
    }

    // Create focus trap
    const removeTrap = this.focusManager.createFocusTrap(helpModal);

    // Close handler
    const closeHandler = () => {
      helpModal!.setAttribute('aria-hidden', 'true');
      helpModal!.style.display = 'none';
      removeTrap();
      this.focusManager.popFocus();
    };

    // Close on Escape or click outside
    const closeButton = helpModal.querySelector('.close-button') as HTMLElement;
    if (closeButton) {
      closeButton.onclick = closeHandler;
    }

    helpModal.onkeydown = (event) => {
      if (event.key === 'Escape') {
        closeHandler();
      }
    };
  }

  private createHelpModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'keyboard-help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'help-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      ">
        <h2 id="help-title">Keyboard Shortcuts</h2>
        <pre class="help-content" style="white-space: pre-wrap; font-family: monospace;"></pre>
        <button class="close-button" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        " aria-label="Close help dialog">×</button>
      </div>
    `;

    return modal;
  }
}

// Export convenience functions
export const keyboardNav = KeyboardNavigationManager.getInstance();

export const initializeKeyboardNavigation = () => keyboardNav.initialize();

export const registerShortcut = (shortcut: KeyboardShortcut) =>
  keyboardNav.getShortcutManager().register(shortcut);

export const createFocusTrap = (container: HTMLElement) =>
  keyboardNav.getFocusManager().createFocusTrap(container);

export const focusElement = (element: HTMLElement) =>
  keyboardNav.getFocusManager().focusElement(element);

// Default export
export default KeyboardNavigationManager;