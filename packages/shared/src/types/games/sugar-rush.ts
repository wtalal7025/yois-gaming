/**
 * Sugar Rush game type definitions
 * Contains interfaces for Sugar Rush game configuration, state, symbols, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Game board dimensions for Sugar Rush
 */
export const SUGAR_RUSH_BOARD_SIZE = 49; // 7x7 grid
export const SUGAR_RUSH_GRID_WIDTH = 7;
export const SUGAR_RUSH_GRID_HEIGHT = 7;
export const SUGAR_RUSH_MIN_CLUSTER_SIZE = 5;
export const SUGAR_RUSH_MAX_MULTIPLIER = 1000;

/**
 * Sugar Rush candy symbol types
 */
export type SugarRushSymbol = 
  | 'red-candy'    // Highest value
  | 'orange-candy' 
  | 'yellow-candy'
  | 'green-candy'
  | 'blue-candy'
  | 'purple-candy'
  | 'pink-candy'   // Lowest value
  | 'wild';        // Wild symbol (substitutes any candy)

/**
 * Symbol state in the Sugar Rush game
 */
export type SugarRushSymbolState = 'normal' | 'matched' | 'falling' | 'exploding';

/**
 * Individual symbol on the Sugar Rush board
 */
export interface SugarRushCell {
  id: number; // 0-48 for 7x7 grid
  row: number; // 0-6
  col: number; // 0-6
  symbol: SugarRushSymbol;
  state: SugarRushSymbolState;
  isMatched: boolean;
  clusterId?: number; // ID of the cluster this cell belongs to
  multiplier?: number; // Zone multiplier (2x, 3x, 5x)
  animationDelay?: number; // For cascade animations
}

/**
 * Cluster of matching symbols
 */
export interface SugarRushCluster {
  id: number;
  symbol: SugarRushSymbol;
  cells: number[]; // Array of cell IDs in the cluster
  size: number;
  payout: number;
  multiplier: number;
}

/**
 * Cascade level information
 */
export interface SugarRushCascade {
  level: number;
  clustersFound: SugarRushCluster[];
  totalPayout: number;
  multiplier: number;
  newSymbols: SugarRushCell[]; // Symbols that fell down
}

/**
 * Sugar Rush game configuration
 */
export interface SugarRushConfig {
  autoSpin?: boolean; // Auto-spin feature
  turboMode?: boolean; // Faster animations
  soundEnabled?: boolean;
  multiplierZones?: {
    enabled: boolean;
    positions: number[]; // Cell positions with multipliers
    values: number[]; // Corresponding multiplier values
  };
}

/**
 * Current state of a Sugar Rush game
 */
export interface SugarRushGameState {
  gameId: string;
  playerId: string;
  betAmount: number;
  grid: SugarRushCell[];
  currentCascadeLevel: number;
  cascadeHistory: SugarRushCascade[];
  totalMultiplier: number;
  totalPayout: number;
  gameStatus: 'spinning' | 'evaluating' | 'cascading' | 'complete' | 'idle';
  startTime: Date;
  endTime?: Date;
  seed: string;
  nonce: number;
  isAutoSpin?: boolean;
}

/**
 * Sugar Rush spin result
 */
export interface SugarRushSpinResult {
  initialGrid: SugarRushCell[];
  cascades: SugarRushCascade[];
  finalGrid: SugarRushCell[];
  totalPayout: number;
  finalMultiplier: number;
  maxCascadeLevel: number;
}

/**
 * Result of a Sugar Rush game
 */
export interface SugarRushResult extends BaseGameResult {
  gameType: 'sugar-rush';
  config: SugarRushConfig;
  finalState: SugarRushGameState;
  spinResult: SugarRushSpinResult;
  clustersWon: SugarRushCluster[];
  cascadeLevels: number;
  maxMultiplier: number;
}

/**
 * Sugar Rush game statistics
 */
export interface SugarRushStats {
  totalGames: number;
  totalSpins: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageMultiplier: number;
  maxCascadeLevels: number;
  favoriteSymbols: { [s in SugarRushSymbol]?: number };
  clusterSizeStats: { [size: number]: number };
}

/**
 * Sugar Rush game history entry
 */
export interface SugarRushHistoryEntry {
  gameId: string;
  timestamp: Date;
  betAmount: number;
  result: 'win' | 'loss';
  payout: number;
  multiplier: number;
  cascadeLevels: number;
  clustersWon: number;
  biggestCluster: number;
  duration: number; // in seconds
}

/**
 * Real-time Sugar Rush game event
 */
export interface SugarRushGameEvent {
  type: 'spin-started' | 'clusters-found' | 'cascade-started' | 'cascade-completed' | 'game-completed';
  gameId: string;
  playerId: string;
  data: {
    cascadeLevel?: number;
    clusters?: SugarRushCluster[];
    payout?: number;
    multiplier?: number;
    newGameState?: Partial<SugarRushGameState>;
  };
  timestamp: Date;
}

/**
 * Symbol payout configuration
 */
export interface SugarRushSymbolPayouts {
  [key: string]: {
    symbol: SugarRushSymbol;
    baseValue: number;
    multipliers: { [clusterSize: number]: number };
  };
}

/**
 * Multiplier zone configuration
 */
export interface SugarRushMultiplierZone {
  position: number; // Cell ID
  multiplier: number; // 2x, 3x, 5x
  isActive: boolean;
}

/**
 * Provably fair data for Sugar Rush game
 */
export interface SugarRushProvablyFair {
  serverSeed: string; // Hidden until game ends
  clientSeed: string;
  nonce: number;
  initialGrid: SugarRushSymbol[];
  cascadeSeeds: string[]; // Seeds for each cascade level
  isVerified: boolean;
  gameHash: string; // Hash of server seed before game starts
}

/**
 * Sugar Rush game validation result
 */
export interface SugarRushValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Sugar Rush auto-play configuration
 */
export interface SugarRushAutoPlay {
  enabled: boolean;
  numberOfSpins: number;
  stopOnWin?: boolean;
  stopOnBigWin?: number; // Stop if win exceeds this multiplier
  stopOnBalance?: number; // Stop if balance drops below this
  increaseOnWin?: number; // Percentage
  increaseOnLoss?: number; // Percentage
  maxBetAmount?: number;
}

/**
 * Animation configuration for Sugar Rush
 */
export interface SugarRushAnimationConfig {
  symbolDropSpeed: number; // milliseconds
  explosionDuration: number; // milliseconds
  cascadeDelay: number; // milliseconds between cascades
  celebrationDuration: number; // milliseconds for win celebrations
  particleCount: number; // Number of particles in explosions
}

/**
 * Sugar Rush bonus feature (for future expansion)
 */
export interface SugarRushBonus {
  type: 'free-spins' | 'multiplier-boost' | 'symbol-upgrade';
  trigger: 'cascade-count' | 'big-win' | 'special-pattern';
  value: number;
  duration?: number;
  isActive: boolean;
}