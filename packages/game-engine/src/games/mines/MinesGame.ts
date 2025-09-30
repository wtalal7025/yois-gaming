/**
 * Mines Game Engine Implementation
 * Implements the complete Mines game logic with provably fair mine placement
 */

import { BaseGame } from '../../base';
import { ProvablyFairRandom } from '../../random';
import { generateId } from '@stake-games/shared';
import type {
  BaseGameResult,
  GameResultStatus,
  MinesConfig,
  MinesGameState,
  MinesResult,
  MinesTile,
  MinesMove,
  MinesProvablyFair,
  MinesValidation
} from '@stake-games/shared';

// Import constants as values
const MINES_BOARD_SIZE = 25;
const MINES_MIN_COUNT = 1;
const MINES_MAX_COUNT = 24;

/**
 * Mines game implementation extending BaseGame
 */
export class MinesGame extends BaseGame {
  constructor() {
    super('mines');
  }

  /**
   * Play a complete Mines game round
   */
  async play(betAmount: number, seed: string, nonce: number, config?: MinesConfig): Promise<MinesResult> {
    // Use default config if none provided
    const gameConfig: MinesConfig = {
      mineCount: config?.mineCount || 3,
      autoReveal: config?.autoReveal || false,
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
    
    // Generate provably fair mine positions
    const minePositions = this.generateMinePositions(seed, 'client-seed', nonce, gameConfig.mineCount);
    
    // Initialize game state
    const gameState = this.initializeGameState(gameId, playerId, betAmount, gameConfig, minePositions, seed, nonce);
    
    // For basic implementation, simulate a simple game
    // In real implementation, this would be managed by game session
    const moves: MinesMove[] = [];
    let currentState = { ...gameState };
    
    // Auto-play demonstration: reveal a few safe tiles
    const safeTiles = this.getSafeTiles(minePositions);
    const tilesToReveal = Math.min(3, safeTiles.length); // Reveal up to 3 safe tiles
    
    for (let i = 0; i < tilesToReveal; i++) {
      const tileId = safeTiles[i];
      // Reason: Ensure tileId is a valid number before creating MinesMove
      if (typeof tileId === 'number') {
        const move: MinesMove = {
          type: 'reveal',
          tileId: tileId,
          timestamp: new Date()
        };
        
        currentState = this.processMove(currentState, move);
        moves.push(move);
      }
    }

    // Determine final result
    const hitMine = currentState.gameStatus === 'lost';
    const finalMultiplier = hitMine ? 0 : currentState.currentMultiplier;
    const payout = hitMine ? 0 : betAmount * finalMultiplier;
    const status: GameResultStatus = hitMine ? 'loss' : 'win';

    // Create provably fair data
    const provablyFair: MinesProvablyFair = {
      serverSeed: seed,
      clientSeed: 'client-seed', // Would be provided by client
      nonce,
      minePositions,
      isVerified: true,
      gameHash: this.generateGameHash(seed, nonce)
    };

    return {
      gameId,
      gameType: 'mines',
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
      revealedSafeTiles: currentState.revealedTiles.length,
      hitMine,
      ...(hitMine ? {} : { cashOutMultiplier: finalMultiplier }),
      minePositions
    };
  }

  /**
   * Validate bet amount according to Mines game rules
   */
  validateBet(betAmount: number): boolean {
    const config = this.getConfig();
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Get Mines game configuration and limits
   */
  getConfig() {
    return {
      minBet: 0.01,
      maxBet: 1000,
      maxMultiplier: 1000,
      minMines: MINES_MIN_COUNT,
      maxMines: MINES_MAX_COUNT,
      boardSize: MINES_BOARD_SIZE
    };
  }

  /**
   * Generate provably fair mine positions
   */
  generateMinePositions(serverSeed: string, clientSeed: string, nonce: number, mineCount: number): number[] {
    const positions: number[] = [];
    const usedPositions = new Set<number>();
    
    // Generate unique mine positions using provably fair random
    for (let i = 0; i < mineCount; i++) {
      let position: number;
      let attempts = 0;
      
      do {
        // Use incremented nonce for each mine to ensure uniqueness
        position = ProvablyFairRandom.generateInteger(serverSeed, clientSeed, nonce + i + attempts, 0, 24);
        attempts++;
      } while (usedPositions.has(position) && attempts < 100); // Prevent infinite loop
      
      if (attempts >= 100) {
        throw new Error('Failed to generate unique mine positions');
      }
      
      positions.push(position);
      usedPositions.add(position);
    }
    
    return positions.sort((a, b) => a - b);
  }

  /**
   * Calculate multiplier based on revealed safe tiles and mine count
   */
  calculateMultiplier(revealedSafeTiles: number, mineCount: number): number {
    // Reason: Standard Mines multiplier formula with house edge consideration
    const totalTiles = 25;
    const safeTiles = totalTiles - mineCount;
    
    if (revealedSafeTiles <= 0 || revealedSafeTiles >= safeTiles) {
      return 1;
    }
    
    // Progressive multiplier calculation
    // Each revealed tile increases risk and reward
    let multiplier = 1;
    
    for (let i = 1; i <= revealedSafeTiles; i++) {
      const remainingSafeTiles = safeTiles - i + 1;
      const remainingTiles = totalTiles - i + 1;
      const probability = remainingSafeTiles / remainingTiles;
      
      // Apply multiplier increase with slight house edge (97% RTP)
      multiplier *= (0.97 / probability);
    }
    
    return Math.round(multiplier * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Initialize game state
   */
  private initializeGameState(
    gameId: string, 
    playerId: string, 
    betAmount: number, 
    config: MinesConfig, 
    minePositions: number[], 
    seed: string, 
    nonce: number
  ): MinesGameState {
    const tiles: MinesTile[] = [];
    
    // Create all 25 tiles for 5x5 grid
    for (let i = 0; i < 25; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      
      tiles.push({
        id: i,
        row,
        col,
        state: 'hidden',
        hasMine: minePositions.includes(i),
        isRevealed: false,
        isFlagged: false
      });
    }

    return {
      gameId,
      playerId,
      betAmount,
      mineCount: config.mineCount,
      tiles,
      minePositions: [], // Hidden from client
      revealedTiles: [],
      currentMultiplier: 1,
      potentialPayout: betAmount,
      gameStatus: 'setup',
      canCashOut: false,
      startTime: new Date(),
      seed,
      nonce
    };
  }

  /**
   * Process a player move
   */
  processMove(gameState: MinesGameState, move: MinesMove): MinesGameState {
    let newState = { ...gameState };
    
    switch (move.type) {
      case 'reveal':
        if (move.tileId !== undefined) {
          newState = this.revealTile(newState, move.tileId);
        }
        break;
        
      case 'flag':
        if (move.tileId !== undefined) {
          newState = this.flagTile(newState, move.tileId);
        }
        break;
        
      case 'cashout':
        newState.gameStatus = 'won';
        newState.endTime = new Date();
        newState.canCashOut = false;
        break;
    }
    
    return newState;
  }

  /**
   * Reveal a tile
   */
  private revealTile(gameState: MinesGameState, tileId: number): MinesGameState {
    const newState = { ...gameState };
    const tile = newState.tiles.find(t => t.id === tileId);
    
    if (!tile || tile.isRevealed || tile.isFlagged) {
      return newState; // Invalid move
    }
    
    tile.isRevealed = true;
    tile.state = 'revealed';
    
    if (tile.hasMine) {
      // Hit mine - game over
      newState.gameStatus = 'lost';
      newState.endTime = new Date();
      newState.canCashOut = false;
    } else {
      // Safe tile revealed
      newState.revealedTiles.push(tileId);
      const revealedCount = newState.revealedTiles.length;
      
      // Calculate new multiplier and potential payout
      newState.currentMultiplier = this.calculateMultiplier(revealedCount, newState.mineCount);
      newState.potentialPayout = newState.betAmount * newState.currentMultiplier;
      
      // Set multiplier on tile
      tile.multiplier = newState.currentMultiplier;
      
      // Enable cash out after first safe tile
      if (revealedCount >= 1) {
        newState.canCashOut = true;
      }
      
      // Check if all safe tiles revealed (maximum win)
      const totalSafeTiles = 25 - newState.mineCount;
      if (revealedCount >= totalSafeTiles) {
        newState.gameStatus = 'won';
        newState.endTime = new Date();
        newState.canCashOut = false;
      } else {
        newState.gameStatus = 'playing';
      }
    }
    
    return newState;
  }

  /**
   * Flag a tile
   */
  private flagTile(gameState: MinesGameState, tileId: number): MinesGameState {
    const newState = { ...gameState };
    const tile = newState.tiles.find(t => t.id === tileId);
    
    if (!tile || tile.isRevealed) {
      return newState; // Invalid move
    }
    
    tile.isFlagged = !tile.isFlagged;
    tile.state = tile.isFlagged ? 'flagged' : 'hidden';
    
    return newState;
  }

  /**
   * Get safe tile positions (for auto-play demo)
   */
  private getSafeTiles(minePositions: number[]): number[] {
    const safeTiles: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!minePositions.includes(i)) {
        safeTiles.push(i);
      }
    }
    return safeTiles;
  }

  /**
   * Validate game configuration
   */
  private validateConfig(config: MinesConfig): MinesValidation {
    const errors: string[] = [];
    
    if (config.mineCount < MINES_MIN_COUNT || config.mineCount > MINES_MAX_COUNT) {
      errors.push(`Mine count must be between ${MINES_MIN_COUNT} and ${MINES_MAX_COUNT}`);
    }
    
    if (config.autoCashout?.enabled && config.autoCashout.multiplier <= 1) {
      errors.push('Auto cashout multiplier must be greater than 1');
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
}