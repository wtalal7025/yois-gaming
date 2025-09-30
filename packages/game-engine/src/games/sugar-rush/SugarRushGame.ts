/**
 * Sugar Rush Game Engine Implementation
 * Implements cascade-style slot game with cluster mechanics and multiplier zones
 */

import { BaseGame } from '../../base';
import { ProvablyFairRandom } from '../../random';
import { generateId } from '@stake-games/shared';
import type {
  BaseGameResult,
  GameResultStatus,
  SugarRushConfig,
  SugarRushGameState,
  SugarRushResult,
  SugarRushCell,
  SugarRushCluster,
  SugarRushCascade,
  SugarRushSpinResult,
  SugarRushSymbol,
  SugarRushValidation,
  SugarRushProvablyFair
} from '@stake-games/shared';

// Game constants
const GRID_SIZE = 49; // 7x7
const GRID_WIDTH = 7;
const GRID_HEIGHT = 7;
const MIN_CLUSTER_SIZE = 5;
const MAX_MULTIPLIER = 1000;

/**
 * Sugar Rush game implementation extending BaseGame
 */
export class SugarRushGame extends BaseGame {
  private readonly symbolWeights: Record<SugarRushSymbol, number> = {
    'red-candy': 8,      // Highest value, lowest frequency
    'orange-candy': 12,
    'yellow-candy': 16,
    'green-candy': 20,
    'blue-candy': 24,
    'purple-candy': 28,
    'pink-candy': 32,    // Lowest value, highest frequency
    'wild': 4            // Rarest symbol
  };

  private readonly symbolPayouts: Record<SugarRushSymbol, number> = {
    'red-candy': 50,
    'orange-candy': 25,
    'yellow-candy': 15,
    'green-candy': 10,
    'blue-candy': 8,
    'purple-candy': 6,
    'pink-candy': 4,
    'wild': 100
  };

  constructor() {
    super('sugar-rush');
  }

  /**
   * Play a complete Sugar Rush game round
   */
  async play(betAmount: number, seed: string, nonce: number, config?: SugarRushConfig): Promise<SugarRushResult> {
    // Use default config if none provided
    const gameConfig: SugarRushConfig = {
      autoSpin: config?.autoSpin || false,
      turboMode: config?.turboMode || false,
      soundEnabled: config?.soundEnabled !== false,
      ...config
    };

    // Validate game configuration
    const validation = this.validateConfig(gameConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid game configuration: ${validation.errors.join(', ')}`);
    }

    // Generate game ID and initialize state
    const gameId = generateId(16);
    const playerId = 'system'; // Would be provided by caller in real implementation
    
    // Initialize game state
    const gameState = this.initializeGameState(gameId, playerId, betAmount, gameConfig, seed, nonce);
    
    // Generate initial grid using provably fair random
    const initialGrid = this.generateInitialGrid(seed, 'client-seed', nonce);
    gameState.grid = initialGrid;
    
    // Process all cascades starting from initial spin
    const spinResult = await this.processSpinWithCascades(gameState, seed, nonce);
    
    // Calculate final results
    const totalPayout = spinResult.totalPayout;
    const finalMultiplier = spinResult.finalMultiplier;
    const status: GameResultStatus = totalPayout > 0 ? 'win' : 'loss';

    // Create provably fair data
    const provablyFair: SugarRushProvablyFair = {
      serverSeed: seed,
      clientSeed: 'client-seed', // Would be provided by client
      nonce,
      initialGrid: initialGrid.map(cell => cell.symbol),
      cascadeSeeds: spinResult.cascades.map((_: SugarRushCascade, i: number) => `${seed}-cascade-${i}`),
      isVerified: true,
      gameHash: this.generateGameHash(seed, nonce)
    };

    // Update final game state
    gameState.gameStatus = 'complete';
    gameState.totalPayout = totalPayout;
    gameState.totalMultiplier = finalMultiplier;
    gameState.endTime = new Date();
    gameState.grid = spinResult.finalGrid;
    gameState.cascadeHistory = spinResult.cascades;

    return {
      gameId,
      gameType: 'sugar-rush',
      playerId,
      betAmount,
      multiplier: finalMultiplier,
      payout: totalPayout,
      status,
      timestamp: new Date(),
      seed,
      nonce,
      config: gameConfig,
      finalState: gameState,
      spinResult,
      clustersWon: spinResult.cascades.flatMap((c: SugarRushCascade) => c.clustersFound),
      cascadeLevels: spinResult.cascades.length,
      maxMultiplier: Math.max(...spinResult.cascades.map((c: SugarRushCascade) => c.multiplier))
    };
  }

  /**
   * Validate bet amount according to Sugar Rush game rules
   */
  validateBet(betAmount: number): boolean {
    const config = this.getConfig();
    return betAmount >= config.minBet && betAmount <= config.maxBet;
  }

  /**
   * Get Sugar Rush game configuration and limits
   */
  getConfig() {
    return {
      minBet: 0.01,
      maxBet: 1000,
      maxMultiplier: MAX_MULTIPLIER,
      gridSize: GRID_SIZE,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      minClusterSize: MIN_CLUSTER_SIZE
    };
  }

  /**
   * Generate initial game grid using provably fair random
   */
  private generateInitialGrid(serverSeed: string, clientSeed: string, nonce: number): SugarRushCell[] {
    const grid: SugarRushCell[] = [];
    
    for (let i = 0; i < GRID_SIZE; i++) {
      const row = Math.floor(i / GRID_WIDTH);
      const col = i % GRID_WIDTH;
      const symbol = this.generateRandomSymbol(serverSeed, clientSeed, nonce + i);
      
      grid.push({
        id: i,
        row,
        col,
        symbol,
        state: 'normal',
        isMatched: false
      });
    }
    
    return grid;
  }

  /**
   * Generate a random symbol using weighted probabilities
   */
  private generateRandomSymbol(serverSeed: string, clientSeed: string, nonce: number): SugarRushSymbol {
    const totalWeight = Object.values(this.symbolWeights).reduce((sum, weight) => sum + weight, 0);
    const randomValue = ProvablyFairRandom.generateInteger(serverSeed, clientSeed, nonce, 0, totalWeight - 1);
    
    let currentWeight = 0;
    for (const [symbol, weight] of Object.entries(this.symbolWeights)) {
      currentWeight += weight;
      if (randomValue < currentWeight) {
        return symbol as SugarRushSymbol;
      }
    }
    
    return 'pink-candy'; // Fallback
  }

  /**
   * Process spin with all cascades until no more clusters found
   */
  private async processSpinWithCascades(
    gameState: SugarRushGameState, 
    seed: string, 
    baseNonce: number
  ): Promise<SugarRushSpinResult> {
    const cascades: SugarRushCascade[] = [];
    const initialGrid = [...gameState.grid];
    let currentGrid = [...gameState.grid];
    let cascadeLevel = 0;
    let totalPayout = 0;
    let finalMultiplier = 1;
    
    // Continue cascading until no more clusters found
    while (true) {
      // Find clusters in current grid
      const clusters = this.findClusters(currentGrid);
      
      if (clusters.length === 0) {
        break; // No more clusters, stop cascading
      }
      
      cascadeLevel++;
      const cascadeMultiplier = this.calculateCascadeMultiplier(cascadeLevel);
      
      // Calculate payout for this cascade level
      let cascadePayout = 0;
      for (const cluster of clusters) {
        const clusterPayout = this.calculateClusterPayout(cluster, gameState.betAmount);
        cluster.payout = clusterPayout * cascadeMultiplier;
        cascadePayout += cluster.payout;
      }
      
      totalPayout += cascadePayout;
      finalMultiplier = Math.max(finalMultiplier, cascadeMultiplier);
      
      // Mark matched symbols
      this.markMatchedSymbols(currentGrid, clusters);
      
      // Apply cascade: remove matched symbols and drop remaining ones
      const newGrid = this.applyCascade(currentGrid, seed, baseNonce + cascadeLevel * 100);
      
      // Record this cascade
      const cascade: SugarRushCascade = {
        level: cascadeLevel,
        clustersFound: clusters,
        totalPayout: cascadePayout,
        multiplier: cascadeMultiplier,
        newSymbols: newGrid.filter(cell => 
          !currentGrid.some(oldCell => 
            oldCell.id === cell.id && oldCell.symbol === cell.symbol
          )
        )
      };
      
      cascades.push(cascade);
      currentGrid = newGrid;
      
      // Safety limit to prevent infinite cascades
      if (cascadeLevel >= 10) {
        break;
      }
    }
    
    return {
      initialGrid,
      cascades,
      finalGrid: currentGrid,
      totalPayout,
      finalMultiplier,
      maxCascadeLevel: cascadeLevel
    };
  }

  /**
   * Find all valid clusters (5+ connected symbols) in the grid
   */
  private findClusters(grid: SugarRushCell[]): SugarRushCluster[] {
    const visited = new Set<number>();
    const clusters: SugarRushCluster[] = [];
    let clusterId = 0;
    
    for (const cell of grid) {
      if (visited.has(cell.id) || cell.symbol === 'wild') continue;
      
      const cluster = this.findConnectedCluster(grid, cell, visited);
      if (cluster.length >= MIN_CLUSTER_SIZE) {
        clusters.push({
          id: clusterId++,
          symbol: cell.symbol,
          cells: cluster,
          size: cluster.length,
          payout: 0, // Will be calculated later
          multiplier: 1
        });
      }
    }
    
    return clusters;
  }

  /**
   * Find connected cluster starting from a cell using flood fill algorithm
   */
  private findConnectedCluster(grid: SugarRushCell[], startCell: SugarRushCell, visited: Set<number>): number[] {
    const cluster: number[] = [];
    const queue: number[] = [startCell.id];
    visited.add(startCell.id);
    
    while (queue.length > 0) {
      const cellId = queue.shift()!;
      cluster.push(cellId);
      
      // Check adjacent cells (up, down, left, right)
      const adjacentIds = this.getAdjacentCellIds(cellId);
      
      for (const adjId of adjacentIds) {
        if (visited.has(adjId)) continue;
        
        const adjCell = grid.find(c => c.id === adjId);
        if (!adjCell) continue;
        
        // Check if symbols match or if adjacent cell is wild
        if (adjCell.symbol === startCell.symbol || adjCell.symbol === 'wild') {
          visited.add(adjId);
          queue.push(adjId);
        }
      }
    }
    
    return cluster;
  }

  /**
   * Get IDs of adjacent cells (up, down, left, right only)
   */
  private getAdjacentCellIds(cellId: number): number[] {
    const row = Math.floor(cellId / GRID_WIDTH);
    const col = cellId % GRID_WIDTH;
    const adjacent: number[] = [];
    
    // Up
    if (row > 0) adjacent.push((row - 1) * GRID_WIDTH + col);
    // Down  
    if (row < GRID_HEIGHT - 1) adjacent.push((row + 1) * GRID_WIDTH + col);
    // Left
    if (col > 0) adjacent.push(row * GRID_WIDTH + (col - 1));
    // Right
    if (col < GRID_WIDTH - 1) adjacent.push(row * GRID_WIDTH + (col + 1));
    
    return adjacent;
  }

  /**
   * Calculate payout for a cluster based on size and symbol value
   */
  private calculateClusterPayout(cluster: SugarRushCluster, betAmount: number): number {
    const baseValue = this.symbolPayouts[cluster.symbol] || 1;
    const sizeMultiplier = this.getClusterSizeMultiplier(cluster.size);
    return (baseValue * sizeMultiplier * betAmount) / 100;
  }

  /**
   * Get multiplier based on cluster size
   */
  private getClusterSizeMultiplier(size: number): number {
    if (size >= 20) return 10;
    if (size >= 15) return 5;
    if (size >= 10) return 3;
    if (size >= 8) return 2;
    if (size >= 6) return 1.5;
    return 1; // 5 symbols
  }

  /**
   * Calculate cascade level multiplier
   */
  private calculateCascadeMultiplier(level: number): number {
    const multipliers = [1, 2, 3, 5, 10, 15, 20, 25, 50, 100];
    return multipliers[Math.min(level - 1, multipliers.length - 1)] || 1;
  }

  /**
   * Mark symbols in clusters as matched
   */
  private markMatchedSymbols(grid: SugarRushCell[], clusters: SugarRushCluster[]): void {
    for (const cluster of clusters) {
      for (const cellId of cluster.cells) {
        const cell = grid.find(c => c.id === cellId);
        if (cell) {
          cell.isMatched = true;
          cell.state = 'matched';
          cell.clusterId = cluster.id;
        }
      }
    }
  }

  /**
   * Apply cascade mechanics: remove matched symbols and drop remaining ones
   */
  private applyCascade(grid: SugarRushCell[], seed: string, nonce: number): SugarRushCell[] {
    const newGrid = [...grid];
    
    // Remove matched symbols and apply gravity column by column
    for (let col = 0; col < GRID_WIDTH; col++) {
      const columnCells = newGrid.filter(cell => cell.col === col).sort((a, b) => a.row - b.row);
      const survivingCells = columnCells.filter(cell => !cell.isMatched);
      
      // Move surviving cells to bottom positions
      for (let i = 0; i < survivingCells.length; i++) {
        const cell = survivingCells[i];
        if (cell) {
          const newRow = GRID_HEIGHT - 1 - i;
          const newId = newRow * GRID_WIDTH + col;
          cell.row = newRow;
          cell.id = newId;
          cell.state = 'normal';
          cell.isMatched = false;
          delete cell.clusterId;
        }
      }
      
      // Generate new symbols for empty positions at top
      const emptyPositions = GRID_HEIGHT - survivingCells.length;
      for (let i = 0; i < emptyPositions; i++) {
        const row = i;
        const cellId = row * GRID_WIDTH + col;
        const symbol = this.generateRandomSymbol(seed, 'client-seed', nonce + cellId);
        
        survivingCells.unshift({
          id: cellId,
          row,
          col,
          symbol,
          state: 'falling',
          isMatched: false
        });
      }
      
      // Update grid with column changes
      newGrid.forEach((cell, index) => {
        if (cell.col === col) {
          const matchingCell = survivingCells.find(sc => sc.id === cell.id);
          if (matchingCell) {
            newGrid[index] = matchingCell;
          }
        }
      });
    }
    
    return newGrid.sort((a, b) => a.id - b.id);
  }

  /**
   * Initialize game state
   */
  private initializeGameState(
    gameId: string,
    playerId: string,
    betAmount: number,
    config: SugarRushConfig,
    seed: string,
    nonce: number
  ): SugarRushGameState {
    return {
      gameId,
      playerId,
      betAmount,
      grid: [],
      currentCascadeLevel: 0,
      cascadeHistory: [],
      totalMultiplier: 1,
      totalPayout: 0,
      gameStatus: 'spinning',
      startTime: new Date(),
      seed,
      nonce,
      isAutoSpin: config.autoSpin || false
    };
  }

  /**
   * Validate game configuration
   */
  private validateConfig(config: SugarRushConfig): SugarRushValidation {
    const errors: string[] = [];
    
    // No specific validation needed for current config options
    // Future expansion could add validation for multiplier zones, etc.
    
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