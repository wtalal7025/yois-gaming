/**
 * Screen Reader Support and Accessibility Enhancement System
 * Provides comprehensive screen reader support and ARIA enhancements
 */

// Types for screen reader functionality
export interface ARIAAttributes {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  hidden?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
  disabled?: boolean;
  invalid?: boolean | 'grammar' | 'spelling';
  required?: boolean;
  readonly?: boolean;
  multiline?: boolean;
  autocomplete?: string;
  haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  role?: string;
  tabIndex?: number;
}

export interface ScreenReaderAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  delay?: number;
  clear?: boolean;
}

export interface GameStateAnnouncement {
  gameId: string;
  action: string;
  result?: string;
  balance?: number;
  winAmount?: number;
}

export interface NavigationAnnouncement {
  from: string;
  to: string;
  context?: string;
}

/**
 * ARIA Label Manager
 * Manages dynamic ARIA labels and descriptions
 */
class ARIAManager {
  private labelMap = new Map<string, string>();
  private descriptionMap = new Map<string, string>();
  private liveRegions = new Map<string, HTMLElement>();

  /**
   * Set ARIA attributes on element
   */
  setAttributes(element: HTMLElement, attributes: ARIAAttributes): void {
    if (attributes.label) {
      element.setAttribute('aria-label', attributes.label);
    }
    
    if (attributes.labelledBy) {
      element.setAttribute('aria-labelledby', attributes.labelledBy);
    }
    
    if (attributes.describedBy) {
      element.setAttribute('aria-describedby', attributes.describedBy);
    }
    
    if (attributes.expanded !== undefined) {
      element.setAttribute('aria-expanded', attributes.expanded.toString());
    }
    
    if (attributes.hidden !== undefined) {
      element.setAttribute('aria-hidden', attributes.hidden.toString());
    }
    
    if (attributes.live) {
      element.setAttribute('aria-live', attributes.live);
    }
    
    if (attributes.atomic !== undefined) {
      element.setAttribute('aria-atomic', attributes.atomic.toString());
    }
    
    if (attributes.relevant) {
      element.setAttribute('aria-relevant', attributes.relevant);
    }
    
    if (attributes.busy !== undefined) {
      element.setAttribute('aria-busy', attributes.busy.toString());
    }
    
    if (attributes.disabled !== undefined) {
      element.setAttribute('aria-disabled', attributes.disabled.toString());
    }
    
    if (attributes.invalid !== undefined) {
      element.setAttribute('aria-invalid', attributes.invalid.toString());
    }
    
    if (attributes.required !== undefined) {
      element.setAttribute('aria-required', attributes.required.toString());
    }
    
    if (attributes.readonly !== undefined) {
      element.setAttribute('aria-readonly', attributes.readonly.toString());
    }
    
    if (attributes.multiline !== undefined) {
      element.setAttribute('aria-multiline', attributes.multiline.toString());
    }
    
    if (attributes.autocomplete) {
      element.setAttribute('aria-autocomplete', attributes.autocomplete);
    }
    
    if (attributes.haspopup !== undefined) {
      element.setAttribute('aria-haspopup', attributes.haspopup.toString());
    }
    
    if (attributes.role) {
      element.setAttribute('role', attributes.role);
    }
    
    if (attributes.tabIndex !== undefined) {
      element.tabIndex = attributes.tabIndex;
    }
  }

  /**
   * Create live region for announcements
   */
  createLiveRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    let region = this.liveRegions.get(id);
    
    if (!region) {
      region = document.createElement('div');
      region.id = `aria-live-${id}`;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      
      document.body.appendChild(region);
      this.liveRegions.set(id, region);
    }
    
    return region;
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite', delay = 0): void {
    const regionId = priority === 'assertive' ? 'urgent' : 'general';
    const region = this.createLiveRegion(regionId, priority);
    
    if (delay > 0) {
      setTimeout(() => {
        region.textContent = message;
      }, delay);
    } else {
      region.textContent = message;
    }
    
    // Clear after a reasonable time to prevent stale content
    setTimeout(() => {
      if (region.textContent === message) {
        region.textContent = '';
      }
    }, 5000);
  }

  /**
   * Set label for element
   */
  setLabel(elementId: string, label: string): void {
    this.labelMap.set(elementId, label);
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute('aria-label', label);
    }
  }

  /**
   * Set description for element
   */
  setDescription(elementId: string, description: string): void {
    this.descriptionMap.set(elementId, description);
    
    // Create or update description element
    let descElement = document.getElementById(`${elementId}-desc`);
    if (!descElement) {
      descElement = document.createElement('div');
      descElement.id = `${elementId}-desc`;
      descElement.className = 'sr-only';
      document.body.appendChild(descElement);
    }
    
    descElement.textContent = description;
    
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute('aria-describedby', `${elementId}-desc`);
    }
  }

  /**
   * Clear live regions
   */
  clearLiveRegions(): void {
    this.liveRegions.forEach(region => {
      region.textContent = '';
    });
  }

  /**
   * Remove ARIA attributes
   */
  removeAttributes(element: HTMLElement): void {
    const ariaAttributes = [
      'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
      'aria-hidden', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-busy',
      'aria-disabled', 'aria-invalid', 'aria-required', 'aria-readonly',
      'aria-multiline', 'aria-autocomplete', 'aria-haspopup', 'role'
    ];
    
    ariaAttributes.forEach(attr => {
      element.removeAttribute(attr);
    });
  }
}

/**
 * Game Accessibility Manager
 * Provides screen reader support for gaming interactions
 */
class GameAccessibilityManager {
  private ariaManager: ARIAManager;
  private gameStates = new Map<string, any>();

  constructor(ariaManager: ARIAManager) {
    this.ariaManager = ariaManager;
  }

  /**
   * Announce game action
   */
  announceGameAction(announcement: GameStateAnnouncement): void {
    const { gameId, action, result, balance, winAmount } = announcement;
    
    let message = `${this.getGameDisplayName(gameId)}: ${action}`;
    
    if (result) {
      message += `. ${result}`;
    }
    
    if (winAmount && winAmount > 0) {
      message += `. You won ${this.formatCurrency(winAmount)}`;
    }
    
    if (balance !== undefined) {
      message += `. Your balance is now ${this.formatCurrency(balance)}`;
    }
    
    this.ariaManager.announce(message, 'assertive');
  }

  /**
   * Announce mine/tile reveal
   */
  announceTileReveal(gameId: string, position: string, result: 'safe' | 'mine' | 'multiplier', value?: number): void {
    const gameName = this.getGameDisplayName(gameId);
    let message = `${gameName}: ${position} revealed`;
    
    if (result === 'safe') {
      message += ', safe tile';
    } else if (result === 'mine') {
      message += ', mine hit! Game over';
    } else if (result === 'multiplier' && value) {
      message += `, multiplier ${value}x`;
    }
    
    this.ariaManager.announce(message, 'assertive');
  }

  /**
   * Announce slot machine result
   */
  announceSlotResult(symbols: string[], paylines: number, winAmount: number): void {
    let message = `Slot result: ${symbols.join(', ')}`;
    
    if (winAmount > 0) {
      message += `. ${paylines} winning paylines. Won ${this.formatCurrency(winAmount)}`;
    } else {
      message += '. No winning combinations';
    }
    
    this.ariaManager.announce(message, 'assertive');
  }

  /**
   * Announce crash game multiplier
   */
  announceCrashMultiplier(multiplier: number, action: 'update' | 'cashout' | 'crash'): void {
    let message = '';
    
    if (action === 'update') {
      message = `Multiplier now ${multiplier.toFixed(2)}x`;
    } else if (action === 'cashout') {
      message = `Cashed out at ${multiplier.toFixed(2)}x`;
    } else if (action === 'crash') {
      message = `Crashed at ${multiplier.toFixed(2)}x`;
    }
    
    const priority = action === 'update' ? 'polite' : 'assertive';
    this.ariaManager.announce(message, priority);
  }

  /**
   * Set up game controls accessibility
   */
  setupGameControls(gameId: string, controls: Record<string, HTMLElement>): void {
    const gameLabels = this.getGameControlLabels(gameId);
    
    Object.entries(controls).forEach(([controlType, element]) => {
      const label = gameLabels[controlType] || this.getDefaultControlLabel(controlType);
      
      this.ariaManager.setAttributes(element, {
        label,
        role: this.getControlRole(controlType),
        describedBy: `${gameId}-${controlType}-help`
      });
      
      // Create help text
      this.createControlHelp(gameId, controlType, element);
    });
  }

  /**
   * Update game status
   */
  updateGameStatus(gameId: string, status: string, details?: Record<string, any>): void {
    this.gameStates.set(gameId, { status, details, timestamp: Date.now() });
    
    const statusElement = document.getElementById(`${gameId}-status`);
    if (statusElement) {
      let statusText = `Game status: ${status}`;
      
      if (details) {
        const detailsText = Object.entries(details)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        statusText += `. ${detailsText}`;
      }
      
      statusElement.textContent = statusText;
      this.ariaManager.setAttributes(statusElement, {
        live: 'polite',
        atomic: true
      });
    }
  }

  private getGameDisplayName(gameId: string): string {
    const gameNames: Record<string, string> = {
      'mines': 'Mines',
      'crash': 'Crash',
      'limbo': 'Limbo',
      'dragon-tower': 'Dragon Tower',
      'sugar-rush': 'Sugar Rush',
      'bars': 'Bars'
    };
    return gameNames[gameId] || gameId;
  }

  private getGameControlLabels(gameId: string): Record<string, string> {
    const commonLabels = {
      bet: 'Bet amount',
      start: 'Start game',
      stop: 'Stop game',
      cashout: 'Cash out',
      reveal: 'Reveal tile',
      spin: 'Spin reels'
    };

    const gameSpecificLabels: Record<string, Record<string, string>> = {
      'mines': {
        ...commonLabels,
        mines: 'Number of mines',
        reveal: 'Reveal tile'
      },
      'crash': {
        ...commonLabels,
        auto: 'Auto cash out',
        multiplier: 'Target multiplier'
      }
    };

    return gameSpecificLabels[gameId] || commonLabels;
  }

  private getDefaultControlLabel(controlType: string): string {
    const labels: Record<string, string> = {
      bet: 'Bet amount',
      start: 'Start',
      stop: 'Stop',
      cashout: 'Cash out',
      reveal: 'Reveal',
      spin: 'Spin'
    };
    return labels[controlType] || controlType;
  }

  private getControlRole(controlType: string): string {
    const roles: Record<string, string> = {
      bet: 'spinbutton',
      start: 'button',
      stop: 'button',
      cashout: 'button',
      reveal: 'button',
      spin: 'button'
    };
    return roles[controlType] || 'button';
  }

  private createControlHelp(gameId: string, controlType: string, element: HTMLElement): void {
    const helpId = `${gameId}-${controlType}-help`;
    let helpElement = document.getElementById(helpId);
    
    if (!helpElement) {
      helpElement = document.createElement('div');
      helpElement.id = helpId;
      helpElement.className = 'sr-only';
      document.body.appendChild(helpElement);
    }
    
    const helpText = this.getControlHelpText(gameId, controlType);
    helpElement.textContent = helpText;
  }

  private getControlHelpText(gameId: string, controlType: string): string {
    const helpTexts: Record<string, Record<string, string>> = {
      'mines': {
        bet: 'Enter your bet amount using number keys or arrow keys',
        mines: 'Select number of mines from 1 to 24',
        reveal: 'Click to reveal this tile. Avoid mines to win'
      },
      'crash': {
        bet: 'Enter your bet amount',
        auto: 'Set automatic cash out multiplier',
        cashout: 'Cash out now to secure your winnings'
      }
    };
    
    const gameHelp = helpTexts[gameId] || {};
    return gameHelp[controlType] || `${controlType} control`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }
}

/**
 * Navigation Accessibility Manager
 * Handles screen reader announcements for navigation changes
 */
class NavigationAccessibilityManager {
  private ariaManager: ARIAManager;
  private currentPage = '';
  private breadcrumbTrail: string[] = [];

  constructor(ariaManager: ARIAManager) {
    this.ariaManager = ariaManager;
  }

  /**
   * Announce page navigation
   */
  announceNavigation(announcement: NavigationAnnouncement): void {
    const { from, to, context } = announcement;
    
    let message = `Navigated to ${to}`;
    
    if (context) {
      message += ` in ${context}`;
    }
    
    if (from && from !== to) {
      message += ` from ${from}`;
    }
    
    this.ariaManager.announce(message, 'polite');
    this.currentPage = to;
  }

  /**
   * Update breadcrumb trail
   */
  updateBreadcrumb(trail: string[]): void {
    this.breadcrumbTrail = [...trail];
    
    const breadcrumbElement = document.querySelector('[aria-label="Breadcrumb"]') as HTMLElement;
    if (breadcrumbElement) {
      const trailText = `You are here: ${trail.join(' > ')}`;
      this.ariaManager.setAttributes(breadcrumbElement, {
        label: trailText
      });
    }
  }

  /**
   * Announce modal open/close
   */
  announceModal(action: 'open' | 'close', title: string): void {
    const message = action === 'open' 
      ? `${title} dialog opened` 
      : `${title} dialog closed`;
    
    this.ariaManager.announce(message, 'assertive');
  }

  /**
   * Announce loading state
   */
  announceLoading(isLoading: boolean, context?: string): void {
    const message = isLoading 
      ? `Loading${context ? ` ${context}` : ''}...` 
      : `Loading complete${context ? ` for ${context}` : ''}`;
    
    this.ariaManager.announce(message, 'polite');
  }
}

/**
 * Main Screen Reader Manager
 */
export class ScreenReaderManager {
  private static instance: ScreenReaderManager;
  private ariaManager: ARIAManager;
  private gameAccessibility: GameAccessibilityManager;
  private navigationAccessibility: NavigationAccessibilityManager;
  private isEnabled = true;

  private constructor() {
    this.ariaManager = new ARIAManager();
    this.gameAccessibility = new GameAccessibilityManager(this.ariaManager);
    this.navigationAccessibility = new NavigationAccessibilityManager(this.ariaManager);
  }

  static getInstance(): ScreenReaderManager {
    if (!ScreenReaderManager.instance) {
      ScreenReaderManager.instance = new ScreenReaderManager();
    }
    return ScreenReaderManager.instance;
  }

  /**
   * Initialize screen reader support
   */
  initialize(): void {
    console.log('Initializing screen reader support...');
    
    // Check for screen reader
    this.detectScreenReader();
    
    // Setup global ARIA landmarks
    this.setupLandmarks();
    
    // Setup skip links
    this.setupSkipLinks();
    
    // Setup focus management
    this.setupFocusManagement();
    
    // Setup keyboard navigation announcements
    this.setupKeyboardAnnouncements();
    
    console.log('Screen reader support initialized');
  }

  /**
   * Get ARIA manager
   */
  getARIA(): ARIAManager {
    return this.ariaManager;
  }

  /**
   * Get game accessibility manager
   */
  getGameAccessibility(): GameAccessibilityManager {
    return this.gameAccessibility;
  }

  /**
   * Get navigation accessibility manager
   */
  getNavigationAccessibility(): NavigationAccessibilityManager {
    return this.navigationAccessibility;
  }

  /**
   * Enable/disable screen reader features
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.ariaManager.clearLiveRegions();
    }
  }

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled(): boolean {
    return this.isEnabled;
  }

  private detectScreenReader(): void {
    // Check for common screen reader indicators
    const hasScreenReader =
      'speechSynthesis' in window ||
      (typeof navigator !== 'undefined' && (
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver')
      )) ||
      document.documentElement.classList.contains('screen-reader');

    if (hasScreenReader) {
      document.documentElement.classList.add('screen-reader-detected');
      console.log('Screen reader detected');
    }
  }

  private setupLandmarks(): void {
    // Ensure main landmarks exist
    const landmarks = ['banner', 'navigation', 'main', 'contentinfo'];
    
    landmarks.forEach(landmark => {
      const element = document.querySelector(`[role="${landmark}"], ${landmark}`);
      if (element && !element.getAttribute('role')) {
        element.setAttribute('role', landmark);
      }
    });
  }

  private setupSkipLinks(): void {
    const skipLinksHtml = `
      <div class="skip-links">
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#game-area" class="skip-link">Skip to game area</a>
      </div>
    `;
    
    const skipLinksElement = document.createElement('div');
    skipLinksElement.innerHTML = skipLinksHtml;
    document.body.insertBefore(skipLinksElement, document.body.firstChild);
    
    // Add skip link styles
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        z-index: 1000;
      }
      
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      
      .skip-link:focus {
        position: static;
        width: auto;
        height: auto;
        padding: 8px;
        text-decoration: none;
        outline: 2px solid #fff;
      }
    `;
    document.head.appendChild(style);
  }

  private setupFocusManagement(): void {
    // Track focus changes for announcements
    let lastFocusedElement: Element | null = null;
    
    document.addEventListener('focusin', (event) => {
      const target = event.target as Element;
      
      if (target !== lastFocusedElement) {
        this.announceFocusChange(target);
        lastFocusedElement = target;
      }
    });
  }

  private setupKeyboardAnnouncements(): void {
    // Announce keyboard shortcuts when Help key is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'F1' || (event.ctrlKey && event.key === '/')) {
        event.preventDefault();
        this.announceKeyboardShortcuts();
      }
    });
  }

  private announceFocusChange(element: Element): void {
    if (!this.isEnabled) return;
    
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || 
                  (element as HTMLElement).textContent?.trim() ||
                  element.tagName.toLowerCase();
    
    if (role && label) {
      this.ariaManager.announce(`${role}: ${label}`, 'polite');
    }
  }

  private announceKeyboardShortcuts(): void {
    const shortcuts = [
      'Tab: Navigate forward',
      'Shift+Tab: Navigate backward',
      'Enter: Activate button or link',
      'Space: Activate button or checkbox',
      'Escape: Close dialog or cancel',
      'Arrow keys: Navigate within games',
      'F1 or Ctrl+/: Show keyboard shortcuts'
    ];
    
    const message = `Keyboard shortcuts: ${shortcuts.join('. ')}`;
    this.ariaManager.announce(message, 'polite');
  }
}

// Export convenience functions
export const screenReader = ScreenReaderManager.getInstance();

export const initializeScreenReader = () => screenReader.initialize();

export const announceToScreenReader = (message: string, priority?: 'polite' | 'assertive') =>
  screenReader.getARIA().announce(message, priority);

export const announceGameAction = (announcement: GameStateAnnouncement) =>
  screenReader.getGameAccessibility().announceGameAction(announcement);

export const announceNavigation = (announcement: NavigationAnnouncement) =>
  screenReader.getNavigationAccessibility().announceNavigation(announcement);

// Default export
export default ScreenReaderManager;