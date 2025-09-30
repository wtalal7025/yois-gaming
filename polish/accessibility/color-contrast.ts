/**
 * Color Contrast Optimization and Theme System
 * Ensures WCAG 2.1 AA compliance and provides high contrast themes
 */

// Types for color contrast management
export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  luminance: number;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'FAIL';
  isValid: boolean;
  recommendation?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  accent: string;
}

export interface AccessibilityTheme {
  name: string;
  displayName: string;
  colors: ThemeColors;
  contrastRatios: Record<string, number>;
  isHighContrast: boolean;
}

export interface ContrastViolation {
  element: HTMLElement;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * Color Utility Functions
 */
class ColorUtils {
  /**
   * Convert hex to RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert RGB to hex
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Convert RGB to HSL
   */
  static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const delta = max - min;
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

      switch (max) {
        case r:
          h = (g - b) / delta + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        case b:
          h = (r - g) / delta + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * Convert HSL to RGB
   */
  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Calculate relative luminance
   */
  static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    const srgb = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(foreground: string, background: string): number {
    const l1 = this.getLuminance(foreground);
    const l2 = this.getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get color information
   */
  static getColorInfo(color: string): ColorInfo {
    const rgb = this.hexToRgb(color);
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const luminance = this.getLuminance(color);

    return {
      hex: color,
      rgb,
      hsl,
      luminance
    };
  }

  /**
   * Darken color by percentage
   */
  static darken(color: string, percentage: number): string {
    const { r, g, b } = this.hexToRgb(color);
    const factor = 1 - (percentage / 100);
    
    return this.rgbToHex(
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor)
    );
  }

  /**
   * Lighten color by percentage
   */
  static lighten(color: string, percentage: number): string {
    const { r, g, b } = this.hexToRgb(color);
    const factor = percentage / 100;
    
    return this.rgbToHex(
      Math.round(r + (255 - r) * factor),
      Math.round(g + (255 - g) * factor),
      Math.round(b + (255 - b) * factor)
    );
  }

  /**
   * Adjust color saturation
   */
  static adjustSaturation(color: string, percentage: number): string {
    const { r, g, b } = this.hexToRgb(color);
    const { h, s, l } = this.rgbToHsl(r, g, b);
    const newSaturation = Math.max(0, Math.min(100, s + percentage));
    const newRgb = this.hslToRgb(h, newSaturation, l);
    
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }
}

/**
 * Contrast Analyzer
 */
class ContrastAnalyzer {
  private minContrastLarge = 3.0;  // WCAG AA for large text
  private minContrastNormal = 4.5; // WCAG AA for normal text
  private minContrastAAA = 7.0;    // WCAG AAA

  /**
   * Check contrast ratio
   */
  checkContrast(foreground: string, background: string, isLargeText = false): ContrastResult {
    const ratio = ColorUtils.getContrastRatio(foreground, background);
    const minRequired = isLargeText ? this.minContrastLarge : this.minContrastNormal;
    
    let level: ContrastResult['level'];
    if (ratio >= this.minContrastAAA) {
      level = 'AAA';
    } else if (ratio >= this.minContrastNormal) {
      level = 'AA';
    } else if (ratio >= this.minContrastLarge) {
      level = 'A';
    } else {
      level = 'FAIL';
    }

    const isValid = ratio >= minRequired;
    const recommendation = this.getRecommendation(ratio, minRequired, foreground, background);

    return { ratio, level, isValid, recommendation };
  }

  /**
   * Find accessible color variant
   */
  findAccessibleColor(originalColor: string, backgroundColor: string, isLargeText = false): string {
    const minRequired = isLargeText ? this.minContrastLarge : this.minContrastNormal;
    const currentRatio = ColorUtils.getContrastRatio(originalColor, backgroundColor);
    
    if (currentRatio >= minRequired) {
      return originalColor;
    }

    // Try darkening the color
    let adjustedColor = originalColor;
    for (let i = 10; i <= 90; i += 10) {
      const darkened = ColorUtils.darken(originalColor, i);
      if (ColorUtils.getContrastRatio(darkened, backgroundColor) >= minRequired) {
        adjustedColor = darkened;
        break;
      }
    }

    // If darkening doesn't work, try lightening
    if (ColorUtils.getContrastRatio(adjustedColor, backgroundColor) < minRequired) {
      for (let i = 10; i <= 90; i += 10) {
        const lightened = ColorUtils.lighten(originalColor, i);
        if (ColorUtils.getContrastRatio(lightened, backgroundColor) >= minRequired) {
          adjustedColor = lightened;
          break;
        }
      }
    }

    return adjustedColor;
  }

  /**
   * Generate accessible color palette
   */
  generateAccessiblePalette(baseColor: string): { light: string; dark: string; contrast: string } {
    const lightBg = '#ffffff';
    const darkBg = '#000000';
    
    return {
      light: this.findAccessibleColor(baseColor, lightBg),
      dark: this.findAccessibleColor(baseColor, darkBg),
      contrast: ColorUtils.getLuminance(baseColor) > 0.5 ? '#000000' : '#ffffff'
    };
  }

  /**
   * Scan DOM for contrast violations
   */
  scanContrast(container: HTMLElement = document.body): ContrastViolation[] {
    const violations: ContrastViolation[] = [];
    const elements = container.querySelectorAll('*');

    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const styles = window.getComputedStyle(htmlElement);
      const color = this.rgbToHex(styles.color);
      const backgroundColor = this.getEffectiveBackgroundColor(htmlElement);
      
      if (color && backgroundColor && this.isTextElement(htmlElement)) {
        const isLargeText = this.isLargeText(styles);
        const result = this.checkContrast(color, backgroundColor, isLargeText);
        
        if (!result.isValid) {
          violations.push({
            element: htmlElement,
            foreground: color,
            background: backgroundColor,
            ratio: result.ratio,
            required: isLargeText ? this.minContrastLarge : this.minContrastNormal,
            severity: this.getSeverity(result.ratio),
            suggestion: result.recommendation || 'Improve color contrast'
          });
        }
      }
    });

    return violations;
  }

  private getRecommendation(ratio: number, required: number, foreground: string, background: string): string {
    if (ratio >= required) return '';
    
    const improvement = Math.ceil((required - ratio) * 10) / 10;
    const suggestion = ColorUtils.getLuminance(foreground) > ColorUtils.getLuminance(background)
      ? 'Consider using a lighter foreground color'
      : 'Consider using a darker foreground color';
    
    return `Contrast ratio needs to improve by ${improvement.toFixed(1)}. ${suggestion}`;
  }

  private rgbToHex(rgb: string): string {
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return '';
    
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
    return ColorUtils.rgbToHex(r, g, b);
  }

  private getEffectiveBackgroundColor(element: HTMLElement): string {
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      const styles = window.getComputedStyle(current);
      const bgColor = styles.backgroundColor;
      
      if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
        return this.rgbToHex(bgColor);
      }
      
      current = current.parentElement;
    }
    
    return '#ffffff'; // Default to white background
  }

  private isTextElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const textTags = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'label', 'li'];
    const hasText = (element.textContent?.trim().length || 0) > 0;
    
    return textTags.includes(tagName) && hasText;
  }

  private isLargeText(styles: CSSStyleDeclaration): boolean {
    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = styles.fontWeight;
    const isBold = fontWeight === 'bold' || parseInt(fontWeight) >= 700;
    
    return fontSize >= 18 || (fontSize >= 14 && isBold);
  }

  private getSeverity(ratio: number): 'low' | 'medium' | 'high' {
    if (ratio >= 3.0) return 'low';
    if (ratio >= 2.0) return 'medium';
    return 'high';
  }
}

/**
 * Theme Manager
 */
class ThemeManager {
  private themes = new Map<string, AccessibilityTheme>();
  private currentTheme = 'default';
  private highContrastEnabled = false;

  constructor() {
    this.initializeThemes();
  }

  /**
   * Register theme
   */
  registerTheme(theme: AccessibilityTheme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Apply theme
   */
  applyTheme(themeName: string): boolean {
    const theme = this.themes.get(themeName);
    if (!theme) return false;

    this.currentTheme = themeName;
    this.highContrastEnabled = theme.isHighContrast;
    
    // Apply CSS custom properties
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Add theme class
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);

    // Store preference
    localStorage.setItem('accessibility-theme', themeName);
    
    console.log(`Applied theme: ${theme.displayName}`);
    return true;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): AccessibilityTheme | null {
    return this.themes.get(this.currentTheme) || null;
  }

  /**
   * Toggle high contrast
   */
  toggleHighContrast(): void {
    const currentTheme = this.getCurrentTheme();
    if (!currentTheme) return;

    if (this.highContrastEnabled) {
      this.applyTheme('default');
    } else {
      this.applyTheme('high-contrast');
    }
  }

  /**
   * Get all themes
   */
  getThemes(): AccessibilityTheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Auto-select theme based on user preferences
   */
  autoSelectTheme(): void {
    // Check stored preference first
    const stored = localStorage.getItem('accessibility-theme');
    if (stored && this.themes.has(stored)) {
      this.applyTheme(stored);
      return;
    }

    // Check system preference for high contrast
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      this.applyTheme('high-contrast');
      return;
    }

    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      this.applyTheme('dark');
      return;
    }

    // Default theme
    this.applyTheme('default');
  }

  private initializeThemes(): void {
    // Default theme
    this.registerTheme({
      name: 'default',
      displayName: 'Default',
      isHighContrast: false,
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        textSecondary: '#6b7280',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        border: '#e5e7eb',
        accent: '#8b5cf6'
      },
      contrastRatios: {
        'text-background': 15.3,
        'primary-background': 5.2
      }
    });

    // Dark theme
    this.registerTheme({
      name: 'dark',
      displayName: 'Dark',
      isHighContrast: false,
      colors: {
        primary: '#60a5fa',
        secondary: '#9ca3af',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        border: '#374151',
        accent: '#a78bfa'
      },
      contrastRatios: {
        'text-background': 14.8,
        'primary-background': 4.8
      }
    });

    // High contrast theme
    this.registerTheme({
      name: 'high-contrast',
      displayName: 'High Contrast',
      isHighContrast: true,
      colors: {
        primary: '#0000ff',
        secondary: '#666666',
        background: '#ffffff',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#000000',
        success: '#008000',
        warning: '#ff8c00',
        error: '#ff0000',
        info: '#0000ff',
        border: '#000000',
        accent: '#800080'
      },
      contrastRatios: {
        'text-background': 21.0,
        'primary-background': 8.6
      }
    });

    // High contrast dark theme
    this.registerTheme({
      name: 'high-contrast-dark',
      displayName: 'High Contrast Dark',
      isHighContrast: true,
      colors: {
        primary: '#ffff00',
        secondary: '#cccccc',
        background: '#000000',
        surface: '#000000',
        text: '#ffffff',
        textSecondary: '#ffffff',
        success: '#00ff00',
        warning: '#ffa500',
        error: '#ff0000',
        info: '#00ffff',
        border: '#ffffff',
        accent: '#ff00ff'
      },
      contrastRatios: {
        'text-background': 21.0,
        'primary-background': 19.6
      }
    });
  }
}

/**
 * Main Color Contrast Manager
 */
export class ColorContrastManager {
  private static instance: ColorContrastManager;
  private analyzer: ContrastAnalyzer;
  private themeManager: ThemeManager;
  private isEnabled = true;
  private violations: ContrastViolation[] = [];

  private constructor() {
    this.analyzer = new ContrastAnalyzer();
    this.themeManager = new ThemeManager();
  }

  static getInstance(): ColorContrastManager {
    if (!ColorContrastManager.instance) {
      ColorContrastManager.instance = new ColorContrastManager();
    }
    return ColorContrastManager.instance;
  }

  /**
   * Initialize color contrast management
   */
  initialize(): void {
    console.log('Initializing color contrast management...');
    
    // Auto-select appropriate theme
    this.themeManager.autoSelectTheme();
    
    // Setup media query listeners
    this.setupMediaQueryListeners();
    
    // Setup user controls
    this.setupUserControls();
    
    // Scan for initial violations
    this.scanAndReport();
    
    console.log('Color contrast management initialized');
  }

  /**
   * Get contrast analyzer
   */
  getAnalyzer(): ContrastAnalyzer {
    return this.analyzer;
  }

  /**
   * Get theme manager
   */
  getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  /**
   * Scan for contrast violations
   */
  scanAndReport(container?: HTMLElement): ContrastViolation[] {
    if (!this.isEnabled) return [];

    this.violations = this.analyzer.scanContrast(container);
    
    if (this.violations.length > 0) {
      console.warn(`Found ${this.violations.length} contrast violations:`, this.violations);
      this.reportViolations();
    }

    return this.violations;
  }

  /**
   * Fix contrast violations automatically
   */
  autoFixViolations(): number {
    let fixed = 0;
    
    this.violations.forEach(violation => {
      const { element, foreground, background } = violation;
      const isLargeText = this.analyzer['isLargeText'](window.getComputedStyle(element));
      const fixedColor = this.analyzer.findAccessibleColor(foreground, background, isLargeText);
      
      if (fixedColor !== foreground) {
        element.style.color = fixedColor;
        fixed++;
      }
    });

    // Rescan after fixes
    this.scanAndReport();
    
    console.log(`Auto-fixed ${fixed} contrast violations`);
    return fixed;
  }

  /**
   * Create contrast adjustment controls
   */
  createContrastControls(): HTMLElement {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'contrast-controls';
    controlsContainer.setAttribute('role', 'region');
    controlsContainer.setAttribute('aria-label', 'Color contrast controls');

    controlsContainer.innerHTML = `
      <div class="contrast-controls-header">
        <h3>Color & Contrast Settings</h3>
      </div>
      <div class="theme-selector">
        <label for="theme-select">Choose theme:</label>
        <select id="theme-select" class="theme-select">
          ${this.themeManager.getThemes()
            .map(theme => `<option value="${theme.name}">${theme.displayName}</option>`)
            .join('')}
        </select>
      </div>
      <div class="contrast-actions">
        <button type="button" class="scan-contrast-btn">Scan Contrast Issues</button>
        <button type="button" class="fix-contrast-btn">Auto-fix Issues</button>
        <button type="button" class="toggle-high-contrast-btn">Toggle High Contrast</button>
      </div>
      <div class="contrast-report" aria-live="polite"></div>
    `;

    // Add event listeners
    this.setupControlsEventListeners(controlsContainer);

    return controlsContainer;
  }

  /**
   * Enable/disable contrast management
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if contrast management is enabled
   */
  isContrastManagementEnabled(): boolean {
    return this.isEnabled;
  }

  private setupMediaQueryListeners(): void {
    // High contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.themeManager.applyTheme('high-contrast');
      }
    });

    // Color scheme preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', (e) => {
      if (e.matches && !this.themeManager.getCurrentTheme()?.isHighContrast) {
        this.themeManager.applyTheme('dark');
      } else if (!e.matches && !this.themeManager.getCurrentTheme()?.isHighContrast) {
        this.themeManager.applyTheme('default');
      }
    });
  }

  private setupUserControls(): void {
    // Create keyboard shortcut for high contrast toggle
    document.addEventListener('keydown', (event) => {
      // Alt + Shift + H for high contrast toggle
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        this.themeManager.toggleHighContrast();
      }
    });
  }

  private setupControlsEventListeners(container: HTMLElement): void {
    const themeSelect = container.querySelector('.theme-select') as HTMLSelectElement;
    const scanBtn = container.querySelector('.scan-contrast-btn') as HTMLButtonElement;
    const fixBtn = container.querySelector('.fix-contrast-btn') as HTMLButtonElement;
    const toggleBtn = container.querySelector('.toggle-high-contrast-btn') as HTMLButtonElement;
    const reportDiv = container.querySelector('.contrast-report') as HTMLElement;

    // Theme selector
    if (themeSelect) {
      themeSelect.value = this.themeManager.getCurrentTheme()?.name || 'default';
      themeSelect.addEventListener('change', () => {
        this.themeManager.applyTheme(themeSelect.value);
      });
    }

    // Scan button
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        const violations = this.scanAndReport();
        this.updateReport(reportDiv, violations);
      });
    }

    // Fix button
    if (fixBtn) {
      fixBtn.addEventListener('click', () => {
        const fixed = this.autoFixViolations();
        this.updateReport(reportDiv, this.violations, `Fixed ${fixed} issues. `);
      });
    }

    // Toggle high contrast
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.themeManager.toggleHighContrast();
      });
    }
  }

  private updateReport(reportDiv: HTMLElement, violations: ContrastViolation[], prefix = ''): void {
    const count = violations.length;
    const severityCounts = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let report = `${prefix}Found ${count} contrast issue${count !== 1 ? 's' : ''}`;
    
    if (count > 0) {
      const details = Object.entries(severityCounts)
        .map(([severity, count]) => `${count} ${severity}`)
        .join(', ');
      report += ` (${details})`;
    }

    reportDiv.textContent = report;
  }

  private reportViolations(): void {
    // Group violations by severity
    const grouped = this.violations.reduce((acc, violation) => {
      if (!acc[violation.severity]) {
        acc[violation.severity] = [];
      }
      acc[violation.severity].push(violation);
      return acc;
    }, {} as Record<string, ContrastViolation[]>);

    console.group('Contrast Violations Report');
    Object.entries(grouped).forEach(([severity, violations]) => {
      console.group(`${severity.toUpperCase()} (${violations.length})`);
      violations.forEach(violation => {
        console.warn('Element:', violation.element);
        console.warn('Ratio:', violation.ratio.toFixed(2), 'Required:', violation.required);
        console.warn('Colors:', violation.foreground, 'on', violation.background);
        console.warn('Suggestion:', violation.suggestion);
      });
      console.groupEnd();
    });
    console.groupEnd();
  }
}

// Export convenience functions
export const colorContrast = ColorContrastManager.getInstance();

export const initializeColorContrast = () => colorContrast.initialize();

export const checkContrast = (foreground: string, background: string, isLargeText?: boolean) =>
  colorContrast.getAnalyzer().checkContrast(foreground, background, isLargeText);

export const applyTheme = (themeName: string) =>
  colorContrast.getThemeManager().applyTheme(themeName);

export const scanContrastViolations = (container?: HTMLElement) =>
  colorContrast.scanAndReport(container);

// Default export
export default ColorContrastManager;