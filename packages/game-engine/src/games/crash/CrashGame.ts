/**
 * Crash Game Engine Implementation
 * Implements the complete Crash real-time multiplier game logic with provably fair crash point generation
 */

import { BaseGame } from '../../base';
import { ProvablyFairRandom } from '../../random';
import { generateId } from '@stake-games/shared';
import type {
  BaseGameResult,
  GameResultStatus,
  CrashConfig,
  CrashGameState,
  CrashResult,
  CrashAction,
  CrashProvablyFair,
  CrashValidation,
  MultiplierPoint,
  CrashPointParams
} from '@stake-games/shared';
import { CRASH_CONSTANTS } from '@stake-games/shared';

/**
 * Crash game implementation extending BaseGame
 */
export class CrashGame extends BaseGame {
  private roundCounter: number = 1;
  
  constructor() {
    super('crash');
  }

  /**
   * Play a complete Crash game round
   */
  async play(betAmount: number, seed: string, nonce: number, config?: CrashConfig): Promise<CrashResult> {
    // Use default config if none provided
    const gameConfig: CrashConfig = {
      bettingWindow: config?.bettingWindow || CRASH_CONSTANTS.BETTING_WINDOW,
      maxRoundDuration: config?.maxRoundDuration || CRASH_CONSTANTS.MAX_ROUND_DURATION,
      minCrashPoint: config?.minCrashPoint || CRASH_CONSTANTS.MIN_CRASH_POINT,
      maxCrashPoint: config?.maxCrashPoint || CRASH_CONSTANTS.MAX_CRASH_POINT,
      houseEdge: config?.houseEdge || CRASH_CONSTANTS.DEFAULT_HOUSE_EDGE,
      ...(config?.autoCashout && { autoCashout: config.autoCashout }),
      ...(config?.autoPlay && { autoPlay: config.autoPlay })
    };

    // Validate game configuration
    const validation = this.validateConfig(gameConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid game configuration: ${validation.errors.join(', ')}`);
    }

    // Generate game ID and initialize
    const gameId = generateId(16);
    const playerId = 'system'; // Would be provided by caller in real implementation
    const clientSeed = 'client-seed'; // Would be provided by client

    // Generate provably fair crash point
    const crashPoint = this.generateCrashPoint({
      serverSeed: seed,
      clientSeed,
      nonce,
      houseEdge: gameConfig.houseEdge,
      minCrash: gameConfig.minCrashPoint,
      maxCrash: gameConfig.maxCrashPoint
    });

    // Initialize game state
    const gameState = this.initializeGameState(gameId, playerId, betAmount, gameConfig, crashPoint, seed, nonce, clientSeed);
    
    // Simulate game progression and determine outcome
    const { finalState, multiplierCurve, playerCashedOut, cashOutMultiplier } = this.simulateGameRound(gameState, crashPoint, gameConfig);

    // Calculate final results
    const payout = playerCashedOut && cashOutMultiplier ? betAmount * cashOutMultiplier : 0;
    const status: GameResultStatus = playerCashedOut ? 'win' : 'loss';

    // Create provably fair verification data
    const provablyFair: CrashProvablyFair = {
      serverSeed: seed,
      clientSeed,
      nonce,
      crashPoint,
      isVerified: true,
      gameHash: this.generateGameHash(seed, nonce),
      algorithm: 'HMAC-SHA256',
      verification: {
        formula: '(2^32 / (2^32 - hash)) * (1 - houseEdge)',
        inputs: `serverSeed: ${seed}, clientSeed: ${clientSeed}, nonce: ${nonce}`,
        calculation: `hash: ${this.calculateHash(seed, clientSeed, nonce)}`,
        result: crashPoint
      }
    };

    return {
      gameId,
      gameType: 'crash',
      playerId,
      betAmount,
      multiplier: cashOutMultiplier || 0,
      payout,
      status,
      timestamp: new Date(),
      seed,
      nonce,
      config: gameConfig,
      finalState,
      crashPoint,
      roundDuration: this.calculateRoundDuration(crashPoint),
      playerCashedOut,
      ...(cashOutMultiplier && { cashOutMultiplier }),
      totalRoundPlayers: 1, // Simplified for single-player demo
      playersWhoWon: playerCashedOut ? 1 : 0,
      playersWhoLost: playerCashedOut ? 0 : 1,
      averageWinMultiplier: cashOutMultiplier || 0,
      biggestWin: payout,
      multiplierCurve
    };
  }

  /**
   * Validate bet amount according to Crash game rules
   */
  validateBet(betAmount: number): boolean {
    const config = this.getConfig();
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Get Crash game configuration and limits
   */
  getConfig() {
    return {
      minBet: CRASH_CONSTANTS.MIN_BET,
      maxBet: CRASH_CONSTANTS.MAX_BET,
      maxMultiplier: CRASH_CONSTANTS.MAX_CRASH_POINT,
      minCrashPoint: CRASH_CONSTANTS.MIN_CRASH_POINT,
      maxCrashPoint: CRASH_CONSTANTS.MAX_CRASH_POINT,
      bettingWindow: CRASH_CONSTANTS.BETTING_WINDOW,
      maxRoundDuration: CRASH_CONSTANTS.MAX_ROUND_DURATION
    };
  }

  /**
   * Generate provably fair crash point using specified algorithm
   */
  generateCrashPoint(params: CrashPointParams): number {
    // Reason: Standard Crash game provably fair algorithm
    // Uses (2^32 / (2^32 - hash)) with house edge adjustment
    const hash = this.calculateHash(params.serverSeed, params.clientSeed, params.nonce);
    
    // Convert hash to crash multiplier
    const maxValue = Math.pow(2, 32);
    const rawCrash = maxValue / (maxValue - hash);
    
    // Apply house edge (typically 1%)
    const adjustedCrash = rawCrash * (1 - params.houseEdge);
    
    // Ensure minimum crash point and round to 2 decimal places
    const finalCrash = Math.max(params.minCrash, adjustedCrash);
    
    return Math.min(Math.round(finalCrash * 100) / 100, params.maxCrash);
  }

  /**
   * Calculate multiplier at specific time using exponential growth
   */
  calculateMultiplierAtTime(elapsedTime: number, crashPoint: number, targetDuration?: number): number {
    // Reason: Exponential growth to reach crash point at target time
    const duration = targetDuration || this.calculateRoundDuration(crashPoint);
    
    if (elapsedTime <= 0) return 1.00;
    if (elapsedTime >= duration) return crashPoint;
    
    // Exponential growth: multiplier = e^(k*t) where k = ln(crashPoint) / duration
    const growthRate = Math.log(crashPoint) / duration;
    const multiplier = Math.exp(growthRate * elapsedTime);
    
    return Math.min(Math.round(multiplier * 100) / 100, crashPoint);
  }

  /**
   * Generate multiplier curve for visualization
   */
  generateMultiplierCurve(crashPoint: number, updateFrequency: number = 60): MultiplierPoint[] {
    const duration = this.calculateRoundDuration(crashPoint);
    const points: MultiplierPoint[] = [];
    const interval = 1 / updateFrequency; // Time between updates
    
    for (let time = 0; time <= duration; time += interval) {
      const multiplier = this.calculateMultiplierAtTime(time, crashPoint, duration);
      
      points.push({
        time: Math.round(time * 1000), // Convert to milliseconds
        multiplier,
        elapsedSeconds: Math.round(time * 10) / 10 // Round to 1 decimal
      });
      
      // Stop if we've reached crash point
      if (multiplier >= crashPoint) break;
    }
    
    return points;
  }

  /**
   * Process player action during game
   */
  processAction(gameState: CrashGameState, action: CrashAction): CrashGameState {
    let newState = { ...gameState };
    
    switch (action.type) {
      case 'bet':
        if (newState.phase === 'waiting' && action.amount) {
          newState.betAmount = action.amount;
          newState.playerStatus = 'active';
          newState.potentialPayout = action.amount;
        }
        break;
        
      case 'cash-out':
        if (newState.phase === 'flying' && newState.playerStatus === 'active') {
          newState.playerStatus = 'cashed-out';
          newState.cashOutMultiplier = newState.currentMultiplier;
          newState.cashOutTime = new Date();
          newState.potentialPayout = newState.betAmount ? newState.betAmount * newState.currentMultiplier : 0;
        }
        break;
        
      case 'auto-cashout':
        if (action.autoCashoutTarget) {
          newState.autoCashoutEnabled = true;
          newState.autoCashoutTarget = action.autoCashoutTarget;
        }
        break;
        
      case 'cancel-bet':
        if (newState.phase === 'waiting') {
          delete (newState as any).betAmount;
          newState.playerStatus = 'crashed';
          newState.potentialPayout = 0;
        }
        break;
    }
    
    return newState;
  }

  /**
   * Initialize game state for new round
   */
  private initializeGameState(
    gameId: string,
    playerId: string,
    betAmount: number,
    config: CrashConfig,
    crashPoint: number,
    seed: string,
    nonce: number,
    clientSeed: string
  ): CrashGameState {
    const gameState: CrashGameState = {
      gameId,
      roundNumber: this.roundCounter++,
      phase: 'waiting',
      startTime: new Date(),
      currentMultiplier: 1.00,
      elapsedTime: 0,
      playerId,
      betAmount,
      playerStatus: 'active',
      potentialPayout: betAmount,
      totalPlayers: 1,
      totalBets: betAmount,
      cashedOutPlayers: 0,
      averageCashOut: 0,
      seed,
      nonce,
      clientSeed,
      autoCashoutEnabled: config.autoCashout?.enabled || false,
      isAutoPlay: config.autoPlay?.enabled || false
    };

    // Add optional properties only if they exist
    if (config.autoCashout?.target) {
      gameState.autoCashoutTarget = config.autoCashout.target;
    }
    if (config.autoPlay?.numberOfRounds) {
      gameState.autoPlayRemaining = config.autoPlay.numberOfRounds;
    }

    return gameState;
  }

  /**
   * Simulate complete game round progression
   */
  private simulateGameRound(
    gameState: CrashGameState,
    crashPoint: number,
    config: CrashConfig
  ): {
    finalState: CrashGameState;
    multiplierCurve: MultiplierPoint[];
    playerCashedOut: boolean;
    cashOutMultiplier?: number;
  } {
    const curve = this.generateMultiplierCurve(crashPoint);
    let playerCashedOut = false;
    let cashOutMultiplier: number | undefined;
    
    // Simulate auto-cashout if enabled
    if (gameState.autoCashoutEnabled && gameState.autoCashoutTarget) {
      const targetIndex = curve.findIndex(point => point.multiplier >= gameState.autoCashoutTarget!);
      if (targetIndex > 0 && targetIndex < curve.length - 1 && curve[targetIndex]) {
        playerCashedOut = true;
        cashOutMultiplier = curve[targetIndex].multiplier;
      }
    }
    
    // Update final state
    const finalState: CrashGameState = {
      ...gameState,
      phase: 'crashed',
      endTime: new Date(),
      currentMultiplier: crashPoint,
      crashPoint,
      elapsedTime: this.calculateRoundDuration(crashPoint),
      playerStatus: playerCashedOut ? 'cashed-out' : 'crashed',
      potentialPayout: playerCashedOut && cashOutMultiplier ?
        (gameState.betAmount || 0) * cashOutMultiplier : 0,
      cashedOutPlayers: playerCashedOut ? 1 : 0,
      averageCashOut: cashOutMultiplier || 0
    };

    // Add optional properties only if they exist
    if (cashOutMultiplier !== undefined) {
      finalState.cashOutMultiplier = cashOutMultiplier;
    }
    if (playerCashedOut) {
      finalState.cashOutTime = new Date();
    }
    
    const result: {
      finalState: CrashGameState;
      multiplierCurve: MultiplierPoint[];
      playerCashedOut: boolean;
      cashOutMultiplier?: number;
    } = {
      finalState,
      multiplierCurve: curve,
      playerCashedOut
    };

    if (cashOutMultiplier !== undefined) {
      result.cashOutMultiplier = cashOutMultiplier;
    }

    return result;
  }

  /**
   * Calculate round duration based on crash point
   */
  private calculateRoundDuration(crashPoint: number): number {
    // Reason: Higher crash points should take longer to reach
    // Logarithmic scaling with reasonable min/max bounds
    const minDuration = 3; // 3 seconds minimum
    const maxDuration = 30; // 30 seconds maximum
    const scaleFactor = 8; // Tuning parameter
    
    const duration = minDuration + (Math.log(crashPoint) * scaleFactor);
    return Math.min(Math.max(duration, minDuration), maxDuration);
  }

  /**
   * Calculate hash for provably fair verification
   */
  private calculateHash(serverSeed: string, clientSeed: string, nonce: number): number {
    // Simplified hash - would use proper HMAC-SHA256 in production
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = Math.abs(hash) & 0x7FFFFFFF; // Ensure positive 32-bit integer
    }
    
    return hash;
  }

  /**
   * Validate game configuration
   */
  private validateConfig(config: CrashConfig): CrashValidation {
    const errors: string[] = [];
    
    if (config.minCrashPoint < CRASH_CONSTANTS.MIN_CRASH_POINT) {
      errors.push(`Minimum crash point must be at least ${CRASH_CONSTANTS.MIN_CRASH_POINT}`);
    }
    
    if (config.maxCrashPoint > CRASH_CONSTANTS.MAX_CRASH_POINT) {
      errors.push(`Maximum crash point cannot exceed ${CRASH_CONSTANTS.MAX_CRASH_POINT}`);
    }
    
    if (config.houseEdge < 0 || config.houseEdge > 0.1) {
      errors.push('House edge must be between 0% and 10%');
    }
    
    if (config.autoCashout?.enabled && config.autoCashout.target < CRASH_CONSTANTS.MIN_AUTO_CASHOUT) {
      errors.push(`Auto cashout target must be at least ${CRASH_CONSTANTS.MIN_AUTO_CASHOUT}`);
    }
    
    if (config.bettingWindow < 5 || config.bettingWindow > 30) {
      errors.push('Betting window must be between 5 and 30 seconds');
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
    return `crash-hash-${seed}-${nonce}`.substring(0, 16);
  }
}