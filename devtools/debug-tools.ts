/**
 * Enhanced debugging tools for development
 * Provides comprehensive debugging utilities for the gaming platform
 */

// Types for debugging tools
interface DebugConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  persistLogs: boolean;
  maxLogEntries: number;
  showTimestamps: boolean;
  showStackTrace: boolean;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: string;
  message: string;
  data?: any;
  stackTrace?: string;
  component?: string;
  userId?: string;
}

interface DebugStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  componentCounts: Record<string, number>;
  recentErrors: LogEntry[];
}

interface ComponentState {
  component: string;
  props: any;
  state: any;
  hooks: any[];
  renders: number;
  lastUpdate: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  timestamp: number;
  duration?: number;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  error?: string;
}

/**
 * Enhanced debugging console with filtering and persistence
 */
class DebugConsole {
  private logs: LogEntry[] = [];
  private config: DebugConfig;
  private maxEntries: number;

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: true,
      logLevel: 'debug',
      persistLogs: true,
      maxLogEntries: 1000,
      showTimestamps: true,
      showStackTrace: false,
      ...config
    };
    this.maxEntries = this.config.maxLogEntries;

    // Load persisted logs
    if (this.config.persistLogs) {
      this.loadPersistedLogs();
    }

    // Intercept console methods
    this.interceptConsoleMethods();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private interceptConsoleMethods(): void {
    if (!this.config.enabled) return;

    const originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);

    Object.entries(originalMethods).forEach(([method, originalFn]) => {
      const methodLevelIndex = levels.indexOf(method === 'log' ? 'info' : method);
      
      (console as any)[method] = (...args: any[]) => {
        // Call original method
        originalFn.apply(console, args);

        // Only log if level is appropriate
        if (methodLevelIndex >= configLevelIndex) {
          this.addLog(method, args.join(' '), args.length > 1 ? args : undefined);
        }
      };
    });
  }

  private addLog(level: string, message: string, data?: any): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      data,
      stackTrace: this.config.showStackTrace ? new Error().stack : undefined
    };

    this.logs.push(entry);

    // Maintain max entries
    if (this.logs.length > this.maxEntries) {
      this.logs.shift();
    }

    // Persist if enabled
    if (this.config.persistLogs) {
      this.persistLogs();
    }

    // Broadcast to debug panel
    this.broadcastLog(entry);
  }

  private loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem('debug-console-logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persisted debug logs:', error);
    }
  }

  private persistLogs(): void {
    try {
      localStorage.setItem('debug-console-logs', JSON.stringify(this.logs.slice(-100)));
    } catch (error) {
      console.warn('Failed to persist debug logs:', error);
    }
  }

  private broadcastLog(entry: LogEntry): void {
    window.dispatchEvent(new CustomEvent('debug:log', { detail: entry }));
  }

  public getLogs(filter?: { level?: string; component?: string; since?: number }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level) {
        filtered = filtered.filter(log => log.level === filter.level);
      }
      if (filter.component) {
        filtered = filtered.filter(log => log.component === filter.component);
      }
      if (filter.since !== undefined) {
        filtered = filtered.filter(log => log.timestamp >= filter.since!);
      }
    }

    return filtered;
  }

  public getStats(): DebugStats {
    const stats: DebugStats = {
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.level === 'error').length,
      warningCount: this.logs.filter(log => log.level === 'warn').length,
      componentCounts: {},
      recentErrors: this.logs
        .filter(log => log.level === 'error')
        .slice(-5)
    };

    // Count logs by component
    this.logs.forEach(log => {
      if (log.component) {
        stats.componentCounts[log.component] = (stats.componentCounts[log.component] || 0) + 1;
      }
    });

    return stats;
  }

  public clearLogs(): void {
    this.logs = [];
    if (this.config.persistLogs) {
      localStorage.removeItem('debug-console-logs');
    }
    window.dispatchEvent(new CustomEvent('debug:cleared'));
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Component state tracker for React debugging
 */
class ComponentStateTracker {
  private components: Map<string, ComponentState> = new Map();
  private renderCounts: Map<string, number> = new Map();

  public trackComponent(componentName: string, props: any, state?: any, hooks?: any[]): void {
    const existing = this.components.get(componentName);
    const renderCount = (this.renderCounts.get(componentName) || 0) + 1;
    
    this.renderCounts.set(componentName, renderCount);
    
    const componentState: ComponentState = {
      component: componentName,
      props,
      state,
      hooks: hooks || [],
      renders: renderCount,
      lastUpdate: Date.now()
    };

    this.components.set(componentName, componentState);

    // Detect excessive renders
    if (renderCount > 50 && renderCount % 10 === 0) {
      console.warn(`Component ${componentName} has rendered ${renderCount} times. Potential performance issue.`);
    }

    // Broadcast state change
    window.dispatchEvent(new CustomEvent('debug:component-update', {
      detail: { componentName, componentState }
    }));
  }

  public getComponentState(componentName: string): ComponentState | undefined {
    return this.components.get(componentName);
  }

  public getAllComponents(): ComponentState[] {
    return Array.from(this.components.values());
  }

  public getExcessiveRenderComponents(threshold: number = 20): ComponentState[] {
    return Array.from(this.components.values())
      .filter(comp => comp.renders > threshold)
      .sort((a, b) => b.renders - a.renders);
  }

  public clearTracking(): void {
    this.components.clear();
    this.renderCounts.clear();
    window.dispatchEvent(new CustomEvent('debug:components-cleared'));
  }
}

/**
 * Network request debugger
 */
class NetworkDebugger {
  private requests: Map<string, NetworkRequest> = new Map();
  private intercepted: boolean = false;

  public startIntercepting(): void {
    if (this.intercepted) return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestId = this.generateId();
      const url = input instanceof Request ? input.url : input.toString();
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      
      const request: NetworkRequest = {
        id: requestId,
        url,
        method,
        timestamp: Date.now(),
        headers: this.extractHeaders(init?.headers || {}),
        body: init?.body
      };

      this.requests.set(requestId, request);
      
      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - request.timestamp;
        
        // Update request with response info
        this.requests.set(requestId, {
          ...request,
          status: response.status,
          duration,
          response: await this.extractResponseData(response.clone())
        });

        this.broadcastRequest(this.requests.get(requestId)!);
        return response;
      } catch (error) {
        const duration = Date.now() - request.timestamp;
        
        this.requests.set(requestId, {
          ...request,
          duration,
          error: error instanceof Error ? error.message : String(error)
        });

        this.broadcastRequest(this.requests.get(requestId)!);
        throw error;
      }
    };

    this.intercepted = true;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private extractHeaders(headers: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        result[key] = value;
      });
    }
    
    return result;
  }

  private async extractResponseData(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text();
      }
      return '[Binary Data]';
    } catch {
      return '[Could not parse response]';
    }
  }

  private broadcastRequest(request: NetworkRequest): void {
    window.dispatchEvent(new CustomEvent('debug:network-request', { detail: request }));
  }

  public getRequests(filter?: { status?: number; method?: string; url?: string }): NetworkRequest[] {
    let requests = Array.from(this.requests.values());

    if (filter) {
      if (filter.status) {
        requests = requests.filter(req => req.status === filter.status);
      }
      if (filter.method) {
        requests = requests.filter(req => req.method === filter.method);
      }
      if (filter.url) {
        requests = requests.filter(req => req.url.includes(filter.url!));
      }
    }

    return requests.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getSlowRequests(threshold: number = 1000): NetworkRequest[] {
    return Array.from(this.requests.values())
      .filter(req => req.duration && req.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  public getFailedRequests(): NetworkRequest[] {
    return Array.from(this.requests.values())
      .filter(req => req.error || (req.status && req.status >= 400));
  }

  public clearRequests(): void {
    this.requests.clear();
    window.dispatchEvent(new CustomEvent('debug:network-cleared'));
  }

  public stopIntercepting(): void {
    // Note: In a real implementation, you'd need to restore the original fetch
    // This is a simplified version for demonstration
    this.intercepted = false;
  }
}

/**
 * Main debug tools manager
 */
export class DebugTools {
  private static instance: DebugTools;
  
  public console: DebugConsole;
  public componentTracker: ComponentStateTracker;
  public networkDebugger: NetworkDebugger;
  private panelVisible: boolean = false;

  private constructor() {
    this.console = new DebugConsole();
    this.componentTracker = new ComponentStateTracker();
    this.networkDebugger = new NetworkDebugger();
    
    this.setupKeyboardShortcuts();
    this.setupDebugPanel();
  }

  public static getInstance(): DebugTools {
    if (!DebugTools.instance) {
      DebugTools.instance = new DebugTools();
    }
    return DebugTools.instance;
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + D to toggle debug panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggleDebugPanel();
      }
      
      // Ctrl/Cmd + Shift + C to clear all debug data
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.clearAllDebugData();
      }
    });
  }

  private setupDebugPanel(): void {
    if (process.env.NODE_ENV === 'production') return;

    // Create debug panel container
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
      z-index: 10000;
      font-family: monospace;
      font-size: 12px;
      overflow: auto;
      display: none;
    `;

    document.body.appendChild(panel);
    this.updateDebugPanel();

    // Listen for debug events
    window.addEventListener('debug:log', () => this.updateDebugPanel());
    window.addEventListener('debug:component-update', () => this.updateDebugPanel());
    window.addEventListener('debug:network-request', () => this.updateDebugPanel());
  }

  private updateDebugPanel(): void {
    const panel = document.getElementById('debug-panel');
    if (!panel || !this.panelVisible) return;

    const stats = this.console.getStats();
    const recentLogs = this.console.getLogs().slice(-5);
    const excessiveRenders = this.componentTracker.getExcessiveRenderComponents(10);
    const slowRequests = this.networkDebugger.getSlowRequests(500);

    panel.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0;">Debug Panel</h3>
        <div>Logs: ${stats.totalLogs} | Errors: ${stats.errorCount} | Warnings: ${stats.warningCount}</div>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0;">Recent Logs</h4>
        ${recentLogs.map(log => `
          <div style="margin-bottom: 4px; color: ${this.getLogColor(log.level)};">
            [${log.level.toUpperCase()}] ${log.message}
          </div>
        `).join('')}
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0;">Performance Issues</h4>
        ${excessiveRenders.slice(0, 3).map(comp => `
          <div style="margin-bottom: 4px; color: orange;">
            ${comp.component}: ${comp.renders} renders
          </div>
        `).join('') || '<div>No issues detected</div>'}
      </div>
      
      <div>
        <h4 style="margin: 0 0 8px 0;">Slow Requests</h4>
        ${slowRequests.slice(0, 3).map(req => `
          <div style="margin-bottom: 4px; color: red;">
            ${req.method} ${req.url}: ${req.duration}ms
          </div>
        `).join('') || '<div>No slow requests</div>'}
      </div>
    `;
  }

  private getLogColor(level: string): string {
    switch (level) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#ffa500';
      case 'info': return '#4ecdc4';
      case 'debug': return '#95a5a6';
      default: return 'white';
    }
  }

  public toggleDebugPanel(): void {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      this.panelVisible = !this.panelVisible;
      panel.style.display = this.panelVisible ? 'block' : 'none';
      if (this.panelVisible) {
        this.updateDebugPanel();
      }
    }
  }

  public clearAllDebugData(): void {
    this.console.clearLogs();
    this.componentTracker.clearTracking();
    this.networkDebugger.clearRequests();
    console.log('All debug data cleared');
  }

  public startNetworkInterception(): void {
    this.networkDebugger.startIntercepting();
  }

  public generateReport(): string {
    const stats = this.console.getStats();
    const components = this.componentTracker.getAllComponents();
    const requests = this.networkDebugger.getRequests();

    const report = {
      timestamp: new Date().toISOString(),
      stats,
      excessiveRenders: this.componentTracker.getExcessiveRenderComponents(),
      slowRequests: this.networkDebugger.getSlowRequests(),
      failedRequests: this.networkDebugger.getFailedRequests(),
      recentLogs: this.console.getLogs().slice(-20),
      componentSummary: components.length,
      networkSummary: requests.length
    };

    return JSON.stringify(report, null, 2);
  }
}

// Global debug instance
export const debugTools = DebugTools.getInstance();

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).debugTools = debugTools;
  debugTools.startNetworkInterception();
  
  console.log('🔧 Debug Tools loaded. Press Ctrl/Cmd + Shift + D to toggle debug panel');
  console.log('🔧 Available: window.debugTools');
}