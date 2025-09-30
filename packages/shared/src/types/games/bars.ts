/**
 * Bars game type definitions
 * Contains interfaces for Bars slot machine game configuration, state, symbols, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Game board dimensions for Bars
 */
export const BARS_BOARD_SIZE = 9; // 3x3 grid
export const BARS_GRID_WIDTH = 3;
export const BARS_GRID_HEIGHT = 3;
export const BARS_MIN_PAYLINES = 1;
export const BARS_MAX_PAYLINES = 5;
export const BARS_MAX_MULTIPLIER = 1000;

/**
 * Bars slot machine symbol types
 */
export type BarsSymbol = 
  | 'triple-bar'   // Highest payout - Triple BAR
  | 'double-bar'   // Double BAR
  | 'single-bar'   // Single BAR
  | 'seven'        // Seven - second highest payout
  | 'bell'         // Bell
  | 'cherry'       // Cherry - special payout rules
  | 'lemon'        // Lemon
  | 'orange'       // Orange
  | 'plum'         // Plum
  | 'grape';       // Grape - lowest regular symbol

/**
 * Symbol state in the Bars game
 */
export type BarsSymbolState = 'normal' | 'spinning' | 'stopped' | 'winning';

/**
 * Individual reel position on the Bars board
 */
export interface BarsReel {
  id: number; // 0-8 for 3x3 grid
  row: number; // 0-2
  col: number; // 0-2
  symbol: BarsSymbol;
  state: BarsSymbolState;
  isWinning: boolean;
  paylineIds: number[]; // Which paylines include this position
  multiplier?: number; // Symbol multiplier if applicable
  animationDelay?: number; // For reel spinning animations
}

/**
 * Payline definition
 */
export interface BarsPayline {
  id: number; // 1-5
  name: string;
  positions: number[]; // Array of 3 reel positions (0-8)
  isActive: boolean;
  betAmount: number;
}

/**
 * Payline win information
 */
export interface BarsPaylineWin {
  paylineId: number;
  symbol: BarsSymbol;
  positions: number[];
  matchCount: number; // 2 or 3 matching symbols
  basePayout: number;
  multiplier: number;
  totalPayout: number;
  isBonus?: boolean; // Mixed BAR bonus or special combination
}

/**
 * Bars game configuration
 */
export interface BarsConfig {
  activePaylines: number; // 1-5 paylines active
  betPerLine: number; // Bet amount per active payline
  autoSpin?: {
    enabled: boolean;
    spins: number;
    stopOnWin?: boolean;
    stopOnBigWin?: number; // Stop if single win exceeds this multiplier
    stopOnBalance?: number; // Stop if balance drops below this
  };
  turboMode?: boolean; // Faster spinning animations
  soundEnabled?: boolean;
}

/**
 * Current state of a Bars game
 */
export interface BarsGameState {
  gameId: string;
  playerId: string;
  betPerLine: number;
  activePaylines: number;
  totalBet: number;
  reels: BarsReel[];
  paylines: BarsPayline[];
  winningPaylines: BarsPaylineWin[];
  totalMultiplier: number;
  totalPayout: number;
  gameStatus: 'idle' | 'spinning' | 'evaluating' | 'displaying-wins' | 'complete';
  spinCount: number;
  startTime: Date;
  endTime?: Date;
  seed: string;
  nonce: number;
  isAutoSpin?: boolean;
  autoSpinRemaining?: number;
}

/**
 * Bars spin result
 */
export interface BarsSpinResult {
  finalReels: BarsReel[];
  winningPaylines: BarsPaylineWin[];
  totalPayout: number;
  totalMultiplier: number;
  hasWin: boolean;
  isBigWin: boolean; // Win exceeds certain threshold
  isMaxWin: boolean; // Maximum possible win achieved
}

/**
 * Result of a Bars game
 */
export interface BarsResult extends BaseGameResult {
  gameType: 'bars';
  config: BarsConfig;
  finalState: BarsGameState;
  spinResult: BarsSpinResult;
  symbolCombinations: { [symbol: string]: number };
  paylineHits: number;
  biggestWin: number;
}

/**
 * Bars game statistics
 */
export interface BarsStats {
  totalGames: number;
  totalSpins: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageMultiplier: number;
  hitFrequency: number; // Percentage of spins that result in wins
  favoritePaylines: { [payline: number]: number };
  symbolFrequency: { [s in BarsSymbol]?: number };
  bonusHits: number; // Mixed BAR combinations
}

/**
 * Bars game history entry
 */
export interface BarsHistoryEntry {
  gameId: string;
  timestamp: Date;
  betPerLine: number;
  activePaylines: number;
  totalBet: number;
  result: 'win' | 'loss';
  payout: number;
  multiplier: number;
  winningPaylines: number;
  biggestPaylineWin: number;
  duration: number; // in seconds
  symbols: BarsSymbol[]; // Final reel symbols
}

/**
 * Real-time Bars game event
 */
export interface BarsGameEvent {
  type: 'spin-started' | 'reels-stopped' | 'wins-evaluated' | 'paylines-highlighted' | 'spin-completed';
  gameId: string;
  playerId: string;
  data: {
    reelPositions?: BarsSymbol[];
    winningPaylines?: BarsPaylineWin[];
    payout?: number;
    multiplier?: number;
    newGameState?: Partial<BarsGameState>;
  };
  timestamp: Date;
}

/**
 * Symbol payout configuration
 */
export interface BarsSymbolPayouts {
  [key: string]: {
    symbol: BarsSymbol;
    threeMatch: number; // Payout for 3 matching symbols
    twoMatch?: number; // Payout for 2 matching symbols (cherry special)
    isSpecial?: boolean; // Special payout rules
  };
}

/**
 * Payline configuration
 */
export interface BarsPaylineConfig {
  id: number;
  name: string;
  positions: [number, number, number]; // Exactly 3 positions
  color: string; // Visual indicator color
}

/**
 * Bonus combination configuration
 */
export interface BarsBonusConfig {
  type: 'mixed-bars' | 'cherry-special';
  symbols: BarsSymbol[];
  multiplier: number;
  description: string;
}

/**
 * Provably fair data for Bars game
 */
export interface BarsProvablyFair {
  serverSeed: string; // Hidden until game ends
  clientSeed: string;
  nonce: number;
  reelResults: BarsSymbol[];
  symbolWeights: { [s in BarsSymbol]: number };
  isVerified: boolean;
  gameHash: string; // Hash of server seed before game starts
}

/**
 * Bars game validation result
 */
export interface BarsValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Bars auto-spin configuration
 */
export interface BarsAutoPlay {
  enabled: boolean;
  numberOfSpins: number;
  stopOnWin?: boolean;
  stopOnBigWin?: number; // Stop if win exceeds this multiplier
  stopOnBalance?: number; // Stop if balance drops below this
  increaseOnWin?: number; // Percentage increase
  increaseOnLoss?: number; // Percentage increase
  maxBetPerLine?: number;
}

/**
 * Animation configuration for Bars
 */
export interface BarsAnimationConfig {
  reelSpinDuration: number; // milliseconds per reel
  reelStopDelay: number; // milliseconds between reel stops
  winHighlightDuration: number; // milliseconds for payline highlights
  symbolAnimationDuration: number; // milliseconds for winning symbol animations
  celebrationDuration: number; // milliseconds for win celebrations
}

/**
 * Reel symbol weighting for random generation
 */
export interface BarsReelWeights {
  reel1: { [s in BarsSymbol]: number };
  reel2: { [s in BarsSymbol]: number };
  reel3: { [s in BarsSymbol]: number };
}

/**
 * Bars multiplier symbol (for future expansion)
 */
export interface BarsMultiplier {
  symbol: '2x' | '3x' | '5x';
  multiplier: number;
  positions: number[]; // Which reel positions can contain multipliers
  frequency: number; // Appearance frequency weight
}