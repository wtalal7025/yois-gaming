/**
 * Limbo game type definitions
 * Contains interfaces for Limbo multiplier prediction game configuration, state, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Limbo game states during gameplay
 */
export type LimboGameState = 
  | 'setup'      // Player selecting target multiplier and bet amount
  | 'rolling'    // Brief animation while generating multiplier  
  | 'result'     // Displaying generated multiplier and win/loss outcome
  | 'complete';  // Payout processed, ready for next round

/**
 * Auto-betting conditions for stopping
 */
export type AutoBettingStopCondition = 
  | 'manual'           // Stop manually
  | 'number-of-bets'   // Stop after X bets
  | 'profit-target'    // Stop when profit target reached
  | 'loss-limit'       // Stop when loss limit reached  
  | 'big-win';         // Stop on big win (customizable threshold)

/**
 * Auto-betting behavior on win/loss
 */
export type AutoBettingBehavior =
  | 'continue'      // Keep same bet amount
  | 'reset-base'    // Reset to base bet amount
  | 'increase';     // Increase bet by percentage

/**
 * Game status for UI state management
 */
export type GameStatus = 'idle' | 'loading' | 'win' | 'loss' | 'complete'

/**
 * Auto-betting configuration interface
 */
export interface LimboAutoBettingConfig {
  enabled: boolean;
  numberOfBets: number;
  onWin: AutoBettingBehavior;
  onLoss: AutoBettingBehavior;
  stopOnWin: boolean;
  stopOnLoss: boolean;
  winAmount: number;
  lossAmount: number;
  increaseOnWin: boolean;
  increaseOnLoss: boolean;
  increasePercentage: number;
  resetOnWin: boolean;
  resetOnLoss: boolean;
  speed: number;
}

/**
 * Limbo game configuration
 */
export interface LimboConfig {
  // Core game parameters
  minTargetMultiplier: number;    // Minimum target (1.01)
  maxTargetMultiplier: number;    // Maximum target (1,000,000)
  houseEdge: number;              // House edge percentage (1%)
  multiplierPrecision: number;    // Decimal places (2)
  
  // Auto-betting configuration
  autoBetting?: {
    enabled: boolean;
    numberOfBets?: number;        // Number of auto bets
    stopCondition: AutoBettingStopCondition;
    profitTarget?: number;        // Stop when profit reaches this
    lossLimit?: number;          // Stop when loss exceeds this
    bigWinThreshold?: number;    // Consider this a "big win" multiplier
    onWin: AutoBettingBehavior;  // What to do after win
    onLoss: AutoBettingBehavior; // What to do after loss
    increasePercentage?: number; // Percentage to increase bet
    maxBetAmount?: number;       // Maximum bet amount cap
    speed: number;               // Delay between bets in ms (500-3000)
  };
  
  // Quick presets for multiplier selection
  quickPresets: number[];        // [2, 5, 10, 100, 1000]
}

/**
 * Current Limbo game session state
 */
export interface LimboGameSessionState {
  gameId: string;
  playerId: string;
  state: LimboGameState;
  
  // Current round data
  betAmount?: number;
  targetMultiplier?: number;
  generatedMultiplier?: number;
  
  // Round results
  isWin?: boolean;
  payout?: number;
  profit?: number;
  
  // Probabilities and potential payout
  winProbability: number;       // Real-time calculation: 99/target
  potentialPayout: number;      // bet × target multiplier
  
  // Auto-betting state
  isAutoBetting: boolean;
  autoBetRemaining?: number;
  autoBetProfit?: number;
  autoBetSession?: {
    totalBets: number;
    wins: number;
    losses: number;
    netProfit: number;
    biggestWin: number;
    currentStreak: number;
    longestStreak: number;
  };
  
  // Provably fair data
  seed: string;
  nonce: number;
  clientSeed?: string;
  
  // Timestamps
  roundStartTime?: Date;
  roundEndTime?: Date;
}

/**
 * Limbo player action
 */
export interface LimboAction {
  type: 
    | 'set-target-multiplier'    // Set target multiplier
    | 'place-bet'               // Place bet with current settings
    | 'roll'                    // Execute the multiplier generation
    | 'start-auto-betting'      // Start auto-betting sequence
    | 'stop-auto-betting'       // Stop auto-betting
    | 'reset-game';            // Reset to setup state
  
  playerId: string;
  timestamp: Date;
  
  // Action-specific data
  targetMultiplier?: number;
  betAmount?: number;
  autoBettingConfig?: LimboConfig['autoBetting'];
}

/**
 * Limbo multiplier generation parameters for provably fair
 */
export interface LimboMultiplierParams {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  houseEdge: number;           // 0.01 for 1%
  minMultiplier: number;       // 1.00
  maxMultiplier: number;       // 1,000,000
}

/**
 * Result of a Limbo game round
 */
export interface LimboResult extends BaseGameResult {
  gameType: 'limbo';
  config: LimboConfig;
  finalState: LimboGameSessionState;
  
  // Round-specific results
  targetMultiplier: number;
  generatedMultiplier: number;
  winProbability: number;       // 99/target at time of bet
  isWin: boolean;
  
  // Timing and animation data
  rollDuration: number;         // Animation duration in ms
  
  // Auto-betting context (if applicable)
  wasAutoBet: boolean;
  autoBetRound?: number;        // Which auto-bet round this was
}

/**
 * Limbo game statistics
 */
export interface LimboStats {
  // Basic statistics
  totalRounds: number;
  roundsWon: number;
  roundsLost: number;
  winRate: number;              // Percentage
  
  // Financial statistics  
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  biggestLoss: number;
  
  // Streak tracking
  longestWinStreak: number;
  currentWinStreak: number;
  longestLossStreak: number;
  currentLossStreak: number;
  
  // Multiplier statistics
  highestGeneratedMultiplier: number;
  mostCommonTarget: number;     // Most frequently chosen target
  averageTarget: number;        // Average target multiplier
  averageGenerated: number;     // Average generated multiplier
  
  // Success rates by target ranges
  successRatesByTarget: {
    [range: string]: {          // e.g., "1.01-2.00", "2.01-5.00"
      attempts: number;
      wins: number; 
      winRate: number;
    };
  };
  
  // Auto-betting statistics
  autoBettingSessions: number;
  totalAutoBets: number;
  autoBettingProfit: number;
  bestAutoBettingSession: number;
  worstAutoBettingSession: number;
}

/**
 * Limbo game history entry
 */
export interface LimboHistoryEntry {
  gameId: string;
  timestamp: Date;
  betAmount: number;
  targetMultiplier: number;
  generatedMultiplier: number;
  winProbability: number;
  result: 'win' | 'loss';
  payout: number;
  profit: number;
  wasAutoBet: boolean;
  autoBetRound?: number;
  rollDuration: number;
}

/**
 * Provably fair data for Limbo game
 */
export interface LimboProvablyFair {
  serverSeed: string;           // Hidden until round ends
  clientSeed: string;           // Player provided or generated
  nonce: number;                // Round-specific nonce
  generatedMultiplier: number;  // Final generated multiplier
  isVerified: boolean;
  gameHash: string;             // Pre-round hash of server seed
  algorithm: string;            // Multiplier generation algorithm used
  verification: {
    formula: string;            // Mathematical formula used
    inputs: string;             // Input parameters
    calculation: string;        // Step-by-step calculation
    result: number;             // Final result
  };
}

/**
 * Limbo game validation result
 */
export interface LimboValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Multiplier input validation
 */
export interface MultiplierValidation {
  isValid: boolean;
  multiplier: number;
  winProbability: number;
  potentialPayout: number;
  error?: string;
  warning?: string;
}

/**
 * Auto-betting session configuration
 */
export interface AutoBettingSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  config: LimboConfig['autoBetting'];
  
  // Session statistics
  totalBets: number;
  completedBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  
  // Session tracking
  biggestWin: number;
  biggestLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  
  // Stop reasons
  stopReason?: 
    | 'completed'       // Finished planned number of bets
    | 'profit-target'   // Reached profit target
    | 'loss-limit'      // Hit loss limit  
    | 'big-win'        // Hit big win threshold
    | 'manual'         // Manually stopped
    | 'error';         // Stopped due to error
}

/**
 * Quick preset multiplier configuration
 */
export interface MultiplierPreset {
  multiplier: number;
  label: string;              // e.g., "2x", "10x", "100x"
  winProbability: number;     // Pre-calculated for display
  popularityRank?: number;    // How popular this preset is
}

/**
 * Limbo game event for real-time updates
 */
export interface LimboGameEvent {
  type: 
    | 'round-started'         // New round began
    | 'multiplier-generated'  // Multiplier generated
    | 'round-completed'       // Round finished
    | 'auto-bet-started'      // Auto-betting started
    | 'auto-bet-stopped'      // Auto-betting stopped
    | 'stats-updated';        // Statistics updated
    
  gameId: string;
  playerId: string;
  timestamp: Date;
  
  data: {
    state?: LimboGameState;
    targetMultiplier?: number;
    generatedMultiplier?: number;
    isWin?: boolean;
    payout?: number;
    profit?: number;
    autoBetRemaining?: number;
    newGameState?: Partial<LimboGameSessionState>;
  };
}

/**
 * Limbo UI theme and animation configuration
 */
export interface LimboUIConfig {
  // Animation settings
  rollAnimationDuration: number;    // Duration of roll animation (ms)
  resultRevealDuration: number;     // Duration of result reveal (ms)
  celebrationDuration: number;      // Win celebration duration (ms)
  
  // Visual settings
  enableParticleEffects: boolean;   // Particle effects on wins
  enableSoundEffects: boolean;      // Sound effects
  enableVibration: boolean;         // Mobile vibration on results
  
  // Color scheme
  winColor: string;                 // Color for wins (green)
  lossColor: string;                // Color for losses (red)
  neutralColor: string;             // Color for neutral states
  accentColor: string;              // Accent color for UI elements
  
  // Multiplier display
  multiplierFontSize: string;       // Size for multiplier display
  multiplierAnimationEasing: string; // CSS easing function
  
  // Mobile optimizations
  touchSensitivity: number;         // Touch sensitivity (1-10)
  compactMode: boolean;             // Use compact layout on small screens
}

/**
 * Performance metrics for Limbo game
 */
export interface LimboPerformanceMetrics {
  averageRollTime: number;          // Average time for roll animation
  renderFrameRate: number;          // Current FPS during animations
  memoryUsage: number;              // Memory usage in MB
  autoBettingSpeed: number;         // Auto-bets per minute
  networkLatency: number;           // Network round-trip time
}