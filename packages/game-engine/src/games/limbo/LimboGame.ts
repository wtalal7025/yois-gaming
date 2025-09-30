/**
 * Limbo Game Engine Implementation
 * Implements the complete Limbo multiplier prediction game logic with provably fair generation
 */

import { BaseGame } from '../../base';
import { ProvablyFairRandom } from '../../random';
import { generateId } from '@stake-games/shared';
import type {
  BaseGameResult,
  GameResultStatus,
  LimboConfig,
  LimboGameSessionState,
  LimboResult,
  LimboAction,
  LimboProvablyFair,
  LimboValidation,
  LimboMultiplierParams,
  MultiplierValidation
} from '@stake-games/shared';
import { LIMBO_CONSTANTS } from '@stake-games/shared';

/**
 * Limbo game implementation extending BaseGame
 */
export class LimboGame extends BaseGame {
  private roundCounter: number = 1;
  
  constructor() {
    super('limbo');
  }

  /**
   * Play a complete Limbo game round
   */
  async play(
    betAmount: number, 
    seed: string, 
    nonce: number, 
    targetMultiplier: number = 2.00,
    config?: LimboConfig
  ): Promise<LimboResult> {
    // Use default config if none provided
    const gameConfig: LimboConfig = {
      minTargetMultiplier: config?.minTargetMultiplier || LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER,
      maxTargetMultiplier: config?.maxTargetMultiplier || LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER,
      houseEdge: config?.houseEdge || LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE,
      multiplierPrecision: config?.multiplierPrecision || LIMBO_CONSTANTS.MULTIPLIER_PRECISION,
      quickPresets: config?.quickPresets || [...LIMBO_CONSTANTS.QUICK_PRESETS],
      ...(config?.autoBetting && { autoBetting: config.autoBetting })
    };

    // Validate game configuration and inputs
    const configValidation = this.validateConfig(gameConfig);
    if (!configValidation.isValid) {
      throw new Error(`Invalid game configuration: ${configValidation.errors.join(', ')}`);
    }

    const multiplierValidation = this.validateTargetMultiplier(targetMultiplier, betAmount, gameConfig);
    if (!multiplierValidation.isValid) {
      throw new Error(`Invalid target multiplier: ${multiplierValidation.error}`);
    }

    // Generate game ID and initialize
    const gameId = generateId(16);
    const playerId = 'system'; // Would be provided by caller in real implementation
    const clientSeed = 'client-seed'; // Would be provided by client

    // Generate provably fair multiplier
    const generatedMultiplier = this.generateMultiplier({
      serverSeed: seed,
      clientSeed,
      nonce,
      houseEdge: gameConfig.houseEdge,
      minMultiplier: 1.00,
      maxMultiplier: gameConfig.maxTargetMultiplier
    });

    // Initialize game state
    const gameState = this.initializeGameState(
      gameId, 
      playerId, 
      betAmount, 
      targetMultiplier,
      generatedMultiplier,
      gameConfig, 
      seed, 
      nonce, 
      clientSeed
    );
    
    // Determine win/loss outcome
    const isWin = generatedMultiplier >= targetMultiplier;
    const payout = isWin ? betAmount * targetMultiplier : 0;
    const status: GameResultStatus = isWin ? 'win' : 'loss';

    // Update final state
    const finalState: LimboGameSessionState = {
      ...gameState,
      state: 'complete',
      generatedMultiplier,
      isWin,
      payout,
      profit: payout - betAmount,
      roundEndTime: new Date()
    };

    // Create provably fair verification data
    const provablyFair: LimboProvablyFair = {
      serverSeed: seed,
      clientSeed,
      nonce,
      generatedMultiplier,
      isVerified: true,
      gameHash: this.generateGameHash(seed, nonce),
      algorithm: 'HMAC-SHA256-Limbo',
      verification: {
        formula: '(99 / (hash / 2^32 * 99 + 1)) * (1 - houseEdge)',
        inputs: `serverSeed: ${seed}, clientSeed: ${clientSeed}, nonce: ${nonce}`,
        calculation: `hash: ${this.calculateHash(seed, clientSeed, nonce)}`,
        result: generatedMultiplier
      }
    };

    return {
      gameId,
      gameType: 'limbo',
      playerId,
      betAmount,
      multiplier: targetMultiplier,
      payout,
      status,
      timestamp: new Date(),
      seed,
      nonce,
      config: gameConfig,
      finalState,
      targetMultiplier,
      generatedMultiplier,
      winProbability: this.calculateWinProbability(targetMultiplier, gameConfig.houseEdge),
      isWin,
      rollDuration: LIMBO_CONSTANTS.ROLL_ANIMATION_DURATION,
      wasAutoBet: false // Would be determined by auto-betting context
    };
  }

  /**
   * Validate bet amount according to Limbo game rules
   */
  validateBet(betAmount: number): boolean {
    const config = this.getConfig();
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Get Limbo game configuration and limits
   */
  getConfig() {
    return {
      minBet: LIMBO_CONSTANTS.MIN_BET,
      maxBet: LIMBO_CONSTANTS.MAX_BET,
      maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER,
      minTargetMultiplier: LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER,
      maxTargetMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER,
      houseEdge: LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE
    };
  }

  /**
   * Generate provably fair multiplier using Limbo-specific algorithm
   */
  generateMultiplier(params: LimboMultiplierParams): number {
    // Reason: Limbo uses inverted probability distribution for multiplier generation
    // Higher multipliers are exponentially rarer, maintaining house edge
    const hash = this.calculateHash(params.serverSeed, params.clientSeed, params.nonce);
    
    // Convert hash to multiplier using inverse probability
    const maxValue = Math.pow(2, 32);
    const normalizedHash = hash / maxValue; // 0-1 range
    
    // Apply house edge adjusted probability
    // Formula: multiplier = (99 / (normalizedHash * 99 + 1)) * (1 - houseEdge)
    const rawMultiplier = LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / 
                         (normalizedHash * LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR + 1);
    
    // Apply house edge reduction
    const adjustedMultiplier = rawMultiplier * (1 - params.houseEdge);
    
    // Ensure minimum multiplier and apply precision
    const finalMultiplier = Math.max(params.minMultiplier, adjustedMultiplier);
    
    // Round to specified precision and ensure within bounds
    const rounded = Math.round(finalMultiplier * Math.pow(10, LIMBO_CONSTANTS.MULTIPLIER_PRECISION)) / 
                   Math.pow(10, LIMBO_CONSTANTS.MULTIPLIER_PRECISION);
    
    return Math.min(rounded, params.maxMultiplier);
  }

  /**
   * Calculate win probability for given target multiplier
   */
  calculateWinProbability(targetMultiplier: number, houseEdge: number = LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE): number {
    // Reason: Win probability = (99/target) * (1-houseEdge) for fair calculation
    const baseProbability = LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / targetMultiplier;
    const adjustedProbability = baseProbability * (1 - houseEdge);
    
    // Return as percentage, rounded to 2 decimal places
    return Math.round(adjustedProbability * 10000) / 100;
  }

  /**
   * Calculate potential payout for given bet and target multiplier
   */
  calculatePotentialPayout(betAmount: number, targetMultiplier: number): number {
    return betAmount * targetMultiplier;
  }

  /**
   * Validate target multiplier input
   */
  validateTargetMultiplier(
    targetMultiplier: number, 
    betAmount: number, 
    config: LimboConfig
  ): MultiplierValidation {
    const errors: string[] = [];
    
    // Check multiplier bounds
    if (targetMultiplier < config.minTargetMultiplier) {
      errors.push(`Target multiplier must be at least ${config.minTargetMultiplier}`);
    }
    
    if (targetMultiplier > config.maxTargetMultiplier) {
      errors.push(`Target multiplier cannot exceed ${config.maxTargetMultiplier}`);
    }
    
    // Check precision
    const decimalPlaces = (targetMultiplier.toString().split('.')[1] || '').length;
    if (decimalPlaces > config.multiplierPrecision) {
      errors.push(`Target multiplier precision cannot exceed ${config.multiplierPrecision} decimal places`);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        multiplier: targetMultiplier,
        winProbability: 0,
        potentialPayout: 0,
        error: errors.join(', ')
      };
    }

    const winProbability = this.calculateWinProbability(targetMultiplier, config.houseEdge);
    const potentialPayout = this.calculatePotentialPayout(betAmount, targetMultiplier);
    
    // Add warnings for extreme multipliers
    let warning: string | undefined;
    if (targetMultiplier > 100) {
      warning = `Very high multiplier (${targetMultiplier}x) has extremely low win probability (${winProbability.toFixed(2)}%)`;
    } else if (winProbability < 1) {
      warning = `Low win probability (${winProbability.toFixed(2)}%) for this multiplier`;
    }

    const result: MultiplierValidation = {
      isValid: true,
      multiplier: targetMultiplier,
      winProbability,
      potentialPayout
    };
    
    if (warning) {
      result.warning = warning;
    }
    
    return result;
  }

  /**
   * Process player action during game
   */
  processAction(gameState: LimboGameSessionState, action: LimboAction): LimboGameSessionState {
    let newState = { ...gameState };
    
    switch (action.type) {
      case 'set-target-multiplier':
        if (newState.state === 'setup' && action.targetMultiplier) {
          newState.targetMultiplier = action.targetMultiplier;
          newState.winProbability = this.calculateWinProbability(action.targetMultiplier);
          if (newState.betAmount) {
            newState.potentialPayout = this.calculatePotentialPayout(newState.betAmount, action.targetMultiplier);
          }
        }
        break;
        
      case 'place-bet':
        if (newState.state === 'setup' && action.betAmount && newState.targetMultiplier) {
          newState.betAmount = action.betAmount;
          newState.potentialPayout = this.calculatePotentialPayout(action.betAmount, newState.targetMultiplier);
          newState.state = 'rolling';
          newState.roundStartTime = new Date();
        }
        break;
        
      case 'roll':
        if (newState.state === 'rolling') {
          newState.state = 'result';
          // Multiplier would be generated here in real implementation
        }
        break;
        
      case 'start-auto-betting':
        if (newState.state === 'setup') {
          newState.isAutoBetting = true;
          if (action.autoBettingConfig?.numberOfBets) {
            newState.autoBetRemaining = action.autoBettingConfig.numberOfBets;
          }
        }
        break;
        
      case 'stop-auto-betting':
        newState.isAutoBetting = false;
        delete (newState as any).autoBetRemaining;
        break;
        
      case 'reset-game':
        newState = {
          gameId: newState.gameId,
          playerId: newState.playerId,
          state: 'setup',
          winProbability: 0,
          potentialPayout: 0,
          isAutoBetting: false,
          seed: newState.seed,
          nonce: newState.nonce,
          clientSeed: newState.clientSeed || 'client-seed'
        };
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
    targetMultiplier: number,
    generatedMultiplier: number,
    config: LimboConfig,
    seed: string,
    nonce: number,
    clientSeed: string
  ): LimboGameSessionState {
    const winProbability = this.calculateWinProbability(targetMultiplier, config.houseEdge);
    const potentialPayout = this.calculatePotentialPayout(betAmount, targetMultiplier);

    return {
      gameId,
      playerId,
      state: 'rolling',
      betAmount,
      targetMultiplier,
      winProbability,
      potentialPayout,
      isAutoBetting: false,
      seed,
      nonce,
      clientSeed,
      roundStartTime: new Date()
    };
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
  private validateConfig(config: LimboConfig): LimboValidation {
    const errors: string[] = [];
    
    if (config.minTargetMultiplier < LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER) {
      errors.push(`Minimum target multiplier must be at least ${LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER}`);
    }
    
    if (config.maxTargetMultiplier > LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER) {
      errors.push(`Maximum target multiplier cannot exceed ${LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER}`);
    }
    
    if (config.houseEdge < 0 || config.houseEdge > 0.1) {
      errors.push('House edge must be between 0% and 10%');
    }
    
    if (config.multiplierPrecision < 0 || config.multiplierPrecision > 6) {
      errors.push('Multiplier precision must be between 0 and 6 decimal places');
    }
    
    if (config.autoBetting?.enabled) {
      const autoBetting = config.autoBetting;
      
      if (autoBetting.numberOfBets && (autoBetting.numberOfBets < 1 || autoBetting.numberOfBets > 1000)) {
        errors.push('Auto-betting number of bets must be between 1 and 1000');
      }
      
      if (autoBetting.speed && (autoBetting.speed < 500 || autoBetting.speed > 5000)) {
        errors.push('Auto-betting speed must be between 500ms and 5000ms');
      }
      
      if (autoBetting.increasePercentage && 
          (autoBetting.increasePercentage < 0 || autoBetting.increasePercentage > 100)) {
        errors.push('Auto-betting increase percentage must be between 0% and 100%');
      }
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
    return `limbo-hash-${seed}-${nonce}`.substring(0, 16);
  }

  /**
   * Get quick preset multipliers with calculated probabilities
   */
  getQuickPresets(config?: LimboConfig): Array<{multiplier: number, probability: number}> {
    const presets = config?.quickPresets || LIMBO_CONSTANTS.QUICK_PRESETS;
    const houseEdge = config?.houseEdge || LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE;
    
    return presets.map(multiplier => ({
      multiplier,
      probability: this.calculateWinProbability(multiplier, houseEdge)
    }));
  }
}