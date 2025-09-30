/**
 * Dragon Tower game type definitions
 * Contains interfaces for Dragon Tower game configuration, state, moves, and results
 */

import type { BaseGameResult } from '../game';

/**
 * Dragon Tower game constants
 */
export const DRAGON_TOWER_LEVELS = 9; // 9-level tower
export const DRAGON_TOWER_MIN_LEVEL = 1;
export const DRAGON_TOWER_MAX_LEVEL = 9;

/**
 * Difficulty levels for Dragon Tower
 */
export type DragonTowerDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Tile counts per difficulty level
 */
export const DRAGON_TOWER_TILE_COUNTS: Record<DragonTowerDifficulty, number> = {
  easy: 2,    // 1 in 2 chance (50%)
  medium: 3,  // 1 in 3 chance (33.33%)
  hard: 4,    // 1 in 4 chance (25%)
  expert: 5   // 1 in 5 chance (20%)
};

/**
 * Base multipliers for each difficulty level
 */
export const DRAGON_TOWER_BASE_MULTIPLIERS: Record<DragonTowerDifficulty, number> = {
  easy: 1.5,    // 50% win chance
  medium: 2,    // 33.33% win chance  
  hard: 2.67,   // 25% win chance
  expert: 3.33  // 20% win chance
};

/**
 * State of a tile in the tower
 */
export type DragonTowerTileState = 'hidden' | 'safe' | 'egg' | 'selected';

/**
 * Individual tile on a tower level
 */
export interface DragonTowerTile {
  id: number; // Tile index within the level
  levelId: number; // Which level (1-9) this tile belongs to
  state: DragonTowerTileState;
  isSafe: boolean; // True for the safe tile, false for egg tiles
  isRevealed: boolean;
  isSelected: boolean; // True if player selected this tile
}

/**
 * Single level in the Dragon Tower
 */
export interface DragonTowerLevel {
  id: number; // 1-9 (level number)
  tiles: DragonTowerTile[];
  isCompleted: boolean;
  isActive: boolean; // True if this is the current level
  safeTileId: number; // Index of the safe tile (hidden until revealed)
  multiplier: number; // Multiplier achieved by completing this level
}

/**
 * Dragon Tower game configuration
 */
export interface DragonTowerConfig {
  difficulty: DragonTowerDifficulty;
  autoClimb?: {
    enabled: boolean;
    stopAtLevel?: number; // Stop climbing at specific level
    stopAtMultiplier?: number; // Stop when multiplier reaches this value
    stopOnWin?: boolean; // Stop if game is won
  };
  autoCashout?: {
    enabled: boolean;
    multiplier: number; // Auto cash out at this multiplier
  };
}

/**
 * Current state of a Dragon Tower game
 */
export interface DragonTowerGameState {
  gameId: string;
  playerId: string;
  betAmount: number;
  difficulty: DragonTowerDifficulty;
  levels: DragonTowerLevel[];
  currentLevel: number; // 1-9, current level being played
  completedLevels: number; // Number of completed levels (0-9)
  currentMultiplier: number;
  potentialPayout: number;
  gameStatus: 'setup' | 'climbing' | 'won' | 'lost' | 'cashed-out';
  canCashOut: boolean;
  startTime: Date;
  endTime?: Date;
  seed: string;
  nonce: number;
  totalEggPositions: number[][]; // Array of egg positions for each level [level][eggPositions]
}

/**
 * Player move in Dragon Tower game
 */
export interface DragonTowerMove {
  type: 'select-tile' | 'cash-out' | 'auto-climb-start' | 'auto-climb-stop';
  levelId?: number; // Required for tile selection
  tileId?: number; // Required for tile selection
  timestamp: Date;
}

/**
 * Result of a Dragon Tower game
 */
export interface DragonTowerResult extends BaseGameResult {
  gameType: 'dragon-tower';
  config: DragonTowerConfig;
  finalState: DragonTowerGameState;
  moves: DragonTowerMove[];
  levelsCompleted: number;
  maxLevelReached: number;
  hitEgg: boolean;
  cashOutLevel?: number; // Level at which player cashed out
  cashOutMultiplier?: number;
  eggPositions: number[][]; // Revealed after game ends
}

/**
 * Dragon Tower game statistics
 */
export interface DragonTowerStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  gamesCashedOut: number;
  winRate: number;
  cashOutRate: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestWin: number;
  longestClimbStreak: number;
  currentClimbStreak: number;
  averageMultiplier: number;
  averageLevelsCompleted: number;
  maxLevelReached: number;
  favoriteDifficulty: DragonTowerDifficulty;
  difficultyStats: { [key in DragonTowerDifficulty]: {
    games: number;
    wins: number;
    averageLevel: number;
    maxLevel: number;
  }};
}

/**
 * Dragon Tower game history entry
 */
export interface DragonTowerHistoryEntry {
  gameId: string;
  timestamp: Date;
  betAmount: number;
  difficulty: DragonTowerDifficulty;
  result: 'win' | 'loss' | 'cash-out';
  multiplier: number;
  payout: number;
  levelsCompleted: number;
  maxLevelReached: number;
  duration: number; // in seconds
}

/**
 * Real-time Dragon Tower game event
 */
export interface DragonTowerGameEvent {
  type: 'level-started' | 'tile-selected' | 'level-completed' | 'egg-hit' | 'cash-out' | 'game-started' | 'game-ended' | 'auto-climb-started' | 'auto-climb-stopped';
  gameId: string;
  playerId: string;
  data: {
    levelId?: number;
    tileId?: number;
    multiplier?: number;
    payout?: number;
    isEgg?: boolean;
    newGameState?: Partial<DragonTowerGameState>;
  };
  timestamp: Date;
}

/**
 * Dragon Tower multiplier calculation parameters
 */
export interface DragonTowerMultiplierParams {
  difficulty: DragonTowerDifficulty;
  level: number; // 1-9
  baseMultiplier: number;
  houseEdge?: number; // Default 3% (97% RTP)
}

/**
 * Provably fair data for Dragon Tower game
 */
export interface DragonTowerProvablyFair {
  serverSeed: string; // Hidden until game ends
  clientSeed: string;
  nonce: number;
  eggPositions: number[][]; // Egg positions for each level
  safeTilePositions: number[]; // Safe tile position for each level
  isVerified: boolean;
  gameHash: string; // Hash of server seed before game starts
}

/**
 * Dragon Tower game validation result
 */
export interface DragonTowerValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Dragon Tower auto-climb configuration
 */
export interface DragonTowerAutoClimb {
  enabled: boolean;
  speed: 'slow' | 'normal' | 'fast'; // Auto-climb speed
  stopConditions: {
    atLevel?: number; // Stop at specific level (1-9)
    atMultiplier?: number; // Stop when multiplier reaches this value
    onWin?: boolean; // Stop if game is won (reach level 9)
    onFirstWin?: boolean; // Stop after first successful level
  };
  safetyLimits: {
    maxLevel?: number; // Never climb beyond this level
    maxRisk?: number; // Stop if risk exceeds this percentage
  };
}

/**
 * Dragon Tower cash-out options
 */
export interface DragonTowerCashOut {
  currentLevel: number;
  currentMultiplier: number;
  guaranteedPayout: number;
  nextLevel: {
    level: number;
    potentialMultiplier: number;
    potentialPayout: number;
    winChance: number; // Percentage chance of success
    riskAmount: number; // Amount at risk if egg is hit
  };
}

/**
 * Dragon Tower level progression data
 */
export interface DragonTowerLevelProgression {
  level: number;
  difficulty: DragonTowerDifficulty;
  tilesCount: number;
  winChance: number; // Percentage
  multiplier: number;
  cumulativeMultiplier: number;
  riskReward: {
    risk: number; // Amount at risk
    reward: number; // Potential reward
    ratio: number; // Risk/reward ratio
  };
}