/**
 * Game-related type definitions
 * Contains interfaces for game results, states, and configurations
 */

/**
 * Supported game types in the platform
 */
export type GameType = 
  | 'sugar-rush'
  | 'mines'
  | 'bars'
  | 'dragon-tower'
  | 'crash'
  | 'limbo';

/**
 * Game result status indicating outcome
 */
export type GameResultStatus = 'win' | 'loss' | 'push';

/**
 * Base game result interface
 */
export interface BaseGameResult {
  gameId: string;
  gameType: GameType;
  playerId: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  status: GameResultStatus;
  timestamp: Date;
  seed: string;
  nonce: number;
}

/**
 * Game configuration interface
 */
export interface GameConfig {
  gameType: GameType;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  maxMultiplier?: number;
  enabled: boolean;
}

/**
 * Player session interface
 */
export interface PlayerSession {
  sessionId: string;
  playerId: string;
  connectedAt: Date;
  lastActivity: Date;
  currentGame?: GameType;
}