/**
 * Game Analytics System
 * Comprehensive tracking and analysis of gaming behavior and performance
 */

// Types for game analytics
export interface GameSession {
  id: string;
  userId?: string;
  sessionId: string;
  gameId: string;
  gameName: string;
  gameType: GameType;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'active' | 'completed' | 'abandoned';
  outcome: GameOutcome;
  bets: GameBet[];
  totalWagered: number;
  totalWon: number;
  netResult: number;
  rounds: GameRound[];
  events: GameEvent[];
  metadata: GameMetadata;
}

export interface GameBet {
  id: string;
  timestamp: number;
  amount: number;
  multiplier?: number;
  outcome: 'win' | 'loss' | 'partial';
  payout: number;
  netResult: number;
  roundId?: string;
}

export interface GameRound {
  id: string;
  gameSessionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  result: any; // Game-specific result data
  actions: number;
  betAmount: number;
  payout: number;
  multiplier?: number;
  isWin: boolean;
  gameState?: any; // Game-specific state
}

export interface GameEvent {
  id: string;
  gameSessionId: string;
  timestamp: number;
  type: GameEventType;
  category: GameEventCategory;
  action: string;
  value?: number;
  properties: Record<string, any>;
  roundId?: string;
}

export interface GameMetadata {
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
  };
  connection: {
    type?: string;
    speed?: 'slow' | 'medium' | 'fast';
    latency?: number;
  };
  gameSettings: {
    autoPlay?: boolean;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
    customSettings?: Record<string, any>;
  };
  performance: {
    averageFPS?: number;
    loadTime: number;
    errorCount: number;
    lagEvents: number;
  };
}

export interface GameOutcome {
  result: 'win' | 'loss' | 'breakeven';
  totalBets: number;
  totalWins: number;
  biggestWin: number;
  biggestLoss: number;
  longestStreak: {
    type: 'win' | 'loss';
    count: number;
  };
  rtp: number; // Return to Player percentage
}

export interface GameAnalytics {
  gameId: string;
  timeRange: {
    start: number;
    end: number;
  };
  sessions: {
    total: number;
    completed: number;
    abandoned: number;
    averageDuration: number;
  };
  financial: {
    totalWagered: number;
    totalWon: number;
    netRevenue: number;
    averageBet: number;
    rtp: number;
    ggrMargin: number;
  };
  engagement: {
    averageSessionTime: number;
    averageRoundsPerSession: number;
    returnRate: number;
    churnRate: number;
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
    averageFPS: number;
    lagIncidents: number;
  };
  topPlayers: PlayerStats[];
  popularFeatures: FeatureUsage[];
}

export interface PlayerStats {
  userId: string;
  sessions: number;
  totalTime: number;
  totalWagered: number;
  totalWon: number;
  netResult: number;
  favoriteGames: string[];
  lastPlayed: number;
  tier: 'casual' | 'regular' | 'vip' | 'whale';
}

export interface FeatureUsage {
  feature: string;
  usage: number;
  userCount: number;
  conversionRate: number;
}

export type GameType = 
  | 'mines'
  | 'crash'
  | 'limbo'
  | 'bars'
  | 'dragon-tower'
  | 'sugar-rush'
  | 'slots'
  | 'table'
  | 'live'
  | 'other';

export type GameEventType =
  | 'game_start'
  | 'game_end'
  | 'bet_placed'
  | 'bet_won'
  | 'bet_lost'
  | 'round_start'
  | 'round_end'
  | 'feature_triggered'
  | 'bonus_activated'
  | 'jackpot_won'
  | 'autoplay_enabled'
  | 'settings_changed'
  | 'error_occurred'
  | 'performance_issue'
  | 'custom';

export type GameEventCategory =
  | 'gameplay'
  | 'financial'
  | 'feature'
  | 'system'
  | 'performance'
  | 'user_action';

/**
 * Game Event Tracker
 */
class GameEventTracker {
  private events: Map<string, GameEvent[]> = new Map();
  private onEventCallback?: (event: GameEvent) => void;

  /**
   * Track game event
   */
  track(
    gameSessionId: string,
    type: GameEventType,
    category: GameEventCategory,
    action: string,
    properties: Record<string, any> = {},
    value?: number,
    roundId?: string
  ): void {
    const event: GameEvent = {
      id: this.generateEventId(),
      gameSessionId,
      timestamp: Date.now(),
      type,
      category,
      action,
      value,
      properties,
      roundId,
    };

    // Add to local storage
    const sessionEvents = this.events.get(gameSessionId) || [];
    sessionEvents.push(event);
    this.events.set(gameSessionId, sessionEvents);

    // Notify callback
    if (this.onEventCallback) {
      this.onEventCallback(event);
    }
  }

  /**
   * Get events for session
   */
  getSessionEvents(gameSessionId: string): GameEvent[] {
    return this.events.get(gameSessionId) || [];
  }

  /**
   * Set event callback
   */
  onEvent(callback: (event: GameEvent) => void): void {
    this.onEventCallback = callback;
  }

  /**
   * Clear events for session
   */
  clearSessionEvents(gameSessionId: string): void {
    this.events.delete(gameSessionId);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Game Round Manager
 */
class GameRoundManager {
  private rounds: Map<string, GameRound[]> = new Map();
  private currentRounds: Map<string, GameRound> = new Map();

  /**
   * Start new round
   */
  startRound(
    gameSessionId: string,
    betAmount: number,
    gameState?: any
  ): string {
    const roundId = this.generateRoundId();
    
    const round: GameRound = {
      id: roundId,
      gameSessionId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      result: null,
      actions: 0,
      betAmount,
      payout: 0,
      isWin: false,
      gameState,
    };

    this.currentRounds.set(gameSessionId, round);
    return roundId;
  }

  /**
   * End current round
   */
  endRound(
    gameSessionId: string,
    result: any,
    payout: number,
    multiplier?: number
  ): GameRound | null {
    const round = this.currentRounds.get(gameSessionId);
    if (!round) return null;

    const endTime = Date.now();
    round.endTime = endTime;
    round.duration = endTime - round.startTime;
    round.result = result;
    round.payout = payout;
    round.multiplier = multiplier;
    round.isWin = payout > round.betAmount;

    // Store completed round
    const sessionRounds = this.rounds.get(gameSessionId) || [];
    sessionRounds.push({ ...round });
    this.rounds.set(gameSessionId, sessionRounds);

    // Clear current round
    this.currentRounds.delete(gameSessionId);

    return round;
  }

  /**
   * Update round action count
   */
  incrementActions(gameSessionId: string): void {
    const round = this.currentRounds.get(gameSessionId);
    if (round) {
      round.actions++;
    }
  }

  /**
   * Get rounds for session
   */
  getSessionRounds(gameSessionId: string): GameRound[] {
    return this.rounds.get(gameSessionId) || [];
  }

  /**
   * Get current round
   */
  getCurrentRound(gameSessionId: string): GameRound | null {
    return this.currentRounds.get(gameSessionId) || null;
  }

  /**
   * Clear rounds for session
   */
  clearSessionRounds(gameSessionId: string): void {
    this.rounds.delete(gameSessionId);
    this.currentRounds.delete(gameSessionId);
  }

  private generateRoundId(): string {
    return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Performance Monitor
 */
class GamePerformanceMonitor {
  private fpsHistory: number[] = [];
  private loadTimes: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lagEvents: Map<string, number> = new Map();

  /**
   * Start monitoring performance
   */
  startMonitoring(gameSessionId: string): void {
    const startTime = Date.now();
    this.loadTimes.set(gameSessionId, startTime);
    this.errorCounts.set(gameSessionId, 0);
    this.lagEvents.set(gameSessionId, 0);

    // Monitor FPS if available
    this.startFPSMonitoring();
  }

  /**
   * Record game loaded
   */
  recordGameLoaded(gameSessionId: string): void {
    const startTime = this.loadTimes.get(gameSessionId);
    if (startTime) {
      const loadTime = Date.now() - startTime;
      this.loadTimes.set(gameSessionId, loadTime);
    }
  }

  /**
   * Record error
   */
  recordError(gameSessionId: string): void {
    const currentCount = this.errorCounts.get(gameSessionId) || 0;
    this.errorCounts.set(gameSessionId, currentCount + 1);
  }

  /**
   * Record lag event
   */
  recordLag(gameSessionId: string): void {
    const currentCount = this.lagEvents.get(gameSessionId) || 0;
    this.lagEvents.set(gameSessionId, currentCount + 1);
  }

  /**
   * Get performance metrics
   */
  getMetrics(gameSessionId: string): GameMetadata['performance'] {
    return {
      averageFPS: this.getAverageFPS(),
      loadTime: this.loadTimes.get(gameSessionId) || 0,
      errorCount: this.errorCounts.get(gameSessionId) || 0,
      lagEvents: this.lagEvents.get(gameSessionId) || 0,
    };
  }

  /**
   * Clear metrics for session
   */
  clearMetrics(gameSessionId: string): void {
    this.loadTimes.delete(gameSessionId);
    this.errorCounts.delete(gameSessionId);
    this.lagEvents.delete(gameSessionId);
  }

  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount * 1000 / (currentTime - lastTime);
        this.fpsHistory.push(fps);
        
        // Keep only last 60 samples (1 minute)
        if (this.fpsHistory.length > 60) {
          this.fpsHistory = this.fpsHistory.slice(-60);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }
}

/**
 * Game Analytics Calculator
 */
class GameAnalyticsCalculator {
  /**
   * Calculate game analytics from sessions
   */
  calculateAnalytics(
    gameId: string,
    sessions: GameSession[],
    timeRange: { start: number; end: number }
  ): GameAnalytics {
    const filteredSessions = sessions.filter(
      s => s.gameId === gameId && 
           s.startTime >= timeRange.start && 
           s.startTime <= timeRange.end
    );

    return {
      gameId,
      timeRange,
      sessions: this.calculateSessionMetrics(filteredSessions),
      financial: this.calculateFinancialMetrics(filteredSessions),
      engagement: this.calculateEngagementMetrics(filteredSessions),
      performance: this.calculatePerformanceMetrics(filteredSessions),
      topPlayers: this.calculateTopPlayers(filteredSessions),
      popularFeatures: this.calculateFeatureUsage(filteredSessions),
    };
  }

  private calculateSessionMetrics(sessions: GameSession[]) {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const abandoned = sessions.filter(s => s.status === 'abandoned').length;
    
    const durations = sessions
      .filter(s => s.duration)
      .map(s => s.duration!);
    
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      total,
      completed,
      abandoned,
      averageDuration,
    };
  }

  private calculateFinancialMetrics(sessions: GameSession[]) {
    const totalWagered = sessions.reduce((sum, s) => sum + s.totalWagered, 0);
    const totalWon = sessions.reduce((sum, s) => sum + s.totalWon, 0);
    const netRevenue = totalWagered - totalWon;
    
    const bets = sessions.flatMap(s => s.bets);
    const averageBet = bets.length > 0
      ? bets.reduce((sum, b) => sum + b.amount, 0) / bets.length
      : 0;
    
    const rtp = totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0;
    const ggrMargin = totalWagered > 0 ? (netRevenue / totalWagered) * 100 : 0;

    return {
      totalWagered,
      totalWon,
      netRevenue,
      averageBet,
      rtp,
      ggrMargin,
    };
  }

  private calculateEngagementMetrics(sessions: GameSession[]) {
    const durations = sessions
      .filter(s => s.duration)
      .map(s => s.duration!);
    
    const averageSessionTime = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const rounds = sessions.flatMap(s => s.rounds);
    const averageRoundsPerSession = sessions.length > 0
      ? rounds.length / sessions.length
      : 0;

    // Calculate return rate (users with multiple sessions)
    const userSessions = new Map<string, number>();
    sessions.forEach(s => {
      if (s.userId) {
        const count = userSessions.get(s.userId) || 0;
        userSessions.set(s.userId, count + 1);
      }
    });
    
    const returningUsers = Array.from(userSessions.values()).filter(count => count > 1).length;
    const returnRate = userSessions.size > 0 ? (returningUsers / userSessions.size) * 100 : 0;
    
    const churnRate = 100 - returnRate;

    return {
      averageSessionTime,
      averageRoundsPerSession,
      returnRate,
      churnRate,
    };
  }

  private calculatePerformanceMetrics(sessions: GameSession[]) {
    const loadTimes = sessions.map(s => s.metadata.performance.loadTime);
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length
      : 0;

    const totalErrors = sessions.reduce((sum, s) => sum + s.metadata.performance.errorCount, 0);
    const errorRate = sessions.length > 0 ? (totalErrors / sessions.length) : 0;

    const fpsValues = sessions
      .map(s => s.metadata.performance.averageFPS)
      .filter(fps => fps && fps > 0);
    
    const averageFPS = fpsValues.length > 0
      ? fpsValues.reduce((sum: number, fps) => sum + (fps || 0), 0) / fpsValues.length
      : 0;

    const lagIncidents = sessions.reduce((sum, s) => sum + s.metadata.performance.lagEvents, 0);

    return {
      averageLoadTime,
      errorRate,
      averageFPS,
      lagIncidents,
    };
  }

  private calculateTopPlayers(sessions: GameSession[]): PlayerStats[] {
    const playerStats = new Map<string, PlayerStats>();

    sessions.forEach(session => {
      if (!session.userId) return;

      const existing = playerStats.get(session.userId) || {
        userId: session.userId,
        sessions: 0,
        totalTime: 0,
        totalWagered: 0,
        totalWon: 0,
        netResult: 0,
        favoriteGames: [],
        lastPlayed: 0,
        tier: 'casual' as const,
      };

      existing.sessions += 1;
      existing.totalTime += session.duration || 0;
      existing.totalWagered += session.totalWagered;
      existing.totalWon += session.totalWon;
      existing.netResult += session.netResult;
      existing.lastPlayed = Math.max(existing.lastPlayed, session.startTime);

      playerStats.set(session.userId, existing);
    });

    // Sort by total wagered and assign tiers
    const sorted = Array.from(playerStats.values())
      .sort((a, b) => b.totalWagered - a.totalWagered)
      .slice(0, 100); // Top 100 players

    // Assign tiers based on wagering
    sorted.forEach((player, index) => {
      if (player.totalWagered > 100000) player.tier = 'whale';
      else if (player.totalWagered > 10000) player.tier = 'vip';
      else if (player.totalWagered > 1000) player.tier = 'regular';
      else player.tier = 'casual';
    });

    return sorted;
  }

  private calculateFeatureUsage(sessions: GameSession[]): FeatureUsage[] {
    const featureUsage = new Map<string, { usage: number; users: Set<string> }>();

    sessions.forEach(session => {
      session.events.forEach(event => {
        if (event.type === 'feature_triggered' || event.type === 'bonus_activated') {
          const feature = event.action;
          const existing = featureUsage.get(feature) || { usage: 0, users: new Set() };
          
          existing.usage += 1;
          if (session.userId) {
            existing.users.add(session.userId);
          }
          
          featureUsage.set(feature, existing);
        }
      });
    });

    return Array.from(featureUsage.entries()).map(([feature, data]) => ({
      feature,
      usage: data.usage,
      userCount: data.users.size,
      conversionRate: sessions.length > 0 ? (data.users.size / sessions.length) * 100 : 0,
    }));
  }
}

/**
 * Main Game Analytics Manager
 */
export class GameAnalyticsManager {
  private static instance: GameAnalyticsManager;
  private sessions: Map<string, GameSession> = new Map();
  private completedSessions: GameSession[] = [];
  private eventTracker: GameEventTracker;
  private roundManager: GameRoundManager;
  private performanceMonitor: GamePerformanceMonitor;
  private analyticsCalculator: GameAnalyticsCalculator;
  private apiEndpoint: string;

  private constructor(apiEndpoint = '/api/analytics/games') {
    this.apiEndpoint = apiEndpoint;
    this.eventTracker = new GameEventTracker();
    this.roundManager = new GameRoundManager();
    this.performanceMonitor = new GamePerformanceMonitor();
    this.analyticsCalculator = new GameAnalyticsCalculator();
    
    this.setupEventForwarding();
  }

  static getInstance(apiEndpoint?: string): GameAnalyticsManager {
    if (!GameAnalyticsManager.instance) {
      GameAnalyticsManager.instance = new GameAnalyticsManager(apiEndpoint);
    }
    return GameAnalyticsManager.instance;
  }

  /**
   * Start game session
   */
  startGameSession(
    gameId: string,
    gameName: string,
    gameType: GameType,
    userId?: string,
    userSessionId?: string
  ): string {
    const gameSessionId = this.generateSessionId();
    
    const session: GameSession = {
      id: gameSessionId,
      userId,
      sessionId: userSessionId || '',
      gameId,
      gameName,
      gameType,
      startTime: Date.now(),
      status: 'active',
      outcome: {
        result: 'breakeven',
        totalBets: 0,
        totalWins: 0,
        biggestWin: 0,
        biggestLoss: 0,
        longestStreak: { type: 'loss', count: 0 },
        rtp: 0,
      },
      bets: [],
      totalWagered: 0,
      totalWon: 0,
      netResult: 0,
      rounds: [],
      events: [],
      metadata: {
        device: this.detectDevice(),
        connection: this.detectConnection(),
        gameSettings: {},
        performance: {
          loadTime: 0,
          errorCount: 0,
          lagEvents: 0,
        },
      },
    };

    this.sessions.set(gameSessionId, session);
    this.performanceMonitor.startMonitoring(gameSessionId);
    
    this.trackEvent(gameSessionId, 'game_start', 'gameplay', 'session_started', {
      gameId,
      gameName,
      gameType,
    });

    return gameSessionId;
  }

  /**
   * End game session
   */
  async endGameSession(gameSessionId: string, outcome?: Partial<GameOutcome>): Promise<void> {
    const session = this.sessions.get(gameSessionId);
    if (!session) return;

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = 'completed';
    session.rounds = this.roundManager.getSessionRounds(gameSessionId);
    session.events = this.eventTracker.getSessionEvents(gameSessionId);
    session.metadata.performance = this.performanceMonitor.getMetrics(gameSessionId);

    // Calculate final outcome
    if (outcome) {
      session.outcome = { ...session.outcome, ...outcome };
    } else {
      session.outcome = this.calculateOutcome(session);
    }

    this.trackEvent(gameSessionId, 'game_end', 'gameplay', 'session_ended', {
      duration: session.duration,
      totalWagered: session.totalWagered,
      totalWon: session.totalWon,
      netResult: session.netResult,
    });

    // Move to completed sessions
    this.completedSessions.push(session);
    this.sessions.delete(gameSessionId);

    // Cleanup
    this.eventTracker.clearSessionEvents(gameSessionId);
    this.roundManager.clearSessionRounds(gameSessionId);
    this.performanceMonitor.clearMetrics(gameSessionId);

    // Send to server
    await this.sendSessionData(session);
  }

  /**
   * Place bet
   */
  placeBet(
    gameSessionId: string,
    amount: number,
    multiplier?: number,
    roundId?: string
  ): string {
    const session = this.sessions.get(gameSessionId);
    if (!session) throw new Error('Game session not found');

    const betId = this.generateBetId();
    const bet: GameBet = {
      id: betId,
      timestamp: Date.now(),
      amount,
      multiplier,
      outcome: 'loss', // Will be updated when resolved
      payout: 0,
      netResult: -amount,
      roundId,
    };

    session.bets.push(bet);
    session.totalWagered += amount;
    session.outcome.totalBets += 1;

    this.trackEvent(gameSessionId, 'bet_placed', 'financial', 'bet_placed', {
      amount,
      multiplier,
      betId,
      roundId,
    });

    return betId;
  }

  /**
   * Resolve bet
   */
  resolveBet(
    gameSessionId: string,
    betId: string,
    outcome: 'win' | 'loss' | 'partial',
    payout: number
  ): void {
    const session = this.sessions.get(gameSessionId);
    if (!session) return;

    const bet = session.bets.find(b => b.id === betId);
    if (!bet) return;

    bet.outcome = outcome;
    bet.payout = payout;
    bet.netResult = payout - bet.amount;

    session.totalWon += payout;
    session.netResult += bet.netResult;

    if (outcome === 'win') {
      session.outcome.totalWins += 1;
      session.outcome.biggestWin = Math.max(session.outcome.biggestWin, bet.netResult);
      
      this.trackEvent(gameSessionId, 'bet_won', 'financial', 'bet_won', {
        amount: bet.amount,
        payout,
        netResult: bet.netResult,
        betId,
      });
    } else {
      session.outcome.biggestLoss = Math.min(session.outcome.biggestLoss, bet.netResult);
      
      this.trackEvent(gameSessionId, 'bet_lost', 'financial', 'bet_lost', {
        amount: bet.amount,
        payout,
        netResult: bet.netResult,
        betId,
      });
    }
  }

  /**
   * Start game round
   */
  startRound(gameSessionId: string, betAmount: number, gameState?: any): string {
    this.trackEvent(gameSessionId, 'round_start', 'gameplay', 'round_started', {
      betAmount,
      gameState,
    });

    return this.roundManager.startRound(gameSessionId, betAmount, gameState);
  }

  /**
   * End game round
   */
  endRound(
    gameSessionId: string,
    result: any,
    payout: number,
    multiplier?: number
  ): void {
    const round = this.roundManager.endRound(gameSessionId, result, payout, multiplier);
    
    if (round) {
      this.trackEvent(gameSessionId, 'round_end', 'gameplay', 'round_ended', {
        duration: round.duration,
        actions: round.actions,
        betAmount: round.betAmount,
        payout: round.payout,
        multiplier: round.multiplier,
        isWin: round.isWin,
        result,
      });
    }
  }

  /**
   * Track custom game event
   */
  trackEvent(
    gameSessionId: string,
    type: GameEventType,
    category: GameEventCategory,
    action: string,
    properties: Record<string, any> = {}
  ): void {
    this.eventTracker.track(gameSessionId, type, category, action, properties);

    // Increment round actions if applicable
    if (category === 'gameplay' && type !== 'round_start' && type !== 'round_end') {
      this.roundManager.incrementActions(gameSessionId);
    }
  }

  /**
   * Record performance issue
   */
  recordPerformanceIssue(gameSessionId: string, type: 'error' | 'lag'): void {
    if (type === 'error') {
      this.performanceMonitor.recordError(gameSessionId);
      this.trackEvent(gameSessionId, 'error_occurred', 'performance', 'error_recorded');
    } else {
      this.performanceMonitor.recordLag(gameSessionId);
      this.trackEvent(gameSessionId, 'performance_issue', 'performance', 'lag_detected');
    }
  }

  /**
   * Get analytics for game
   */
  getGameAnalytics(
    gameId: string,
    timeRange?: { start: number; end: number }
  ): GameAnalytics {
    const defaultRange = {
      start: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
      end: Date.now(),
    };

    return this.analyticsCalculator.calculateAnalytics(
      gameId,
      this.completedSessions,
      timeRange || defaultRange
    );
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  private setupEventForwarding(): void {
    this.eventTracker.onEvent(async (event) => {
      // Forward events to analytics service in real-time if needed
      try {
        await fetch(`${this.apiEndpoint}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } catch (error) {
        console.warn('Failed to forward game event:', error);
      }
    });
  }

  private calculateOutcome(session: GameSession): GameOutcome {
    const bets = session.bets;
    const wins = bets.filter(b => b.outcome === 'win');
    const losses = bets.filter(b => b.outcome === 'loss');

    // Calculate streaks
    let currentStreak: { type: 'win' | 'loss'; count: number } = { type: 'loss', count: 0 };
    let longestStreak: { type: 'win' | 'loss'; count: number } = { type: 'loss', count: 0 };

    for (const bet of bets) {
      const betType: 'win' | 'loss' = bet.outcome === 'win' ? 'win' : 'loss';
      
      if (betType === currentStreak.type) {
        currentStreak.count++;
      } else {
        if (currentStreak.count > longestStreak.count) {
          longestStreak = { ...currentStreak };
        }
        currentStreak = { type: betType, count: 1 };
      }
    }

    // Check final streak
    if (currentStreak.count > longestStreak.count) {
      longestStreak = { ...currentStreak };
    }

    const rtp = session.totalWagered > 0 ? (session.totalWon / session.totalWagered) * 100 : 0;
    
    let result: 'win' | 'loss' | 'breakeven' = 'breakeven';
    if (session.netResult > 0) result = 'win';
    else if (session.netResult < 0) result = 'loss';

    return {
      result,
      totalBets: bets.length,
      totalWins: wins.length,
      biggestWin: Math.max(...wins.map(b => b.netResult), 0),
      biggestLoss: Math.min(...losses.map(b => b.netResult), 0),
      longestStreak,
      rtp,
    };
  }

  private async sendSessionData(session: GameSession): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
    } catch (error) {
      console.error('Failed to send session data:', error);
    }
  }

  private detectDevice(): GameMetadata['device'] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      type: /tablet|ipad/.test(userAgent) ? 'tablet' :
            /mobile|android|ios|iphone/.test(userAgent) ? 'mobile' : 'desktop',
      browser: this.getBrowserName(),
      os: this.getOSName(),
    };
  }

  private detectConnection(): GameMetadata['connection'] {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      type: connection?.type || 'unknown',
      speed: this.classifyConnectionSpeed(connection?.downlink),
    };
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/chrome/.test(userAgent)) return 'chrome';
    if (/firefox/.test(userAgent)) return 'firefox';
    if (/safari/.test(userAgent)) return 'safari';
    if (/edge/.test(userAgent)) return 'edge';
    return 'unknown';
  }

  private getOSName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/windows/.test(userAgent)) return 'windows';
    if (/mac/.test(userAgent)) return 'macos';
    if (/linux/.test(userAgent)) return 'linux';
    if (/android/.test(userAgent)) return 'android';
    if (/ios/.test(userAgent)) return 'ios';
    return 'unknown';
  }

  private classifyConnectionSpeed(downlink?: number): 'slow' | 'medium' | 'fast' {
    if (!downlink) return 'medium';
    if (downlink < 1) return 'slow';
    if (downlink < 5) return 'medium';
    return 'fast';
  }

  private generateSessionId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBetId(): string {
    return `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export convenience functions
export const initializeGameAnalytics = (apiEndpoint?: string) => {
  return GameAnalyticsManager.getInstance(apiEndpoint);
};

export const startGameSession = (
  gameId: string,
  gameName: string,
  gameType: GameType,
  userId?: string,
  userSessionId?: string
) => {
  const manager = GameAnalyticsManager.getInstance();
  return manager.startGameSession(gameId, gameName, gameType, userId, userSessionId);
};

export const trackGameEvent = (
  gameSessionId: string,
  type: GameEventType,
  category: GameEventCategory,
  action: string,
  properties?: Record<string, any>
) => {
  const manager = GameAnalyticsManager.getInstance();
  manager.trackEvent(gameSessionId, type, category, action, properties);
};

// Default export
export default GameAnalyticsManager;