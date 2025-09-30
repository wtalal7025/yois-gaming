/**
 * Social Sharing Functionality System
 * Provides comprehensive social media sharing capabilities with analytics and customization
 */

// Types for social sharing
export interface SocialShareConfig {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
  via?: string;
  customParams?: Record<string, string>;
}

export interface SocialPlatformConfig {
  name: SocialPlatform;
  enabled: boolean;
  customization?: {
    buttonText?: string;
    buttonStyle?: string;
    iconClass?: string;
    color?: string;
  };
  tracking?: {
    category?: string;
    action?: string;
    label?: string;
  };
}

export interface SocialShareButton {
  platform: SocialPlatform;
  url: string;
  text: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export interface SocialShareAnalytics {
  platform: SocialPlatform;
  url: string;
  timestamp: Date;
  userId?: string;
  source?: string;
  campaign?: string;
}

export type SocialPlatform = 
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'telegram'
  | 'pinterest'
  | 'tumblr'
  | 'email'
  | 'copy-link'
  | 'print';

export interface GameShareData {
  gameId: string;
  name: string;
  category: string;
  url: string;
  image: string;
  description: string;
  score?: number;
  achievement?: string;
}

export interface ShareModalConfig {
  title: string;
  platforms: SocialPlatform[];
  customMessage?: string;
  showAnalytics?: boolean;
  onShare?: (platform: SocialPlatform, success: boolean) => void;
  onClose?: () => void;
}

/**
 * Social Platform URL Generator
 */
class SocialPlatformUrls {
  private baseUrls: Record<SocialPlatform, string> = {
    facebook: 'https://www.facebook.com/sharer/sharer.php',
    twitter: 'https://twitter.com/intent/tweet',
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
    reddit: 'https://www.reddit.com/submit',
    whatsapp: 'https://wa.me/',
    telegram: 'https://t.me/share/url',
    pinterest: 'https://pinterest.com/pin/create/button/',
    tumblr: 'https://www.tumblr.com/widgets/share/tool',
    email: 'mailto:',
    'copy-link': '',
    print: ''
  };

  /**
   * Generate share URL for platform
   */
  generateShareUrl(platform: SocialPlatform, config: SocialShareConfig): string {
    const baseUrl = this.baseUrls[platform];
    
    switch (platform) {
      case 'facebook':
        return this.buildUrl(baseUrl, {
          u: config.url,
          quote: config.title,
          hashtag: config.hashtags ? `#${config.hashtags[0]}` : undefined
        });

      case 'twitter':
        return this.buildUrl(baseUrl, {
          url: config.url,
          text: config.title,
          hashtags: config.hashtags?.join(','),
          via: config.via,
          ...config.customParams
        });

      case 'linkedin':
        return this.buildUrl(baseUrl, {
          url: config.url,
          title: config.title,
          summary: config.description,
          source: config.via || 'Gaming Platform'
        });

      case 'reddit':
        return this.buildUrl(baseUrl, {
          url: config.url,
          title: config.title
        });

      case 'whatsapp':
        const whatsappText = `${config.title}\n${config.description || ''}\n${config.url}`;
        return `${baseUrl}?text=${encodeURIComponent(whatsappText)}`;

      case 'telegram':
        return this.buildUrl(baseUrl, {
          url: config.url,
          text: config.title
        });

      case 'pinterest':
        return this.buildUrl(baseUrl, {
          url: config.url,
          media: config.image,
          description: config.title
        });

      case 'tumblr':
        return this.buildUrl(baseUrl, {
          canonicalUrl: config.url,
          title: config.title,
          caption: config.description
        });

      case 'email':
        const subject = encodeURIComponent(config.title);
        const body = encodeURIComponent(`${config.description || ''}\n\n${config.url}`);
        return `${baseUrl}?subject=${subject}&body=${body}`;

      case 'copy-link':
      case 'print':
        return config.url;

      default:
        return config.url;
    }
  }

  private buildUrl(baseUrl: string, params: Record<string, string | undefined>): string {
    const urlParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        urlParams.append(key, value);
      }
    });

    return `${baseUrl}?${urlParams.toString()}`;
  }
}

/**
 * Social Share Button Generator
 */
class SocialShareButtonGenerator {
  private platformConfig: Record<SocialPlatform, {
    name: string;
    color: string;
    icon: string;
    text: string;
  }> = {
    facebook: {
      name: 'Facebook',
      color: '#1877F2',
      icon: 'fab fa-facebook-f',
      text: 'Share on Facebook'
    },
    twitter: {
      name: 'Twitter',
      color: '#1DA1F2',
      icon: 'fab fa-twitter',
      text: 'Share on Twitter'
    },
    linkedin: {
      name: 'LinkedIn',
      color: '#0A66C2',
      icon: 'fab fa-linkedin-in',
      text: 'Share on LinkedIn'
    },
    reddit: {
      name: 'Reddit',
      color: '#FF4500',
      icon: 'fab fa-reddit-alien',
      text: 'Share on Reddit'
    },
    whatsapp: {
      name: 'WhatsApp',
      color: '#25D366',
      icon: 'fab fa-whatsapp',
      text: 'Share on WhatsApp'
    },
    telegram: {
      name: 'Telegram',
      color: '#0088CC',
      icon: 'fab fa-telegram-plane',
      text: 'Share on Telegram'
    },
    pinterest: {
      name: 'Pinterest',
      color: '#E60023',
      icon: 'fab fa-pinterest-p',
      text: 'Share on Pinterest'
    },
    tumblr: {
      name: 'Tumblr',
      color: '#00CF35',
      icon: 'fab fa-tumblr',
      text: 'Share on Tumblr'
    },
    email: {
      name: 'Email',
      color: '#EA4335',
      icon: 'fas fa-envelope',
      text: 'Share via Email'
    },
    'copy-link': {
      name: 'Copy Link',
      color: '#6B7280',
      icon: 'fas fa-link',
      text: 'Copy Link'
    },
    print: {
      name: 'Print',
      color: '#4B5563',
      icon: 'fas fa-print',
      text: 'Print Page'
    }
  };

  /**
   * Generate share button data
   */
  generateButton(
    platform: SocialPlatform, 
    shareUrl: string, 
    customConfig?: SocialPlatformConfig
  ): SocialShareButton {
    const config = this.platformConfig[platform];
    const customization = customConfig?.customization;

    return {
      platform,
      url: shareUrl,
      text: customization?.buttonText || config.text,
      icon: customization?.iconClass || config.icon,
      color: customization?.color || config.color,
      onClick: () => this.handleShare(platform, shareUrl)
    };
  }

  /**
   * Generate share buttons for multiple platforms
   */
  generateButtons(
    platforms: SocialPlatform[],
    config: SocialShareConfig,
    platformConfigs?: SocialPlatformConfig[]
  ): SocialShareButton[] {
    const urlGenerator = new SocialPlatformUrls();
    const buttons: SocialShareButton[] = [];

    for (const platform of platforms) {
      const platformConfig = platformConfigs?.find(c => c.name === platform);
      
      if (platformConfig && !platformConfig.enabled) {
        continue;
      }

      const shareUrl = urlGenerator.generateShareUrl(platform, config);
      const button = this.generateButton(platform, shareUrl, platformConfig);
      
      buttons.push(button);
    }

    return buttons;
  }

  /**
   * Generate HTML for share buttons
   */
  generateButtonsHTML(buttons: SocialShareButton[], containerClass = 'social-share-buttons'): string {
    const buttonsHTML = buttons.map(button => `
      <button 
        class="social-share-button ${button.platform}-share" 
        style="background-color: ${button.color}"
        data-platform="${button.platform}"
        data-url="${button.url}"
        title="${button.text}"
        onclick="socialShare.share('${button.platform}', '${button.url}')"
      >
        <i class="${button.icon}"></i>
        <span>${button.text}</span>
      </button>
    `).join('\n');

    return `
      <div class="${containerClass}">
        ${buttonsHTML}
      </div>
    `;
  }

  private handleShare(platform: SocialPlatform, url: string): void {
    if (platform === 'copy-link') {
      this.copyToClipboard(url);
    } else if (platform === 'print') {
      window.print();
    } else {
      this.openShareWindow(url);
    }
  }

  private openShareWindow(url: string): void {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'share-window',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('Link copied to clipboard!');
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.showNotification('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      this.showNotification('Failed to copy link');
    }

    document.body.removeChild(textArea);
  }

  private showNotification(message: string): void {
    // This would integrate with your notification system
    console.log(message);
  }
}

/**
 * Game-specific Sharing Helper
 */
class GameSharingHelper {
  private urlGenerator: SocialPlatformUrls;
  private buttonGenerator: SocialShareButtonGenerator;

  constructor() {
    this.urlGenerator = new SocialPlatformUrls();
    this.buttonGenerator = new SocialShareButtonGenerator();
  }

  /**
   * Generate game achievement share
   */
  generateGameAchievementShare(game: GameShareData): SocialShareConfig {
    const title = game.achievement 
      ? `🎉 Just unlocked "${game.achievement}" in ${game.name}!`
      : `🎮 Just played ${game.name}!`;

    const description = game.score 
      ? `I scored ${game.score} points playing ${game.name}. Can you beat my score?`
      : `Check out this awesome ${game.category} game: ${game.name}`;

    return {
      url: game.url,
      title,
      description,
      image: game.image,
      hashtags: ['gaming', game.category.toLowerCase(), 'online-games'],
      via: 'GamingPlatform'
    };
  }

  /**
   * Generate game recommendation share
   */
  generateGameRecommendationShare(game: GameShareData): SocialShareConfig {
    const title = `🎯 You should try ${game.name}!`;
    const description = `${game.description} Play this amazing ${game.category} game now!`;

    return {
      url: game.url,
      title,
      description,
      image: game.image,
      hashtags: ['gaming', 'game-recommendation', game.category.toLowerCase()],
      via: 'GamingPlatform'
    };
  }

  /**
   * Generate win celebration share
   */
  generateWinCelebrationShare(game: GameShareData, winAmount?: number): SocialShareConfig {
    const title = winAmount 
      ? `💰 Just won $${winAmount} playing ${game.name}!`
      : `🏆 Big win on ${game.name}!`;

    const description = `Lady luck is on my side! Check out this ${game.category} game where I just hit it big!`;

    return {
      url: game.url,
      title,
      description,
      image: game.image,
      hashtags: ['big-win', 'gaming', 'lucky-day', game.category.toLowerCase()],
      via: 'GamingPlatform'
    };
  }
}

/**
 * Social Share Analytics Tracker
 */
class SocialShareAnalyticsTracker {
  private analytics: SocialShareAnalytics[] = [];
  private apiEndpoint: string;

  constructor(apiEndpoint = '/api/analytics/social-shares') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Track social share event
   */
  track(event: SocialShareAnalytics): void {
    this.analytics.push(event);
    this.sendToServer(event);
  }

  /**
   * Track share button click
   */
  trackShare(
    platform: SocialPlatform,
    url: string,
    userId?: string,
    source?: string,
    campaign?: string
  ): void {
    const event: SocialShareAnalytics = {
      platform,
      url,
      timestamp: new Date(),
      userId,
      source,
      campaign
    };

    this.track(event);
  }

  /**
   * Get share statistics
   */
  getStats(timeRange?: { start: Date; end: Date }): {
    totalShares: number;
    sharesByPlatform: Record<SocialPlatform, number>;
    topUrls: Array<{ url: string; count: number }>;
    sharesByDay: Record<string, number>;
  } {
    let filteredAnalytics = this.analytics;

    if (timeRange) {
      filteredAnalytics = this.analytics.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    const sharesByPlatform = {} as Record<SocialPlatform, number>;
    const urlCounts = new Map<string, number>();
    const daysCounts = new Map<string, number>();

    for (const analytic of filteredAnalytics) {
      // Count by platform
      sharesByPlatform[analytic.platform] = (sharesByPlatform[analytic.platform] || 0) + 1;

      // Count by URL
      urlCounts.set(analytic.url, (urlCounts.get(analytic.url) || 0) + 1);

      // Count by day
      const day = analytic.timestamp.toISOString().split('T')[0];
      daysCounts.set(day, (daysCounts.get(day) || 0) + 1);
    }

    // Get top URLs
    const topUrls = Array.from(urlCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalShares: filteredAnalytics.length,
      sharesByPlatform,
      topUrls,
      sharesByDay: Object.fromEntries(daysCounts)
    };
  }

  private async sendToServer(event: SocialShareAnalytics): Promise<void> {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }
}

/**
 * Main Social Sharing Manager
 */
export class SocialSharingManager {
  private static instance: SocialSharingManager;
  private urlGenerator: SocialPlatformUrls;
  private buttonGenerator: SocialShareButtonGenerator;
  private gameHelper: GameSharingHelper;
  private analytics: SocialShareAnalyticsTracker;
  private defaultPlatforms: SocialPlatform[] = [
    'facebook', 'twitter', 'linkedin', 'whatsapp', 'copy-link'
  ];

  private constructor() {
    this.urlGenerator = new SocialPlatformUrls();
    this.buttonGenerator = new SocialShareButtonGenerator();
    this.gameHelper = new GameSharingHelper();
    this.analytics = new SocialShareAnalyticsTracker();
  }

  static getInstance(): SocialSharingManager {
    if (!SocialSharingManager.instance) {
      SocialSharingManager.instance = new SocialSharingManager();
    }
    return SocialSharingManager.instance;
  }

  /**
   * Initialize social sharing
   */
  initialize(): void {
    console.log('Social sharing system initialized');
    this.setupGlobalShareHandler();
  }

  /**
   * Generate share URL
   */
  generateShareUrl(platform: SocialPlatform, config: SocialShareConfig): string {
    return this.urlGenerator.generateShareUrl(platform, config);
  }

  /**
   * Generate share buttons
   */
  generateShareButtons(
    config: SocialShareConfig,
    platforms: SocialPlatform[] = this.defaultPlatforms,
    platformConfigs?: SocialPlatformConfig[]
  ): SocialShareButton[] {
    return this.buttonGenerator.generateButtons(platforms, config, platformConfigs);
  }

  /**
   * Generate share buttons HTML
   */
  generateShareButtonsHTML(
    config: SocialShareConfig,
    platforms: SocialPlatform[] = this.defaultPlatforms,
    containerClass?: string
  ): string {
    const buttons = this.generateShareButtons(config, platforms);
    return this.buttonGenerator.generateButtonsHTML(buttons, containerClass);
  }

  /**
   * Share game achievement
   */
  shareGameAchievement(game: GameShareData, platforms?: SocialPlatform[]): SocialShareButton[] {
    const shareConfig = this.gameHelper.generateGameAchievementShare(game);
    return this.generateShareButtons(shareConfig, platforms);
  }

  /**
   * Share game recommendation
   */
  shareGameRecommendation(game: GameShareData, platforms?: SocialPlatform[]): SocialShareButton[] {
    const shareConfig = this.gameHelper.generateGameRecommendationShare(game);
    return this.generateShareButtons(shareConfig, platforms);
  }

  /**
   * Share win celebration
   */
  shareWinCelebration(
    game: GameShareData, 
    winAmount?: number, 
    platforms?: SocialPlatform[]
  ): SocialShareButton[] {
    const shareConfig = this.gameHelper.generateWinCelebrationShare(game, winAmount);
    return this.generateShareButtons(shareConfig, platforms);
  }

  /**
   * Track share event
   */
  trackShare(platform: SocialPlatform, url: string, userId?: string): void {
    this.analytics.trackShare(platform, url, userId, 'share-button');
  }

  /**
   * Get sharing analytics
   */
  getAnalytics(timeRange?: { start: Date; end: Date }) {
    return this.analytics.getStats(timeRange);
  }

  /**
   * Open share modal (if implemented)
   */
  openShareModal(config: ShareModalConfig): void {
    // This would integrate with your modal system
    console.log('Share modal:', config);
  }

  private setupGlobalShareHandler(): void {
    // Setup global share handler for window.socialShare
    (window as any).socialShare = {
      share: (platform: string, url: string) => {
        this.handleShare(platform as SocialPlatform, url);
      }
    };
  }

  private handleShare(platform: SocialPlatform, url: string): void {
    // Track the share
    this.trackShare(platform, url);

    // Handle platform-specific sharing
    if (platform === 'copy-link') {
      this.copyToClipboard(url);
    } else if (platform === 'print') {
      window.print();
    } else {
      this.openShareWindow(url);
    }
  }

  private openShareWindow(url: string): void {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'share-window',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Link copied to clipboard!');
      });
    }
  }
}

// Export convenience functions
export const socialSharingManager = SocialSharingManager.getInstance();

export const initializeSocialSharing = () => socialSharingManager.initialize();

export const generateShareUrl = (platform: SocialPlatform, config: SocialShareConfig) =>
  socialSharingManager.generateShareUrl(platform, config);

export const generateShareButtons = (
  config: SocialShareConfig,
  platforms?: SocialPlatform[]
) => socialSharingManager.generateShareButtons(config, platforms);

export const shareGameAchievement = (game: GameShareData, platforms?: SocialPlatform[]) =>
  socialSharingManager.shareGameAchievement(game, platforms);

export const trackShare = (platform: SocialPlatform, url: string, userId?: string) =>
  socialSharingManager.trackShare(platform, url, userId);

// Default export
export default SocialSharingManager;