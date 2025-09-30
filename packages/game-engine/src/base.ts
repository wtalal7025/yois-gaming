/**
 * Base game engine classes and interfaces
 * Contains abstract game class and core game logic
 */

import type { GameType, BaseGameResult } from '@stake-games/shared';

/**
 * Abstract base class for all games
 */
export abstract class BaseGame {
  protected gameType: GameType;
  
  constructor(gameType: GameType) {
    this.gameType = gameType;
  }

  /**
   * Play a game round with given bet amount and seed
   */
  abstract play(betAmount: number, seed: string, nonce: number): Promise<BaseGameResult>;
  
  /**
   * Validate bet amount according to game rules
   */
  abstract validateBet(betAmount: number): boolean;
  
  /**
   * Get game configuration and limits
   */
  abstract getConfig(): {
    minBet: number;
    maxBet: number;
    maxMultiplier?: number;
  };
}

/**
 * Game engine factory for creating game instances
 */
export class GameEngine {
  private games: Map<GameType, BaseGame> = new Map();
  
  /**
   * Register a game implementation
   */
  registerGame(gameType: GameType, game: BaseGame): void {
    this.games.set(gameType, game);
  }
  
  /**
   * Get game instance by type
   */
  getGame(gameType: GameType): BaseGame | undefined {
    return this.games.get(gameType);
  }
  
  /**
   * Get all registered game types
   */
  getAvailableGames(): GameType[] {
    return Array.from(this.games.keys());
  }
}