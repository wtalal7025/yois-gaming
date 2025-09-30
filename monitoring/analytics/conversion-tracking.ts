/**
 * Conversion Tracking and Retention Analytics System
 * Tracks user conversion events, funnel analysis, and retention metrics
 */

// Types for conversion tracking
export interface ConversionEvent {
  id: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  type: ConversionType;
  category: ConversionCategory;
  value?: number;
  currency?: string;
  properties: Record<string, any>;
  attribution: ConversionAttribution;
  funnel: FunnelStep[];
}

export interface ConversionAttribution {
  source: string;
  medium: string;
  campaign?: string;
  referrer?: string;
  landingPage: string;
  timeToConversion: number;
  touchpoints: Touchpoint[];
}

export interface Touchpoint {
  timestamp: number;
  type: 'page_view' | 'ad_click' | 'email_click' | 'social_click' | 'organic' | 'direct';
  source: string;
  medium?: string;
  campaign?: string;
  value?: number;
}

export interface FunnelStep {
  name: string;
  timestamp: number;
  completed: boolean;
  value?: number;
  properties?: Record<string, any>;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  steps: FunnelStepDefinition[];
  timeWindow: number; // Time window in milliseconds
  isActive: boolean;
}

export interface FunnelStepDefinition {
  name: string;
  eventType: string;
  eventAction: string;
  required: boolean;
  order: number;
  conditions?: Record<string, any>;
}

export interface ConversionMetrics {
  funnelId?: string;
  timeRange: {
    start: number;
    end: number;
  };
  totalUsers: number;
  conversions: number;
  conversionRate: number;
  averageTimeToConversion: number;
  averageValue: number;
  totalValue: number;
  funnel: FunnelAnalysis[];
  cohorts: CohortAnalysis[];
  attribution: AttributionAnalysis;
}

export interface FunnelAnalysis {
  step: string;
  users: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  averageTime: number;
}

export interface CohortAnalysis {
  cohort: string;
  size: number;
  periods: CohortPeriod[];
}

export interface CohortPeriod {
  period: number;
  users: number;
  retention: number;
  conversions: number;
  revenue: number;
}

export interface AttributionAnalysis {
  channels: ChannelAttribution[];
  touchpoints: TouchpointAttribution[];
  timeDecay: TimeDecayAttribution[];
}

export interface ChannelAttribution {
  channel: string;
  users: number;
  conversions: number;
  revenue: number;
  cost?: number;
  roi?: number;
  attribution: {
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
    positionBased: number;
  };
}

export interface TouchpointAttribution {
  touchpoint: string;
  influence: number;
  conversions: number;
  averagePosition: number;
}

export interface TimeDecayAttribution {
  period: string;
  weight: number;
  conversions: number;
  revenue: number;
}

export interface RetentionMetrics {
  userCohorts: UserCohort[];
  retentionCurves: RetentionCurve[];
  churnAnalysis: ChurnAnalysis;
  ltv: LTVAnalysis;
}

export interface UserCohort {
  cohortDate: string;
  initialSize: number;
  retentionRates: Array<{
    period: number;
    users: number;
    rate: number;
  }>;
}

export interface RetentionCurve {
  segment: string;
  periods: Array<{
    period: number;
    retention: number;
  }>;
}

export interface ChurnAnalysis {
  overall: {
    rate: number;
    averageLifespan: number;
  };
  bySegment: Array<{
    segment: string;
    churnRate: number;
    factors: Array<{
      factor: string;
      impact: number;
    }>;
  }>;
  predictions: Array<{
    userId: string;
    churnProbability: number;
    factors: string[];
  }>;
}

export interface LTVAnalysis {
  overall: {
    averageLTV: number;
    medianLTV: number;
  };
  bySegment: Array<{
    segment: string;
    averageLTV: number;
    predictedLTV: number;
  }>;
  cohorts: Array<{
    cohort: string;
    currentLTV: number;
    projectedLTV: number;
  }>;
}

export type ConversionType = 
  | 'registration'
  | 'email_signup'
  | 'first_deposit'
  | 'first_bet'
  | 'purchase'
  | 'subscription'
  | 'game_played'
  | 'level_completed'
  | 'feature_used'
  | 'goal_achieved'
  | 'custom';

export type ConversionCategory = 
  | 'acquisition'
  | 'activation'
  | 'engagement'
  | 'retention'
  | 'revenue'
  | 'referral';

/**
 * Conversion Event Tracker
 */
class ConversionEventTracker {
  private events: ConversionEvent[] = [];
  private touchpoints: Map<string, Touchpoint[]> = new Map();

  /**
   * Track conversion event
   */
  track(
    type: ConversionType,
    category: ConversionCategory,
    properties: Record<string, any> = {},
    value?: number,
    currency = 'USD',
    userId?: string,
    sessionId?: string
  ): string {
    const eventId = this.generateEventId();
    const timestamp = Date.now();

    const event: ConversionEvent = {
      id: eventId,
      userId,
      sessionId: sessionId || this.getCurrentSessionId(),
      timestamp,
      type,
      category,
      value,
      currency,
      properties,
      attribution: this.buildAttribution(userId || sessionId || 'anonymous', timestamp),
      funnel: [], // Will be populated by funnel analyzer
    };

    this.events.push(event);
    return eventId;
  }

  /**
   * Track touchpoint
   */
  trackTouchpoint(
    userId: string,
    type: Touchpoint['type'],
    source: string,
    medium?: string,
    campaign?: string,
    value?: number
  ): void {
    const touchpoint: Touchpoint = {
      timestamp: Date.now(),
      type,
      source,
      medium,
      campaign,
      value,
    };

    const userTouchpoints = this.touchpoints.get(userId) || [];
    userTouchpoints.push(touchpoint);
    
    // Keep only last 50 touchpoints per user
    if (userTouchpoints.length > 50) {
      userTouchpoints.splice(0, userTouchpoints.length - 50);
    }
    
    this.touchpoints.set(userId, userTouchpoints);
  }

  /**
   * Get conversion events
   */
  getEvents(filter?: {
    userId?: string;
    type?: ConversionType;
    category?: ConversionCategory;
    dateRange?: { start: number; end: number };
  }): ConversionEvent[] {
    let filtered = this.events;

    if (filter) {
      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId);
      }
      if (filter.type) {
        filtered = filtered.filter(e => e.type === filter.type);
      }
      if (filter.category) {
        filtered = filtered.filter(e => e.category === filter.category);
      }
      if (filter.dateRange) {
        filtered = filtered.filter(e => 
          e.timestamp >= filter.dateRange!.start && 
          e.timestamp <= filter.dateRange!.end
        );
      }
    }

    return filtered;
  }

  /**
   * Get user touchpoints
   */
  getUserTouchpoints(userId: string): Touchpoint[] {
    return this.touchpoints.get(userId) || [];
  }

  private buildAttribution(userKey: string, conversionTime: number): ConversionAttribution {
    const touchpoints = this.getUserTouchpoints(userKey);
    const landingPage = this.getLandingPage(userKey);
    const firstTouchpoint = touchpoints[0];
    
    const timeToConversion = firstTouchpoint 
      ? conversionTime - firstTouchpoint.timestamp 
      : 0;

    return {
      source: firstTouchpoint?.source || 'direct',
      medium: firstTouchpoint?.medium || 'none',
      campaign: firstTouchpoint?.campaign,
      referrer: this.getReferrer(userKey),
      landingPage,
      timeToConversion,
      touchpoints: touchpoints.slice(-10), // Last 10 touchpoints
    };
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('session-id') || 'unknown';
  }

  private getLandingPage(userKey: string): string {
    return localStorage.getItem(`landing-${userKey}`) || window.location.pathname;
  }

  private getReferrer(userKey: string): string {
    return document.referrer || 'direct';
  }

  private generateEventId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Funnel Analyzer
 */
class FunnelAnalyzer {
  private funnels: Map<string, ConversionFunnel> = new Map();

  /**
   * Define conversion funnel
   */
  defineFunnel(
    name: string,
    steps: FunnelStepDefinition[],
    timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): string {
    const funnelId = this.generateFunnelId();
    
    const funnel: ConversionFunnel = {
      id: funnelId,
      name,
      steps: steps.sort((a, b) => a.order - b.order),
      timeWindow,
      isActive: true,
    };

    this.funnels.set(funnelId, funnel);
    return funnelId;
  }

  /**
   * Analyze user journey through funnel
   */
  analyzeUserJourney(
    userId: string,
    events: ConversionEvent[],
    funnelId: string
  ): FunnelStep[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const userEvents = events.filter(e => e.userId === userId);
    const steps: FunnelStep[] = [];

    for (const stepDef of funnel.steps) {
      const matchingEvent = userEvents.find(e => 
        e.type === stepDef.eventType && 
        this.matchesConditions(e, stepDef.conditions)
      );

      const step: FunnelStep = {
        name: stepDef.name,
        timestamp: matchingEvent?.timestamp || 0,
        completed: !!matchingEvent,
        value: matchingEvent?.value,
        properties: matchingEvent?.properties,
      };

      steps.push(step);

      // If this is a required step and not completed, break
      if (stepDef.required && !step.completed) {
        break;
      }
    }

    return steps;
  }

  /**
   * Calculate funnel metrics
   */
  calculateFunnelMetrics(
    funnelId: string,
    events: ConversionEvent[],
    timeRange: { start: number; end: number }
  ): FunnelAnalysis[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const relevantEvents = events.filter(e => 
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    const userIds = [...new Set(relevantEvents.map(e => e.userId).filter(Boolean))];
    const analysis: FunnelAnalysis[] = [];

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      const stepUsers = new Set<string>();
      let totalTime = 0;
      let timeCount = 0;

      // Find users who completed this step
      for (const userId of userIds) {
        const userJourney = this.analyzeUserJourney(userId!, relevantEvents, funnelId);
        if (userJourney[i]?.completed) {
          stepUsers.add(userId!);
          if (userJourney[i].timestamp > 0) {
            totalTime += userJourney[i].timestamp - (userJourney[0]?.timestamp || 0);
            timeCount++;
          }
        }
      }

      const stepUserCount = stepUsers.size;
      const previousStepCount = i === 0 ? userIds.length : analysis[i - 1].users;
      const conversionRate = previousStepCount > 0 ? (stepUserCount / previousStepCount) * 100 : 0;
      const dropoffRate = 100 - conversionRate;
      const averageTime = timeCount > 0 ? totalTime / timeCount : 0;

      analysis.push({
        step: step.name,
        users: stepUserCount,
        conversions: stepUserCount,
        conversionRate,
        dropoffRate,
        averageTime,
      });
    }

    return analysis;
  }

  private matchesConditions(event: ConversionEvent, conditions?: Record<string, any>): boolean {
    if (!conditions) return true;

    return Object.entries(conditions).every(([key, value]) => {
      const eventValue = event.properties[key];
      return eventValue === value;
    });
  }

  private generateFunnelId(): string {
    return `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

/**
 * Cohort Analyzer
 */
class CohortAnalyzer {
  /**
   * Calculate cohort analysis
   */
  calculateCohortAnalysis(
    events: ConversionEvent[],
    cohortType: 'daily' | 'weekly' | 'monthly' = 'weekly',
    periods = 12
  ): CohortAnalysis[] {
    const cohorts = this.groupEventsByCohort(events, cohortType);
    const analysis: CohortAnalysis[] = [];

    for (const [cohortDate, cohortEvents] of cohorts.entries()) {
      const userIds = [...new Set(cohortEvents.map(e => e.userId).filter(Boolean))];
      const cohortSize = userIds.length;
      
      const periodData: CohortPeriod[] = [];
      
      for (let period = 0; period < periods; period++) {
        const periodStart = this.getCohortPeriodStart(cohortDate, cohortType, period);
        const periodEnd = this.getCohortPeriodEnd(cohortDate, cohortType, period);
        
        const periodEvents = events.filter(e => 
          userIds.includes(e.userId!) &&
          e.timestamp >= periodStart &&
          e.timestamp < periodEnd
        );

        const periodUsers = [...new Set(periodEvents.map(e => e.userId))].length;
        const retention = cohortSize > 0 ? (periodUsers / cohortSize) * 100 : 0;
        const conversions = periodEvents.length;
        const revenue = periodEvents.reduce((sum, e) => sum + (e.value || 0), 0);

        periodData.push({
          period,
          users: periodUsers,
          retention,
          conversions,
          revenue,
        });
      }

      analysis.push({
        cohort: cohortDate,
        size: cohortSize,
        periods: periodData,
      });
    }

    return analysis.sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  private groupEventsByCohort(
    events: ConversionEvent[],
    cohortType: 'daily' | 'weekly' | 'monthly'
  ): Map<string, ConversionEvent[]> {
    const cohorts = new Map<string, ConversionEvent[]>();

    for (const event of events) {
      if (!event.userId) continue;

      const cohortKey = this.getCohortKey(event.timestamp, cohortType);
      const cohortEvents = cohorts.get(cohortKey) || [];
      cohortEvents.push(event);
      cohorts.set(cohortKey, cohortEvents);
    }

    return cohorts;
  }

  private getCohortKey(timestamp: number, cohortType: 'daily' | 'weekly' | 'monthly'): string {
    const date = new Date(timestamp);
    
    switch (cohortType) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private getCohortPeriodStart(cohortDate: string, cohortType: string, period: number): number {
    const baseDate = new Date(cohortDate);
    
    switch (cohortType) {
      case 'daily':
        baseDate.setDate(baseDate.getDate() + period);
        break;
      case 'weekly':
        baseDate.setDate(baseDate.getDate() + (period * 7));
        break;
      case 'monthly':
        baseDate.setMonth(baseDate.getMonth() + period);
        break;
    }
    
    return baseDate.getTime();
  }

  private getCohortPeriodEnd(cohortDate: string, cohortType: string, period: number): number {
    const baseDate = new Date(cohortDate);
    
    switch (cohortType) {
      case 'daily':
        baseDate.setDate(baseDate.getDate() + period + 1);
        break;
      case 'weekly':
        baseDate.setDate(baseDate.getDate() + ((period + 1) * 7));
        break;
      case 'monthly':
        baseDate.setMonth(baseDate.getMonth() + period + 1);
        break;
    }
    
    return baseDate.getTime();
  }
}

/**
 * Attribution Analyzer
 */
class AttributionAnalyzer {
  /**
   * Calculate multi-touch attribution
   */
  calculateAttribution(events: ConversionEvent[]): AttributionAnalysis {
    return {
      channels: this.calculateChannelAttribution(events),
      touchpoints: this.calculateTouchpointAttribution(events),
      timeDecay: this.calculateTimeDecayAttribution(events),
    };
  }

  private calculateChannelAttribution(events: ConversionEvent[]): ChannelAttribution[] {
    const channels = new Map<string, {
      users: Set<string>;
      conversions: number;
      revenue: number;
      firstTouch: number;
      lastTouch: number;
      linear: number;
      timeDecay: number;
      positionBased: number;
    }>();

    for (const event of events) {
      const channel = event.attribution.source;
      
      if (!channels.has(channel)) {
        channels.set(channel, {
          users: new Set(),
          conversions: 0,
          revenue: 0,
          firstTouch: 0,
          lastTouch: 0,
          linear: 0,
          timeDecay: 0,
          positionBased: 0,
        });
      }

      const channelData = channels.get(channel)!;
      if (event.userId) channelData.users.add(event.userId);
      channelData.conversions++;
      channelData.revenue += event.value || 0;

      // Calculate attribution weights
      const touchpoints = event.attribution.touchpoints;
      if (touchpoints.length > 0) {
        // First touch
        if (touchpoints[0].source === channel) {
          channelData.firstTouch++;
        }

        // Last touch
        if (touchpoints[touchpoints.length - 1].source === channel) {
          channelData.lastTouch++;
        }

        // Linear
        const linearWeight = touchpoints.filter(t => t.source === channel).length / touchpoints.length;
        channelData.linear += linearWeight;

        // Time decay (more recent touchpoints get higher weight)
        let timeDecayWeight = 0;
        for (let i = 0; i < touchpoints.length; i++) {
          if (touchpoints[i].source === channel) {
            const decay = Math.pow(0.5, touchpoints.length - 1 - i);
            timeDecayWeight += decay;
          }
        }
        channelData.timeDecay += timeDecayWeight;

        // Position based (40% first, 40% last, 20% middle)
        let positionWeight = 0;
        for (let i = 0; i < touchpoints.length; i++) {
          if (touchpoints[i].source === channel) {
            if (i === 0) positionWeight += 0.4;
            else if (i === touchpoints.length - 1) positionWeight += 0.4;
            else positionWeight += 0.2 / Math.max(1, touchpoints.length - 2);
          }
        }
        channelData.positionBased += positionWeight;
      }
    }

    return Array.from(channels.entries()).map(([channel, data]) => ({
      channel,
      users: data.users.size,
      conversions: data.conversions,
      revenue: data.revenue,
      attribution: {
        firstTouch: data.firstTouch,
        lastTouch: data.lastTouch,
        linear: data.linear,
        timeDecay: data.timeDecay,
        positionBased: data.positionBased,
      },
    }));
  }

  private calculateTouchpointAttribution(events: ConversionEvent[]): TouchpointAttribution[] {
    const touchpoints = new Map<string, {
      influence: number;
      conversions: number;
      positions: number[];
    }>();

    for (const event of events) {
      for (let i = 0; i < event.attribution.touchpoints.length; i++) {
        const touchpoint = event.attribution.touchpoints[i];
        const key = `${touchpoint.source}_${touchpoint.type}`;
        
        if (!touchpoints.has(key)) {
          touchpoints.set(key, { influence: 0, conversions: 0, positions: [] });
        }

        const data = touchpoints.get(key)!;
        data.influence += 1 / event.attribution.touchpoints.length; // Linear attribution
        data.conversions++;
        data.positions.push(i);
      }
    }

    return Array.from(touchpoints.entries()).map(([touchpoint, data]) => ({
      touchpoint,
      influence: data.influence,
      conversions: data.conversions,
      averagePosition: data.positions.reduce((sum, pos) => sum + pos, 0) / data.positions.length,
    }));
  }

  private calculateTimeDecayAttribution(events: ConversionEvent[]): TimeDecayAttribution[] {
    const periods = new Map<string, { weight: number; conversions: number; revenue: number }>();
    
    for (const event of events) {
      const period = this.getPeriod(event.timestamp);
      
      if (!periods.has(period)) {
        periods.set(period, { weight: 0, conversions: 0, revenue: 0 });
      }

      const data = periods.get(period)!;
      data.conversions++;
      data.revenue += event.value || 0;
      
      // Calculate time decay weight based on recency
      const daysAgo = (Date.now() - event.timestamp) / (24 * 60 * 60 * 1000);
      data.weight += Math.pow(0.5, daysAgo / 7); // Half-life of 7 days
    }

    return Array.from(periods.entries()).map(([period, data]) => ({
      period,
      weight: data.weight,
      conversions: data.conversions,
      revenue: data.revenue,
    }));
  }

  private getPeriod(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Main Conversion Tracking Manager
 */
export class ConversionTrackingManager {
  private static instance: ConversionTrackingManager;
  private eventTracker: ConversionEventTracker;
  private funnelAnalyzer: FunnelAnalyzer;
  private cohortAnalyzer: CohortAnalyzer;
  private attributionAnalyzer: AttributionAnalyzer;
  private apiEndpoint: string;

  private constructor(apiEndpoint = '/api/analytics/conversions') {
    this.apiEndpoint = apiEndpoint;
    this.eventTracker = new ConversionEventTracker();
    this.funnelAnalyzer = new FunnelAnalyzer();
    this.cohortAnalyzer = new CohortAnalyzer();
    this.attributionAnalyzer = new AttributionAnalyzer();
  }

  static getInstance(apiEndpoint?: string): ConversionTrackingManager {
    if (!ConversionTrackingManager.instance) {
      ConversionTrackingManager.instance = new ConversionTrackingManager(apiEndpoint);
    }
    return ConversionTrackingManager.instance;
  }

  /**
   * Track conversion event
   */
  trackConversion(
    type: ConversionType,
    category: ConversionCategory,
    properties: Record<string, any> = {},
    value?: number,
    currency = 'USD',
    userId?: string,
    sessionId?: string
  ): string {
    return this.eventTracker.track(type, category, properties, value, currency, userId, sessionId);
  }

  /**
   * Track touchpoint
   */
  trackTouchpoint(
    userId: string,
    type: Touchpoint['type'],
    source: string,
    medium?: string,
    campaign?: string,
    value?: number
  ): void {
    this.eventTracker.trackTouchpoint(userId, type, source, medium, campaign, value);
  }

  /**
   * Define conversion funnel
   */
  defineFunnel(
    name: string,
    steps: FunnelStepDefinition[],
    timeWindow?: number
  ): string {
    return this.funnelAnalyzer.defineFunnel(name, steps, timeWindow);
  }

  /**
   * Get conversion metrics
   */
  getConversionMetrics(
    timeRange: { start: number; end: number },
    funnelId?: string
  ): ConversionMetrics {
    const events = this.eventTracker.getEvents({ dateRange: timeRange });
    const totalUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    const conversions = events.length;
    const conversionRate = totalUsers > 0 ? (conversions / totalUsers) * 100 : 0;

    const timesToConversion = events
      .map(e => e.attribution.timeToConversion)
      .filter(t => t > 0);
    const averageTimeToConversion = timesToConversion.length > 0
      ? timesToConversion.reduce((sum, time) => sum + time, 0) / timesToConversion.length
      : 0;

    const values = events.map(e => e.value || 0);
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    const averageValue = values.length > 0 ? totalValue / values.length : 0;

    return {
      funnelId,
      timeRange,
      totalUsers,
      conversions,
      conversionRate,
      averageTimeToConversion,
      averageValue,
      totalValue,
      funnel: funnelId ? this.funnelAnalyzer.calculateFunnelMetrics(funnelId, events, timeRange) : [],
      cohorts: this.cohortAnalyzer.calculateCohortAnalysis(events),
      attribution: this.attributionAnalyzer.calculateAttribution(events),
    };
  }

  /**
   * Send data to server
   */
  async flush(): Promise<void> {
    const events = this.eventTracker.getEvents();
    if (events.length === 0) return;

    try {
      await fetch(`${this.apiEndpoint}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send conversion data:', error);
    }
  }
}

// Export convenience functions
export const initializeConversionTracking = (apiEndpoint?: string) => {
  return ConversionTrackingManager.getInstance(apiEndpoint);
};

export const trackConversion = (
  type: ConversionType,
  category: ConversionCategory,
  properties?: Record<string, any>,
  value?: number,
  currency?: string,
  userId?: string,
  sessionId?: string
) => {
  const manager = ConversionTrackingManager.getInstance();
  return manager.trackConversion(type, category, properties, value, currency, userId, sessionId);
};

export const trackTouchpoint = (
  userId: string,
  type: Touchpoint['type'],
  source: string,
  medium?: string,
  campaign?: string,
  value?: number
) => {
  const manager = ConversionTrackingManager.getInstance();
  manager.trackTouchpoint(userId, type, source, medium, campaign, value);
};

// Default export
export default ConversionTrackingManager;