/**
 * Mines game type definitions
 * Contains interfaces for Mines game configuration, state, moves, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Game board dimensions for Mines
 */
export const MINES_BOARD_SIZE = 25; // 5x5 grid
export const MINES_MIN_COUNT = 1;
export const MINES_MAX_COUNT = 24;

/**
 * Tile state in the Mines game
 */
export type MinesTileState = 'hidden' | 'revealed' | 'flagged';

/**
 * Individual tile on the Mines board
 */
export interface MinesTile {
  id: number; // 0-24 for 5x5 grid
  row: number; // 0-4
  col: number; // 0-4
  state: MinesTileState;
  hasMine: boolean;
  multiplier?: number; // Only set when revealed and safe
  isRevealed: boolean;
  isFlagged: boolean;
}

/**
 * Mines game configuration
 */
export interface MinesConfig {
  mineCount: number; // 1-24
  autoReveal?: boolean; // Auto-reveal adjacent tiles
  autoCashout?: {
    enabled: boolean;
    multiplier: number;
  };
}

/**
 * Current state of a Mines game
 */
export interface MinesGameState {
  gameId: string;
  playerId: string;
  betAmount: number;
  mineCount: number;
  tiles: MinesTile[];
  minePositions: number[]; // Hidden from client until game ends
  revealedTiles: number[]; // Array of revealed tile IDs
  currentMultiplier: number;
  potentialPayout: number;
  gameStatus: 'setup' | 'playing' | 'won' | 'lost';
  canCashOut: boolean;
  startTime: Date;
  endTime?: Date;
  seed: string;
  nonce: number;
}

/**
 * Player move in Mines game
 */
export interface MinesMove {
  type: 'reveal' | 'flag' | 'cashout';
  tileId?: number; // Required for reveal/flag actions
  timestamp: Date;
}

/**
 * Result of a Mines game
 */
export interface MinesResult extends BaseGameResult {
  gameType: 'mines';
  config: MinesConfig;
  finalState: MinesGameState;
  moves: MinesMove[];
  revealedSafeTiles: number;
  hitMine: boolean;
  cashOutMultiplier?: number;
  minePositions: number[]; // Revealed after game ends
}

/**
 * Mines game statistics
 */
export interface MinesStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageMultiplier: number;
  favoriteMineCounts: { [count: number]: number };
}

/**
 * Mines game history entry
 */
export interface MinesHistoryEntry {
  gameId: string;
  timestamp: Date;
  betAmount: number;
  mineCount: number;
  result: 'win' | 'loss';
  multiplier: number;
  payout: number;
  tilesRevealed: number;
  duration: number; // in seconds
}

/**
 * Real-time Mines game event
 */
export interface MinesGameEvent {
  type: 'tile-revealed' | 'mine-hit' | 'cash-out' | 'game-started' | 'game-ended';
  gameId: string;
  playerId: string;
  data: {
    tileId?: number;
    multiplier?: number;
    payout?: number;
    newGameState?: Partial<MinesGameState>;
  };
  timestamp: Date;
}

/**
 * Mines multiplier calculation parameters
 */
export interface MinesMultiplierParams {
  totalTiles: number;
  mineCount: number;
  revealedSafeTiles: number;
  houseEdge?: number;
}

/**
 * Provably fair data for Mines game
 */
export interface MinesProvablyFair {
  serverSeed: string; // Hidden until game ends
  clientSeed: string;
  nonce: number;
  minePositions: number[];
  isVerified: boolean;
  gameHash: string; // Hash of server seed before game starts
}

/**
 * Mines game validation result
 */
export interface MinesValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Mines auto-play configuration
 */
export interface MinesAutoPlay {
  enabled: boolean;
  numberOfGames: number;
  stopOnWin?: boolean;
  stopOnLoss?: boolean;
  increaseOnWin?: number; // Percentage
  increaseOnLoss?: number; // Percentage
  maxBetAmount?: number;
  cashOutAt?: number; // Multiplier to auto cash out
}