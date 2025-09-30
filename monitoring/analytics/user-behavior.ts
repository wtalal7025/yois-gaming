/**
 * User Behavior Analytics System
 * Privacy-compliant tracking of user interactions and behavior patterns
 */

// Types for user behavior analytics
export interface UserAction {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: number;
  type: ActionType;
  category: ActionCategory;
  element?: string;
  target?: string;
  value?: number;
  properties: Record<string, any>;
  context: ActionContext;
  device: DeviceInfo;
  location: LocationInfo;
}

export interface ActionContext {
  url: string;
  referrer: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
    maxX: number;
    maxY: number;
  };
  timeOnPage: number;
  sessionDuration: number;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: string;
  browser: string;
  version: string;
  touchEnabled: boolean;
  screenResolution: {
    width: number;
    height: number;
  };
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  language: string;
  locale: string;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  actions: number;
  bounced: boolean;
  converted: boolean;
  conversionEvents: string[];
  entryPage: string;
  exitPage?: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  device: DeviceInfo;
  location: LocationInfo;
}

export interface UserBehaviorMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionDuration: number;
  averagePageViews: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number; uniqueViews: number }>;
  topActions: Array<{ action: string; count: number }>;
  userFlow: UserFlowData[];
  cohortAnalysis: CohortData[];
}

export interface UserFlowData {
  from: string;
  to: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface CohortData {
  cohort: string;
  period: number;
  users: number;
  retention: number;
}

export type ActionType = 
  | 'click'
  | 'scroll' 
  | 'pageview'
  | 'form_submit'
  | 'form_field_focus'
  | 'search'
  | 'download'
  | 'video_play'
  | 'video_pause'
  | 'game_start'
  | 'game_end'
  | 'bet_placed'
  | 'deposit'
  | 'withdrawal'
  | 'custom';

export type ActionCategory =
  | 'navigation'
  | 'engagement'
  | 'conversion'
  | 'gaming'
  | 'financial'
  | 'social'
  | 'content'
  | 'custom';

export interface BehaviorTrackingConfig {
  enabled: boolean;
  anonymizeIPs: boolean;
  respectDNT: boolean;
  cookieConsent: boolean;
  sampling: {
    rate: number;
    userSample?: (userId?: string) => boolean;
  };
  events: {
    pageViews: boolean;
    clicks: boolean;
    scrolling: boolean;
    formInteractions: boolean;
    gameEvents: boolean;
    financialEvents: boolean;
  };
  privacy: {
    excludeFields: string[];
    hashUserIds: boolean;
    dataRetentionDays: number;
  };
  storage: {
    bufferSize: number;
    flushInterval: number;
    apiEndpoint: string;
  };
}

/**
 * Device Detection Utility
 */
class DeviceDetector {
  /**
   * Detect device information
   */
  static detect(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      type: this.detectDeviceType(userAgent),
      os: this.detectOS(userAgent),
      browser: this.detectBrowser(userAgent),
      version: this.detectBrowserVersion(userAgent),
      touchEnabled: 'ontouchstart' in window,
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height,
      },
    };
  }

  private static detectDeviceType(userAgent: string): DeviceInfo['type'] {
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private static detectOS(userAgent: string): string {
    if (/windows/.test(userAgent)) return 'Windows';
    if (/mac/.test(userAgent)) return 'macOS';
    if (/linux/.test(userAgent)) return 'Linux';
    if (/android/.test(userAgent)) return 'Android';
    if (/ios|iphone|ipad/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private static detectBrowser(userAgent: string): string {
    if (/chrome/.test(userAgent)) return 'Chrome';
    if (/firefox/.test(userAgent)) return 'Firefox';
    if (/safari/.test(userAgent)) return 'Safari';
    if (/edge/.test(userAgent)) return 'Edge';
    if (/opera/.test(userAgent)) return 'Opera';
    return 'Unknown';
  }

  private static detectBrowserVersion(userAgent: string): string {
    const matches = userAgent.match(/(chrome|firefox|safari|edge|opera)\/(\d+\.\d+)/);
    return matches ? matches[2] : 'Unknown';
  }
}

/**
 * Location Detector
 */
class LocationDetector {
  /**
   * Detect location information
   */
  static detect(): LocationInfo {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      locale: navigator.language,
      // Country, region, and city would be determined server-side from IP
      // to comply with privacy regulations
    };
  }
}

/**
 * Session Manager
 */
class SessionManager {
  private session: UserSession | null = null;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private lastActivity = Date.now();
  private onSessionEnd?: (session: UserSession) => void;

  /**
   * Initialize session
   */
  initialize(userId?: string, onSessionEnd?: (session: UserSession) => void): void {
    this.onSessionEnd = onSessionEnd;
    
    // Try to restore existing session
    const existingSessionId = sessionStorage.getItem('analytics-session-id');
    const sessionData = existingSessionId ? this.loadSession(existingSessionId) : null;

    if (sessionData && this.isSessionValid(sessionData)) {
      this.session = sessionData;
      this.updateSession();
    } else {
      this.startNewSession(userId);
    }

    // Setup session timeout monitoring
    this.setupActivityMonitoring();
  }

  /**
   * Get current session
   */
  getCurrentSession(): UserSession | null {
    return this.session;
  }

  /**
   * Update session activity
   */
  updateActivity(): void {
    this.lastActivity = Date.now();
    if (this.session) {
      this.updateSession();
    }
  }

  /**
   * End current session
   */
  endSession(): void {
    if (!this.session) return;

    this.session.endTime = Date.now();
    this.session.duration = this.session.endTime - this.session.startTime;
    this.session.exitPage = window.location.pathname;

    // Save final session state
    this.saveSession();

    // Notify callback
    if (this.onSessionEnd) {
      this.onSessionEnd({ ...this.session });
    }

    // Clear session
    sessionStorage.removeItem('analytics-session-id');
    this.session = null;
  }

  private startNewSession(userId?: string): void {
    const sessionId = this.generateSessionId();
    const utmParams = this.extractUTMParams();

    this.session = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      pageViews: 0,
      actions: 0,
      bounced: true, // Will be updated as user interacts
      converted: false,
      conversionEvents: [],
      entryPage: window.location.pathname,
      referrer: document.referrer,
      utmSource: utmParams.source,
      utmMedium: utmParams.medium,
      utmCampaign: utmParams.campaign,
      device: DeviceDetector.detect(),
      location: LocationDetector.detect(),
    };

    sessionStorage.setItem('analytics-session-id', sessionId);
    this.saveSession();
  }

  private updateSession(): void {
    if (!this.session) return;

    this.session.actions++;
    this.session.bounced = this.session.actions <= 1 && this.session.pageViews <= 1;

    this.saveSession();
  }

  private loadSession(sessionId: string): UserSession | null {
    try {
      const data = localStorage.getItem(`analytics-session-${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveSession(): void {
    if (!this.session) return;

    try {
      localStorage.setItem(
        `analytics-session-${this.session.id}`,
        JSON.stringify(this.session)
      );
    } catch (error) {
      console.warn('Failed to save session:', error);
    }
  }

  private isSessionValid(session: UserSession): boolean {
    const now = Date.now();
    const sessionAge = now - session.startTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return sessionAge < maxAge && (now - this.lastActivity) < this.sessionTimeout;
  }

  private setupActivityMonitoring(): void {
    // Monitor for session timeout
    const checkTimeout = () => {
      if (this.session && (Date.now() - this.lastActivity) > this.sessionTimeout) {
        this.endSession();
      }
    };

    setInterval(checkTimeout, 60000); // Check every minute

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateActivity();
      } else if (document.visibilityState === 'hidden') {
        // Save session state when page becomes hidden
        this.saveSession();
      }
    });

    // End session on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractUTMParams(): { source?: string; medium?: string; campaign?: string } {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
    };
  }
}

/**
 * Event Tracker
 */
class EventTracker {
  private buffer: UserAction[] = [];
  private config: BehaviorTrackingConfig;
  private sessionManager: SessionManager;

  constructor(config: BehaviorTrackingConfig, sessionManager: SessionManager) {
    this.config = config;
    this.sessionManager = sessionManager;
  }

  /**
   * Track user action
   */
  track(
    type: ActionType,
    category: ActionCategory,
    properties: Record<string, any> = {},
    element?: string,
    target?: string,
    value?: number
  ): void {
    if (!this.shouldTrackAction(type)) return;

    const session = this.sessionManager.getCurrentSession();
    if (!session) return;

    const action: UserAction = {
      id: this.generateActionId(),
      sessionId: session.id,
      userId: session.userId,
      timestamp: Date.now(),
      type,
      category,
      element,
      target,
      value,
      properties: this.sanitizeProperties(properties),
      context: this.getActionContext(session),
      device: session.device,
      location: session.location,
    };

    this.addToBuffer(action);
    this.sessionManager.updateActivity();

    // Update session state
    if (type === 'pageview') {
      session.pageViews++;
    }
  }

  /**
   * Flush buffer to server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const actions = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.storage.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actions }),
        keepalive: true,
      });
    } catch (error) {
      console.warn('Failed to send analytics data:', error);
      // Re-add actions to buffer for retry
      this.buffer.unshift(...actions);
    }
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  private shouldTrackAction(type: ActionType): boolean {
    if (!this.config.enabled) return false;
    if (this.config.respectDNT && navigator.doNotTrack === '1') return false;
    if (this.config.cookieConsent && !this.hasConsent()) return false;

    // Apply sampling
    if (Math.random() > this.config.sampling.rate) return false;

    // Check event-specific settings
    switch (type) {
      case 'pageview':
        return this.config.events.pageViews;
      case 'click':
        return this.config.events.clicks;
      case 'scroll':
        return this.config.events.scrolling;
      case 'form_submit':
      case 'form_field_focus':
        return this.config.events.formInteractions;
      case 'game_start':
      case 'game_end':
        return this.config.events.gameEvents;
      case 'deposit':
      case 'withdrawal':
      case 'bet_placed':
        return this.config.events.financialEvents;
      default:
        return true;
    }
  }

  private addToBuffer(action: UserAction): void {
    this.buffer.push(action);

    if (this.buffer.length >= this.config.storage.bufferSize) {
      this.flush();
    }
  }

  private getActionContext(session: UserSession): ActionContext {
    return {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scroll: {
        x: window.pageXOffset,
        y: window.pageYOffset,
        maxX: document.documentElement.scrollWidth - window.innerWidth,
        maxY: document.documentElement.scrollHeight - window.innerHeight,
      },
      timeOnPage: Date.now() - (session.startTime || 0),
      sessionDuration: Date.now() - session.startTime,
    };
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties };

    // Remove excluded fields
    for (const field of this.config.privacy.excludeFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  private hasConsent(): boolean {
    return localStorage.getItem('analytics-consent') === 'granted';
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Automatic Event Tracking
 */
class AutoTracker {
  private eventTracker: EventTracker;
  private config: BehaviorTrackingConfig;
  private setupComplete = false;

  constructor(eventTracker: EventTracker, config: BehaviorTrackingConfig) {
    this.eventTracker = eventTracker;
    this.config = config;
  }

  /**
   * Setup automatic event tracking
   */
  setup(): void {
    if (this.setupComplete) return;

    this.setupPageViewTracking();
    this.setupClickTracking();
    this.setupScrollTracking();
    this.setupFormTracking();

    this.setupComplete = true;
  }

  private setupPageViewTracking(): void {
    if (!this.config.events.pageViews) return;

    // Track initial page view
    this.eventTracker.track('pageview', 'navigation', {
      title: document.title,
      path: window.location.pathname,
    });

    // Track SPA navigation (if applicable)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => {
        this.eventTracker.track('pageview', 'navigation', {
          title: document.title,
          path: window.location.pathname,
        });
      }, 100);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        this.eventTracker.track('pageview', 'navigation', {
          title: document.title,
          path: window.location.pathname,
        });
      }, 100);
    };

    window.addEventListener('popstate', () => {
      this.eventTracker.track('pageview', 'navigation', {
        title: document.title,
        path: window.location.pathname,
      });
    });
  }

  private setupClickTracking(): void {
    if (!this.config.events.clicks) return;

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const element = this.getElementSelector(target);
      const text = target.textContent?.trim().substring(0, 100);

      this.eventTracker.track('click', 'engagement', {
        text,
        tagName: target.tagName,
        className: target.className,
      }, element, target.tagName.toLowerCase());
    });
  }

  private setupScrollTracking(): void {
    if (!this.config.events.scrolling) return;

    let maxScrollDepth = 0;
    let scrollTimer: NodeJS.Timeout;

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      
      scrollTimer = setTimeout(() => {
        const scrollDepth = Math.round(
          (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );

        if (scrollDepth > maxScrollDepth) {
          maxScrollDepth = scrollDepth;
          
          // Track milestone scroll depths
          const milestones = [25, 50, 75, 90, 100];
          const milestone = milestones.find(m => scrollDepth >= m && maxScrollDepth < m);
          
          if (milestone) {
            this.eventTracker.track('scroll', 'engagement', {
              depth: milestone,
              maxDepth: scrollDepth,
            });
          }
        }
      }, 500);
    });
  }

  private setupFormTracking(): void {
    if (!this.config.events.formInteractions) return;

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formSelector = this.getElementSelector(form);

      this.eventTracker.track('form_submit', 'conversion', {
        formId: form.id,
        action: form.action,
        method: form.method,
      }, formSelector);
    });

    // Track form field focus
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        const fieldSelector = this.getElementSelector(target);
        
        this.eventTracker.track('form_field_focus', 'engagement', {
          fieldType: (target as HTMLInputElement).type || target.tagName.toLowerCase(),
          fieldName: (target as HTMLInputElement).name,
        }, fieldSelector);
      }
    });
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }
}

/**
 * Main User Behavior Analytics Manager
 */
export class UserBehaviorAnalytics {
  private static instance: UserBehaviorAnalytics;
  private config: BehaviorTrackingConfig;
  private sessionManager: SessionManager;
  private eventTracker: EventTracker;
  private autoTracker: AutoTracker;
  private flushInterval?: NodeJS.Timeout;

  private constructor(config: BehaviorTrackingConfig) {
    this.config = config;
    this.sessionManager = new SessionManager();
    this.eventTracker = new EventTracker(config, this.sessionManager);
    this.autoTracker = new AutoTracker(this.eventTracker, config);
  }

  static getInstance(config?: BehaviorTrackingConfig): UserBehaviorAnalytics {
    if (!UserBehaviorAnalytics.instance && config) {
      UserBehaviorAnalytics.instance = new UserBehaviorAnalytics(config);
    }
    return UserBehaviorAnalytics.instance;
  }

  /**
   * Initialize analytics
   */
  initialize(userId?: string): void {
    console.log('Initializing user behavior analytics...');

    // Initialize session
    this.sessionManager.initialize(userId, (session) => {
      // Session ended - could send session data to server here
      console.log('Session ended:', session);
    });

    // Setup automatic tracking
    this.autoTracker.setup();

    // Setup periodic flushing
    this.flushInterval = setInterval(() => {
      this.eventTracker.flush();
    }, this.config.storage.flushInterval);
  }

  /**
   * Track custom event
   */
  track(
    event: string,
    properties: Record<string, any> = {},
    category: ActionCategory = 'custom'
  ): void {
    this.eventTracker.track('custom', category, {
      event,
      ...properties,
    });
  }

  /**
   * Track page view
   */
  trackPageView(title?: string, path?: string): void {
    this.eventTracker.track('pageview', 'navigation', {
      title: title || document.title,
      path: path || window.location.pathname,
    });
  }

  /**
   * Track conversion event
   */
  trackConversion(event: string, value?: number, properties: Record<string, any> = {}): void {
    this.eventTracker.track('custom', 'conversion', {
      event,
      value,
      ...properties,
    });

    // Update session conversion state
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      session.converted = true;
      session.conversionEvents.push(event);
    }
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    const session = this.sessionManager.getCurrentSession();
    if (session) {
      session.userId = userId;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): UserSession | null {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    await this.eventTracker.flush();
  }

  /**
   * Destroy analytics instance
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.sessionManager.endSession();
    this.eventTracker.flush();
  }
}

// Default configuration
export const defaultBehaviorConfig: BehaviorTrackingConfig = {
  enabled: true,
  anonymizeIPs: true,
  respectDNT: true,
  cookieConsent: false, // Set to true in production
  sampling: {
    rate: 1.0, // 100% for development
  },
  events: {
    pageViews: true,
    clicks: true,
    scrolling: true,
    formInteractions: true,
    gameEvents: true,
    financialEvents: true,
  },
  privacy: {
    excludeFields: ['password', 'creditCard', 'ssn'],
    hashUserIds: false,
    dataRetentionDays: 90,
  },
  storage: {
    bufferSize: 50,
    flushInterval: 30000, // 30 seconds
    apiEndpoint: '/api/analytics/events',
  },
};

// Export convenience functions
export const initializeBehaviorAnalytics = (config: Partial<BehaviorTrackingConfig> = {}, userId?: string) => {
  const finalConfig = { ...defaultBehaviorConfig, ...config };
  const analytics = UserBehaviorAnalytics.getInstance(finalConfig);
  analytics.initialize(userId);
  return analytics;
};

export const trackEvent = (event: string, properties?: Record<string, any>, category?: ActionCategory) => {
  const analytics = UserBehaviorAnalytics.getInstance();
  analytics?.track(event, properties, category);
};

export const trackPageView = (title?: string, path?: string) => {
  const analytics = UserBehaviorAnalytics.getInstance();
  analytics?.trackPageView(title, path);
};

export const trackConversion = (event: string, value?: number, properties?: Record<string, any>) => {
  const analytics = UserBehaviorAnalytics.getInstance();
  analytics?.trackConversion(event, value, properties);
};

// Default export
export default UserBehaviorAnalytics;