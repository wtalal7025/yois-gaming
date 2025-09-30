/**
 * Progressive Web App (PWA) Features and Offline Capability System
 * Provides comprehensive PWA functionality for enhanced mobile experience
 */

// Types for PWA features
export interface PWAConfig {
  enableServiceWorker: boolean;
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableBackgroundSync: boolean;
  enableInstallPrompt: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  offlinePages: string[];
  staticAssets: string[];
  apiEndpoints: string[];
}

export interface ServiceWorkerConfig {
  scriptUrl: string;
  scope: string;
  updateViaCache: 'imports' | 'all' | 'none';
  skipWaiting: boolean;
}

export interface CacheStrategy {
  name: string;
  urls: string[];
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxAge?: number;
  maxEntries?: number;
}

export interface PWANotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: PWANotificationAction[];
}

export interface InstallPromptOptions {
  showDelay: number;
  maxPrompts: number;
  daysToWait: number;
}

/**
 * Service Worker Manager
 */
class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  /**
   * Register service worker
   */
  async register(config: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('Service Workers not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(config.scriptUrl, {
        scope: config.scope,
        updateViaCache: config.updateViaCache
      });

      console.log('Service Worker registered successfully');
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.emit('update-available', newWorker);
            }
          });
        }
      });

      // Handle controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.emit('controller-changed');
      });

      // Skip waiting if configured
      if (config.skipWaiting && this.registration.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      if (result) {
        this.registration = null;
        console.log('Service Worker unregistered successfully');
      }
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Update service worker
   */
  async update(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('Service Worker update check completed');
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  /**
   * Send message to service worker
   */
  postMessage(message: any): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Check if service worker is supported
   */
  isServiceWorkerSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in service worker callback for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Cache Manager
 */
class CacheManager {
  private cacheStrategies: CacheStrategy[] = [];
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'caches' in window;
  }

  /**
   * Add cache strategy
   */
  addStrategy(strategy: CacheStrategy): void {
    this.cacheStrategies.push(strategy);
  }

  /**
   * Cache resources
   */
  async cacheResources(cacheName: string, urls: string[]): Promise<void> {
    if (!this.isSupported) return;

    try {
      const cache = await caches.open(cacheName);
      await cache.addAll(urls);
      console.log(`Cached ${urls.length} resources in ${cacheName}`);
    } catch (error) {
      console.error('Failed to cache resources:', error);
    }
  }

  /**
   * Get cached response
   */
  async getCachedResponse(request: Request | string): Promise<Response | undefined> {
    if (!this.isSupported) return undefined;

    try {
      return await caches.match(request);
    } catch (error) {
      console.error('Failed to get cached response:', error);
      return undefined;
    }
  }

  /**
   * Clear cache
   */
  async clearCache(cacheName: string): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      return await caches.delete(cacheName);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    if (!this.isSupported) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(cacheName: string): Promise<number> {
    if (!this.isSupported) return 0;

    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      let totalSize = 0;

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * Check if cache is supported
   */
  isCacheSupported(): boolean {
    return this.isSupported;
  }
}

/**
 * Push Notification Manager
 */
class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  /**
   * Set service worker registration
   */
  setRegistration(registration: ServiceWorkerRegistration): void {
    this.registration = registration;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return 'denied';

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show local notification
   */
  async showNotification(config: NotificationConfig): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') return;

    try {
      if (this.registration) {
        const notificationOptions: NotificationOptions = {
          body: config.body,
          icon: config.icon,
          badge: config.badge,
          tag: config.tag,
          requireInteraction: config.requireInteraction
        };

        // Add actions if supported (only in service worker context)
        if (config.actions && (notificationOptions as any).actions !== undefined) {
          (notificationOptions as any).actions = config.actions;
        }

        await this.registration.showNotification(config.title, notificationOptions);
      } else {
        new Notification(config.title, {
          body: config.body,
          icon: config.icon,
          tag: config.tag,
          requireInteraction: config.requireInteraction
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration || this.permission !== 'granted') return null;

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      console.log('Subscribed to push notifications');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const result = await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');
        return result;
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get notification permission
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

/**
 * Install Prompt Manager
 */
class InstallPromptManager {
  private deferredPrompt: any = null;
  private canInstall = false;
  private installCount: number;
  private lastPromptDate: number;
  private options: InstallPromptOptions;

  constructor(options: InstallPromptOptions) {
    this.options = options;
    this.installCount = parseInt(localStorage.getItem('pwa-install-count') || '0');
    this.lastPromptDate = parseInt(localStorage.getItem('pwa-last-prompt') || '0');
    
    this.setupInstallListeners();
  }

  /**
   * Check if app can be installed
   */
  canShowPrompt(): boolean {
    const daysSinceLastPrompt = (Date.now() - this.lastPromptDate) / (1000 * 60 * 60 * 24);
    return this.canInstall && 
           this.installCount < this.options.maxPrompts &&
           daysSinceLastPrompt >= this.options.daysToWait;
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt || !this.canShowPrompt()) return false;

    try {
      // Show the prompt
      this.deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      // Update tracking
      this.installCount++;
      this.lastPromptDate = Date.now();
      localStorage.setItem('pwa-install-count', this.installCount.toString());
      localStorage.setItem('pwa-last-prompt', this.lastPromptDate.toString());
      
      // Clear the deferred prompt
      this.deferredPrompt = null;
      this.canInstall = false;

      return outcome === 'accepted';
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return false;
    }
  }

  /**
   * Create custom install prompt
   */
  createCustomPrompt(): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = 'pwa-install-prompt';
    prompt.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    `;

    prompt.innerHTML = `
      <div class="pwa-icon" style="width: 48px; height: 48px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">📱</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">Install App</div>
        <div style="color: #6b7280; font-size: 14px;">Get the full experience with our app!</div>
      </div>
      <button class="install-btn" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer;">Install</button>
      <button class="dismiss-btn" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 8px;">×</button>
    `;

    // Add event listeners
    const installBtn = prompt.querySelector('.install-btn') as HTMLButtonElement;
    const dismissBtn = prompt.querySelector('.dismiss-btn') as HTMLButtonElement;

    installBtn.addEventListener('click', async () => {
      const installed = await this.showInstallPrompt();
      if (installed) {
        prompt.remove();
      }
    });

    dismissBtn.addEventListener('click', () => {
      prompt.style.transform = 'translateY(100%)';
      setTimeout(() => prompt.remove(), 300);
      
      // Track dismissal
      this.installCount++;
      localStorage.setItem('pwa-install-count', this.installCount.toString());
    });

    return prompt;
  }

  /**
   * Auto-show install prompt with delay
   */
  autoShowPrompt(): void {
    if (!this.canShowPrompt()) return;

    setTimeout(() => {
      if (this.canShowPrompt()) {
        const prompt = this.createCustomPrompt();
        document.body.appendChild(prompt);
        
        // Animate in
        setTimeout(() => {
          prompt.style.transform = 'translateY(0)';
        }, 100);
      }
    }, this.options.showDelay);
  }

  private setupInstallListeners(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall = true;
      console.log('Install prompt available');
    });

    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully');
      this.deferredPrompt = null;
      this.canInstall = false;
    });
  }
}

/**
 * Background Sync Manager
 */
class BackgroundSyncManager {
  private registration: ServiceWorkerRegistration | null = null;
  private pendingActions: string[] = [];
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    this.loadPendingActions();
  }

  /**
   * Set service worker registration
   */
  setRegistration(registration: ServiceWorkerRegistration): void {
    this.registration = registration;
  }

  /**
   * Register background sync
   */
  async registerSync(tag: string): Promise<boolean> {
    if (!this.isSupported || !this.registration) return false;

    try {
      await (this.registration as any).sync.register(tag);
      this.addPendingAction(tag);
      console.log(`Background sync registered: ${tag}`);
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }

  /**
   * Get sync tags
   */
  async getSyncTags(): Promise<string[]> {
    if (!this.isSupported || !this.registration) return [];

    try {
      return await (this.registration as any).sync.getTags();
    } catch (error) {
      console.error('Failed to get sync tags:', error);
      return [];
    }
  }

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Add pending action
   */
  private addPendingAction(action: string): void {
    if (!this.pendingActions.includes(action)) {
      this.pendingActions.push(action);
      this.savePendingActions();
    }
  }

  /**
   * Remove pending action
   */
  removePendingAction(action: string): void {
    const index = this.pendingActions.indexOf(action);
    if (index > -1) {
      this.pendingActions.splice(index, 1);
      this.savePendingActions();
    }
  }

  /**
   * Get pending actions
   */
  getPendingActions(): string[] {
    return [...this.pendingActions];
  }

  private loadPendingActions(): void {
    const stored = localStorage.getItem('pwa-pending-sync');
    if (stored) {
      try {
        this.pendingActions = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load pending sync actions:', error);
        this.pendingActions = [];
      }
    }
  }

  private savePendingActions(): void {
    try {
      localStorage.setItem('pwa-pending-sync', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save pending sync actions:', error);
    }
  }
}

/**
 * Main PWA Manager
 */
export class PWAManager {
  private static instance: PWAManager;
  private config: PWAConfig;
  private serviceWorkerManager: ServiceWorkerManager;
  private cacheManager: CacheManager;
  private notificationManager: NotificationManager;
  private installPromptManager: InstallPromptManager;
  private backgroundSyncManager: BackgroundSyncManager;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.serviceWorkerManager = new ServiceWorkerManager();
    this.cacheManager = new CacheManager();
    this.notificationManager = new NotificationManager();
    this.installPromptManager = new InstallPromptManager({
      showDelay: 5000,
      maxPrompts: 3,
      daysToWait: 7
    });
    this.backgroundSyncManager = new BackgroundSyncManager();
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  /**
   * Initialize PWA features
   */
  async initialize(config?: Partial<PWAConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('Initializing PWA features...');

    // Register service worker
    if (this.config.enableServiceWorker) {
      await this.initializeServiceWorker();
    }

    // Setup offline mode
    if (this.config.enableOfflineMode) {
      await this.setupOfflineMode();
    }

    // Setup push notifications
    if (this.config.enablePushNotifications) {
      await this.setupPushNotifications();
    }

    // Setup background sync
    if (this.config.enableBackgroundSync) {
      this.setupBackgroundSync();
    }

    // Setup install prompt
    if (this.config.enableInstallPrompt) {
      this.setupInstallPrompt();
    }

    // Setup manifest
    this.setupManifest();

    this.isInitialized = true;
    console.log('PWA features initialized successfully');
  }

  /**
   * Check if app is running as PWA
   */
  isRunningAsPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Get service worker manager
   */
  getServiceWorker(): ServiceWorkerManager {
    return this.serviceWorkerManager;
  }

  /**
   * Get cache manager
   */
  getCache(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Get notification manager
   */
  getNotifications(): NotificationManager {
    return this.notificationManager;
  }

  /**
   * Get install prompt manager
   */
  getInstallPrompt(): InstallPromptManager {
    return this.installPromptManager;
  }

  /**
   * Get background sync manager
   */
  getBackgroundSync(): BackgroundSyncManager {
    return this.backgroundSyncManager;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async initializeServiceWorker(): Promise<void> {
    const registration = await this.serviceWorkerManager.register({
      scriptUrl: '/sw.js',
      scope: '/',
      updateViaCache: 'none',
      skipWaiting: true
    });

    if (registration) {
      this.notificationManager.setRegistration(registration);
      this.backgroundSyncManager.setRegistration(registration);
    }
  }

  private async setupOfflineMode(): Promise<void> {
    // Cache static assets
    await this.cacheManager.cacheResources('static-v1', this.config.staticAssets);
    
    // Cache offline pages
    await this.cacheManager.cacheResources('pages-v1', this.config.offlinePages);
    
    console.log('Offline mode configured');
  }

  private async setupPushNotifications(): Promise<void> {
    const permission = await this.notificationManager.requestPermission();
    if (permission === 'granted') {
      console.log('Push notifications enabled');
    }
  }

  private setupBackgroundSync(): void {
    // Background sync will be handled by the service worker
    console.log('Background sync configured');
  }

  private setupInstallPrompt(): void {
    // Auto-show install prompt after delay
    this.installPromptManager.autoShowPrompt();
  }

  private setupManifest(): void {
    // Ensure manifest is linked
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Add theme color meta tag
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#3b82f6';
      document.head.appendChild(themeColor);
    }
  }

  private getDefaultConfig(): PWAConfig {
    return {
      enableServiceWorker: true,
      enableOfflineMode: true,
      enablePushNotifications: false,
      enableBackgroundSync: false,
      enableInstallPrompt: true,
      cacheStrategy: 'stale-while-revalidate',
      offlinePages: ['/offline.html'],
      staticAssets: ['/images/icon-192.png', '/images/icon-512.png'],
      apiEndpoints: ['/api/user', '/api/games']
    };
  }
}

// Export convenience functions
export const pwa = PWAManager.getInstance();

export const initializePWA = (config?: Partial<PWAConfig>) =>
  pwa.initialize(config);

export const isRunningAsPWA = () => pwa.isRunningAsPWA();

export const getServiceWorker = () => pwa.getServiceWorker();

export const getCacheManager = () => pwa.getCache();

export const getNotificationManager = () => pwa.getNotifications();

export const showInstallPrompt = () => pwa.getInstallPrompt().showInstallPrompt();

// Default export
export default PWAManager;