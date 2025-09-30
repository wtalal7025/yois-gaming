/**
 * Dragon Tower Game Engine Implementation
 * Implements the complete Dragon Tower game logic with provably fair egg placement
 */

import { BaseGame } from '../../base';
import { ProvablyFairRandom } from '../../random';
import { generateId } from '@yois-games/shared';
import type {
  BaseGameResult,
  GameResultStatus,
  DragonTowerConfig,
  DragonTowerGameState,
  DragonTowerResult,
  DragonTowerTile,
  DragonTowerLevel,
  DragonTowerMove,
  DragonTowerProvablyFair,
  DragonTowerValidation,
  DragonTowerDifficulty,
  DragonTowerMultiplierParams
} from '@yois-games/shared';

// Import constants as values
const DRAGON_TOWER_LEVELS = 9;
const DRAGON_TOWER_TILE_COUNTS = {
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5
};
const DRAGON_TOWER_BASE_MULTIPLIERS = {
  easy: 1.5,
  medium: 2,
  hard: 2.67,
  expert: 3.33
};

/**
 * Dragon Tower game implementation extending BaseGame
 */
export class DragonTowerGame extends BaseGame {
  constructor() {
    super('dragon-tower');
  }

  /**
   * Play a complete Dragon Tower game round
   */
  async play(betAmount: number, seed: string, nonce: number, config?: DragonTowerConfig): Promise<DragonTowerResult> {
    // Use default config if none provided
    const gameConfig: DragonTowerConfig = {
      difficulty: config?.difficulty || 'easy',
      ...(config?.autoClimb && { autoClimb: config.autoClimb }),
      ...(config?.autoCashout && { autoCashout: config.autoCashout })
    };

    // Validate game configuration
    const validation = this.validateConfig(gameConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid game configuration: ${validation.errors.join(', ')}`);
    }

    // Generate game ID and initialize state
    const gameId = generateId(16);
    const playerId = 'system'; // Would be provided by caller in real implementation

    // Generate provably fair egg positions for all levels
    const eggPositions = this.generateEggPositions(seed, 'client-seed', nonce, gameConfig.difficulty);

    // Initialize game state
    const gameState = this.initializeGameState(gameId, playerId, betAmount, gameConfig, eggPositions, seed, nonce);

    // For basic implementation, simulate a tower climb
    // In real implementation, this would be managed by game session
    const moves: DragonTowerMove[] = [];
    let currentState = { ...gameState };

    // Auto-climb demonstration: climb a few levels
    const levelsToClimb = Math.min(3, DRAGON_TOWER_LEVELS); // Climb up to 3 levels for demo

    for (let level = 1; level <= levelsToClimb; level++) {
      const currentLevel = currentState.levels.find(l => l.id === level);
      if (!currentLevel) continue;

      const safeTileId = currentLevel.safeTileId;
      const move: DragonTowerMove = {
        type: 'select-tile',
        levelId: level,
        tileId: safeTileId,
        timestamp: new Date()
      };

      currentState = this.processMove(currentState, move);
      moves.push(move);

      if (currentState.gameStatus === 'lost') {
        break; // Hit an egg, stop climbing
      }
    }

    // Determine final result
    const hitEgg = currentState.gameStatus === 'lost';
    const finalMultiplier = hitEgg ? 0 : currentState.currentMultiplier;
    const payout = hitEgg ? 0 : betAmount * finalMultiplier;
    const status: GameResultStatus = hitEgg ? 'loss' : 'win';

    // Create provably fair data
    const provablyFair: DragonTowerProvablyFair = {
      serverSeed: seed,
      clientSeed: 'client-seed', // Would be provided by client
      nonce,
      eggPositions,
      safeTilePositions: eggPositions.map((levelEggs, levelIndex) => {
        const tileCount = DRAGON_TOWER_TILE_COUNTS[gameConfig.difficulty];
        for (let i = 0; i < tileCount; i++) {
          if (!levelEggs.includes(i)) {
            return i; // First non-egg position is the safe tile
          }
        }
        return 0; // Fallback
      }),
      isVerified: true,
      gameHash: this.generateGameHash(seed, nonce)
    };

    return {
      gameId,
      gameType: 'dragon-tower',
      playerId,
      betAmount,
      multiplier: finalMultiplier,
      payout,
      status,
      timestamp: new Date(),
      seed,
      nonce,
      config: gameConfig,
      finalState: currentState,
      moves,
      levelsCompleted: currentState.completedLevels,
      maxLevelReached: Math.max(currentState.currentLevel - 1, 0),
      hitEgg,
      ...(hitEgg ? {} : {
        cashOutLevel: currentState.currentLevel,
        cashOutMultiplier: finalMultiplier
      }),
      eggPositions
    };
  }

  /**
   * Validate bet amount according to Dragon Tower game rules
   */
  validateBet(betAmount: number): boolean {
    const config = this.getConfig();
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Get Dragon Tower game configuration and limits
   */
  getConfig() {
    return {
      minBet: 0.01,
      maxBet: 1000,
      maxMultiplier: 50000, // Very high multiplier possible at expert level 9
      minLevel: 1,
      maxLevel: DRAGON_TOWER_LEVELS,
      difficulties: ['easy', 'medium', 'hard', 'expert'] as DragonTowerDifficulty[]
    };
  }

  /**
   * Generate provably fair egg positions for all tower levels
   */
  generateEggPositions(serverSeed: string, clientSeed: string, nonce: number, difficulty: DragonTowerDifficulty): number[][] {
    const tileCount = DRAGON_TOWER_TILE_COUNTS[difficulty];
    const eggPositions: number[][] = [];

    // Generate egg positions for each level
    for (let level = 0; level < DRAGON_TOWER_LEVELS; level++) {
      const levelEggPositions: number[] = [];

      // Each level has one safe tile and (tileCount - 1) egg tiles
      const safeTilePosition = ProvablyFairRandom.generateInteger(
        serverSeed,
        clientSeed,
        nonce + level,
        0,
        tileCount - 1
      );

      // All other positions are eggs
      for (let i = 0; i < tileCount; i++) {
        if (i !== safeTilePosition) {
          levelEggPositions.push(i);
        }
      }

      eggPositions.push(levelEggPositions);
    }

    return eggPositions;
  }

  /**
   * Calculate multiplier for reaching a specific level at given difficulty
   */
  calculateLevelMultiplier(level: number, difficulty: DragonTowerDifficulty): number {
    // Reason: Progressive multiplier system where each level multiplies by base chance inverse
    const baseMultiplier = DRAGON_TOWER_BASE_MULTIPLIERS[difficulty];

    if (level <= 0) {
      return 1;
    }

    // Each level multiplies the total by the base multiplier
    // Level 1: baseMultiplier, Level 2: baseMultiplier^2, etc.
    const multiplier = Math.pow(baseMultiplier, level);

    // Apply house edge (97% RTP)
    const withHouseEdge = multiplier * 0.97;

    return Math.round(withHouseEdge * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Initialize game state
   */
  private initializeGameState(
    gameId: string,
    playerId: string,
    betAmount: number,
    config: DragonTowerConfig,
    eggPositions: number[][],
    seed: string,
    nonce: number
  ): DragonTowerGameState {
    const tileCount = DRAGON_TOWER_TILE_COUNTS[config.difficulty];
    const levels: DragonTowerLevel[] = [];

    // Create all 9 levels for the tower
    for (let levelId = 1; levelId <= DRAGON_TOWER_LEVELS; levelId++) {
      const levelIndex = levelId - 1; // Array index (0-8)
      const levelEggPositions = eggPositions[levelIndex];

      // Find the safe tile position (the one not in egg positions)
      let safeTileId = 0;
      for (let i = 0; i < tileCount; i++) {
        if (!levelEggPositions?.includes(i)) {
          safeTileId = i;
          break;
        }
      }

      const tiles: DragonTowerTile[] = [];

      // Create all tiles for this level
      for (let i = 0; i < tileCount; i++) {
        tiles.push({
          id: i,
          levelId,
          state: 'hidden',
          isSafe: i === safeTileId,
          isRevealed: false,
          isSelected: false
        });
      }

      levels.push({
        id: levelId,
        tiles,
        isCompleted: false,
        isActive: levelId === 1, // First level is active
        safeTileId,
        multiplier: this.calculateLevelMultiplier(levelId, config.difficulty)
      });
    }

    return {
      gameId,
      playerId,
      betAmount,
      difficulty: config.difficulty,
      levels,
      currentLevel: 1,
      completedLevels: 0,
      currentMultiplier: 1,
      potentialPayout: betAmount,
      gameStatus: 'setup',
      canCashOut: false,
      startTime: new Date(),
      seed,
      nonce,
      totalEggPositions: eggPositions
    };
  }

  /**
   * Process a player move
   */
  processMove(gameState: DragonTowerGameState, move: DragonTowerMove): DragonTowerGameState {
    let newState = { ...gameState, levels: gameState.levels.map(l => ({ ...l, tiles: l.tiles.map(t => ({ ...t })) })) };

    switch (move.type) {
      case 'select-tile':
        if (move.levelId !== undefined && move.tileId !== undefined) {
          newState = this.selectTile(newState, move.levelId, move.tileId);
        }
        break;

      case 'cash-out':
        newState.gameStatus = 'cashed-out';
        newState.endTime = new Date();
        newState.canCashOut = false;
        break;
    }

    return newState;
  }

  /**
   * Select a tile on a specific level
   */
  private selectTile(gameState: DragonTowerGameState, levelId: number, tileId: number): DragonTowerGameState {
    const newState = { ...gameState };
    const level = newState.levels.find(l => l.id === levelId);

    if (!level || !level.isActive) {
      return newState; // Invalid move
    }

    const tile = level.tiles.find(t => t.id === tileId);
    if (!tile || tile.isRevealed) {
      return newState; // Invalid move
    }

    // Reveal the selected tile
    tile.isRevealed = true;
    tile.isSelected = true;
    tile.state = tile.isSafe ? 'safe' : 'egg';

    if (tile.isSafe) {
      // Safe tile selected - advance to next level or win
      level.isCompleted = true;
      level.isActive = false;
      newState.completedLevels++;
      newState.currentMultiplier = level.multiplier;
      newState.potentialPayout = newState.betAmount * newState.currentMultiplier;

      if (levelId >= DRAGON_TOWER_LEVELS) {
        // Reached the top of the tower - maximum win
        newState.gameStatus = 'won';
        newState.endTime = new Date();
        newState.canCashOut = false;
      } else {
        // Move to next level
        newState.currentLevel = levelId + 1;
        const nextLevel = newState.levels.find(l => l.id === levelId + 1);
        if (nextLevel) {
          nextLevel.isActive = true;
        }
        newState.gameStatus = 'climbing';
        newState.canCashOut = true; // Can cash out after each completed level
      }
    } else {
      // Hit an egg - game over
      newState.gameStatus = 'lost';
      newState.endTime = new Date();
      newState.canCashOut = false;

      // Reveal all tiles on current level to show where the safe tile was
      level.tiles.forEach(t => {
        if (!t.isRevealed) {
          t.isRevealed = true;
          t.state = t.isSafe ? 'safe' : 'egg';
        }
      });
    }

    return newState;
  }

  /**
   * Validate game configuration
   */
  private validateConfig(config: DragonTowerConfig): DragonTowerValidation {
    const errors: string[] = [];

    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    if (!validDifficulties.includes(config.difficulty)) {
      errors.push(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }

    if (config.autoCashout?.enabled && config.autoCashout.multiplier <= 1) {
      errors.push('Auto cashout multiplier must be greater than 1');
    }

    if (config.autoClimb?.stopAtLevel &&
      (config.autoClimb.stopAtLevel < 1 || config.autoClimb.stopAtLevel > DRAGON_TOWER_LEVELS)) {
      errors.push(`Auto climb stop level must be between 1 and ${DRAGON_TOWER_LEVELS}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate game hash for provably fair verification
   */
  private generateGameHash(seed: string, nonce: number): string {
    // Simplified hash generation - would use proper crypto in production
    return `hash-${seed}-${nonce}`.substring(0, 16);
  }

  /**
   * Get level progression information for UI
   */
  getLevelProgression(difficulty: DragonTowerDifficulty): Array<{
    level: number;
    multiplier: number;
    winChance: number;
    cumulativeWinChance: number;
  }> {
    const tileCount = DRAGON_TOWER_TILE_COUNTS[difficulty];
    const winChancePerLevel = (1 / tileCount) * 100; // Percentage chance to pick safe tile

    const progression = [];

    for (let level = 1; level <= DRAGON_TOWER_LEVELS; level++) {
      const multiplier = this.calculateLevelMultiplier(level, difficulty);
      const cumulativeWinChance = Math.pow(1 / tileCount, level) * 100; // Chance to reach this level

      progression.push({
        level,
        multiplier,
        winChance: winChancePerLevel,
        cumulativeWinChance
      });
    }

    return progression;
  }
}