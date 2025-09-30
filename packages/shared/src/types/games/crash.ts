/**
 * Crash game type definitions
 * Contains interfaces for Crash real-time multiplier game configuration, state, phases, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Crash game phase states
 */
export type CrashPhase = 
  | 'waiting'          // Players can place bets, countdown to next round
  | 'betting-closed'   // Brief phase before round starts
  | 'flying'           // Multiplier growing, players can cash out
  | 'crashed'          // Round ended, showing results
  | 'preparing';       // Preparing for next round

/**
 * Player cash-out status
 */
export type CashOutStatus = 'active' | 'cashed-out' | 'crashed';

/**
 * Crash game configuration
 */
export interface CrashConfig {
  bettingWindow: number; // Betting window duration in seconds (10-15s)
  maxRoundDuration: number; // Maximum round duration in seconds (60s)
  minCrashPoint: number; // Minimum crash point (1.00)
  maxCrashPoint: number; // Theoretical max crash point (1000000.00)
  houseEdge: number; // House edge percentage (~1%)
  autoCashout?: {
    enabled: boolean;
    target: number; // Target multiplier (e.g., 2.50)
    minTarget: number; // Minimum auto-cashout (1.01)
    maxTarget: number; // Maximum auto-cashout (1000.00)
  };
  autoPlay?: {
    enabled: boolean;
    numberOfRounds: number;
    stopOnBigWin?: number; // Stop if win exceeds this multiplier
    stopOnBalance?: number; // Stop if balance drops below this
    increaseOnWin?: number; // Percentage increase
    increaseOnLoss?: number; // Percentage increase
    maxBetAmount?: number;
  };
}

/**
 * Current state of a Crash game round
 */
export interface CrashGameState {
  gameId: string;
  roundNumber: number;
  phase: CrashPhase;
  startTime: Date;
  endTime?: Date;
  bettingCloseTime?: Date;
  
  // Multiplier and timing
  currentMultiplier: number;
  crashPoint?: number; // Hidden until crash occurs
  elapsedTime: number; // Time since multiplier started growing
  
  // Player state
  playerId: string;
  betAmount?: number;
  playerStatus: CashOutStatus;
  cashOutMultiplier?: number; // Multiplier when player cashed out
  cashOutTime?: Date;
  potentialPayout: number;
  
  // Round statistics
  totalPlayers: number;
  totalBets: number;
  cashedOutPlayers: number;
  averageCashOut: number;
  
  // Provably fair
  seed: string;
  nonce: number;
  clientSeed?: string;
  
  // Auto features
  autoCashoutEnabled: boolean;
  autoCashoutTarget?: number;
  isAutoPlay?: boolean;
  autoPlayRemaining?: number;
}

/**
 * Player action in Crash game
 */
export interface CrashAction {
  type: 'bet' | 'cash-out' | 'auto-cashout' | 'cancel-bet';
  playerId: string;
  amount?: number; // For bet actions
  multiplier?: number; // For cash-out actions
  timestamp: Date;
  autoCashoutTarget?: number; // For setting auto cash-out
}

/**
 * Multiplier curve point for visualization
 */
export interface MultiplierPoint {
  time: number; // Time in milliseconds from start
  multiplier: number; // Multiplier value at this time
  elapsedSeconds: number; // Human-readable elapsed time
}

/**
 * Crash point generation parameters
 */
export interface CrashPointParams {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  houseEdge: number;
  minCrash: number;
  maxCrash: number;
}

/**
 * Result of a Crash game
 */
export interface CrashResult extends BaseGameResult {
  gameType: 'crash';
  config: CrashConfig;
  finalState: CrashGameState;
  
  // Round results
  crashPoint: number;
  roundDuration: number; // Duration until crash in seconds
  playerCashedOut: boolean;
  cashOutMultiplier?: number;
  
  // Statistics
  totalRoundPlayers: number;
  playersWhoWon: number;
  playersWhoLost: number;
  averageWinMultiplier: number;
  biggestWin: number;
  
  // Multiplier curve data for replay
  multiplierCurve: MultiplierPoint[];
}

/**
 * Crash game statistics
 */
export interface CrashStats {
  totalRounds: number;
  roundsWon: number;
  roundsLost: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageCashOutMultiplier: number;
  averageRoundDuration: number;
  favoriteAutoCashouts: { [multiplier: string]: number };
  crashDistribution: { [range: string]: number }; // e.g., "1.00-1.99": 50
}

/**
 * Crash game history entry
 */
export interface CrashHistoryEntry {
  gameId: string;
  roundNumber: number;
  timestamp: Date;
  betAmount: number;
  crashPoint: number;
  result: 'win' | 'loss';
  cashOutMultiplier?: number;
  payout: number;
  profit: number;
  roundDuration: number;
  playerCount: number;
  wasAutoCashout: boolean;
}

/**
 * Real-time Crash game event
 */
export interface CrashGameEvent {
  type: 
    | 'round-starting'      // New round countdown begins
    | 'betting-closed'      // Betting window closed
    | 'multiplier-started'  // Multiplier begins growing
    | 'player-cashed-out'   // A player cashed out
    | 'multiplier-update'   // Real-time multiplier update
    | 'round-crashed'       // Round ended with crash
    | 'round-ended';        // Round completely finished
  
  gameId: string;
  roundNumber: number;
  timestamp: Date;
  
  data: {
    phase?: CrashPhase;
    multiplier?: number;
    crashPoint?: number;
    playerId?: string;
    cashOutMultiplier?: number;
    payout?: number;
    countdown?: number;
    newGameState?: Partial<CrashGameState>;
  };
}

/**
 * Multiplier growth algorithm configuration
 */
export interface MultiplierGrowthConfig {
  startMultiplier: number; // Always 1.00
  growthRate: number; // Exponential growth rate constant
  updateFrequency: number; // Updates per second (60fps = 60)
  targetDuration: number; // Target time to reach crash point
  smoothing: boolean; // Use smoothing for visual appeal
}

/**
 * Auto-cashout trigger configuration
 */
export interface AutoCashoutConfig {
  enabled: boolean;
  target: number; // Target multiplier
  tolerance: number; // Execution tolerance (+/- multiplier)
  maxDelay: number; // Maximum execution delay in ms
  failsafes: {
    networkTimeout: number;
    serverLag: number;
    executionBuffer: number; // Buffer before target for safety
  };
}

/**
 * Provably fair data for Crash game
 */
export interface CrashProvablyFair {
  serverSeed: string; // Hidden until round ends
  clientSeed: string; // Player provided or generated
  nonce: number; // Round-specific nonce
  crashPoint: number; // Final crash point
  isVerified: boolean;
  gameHash: string; // Pre-round hash of server seed
  algorithm: string; // Crash point generation algorithm used
  verification: {
    formula: string;
    inputs: string;
    calculation: string;
    result: number;
  };
}

/**
 * Crash game validation result
 */
export interface CrashValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Live round information for display
 */
export interface CrashLiveRound {
  roundId: string;
  roundNumber: number;
  phase: CrashPhase;
  currentMultiplier: number;
  elapsedTime: number;
  playerCount: number;
  totalBetAmount: number;
  topCashOuts: Array<{
    playerId: string;
    playerName?: string;
    multiplier: number;
    payout: number;
    timestamp: Date;
  }>;
  countdown?: number; // Countdown for next round
}

/**
 * Crash game animation configuration
 */
export interface CrashAnimationConfig {
  rocketLaunch: boolean; // Enable rocket launch animation
  multiplierGlow: boolean; // Glow effect on multiplier
  chartTrail: boolean; // Trail effect on chart curve
  explosionEffect: boolean; // Explosion when crashed
  celebrationDuration: number; // Win celebration duration
  crashShakeIntensity: number; // Screen shake on crash
}

/**
 * Chart visualization configuration
 */
export interface CrashChartConfig {
  width: number;
  height: number;
  backgroundColor: string;
  gridColor: string;
  curveColor: string;
  crashColor: string;
  cashOutColor: string;
  updateFrequency: number; // Chart updates per second
  maxDataPoints: number; // Maximum points to keep in memory
  timeWindow: number; // Time window to display in seconds
  multiplierRange: [number, number]; // Y-axis multiplier range
}

/**
 * Crash sound configuration
 */
export interface CrashSoundConfig {
  enabled: boolean;
  rocketLaunch: boolean;
  multiplierTicking: boolean;
  cashOutSuccess: boolean;
  crashExplosion: boolean;
  countdownBeep: boolean;
  volume: number; // 0-100
}

/**
 * Performance monitoring for real-time features
 */
export interface CrashPerformanceMetrics {
  frameRate: number; // Current FPS
  latency: number; // Network latency in ms
  updateDelay: number; // Average update delay
  memorUsage: number; // Memory usage for chart data
  cpuUsage: number; // CPU usage percentage
  networkUtilization: number; // Network usage
}

/**
 * Mobile-specific configuration
 */
export interface CrashMobileConfig {
  touchSensitivity: number;
  gestureSupport: boolean;
  vibrationEnabled: boolean;
  batteryOptimization: boolean;
  reducedAnimations: boolean;
  compactLayout: boolean;
}
