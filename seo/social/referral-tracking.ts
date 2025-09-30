/**
 * Social Referral Tracking System
 * Provides comprehensive tracking and analytics for social media referrals and user acquisition
 */

// Types for referral tracking
export interface SocialReferral {
  id: string;
  platform: SocialPlatform;
  sourceUrl: string;
  targetUrl: string;
  referrerUserId?: string;
  newUserId?: string;
  campaignId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  conversionData?: ReferralConversion;
  metadata: ReferralMetadata;
}

export interface ReferralConversion {
  type: ConversionType;
  value: number;
  currency: string;
  conversionTime: Date;
  gameId?: string;
  transactionId?: string;
}

export interface ReferralMetadata {
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  deviceInfo?: {
    platform: string;
    browser: string;
    version: string;
    mobile: boolean;
  };
  sessionInfo?: {
    sessionId: string;
    duration: number;
    pageViews: number;
  };
}

export interface ReferralCampaign {
  id: string;
  name: string;
  platform: SocialPlatform;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetUrl: string;
  utmParameters: UTMParameters;
  goals: ReferralGoal[];
  budget?: number;
  currentSpend?: number;
}

export interface UTMParameters {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  customParams?: Record<string, string>;
}

export interface ReferralGoal {
  type: ConversionType;
  target: number;
  reward: number;
  current: number;
  achieved: boolean;
}

export interface ReferralAnalytics {
  totalReferrals: number;
  conversionRate: number;
  averageValue: number;
  topPlatforms: Array<{ platform: SocialPlatform; count: number; value: number }>;
  topReferrers: Array<{ userId: string; referrals: number; value: number }>;
  campaignPerformance: Array<{ campaignId: string; referrals: number; conversions: number; roi: number }>;
  timeSeriesData: Array<{ date: string; referrals: number; conversions: number }>;
}

export type SocialPlatform = 
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'telegram'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'discord'
  | 'snapchat'
  | 'other';

export type ConversionType = 
  | 'registration'
  | 'deposit'
  | 'first_bet'
  | 'game_play'
  | 'purchase'
  | 'subscription'
  | 'engagement'
  | 'retention';

/**
 * UTM Parameter Builder
 */
class UTMParameterBuilder {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Build URL with UTM parameters
   */
  buildTrackedUrl(targetPath: string, params: UTMParameters): string {
    const url = new URL(targetPath, this.baseUrl);
    
    // Add standard UTM parameters
    url.searchParams.set('utm_source', params.source);
    url.searchParams.set('utm_medium', params.medium);
    url.searchParams.set('utm_campaign', params.campaign);
    
    if (params.term) {
      url.searchParams.set('utm_term', params.term);
    }
    
    if (params.content) {
      url.searchParams.set('utm_content', params.content);
    }
    
    // Add custom parameters
    if (params.customParams) {
      for (const [key, value] of Object.entries(params.customParams)) {
        url.searchParams.set(key, value);
      }
    }
    
    return url.toString();
  }

  /**
   * Parse UTM parameters from URL
   */
  parseUTMParameters(url: string): UTMParameters | null {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      const source = params.get('utm_source');
      const medium = params.get('utm_medium');
      const campaign = params.get('utm_campaign');
      
      if (!source || !medium || !campaign) {
        return null;
      }
      
      const customParams: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        if (!key.startsWith('utm_') && value) {
          customParams[key] = value;
        }
      }
      
      return {
        source,
        medium,
        campaign,
        term: params.get('utm_term') || undefined,
        content: params.get('utm_content') || undefined,
        customParams: Object.keys(customParams).length > 0 ? customParams : undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate campaign-specific UTM parameters
   */
  generateCampaignUTM(
    platform: SocialPlatform,
    campaignName: string,
    variant?: string
  ): UTMParameters {
    return {
      source: platform,
      medium: 'social',
      campaign: campaignName,
      content: variant,
      customParams: {
        timestamp: Date.now().toString(),
        platform_variant: variant || 'default'
      }
    };
  }
}

/**
 * Referral Tracker
 */
class ReferralTracker {
  private referrals: Map<string, SocialReferral> = new Map();
  private apiEndpoint: string;

  constructor(apiEndpoint = '/api/analytics/referrals') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Track new referral
   */
  async trackReferral(
    platform: SocialPlatform,
    sourceUrl: string,
    targetUrl: string,
    request: {
      ipAddress: string;
      userAgent: string;
      referrerUserId?: string;
      campaignId?: string;
    }
  ): Promise<string> {
    const referralId = this.generateReferralId();
    
    const referral: SocialReferral = {
      id: referralId,
      platform,
      sourceUrl,
      targetUrl,
      referrerUserId: request.referrerUserId,
      campaignId: request.campaignId,
      timestamp: new Date(),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      metadata: this.extractMetadata(request)
    };

    this.referrals.set(referralId, referral);
    await this.sendToServer(referral);
    
    return referralId;
  }

  /**
   * Track conversion for referral
   */
  async trackConversion(
    referralId: string,
    conversion: ReferralConversion,
    newUserId?: string
  ): Promise<void> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      console.warn('Referral not found for conversion tracking:', referralId);
      return;
    }

    referral.conversionData = conversion;
    if (newUserId) {
      referral.newUserId = newUserId;
    }

    await this.sendToServer(referral);
  }

  /**
   * Get referral by ID
   */
  getReferral(referralId: string): SocialReferral | undefined {
    return this.referrals.get(referralId);
  }

  /**
   * Get referrals by platform
   */
  getReferralsByPlatform(platform: SocialPlatform): SocialReferral[] {
    return Array.from(this.referrals.values()).filter(r => r.platform === platform);
  }

  /**
   * Get referrals by campaign
   */
  getReferralsByCampaign(campaignId: string): SocialReferral[] {
    return Array.from(this.referrals.values()).filter(r => r.campaignId === campaignId);
  }

  /**
   * Get all referrals
   */
  getAllReferrals(): SocialReferral[] {
    return Array.from(this.referrals.values());
  }

  private generateReferralId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMetadata(request: { userAgent: string; ipAddress: string }): ReferralMetadata {
    const metadata: ReferralMetadata = {};

    // Extract device info from user agent (simplified)
    const userAgent = request.userAgent.toLowerCase();
    metadata.deviceInfo = {
      platform: this.detectPlatform(userAgent),
      browser: this.detectBrowser(userAgent),
      version: 'unknown',
      mobile: /mobile|android|ios|iphone|ipad/.test(userAgent)
    };

    // In a real implementation, you would use a geolocation service
    metadata.geoLocation = {
      country: 'Unknown',
      region: 'Unknown', 
      city: 'Unknown'
    };

    return metadata;
  }

  private detectPlatform(userAgent: string): string {
    if (/windows/.test(userAgent)) return 'Windows';
    if (/mac/.test(userAgent)) return 'macOS';
    if (/linux/.test(userAgent)) return 'Linux';
    if (/android/.test(userAgent)) return 'Android';
    if (/ios|iphone|ipad/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private detectBrowser(userAgent: string): string {
    if (/chrome/.test(userAgent)) return 'Chrome';
    if (/firefox/.test(userAgent)) return 'Firefox';
    if (/safari/.test(userAgent)) return 'Safari';
    if (/edge/.test(userAgent)) return 'Edge';
    if (/opera/.test(userAgent)) return 'Opera';
    return 'Unknown';
  }

  private async sendToServer(referral: SocialReferral): Promise<void> {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(referral)
      });
    } catch (error) {
      console.error('Failed to send referral data:', error);
    }
  }
}

/**
 * Campaign Manager
 */
class ReferralCampaignManager {
  private campaigns: Map<string, ReferralCampaign> = new Map();
  private utmBuilder: UTMParameterBuilder;

  constructor(baseUrl: string) {
    this.utmBuilder = new UTMParameterBuilder(baseUrl);
  }

  /**
   * Create new referral campaign
   */
  createCampaign(
    name: string,
    platform: SocialPlatform,
    targetUrl: string,
    goals: ReferralGoal[],
    endDate?: Date
  ): string {
    const campaignId = this.generateCampaignId();
    const utmParams = this.utmBuilder.generateCampaignUTM(platform, name);

    const campaign: ReferralCampaign = {
      id: campaignId,
      name,
      platform,
      startDate: new Date(),
      endDate,
      isActive: true,
      targetUrl,
      utmParameters: utmParams,
      goals,
      currentSpend: 0
    };

    this.campaigns.set(campaignId, campaign);
    return campaignId;
  }

  /**
   * Get campaign tracking URL
   */
  getCampaignUrl(campaignId: string, variant?: string): string | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const utmParams = variant 
      ? { ...campaign.utmParameters, content: variant }
      : campaign.utmParameters;

    return this.utmBuilder.buildTrackedUrl(campaign.targetUrl, utmParams);
  }

  /**
   * Update campaign goals
   */
  updateCampaignGoals(campaignId: string, referrals: SocialReferral[]): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const campaignReferrals = referrals.filter(r => r.campaignId === campaignId);

    for (const goal of campaign.goals) {
      const relevantReferrals = campaignReferrals.filter(r => 
        r.conversionData?.type === goal.type
      );

      goal.current = relevantReferrals.length;
      goal.achieved = goal.current >= goal.target;
    }
  }

  /**
   * Get active campaigns
   */
  getActiveCampaigns(): ReferralCampaign[] {
    return Array.from(this.campaigns.values()).filter(c => 
      c.isActive && (!c.endDate || c.endDate > new Date())
    );
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): ReferralCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  private generateCampaignId(): string {
    return `camp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

/**
 * Analytics Calculator
 */
class ReferralAnalyticsCalculator {
  /**
   * Calculate referral analytics
   */
  calculateAnalytics(
    referrals: SocialReferral[],
    timeRange?: { start: Date; end: Date }
  ): ReferralAnalytics {
    let filteredReferrals = referrals;

    if (timeRange) {
      filteredReferrals = referrals.filter(r => 
        r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    const conversions = filteredReferrals.filter(r => r.conversionData);
    const totalValue = conversions.reduce((sum, r) => sum + (r.conversionData?.value || 0), 0);

    return {
      totalReferrals: filteredReferrals.length,
      conversionRate: filteredReferrals.length > 0 ? conversions.length / filteredReferrals.length : 0,
      averageValue: conversions.length > 0 ? totalValue / conversions.length : 0,
      topPlatforms: this.calculateTopPlatforms(filteredReferrals),
      topReferrers: this.calculateTopReferrers(filteredReferrals),
      campaignPerformance: this.calculateCampaignPerformance(filteredReferrals),
      timeSeriesData: this.calculateTimeSeriesData(filteredReferrals)
    };
  }

  private calculateTopPlatforms(referrals: SocialReferral[]): Array<{ platform: SocialPlatform; count: number; value: number }> {
    const platformStats = new Map<SocialPlatform, { count: number; value: number }>();

    for (const referral of referrals) {
      const stats = platformStats.get(referral.platform) || { count: 0, value: 0 };
      stats.count += 1;
      stats.value += referral.conversionData?.value || 0;
      platformStats.set(referral.platform, stats);
    }

    return Array.from(platformStats.entries())
      .map(([platform, stats]) => ({ platform, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateTopReferrers(referrals: SocialReferral[]): Array<{ userId: string; referrals: number; value: number }> {
    const referrerStats = new Map<string, { referrals: number; value: number }>();

    for (const referral of referrals) {
      if (!referral.referrerUserId) continue;

      const stats = referrerStats.get(referral.referrerUserId) || { referrals: 0, value: 0 };
      stats.referrals += 1;
      stats.value += referral.conversionData?.value || 0;
      referrerStats.set(referral.referrerUserId, stats);
    }

    return Array.from(referrerStats.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10);
  }

  private calculateCampaignPerformance(referrals: SocialReferral[]): Array<{ campaignId: string; referrals: number; conversions: number; roi: number }> {
    const campaignStats = new Map<string, { referrals: number; conversions: number; value: number }>();

    for (const referral of referrals) {
      if (!referral.campaignId) continue;

      const stats = campaignStats.get(referral.campaignId) || { referrals: 0, conversions: 0, value: 0 };
      stats.referrals += 1;
      
      if (referral.conversionData) {
        stats.conversions += 1;
        stats.value += referral.conversionData.value;
      }
      
      campaignStats.set(referral.campaignId, stats);
    }

    return Array.from(campaignStats.entries())
      .map(([campaignId, stats]) => ({
        campaignId,
        referrals: stats.referrals,
        conversions: stats.conversions,
        roi: stats.referrals > 0 ? stats.value / stats.referrals : 0
      }))
      .sort((a, b) => b.roi - a.roi);
  }

  private calculateTimeSeriesData(referrals: SocialReferral[]): Array<{ date: string; referrals: number; conversions: number }> {
    const dailyStats = new Map<string, { referrals: number; conversions: number }>();

    for (const referral of referrals) {
      const date = referral.timestamp.toISOString().split('T')[0];
      const stats = dailyStats.get(date) || { referrals: 0, conversions: 0 };
      
      stats.referrals += 1;
      if (referral.conversionData) {
        stats.conversions += 1;
      }
      
      dailyStats.set(date, stats);
    }

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

/**
 * Main Social Referral Tracking Manager
 */
export class SocialReferralManager {
  private static instance: SocialReferralManager;
  private tracker: ReferralTracker;
  private campaignManager: ReferralCampaignManager;
  private analyticsCalculator: ReferralAnalyticsCalculator;
  private utmBuilder: UTMParameterBuilder;

  private constructor() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
    this.tracker = new ReferralTracker();
    this.campaignManager = new ReferralCampaignManager(baseUrl);
    this.analyticsCalculator = new ReferralAnalyticsCalculator();
    this.utmBuilder = new UTMParameterBuilder(baseUrl);
  }

  static getInstance(): SocialReferralManager {
    if (!SocialReferralManager.instance) {
      SocialReferralManager.instance = new SocialReferralManager();
    }
    return SocialReferralManager.instance;
  }

  /**
   * Initialize referral tracking
   */
  initialize(): void {
    console.log('Social referral tracking system initialized');
    this.setupReferralDetection();
  }

  /**
   * Track referral from request
   */
  async trackReferralFromRequest(
    request: Request,
    platform: SocialPlatform = 'other'
  ): Promise<string> {
    const url = new URL(request.url);
    const referrer = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = this.extractIpAddress(request);

    // Try to detect platform from referrer or UTM source
    const detectedPlatform = this.detectPlatformFromUrl(referrer) || 
                            this.detectPlatformFromUTM(url) || 
                            platform;

    const utmParams = this.utmBuilder.parseUTMParameters(request.url);
    const campaignId = utmParams?.campaign;

    return this.tracker.trackReferral(
      detectedPlatform,
      referrer,
      request.url,
      {
        ipAddress,
        userAgent,
        campaignId
      }
    );
  }

  /**
   * Track conversion
   */
  async trackConversion(
    referralId: string,
    type: ConversionType,
    value: number,
    currency = 'USD',
    gameId?: string,
    transactionId?: string,
    newUserId?: string
  ): Promise<void> {
    const conversion: ReferralConversion = {
      type,
      value,
      currency,
      conversionTime: new Date(),
      gameId,
      transactionId
    };

    await this.tracker.trackConversion(referralId, conversion, newUserId);
  }

  /**
   * Create referral campaign
   */
  createCampaign(
    name: string,
    platform: SocialPlatform,
    targetUrl: string,
    goals: ReferralGoal[],
    endDate?: Date
  ): string {
    return this.campaignManager.createCampaign(name, platform, targetUrl, goals, endDate);
  }

  /**
   * Get campaign tracking URL
   */
  getCampaignUrl(campaignId: string, variant?: string): string | null {
    return this.campaignManager.getCampaignUrl(campaignId, variant);
  }

  /**
   * Get analytics
   */
  getAnalytics(timeRange?: { start: Date; end: Date }): ReferralAnalytics {
    const referrals = this.getAllReferrals();
    return this.analyticsCalculator.calculateAnalytics(referrals, timeRange);
  }

  /**
   * Get all referrals (helper method)
   */
  private getAllReferrals(): SocialReferral[] {
    return this.tracker.getAllReferrals();
  }

  /**
   * Get active campaigns
   */
  getActiveCampaigns(): ReferralCampaign[] {
    return this.campaignManager.getActiveCampaigns();
  }

  private setupReferralDetection(): void {
    // Setup automatic referral detection on page load
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const referrer = document.referrer;
      
      if (referrer || urlParams.has('utm_source')) {
        // Store referral information in session storage
        const referralData = {
          referrer,
          timestamp: Date.now(),
          utm: Object.fromEntries(urlParams.entries())
        };
        
        sessionStorage.setItem('social_referral', JSON.stringify(referralData));
      }
    }
  }

  private detectPlatformFromUrl(url: string): SocialPlatform | null {
    if (!url) return null;

    const domain = this.extractDomain(url);
    const platformMap: Record<string, SocialPlatform> = {
      'facebook.com': 'facebook',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'linkedin.com': 'linkedin',
      'reddit.com': 'reddit',
      'whatsapp.com': 'whatsapp',
      't.me': 'telegram',
      'tiktok.com': 'tiktok',
      'youtube.com': 'youtube',
      'pinterest.com': 'pinterest',
      'discord.com': 'discord',
      'snapchat.com': 'snapchat'
    };

    return platformMap[domain] || null;
  }

  private detectPlatformFromUTM(url: URL): SocialPlatform | null {
    const source = url.searchParams.get('utm_source');
    if (!source) return null;

    return source as SocialPlatform;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private extractIpAddress(request: Request): string {
    // In a real implementation, you'd extract this from headers
    return 'unknown';
  }
}

// Export convenience functions
export const socialReferralManager = SocialReferralManager.getInstance();

export const initializeSocialReferrals = () => socialReferralManager.initialize();

export const trackReferralFromRequest = (request: Request, platform?: SocialPlatform) =>
  socialReferralManager.trackReferralFromRequest(request, platform);

export const trackConversion = (
  referralId: string,
  type: ConversionType,
  value: number,
  currency?: string,
  gameId?: string,
  transactionId?: string,
  newUserId?: string
) => socialReferralManager.trackConversion(referralId, type, value, currency, gameId, transactionId, newUserId);

export const createReferralCampaign = (
  name: string,
  platform: SocialPlatform,
  targetUrl: string,
  goals: ReferralGoal[],
  endDate?: Date
) => socialReferralManager.createCampaign(name, platform, targetUrl, goals, endDate);

// Default export
export default SocialReferralManager;