/**
 * Main Sugar Rush Game Component
 * Integrates all Sugar Rush game components and manages game state
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner } from '@heroui/react'
import type {
  SugarRushGameState,
  SugarRushConfig,
  SugarRushResult,
  SugarRushCell,
  SugarRushSymbol
} from '@stake-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { SugarRushGrid } from './SugarRushGrid'
import { SugarRushControls } from './SugarRushControls'
import { SugarRushStats } from './SugarRushStats'

/**
 * Game status for UI state management
 */
type GameStatus = 'idle' | 'spinning' | 'evaluating' | 'cascading' | 'complete' | 'loading'

/**
 * Props for SugarRushGame component
 */
interface SugarRushGameProps {
  onGameResult?: (result: SugarRushResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Main Sugar Rush game component
 */
export function SugarRushGame({
  onGameResult,
  minBet = 0.01,
  maxBet = 1000
}: SugarRushGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<SugarRushGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<SugarRushConfig>({
    autoSpin: false,
    turboMode: false,
    soundEnabled: true
  })
  const [currentBet, setCurrentBet] = useState(1)
  const [gameHistory, setGameHistory] = useState<SugarRushResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cascadeAnimation, setCascadeAnimation] = useState(false)

  /**
   * Generate random symbol for demo purposes
   */
  const getRandomSymbol = useCallback((): SugarRushSymbol => {
    const symbols: SugarRushSymbol[] = [
      'red-candy', 'orange-candy', 'yellow-candy', 'green-candy', 
      'blue-candy', 'purple-candy', 'pink-candy', 'wild'
    ]
    const weights = [8, 12, 16, 20, 24, 28, 32, 4] // Higher number = more common
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const random = Math.random() * totalWeight
    
    let currentWeight = 0
    for (let i = 0; i < symbols.length; i++) {
      currentWeight += weights[i] || 0
      if (random <= currentWeight) {
        return symbols[i] || 'pink-candy'
      }
    }
    return 'pink-candy'
  }, [])

  /**
   * Generate initial game grid
   */
  const generateGrid = useCallback((): SugarRushCell[] => {
    const grid: SugarRushCell[] = []
    for (let i = 0; i < 49; i++) { // 7x7 grid
      grid.push({
        id: i,
        row: Math.floor(i / 7),
        col: i % 7,
        symbol: getRandomSymbol(),
        state: 'normal',
        isMatched: false
      })
    }
    return grid
  }, [getRandomSymbol])

  /**
   * Initialize a new game
   */
  const initializeGame = useCallback(async () => {
    try {
      setGameStatus('loading')
      setError(null)
      setCascadeAnimation(false)

      // Validate authentication
      if (!isAuthenticated) {
        throw new Error('Please log in to play')
      }

      // Validate bet amount
      if (!canAfford(currentBet)) {
        throw new Error('Insufficient balance')
      }

      if (currentBet < minBet || currentBet > maxBet) {
        throw new Error(`Bet must be between ${minBet} and ${maxBet}`)
      }

      // Place bet through wallet store
      const betResult = await bet(currentBet, 'sugar-rush')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Create initial game state
      const gameId = `sugar_rush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const initialGrid = generateGrid()
      
      const newGameState: SugarRushGameState = {
        gameId,
        playerId: user?.id || 'anonymous',
        betAmount: currentBet,
        grid: initialGrid,
        currentCascadeLevel: 0,
        cascadeHistory: [],
        totalMultiplier: 1,
        totalPayout: 0,
        gameStatus: 'spinning',
        startTime: new Date(),
        seed: `demo-seed-${Date.now()}`,
        nonce: Math.floor(Math.random() * 1000000),
        isAutoSpin: gameConfig.autoSpin || false
      }

      setGameState(newGameState)
      setGameStatus('spinning')

      // Simulate spin animation
      setTimeout(() => {
        processGameSpin(newGameState)
      }, gameConfig.turboMode ? 500 : 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game')
      setGameStatus('idle')
    }
  }, [currentBet, minBet, maxBet, gameConfig, generateGrid, isAuthenticated, user?.id, canAfford, bet])

  /**
   * Process game spin and find clusters
   */
  const processGameSpin = useCallback(async (gameState: SugarRushGameState) => {
    try {
      setGameStatus('evaluating')
      
      // Find clusters in the grid
      const clusters = findClusters(gameState.grid)
      
      if (clusters.length === 0) {
        // No wins - game complete
        setGameStatus('complete')
        gameState.gameStatus = 'complete'
        gameState.endTime = new Date()
        setGameState({ ...gameState })
        
        const result: SugarRushResult = createGameResult(gameState, [], 0, 0)
        setGameHistory((prev: SugarRushResult[]) => [...prev, result])
        onGameResult?.(result)
        return
      }

      // Process cascades
      await processCascades(gameState, clusters)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process game')
      setGameStatus('complete')
    }
  }, [onGameResult])

  /**
   * Find clusters using simplified algorithm
   */
  const findClusters = (grid: SugarRushCell[]) => {
    const visited = new Set<number>()
    const clusters: { symbol: SugarRushSymbol, cells: number[], size: number, payout: number }[] = []
    
    for (const cell of grid) {
      if (visited.has(cell.id) || cell.symbol === 'wild') continue
      
      const cluster = findConnectedCluster(grid, cell, visited)
      if (cluster.length >= 5) { // Minimum cluster size
        const payout = calculateClusterPayout(cell.symbol, cluster.length, currentBet)
        clusters.push({
          symbol: cell.symbol,
          cells: cluster,
          size: cluster.length,
          payout
        })
      }
    }
    
    return clusters
  }

  /**
   * Find connected cluster using flood fill
   */
  const findConnectedCluster = (grid: SugarRushCell[], startCell: SugarRushCell, visited: Set<number>): number[] => {
    const cluster: number[] = []
    const queue: number[] = [startCell.id]
    visited.add(startCell.id)
    
    while (queue.length > 0) {
      const cellId = queue.shift()!
      cluster.push(cellId)
      
      // Check adjacent cells (up, down, left, right)
      const adjacentIds = getAdjacentCellIds(cellId)
      
      for (const adjId of adjacentIds) {
        if (visited.has(adjId)) continue
        
        const adjCell = grid.find(c => c.id === adjId)
        if (!adjCell) continue
        
        if (adjCell.symbol === startCell.symbol || adjCell.symbol === 'wild') {
          visited.add(adjId)
          queue.push(adjId)
        }
      }
    }
    
    return cluster
  }

  /**
   * Get adjacent cell IDs
   */
  const getAdjacentCellIds = (cellId: number): number[] => {
    const row = Math.floor(cellId / 7)
    const col = cellId % 7
    const adjacent: number[] = []
    
    if (row > 0) adjacent.push((row - 1) * 7 + col)        // Up
    if (row < 6) adjacent.push((row + 1) * 7 + col)        // Down  
    if (col > 0) adjacent.push(row * 7 + (col - 1))        // Left
    if (col < 6) adjacent.push(row * 7 + (col + 1))        // Right
    
    return adjacent
  }

  /**
   * Calculate cluster payout
   */
  const calculateClusterPayout = (symbol: SugarRushSymbol, size: number, betAmount: number): number => {
    const symbolValues = {
      'red-candy': 50, 'orange-candy': 25, 'yellow-candy': 15, 'green-candy': 10,
      'blue-candy': 8, 'purple-candy': 6, 'pink-candy': 4, 'wild': 100
    }
    
    const baseValue = symbolValues[symbol] || 1
    const sizeMultiplier = getSizeMultiplier(size)
    return (baseValue * sizeMultiplier * betAmount) / 100
  }

  /**
   * Get size multiplier for cluster
   */
  const getSizeMultiplier = (size: number): number => {
    if (size >= 20) return 10
    if (size >= 15) return 5
    if (size >= 10) return 3
    if (size >= 8) return 2
    if (size >= 6) return 1.5
    return 1
  }

  /**
   * Process cascades with animation
   */
  const processCascades = async (gameState: SugarRushGameState, initialClusters: any[]) => {
    let currentGrid = [...gameState.grid]
    let cascadeLevel = 0
    let totalPayout = 0
    let allClusters = [...initialClusters]
    
    while (initialClusters.length > 0 || cascadeLevel === 0) {
      cascadeLevel++
      setGameStatus('cascading')
      setCascadeAnimation(true)
      
      // Mark matched symbols
      for (const cluster of initialClusters) {
        for (const cellId of cluster.cells) {
          const cell = currentGrid.find(c => c.id === cellId)
          if (cell) {
            cell.isMatched = true
            cell.state = 'matched'
          }
        }
      }
      
      // Calculate cascade payout with multiplier
      const cascadeMultiplier = getCascadeMultiplier(cascadeLevel)
      let cascadePayout = 0
      for (const cluster of initialClusters) {
        cascadePayout += cluster.payout * cascadeMultiplier
      }
      totalPayout += cascadePayout
      
      setGameState((prev: SugarRushGameState | null) => prev ? { 
        ...prev, 
        grid: [...currentGrid],
        totalPayout,
        totalMultiplier: cascadeMultiplier,
        currentCascadeLevel: cascadeLevel
      } : null)
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, gameConfig.turboMode ? 800 : 1500))
      
      // Apply cascade (remove matched, drop remaining, add new)
      currentGrid = applyCascade(currentGrid)
      
      setCascadeAnimation(false)
      setGameState((prev: SugarRushGameState | null) => prev ? { ...prev, grid: [...currentGrid] } : null)
      
      // Wait for drop animation
      await new Promise(resolve => setTimeout(resolve, gameConfig.turboMode ? 300 : 800))
      
      // Find new clusters
      initialClusters = findClusters(currentGrid)
      allClusters.push(...initialClusters)
      
      if (cascadeLevel >= 10) break // Safety limit
    }
    
    // Game complete - handle winnings through wallet store
    setGameStatus('complete')
    
    if (totalPayout > 0) {
      await win(totalPayout, gameState.gameId)
    }
    
    const finalGameState = { ...gameState, grid: currentGrid, totalPayout, gameStatus: 'complete' as const, endTime: new Date() }
    setGameState(finalGameState)
    
    const result = createGameResult(finalGameState, allClusters, totalPayout, cascadeLevel)
    setGameHistory((prev: SugarRushResult[]) => [...prev, result])
    onGameResult?.(result)
  }

  /**
   * Get cascade multiplier
   */
  const getCascadeMultiplier = (level: number): number => {
    const multipliers = [1, 2, 3, 5, 10, 15, 20, 25, 50, 100]
    return multipliers[Math.min(level - 1, multipliers.length - 1)] || 1
  }

  /**
   * Apply cascade mechanics
   */
  const applyCascade = (grid: SugarRushCell[]): SugarRushCell[] => {
    const newGrid = [...grid]
    
    // Process each column
    for (let col = 0; col < 7; col++) {
      const columnCells = newGrid.filter(cell => cell.col === col).sort((a, b) => a.row - b.row)
      const survivingCells = columnCells.filter(cell => !cell.isMatched)
      
      // Move surviving cells down
      for (let i = 0; i < survivingCells.length; i++) {
        const survivingCell = survivingCells[i]
        if (survivingCell) {
          const newRow = 6 - i
          const newId = newRow * 7 + col
          survivingCell.row = newRow
          survivingCell.id = newId
          survivingCell.state = 'normal'
          survivingCell.isMatched = false
        }
      }
      
      // Add new symbols at top
      const emptyPositions = 7 - survivingCells.length
      for (let i = 0; i < emptyPositions; i++) {
        const row = i
        const cellId = row * 7 + col
        survivingCells.unshift({
          id: cellId,
          row,
          col,
          symbol: getRandomSymbol(),
          state: 'falling',
          isMatched: false
        })
      }
      
      // Update grid
      newGrid.forEach((cell, index) => {
        if (cell.col === col) {
          const matchingCell = survivingCells.find(sc => sc.id === cell.id)
          if (matchingCell) {
            newGrid[index] = matchingCell
          }
        }
      })
    }
    
    return newGrid.sort((a, b) => a.id - b.id)
  }

  /**
   * Create game result
   */
  const createGameResult = (gameState: SugarRushGameState, clusters: any[], totalPayout: number, cascadeLevels: number): SugarRushResult => {
    return {
      gameId: gameState.gameId,
      gameType: 'sugar-rush',
      playerId: gameState.playerId,
      betAmount: gameState.betAmount,
      multiplier: totalPayout > 0 ? totalPayout / gameState.betAmount : 0,
      payout: totalPayout,
      status: totalPayout > 0 ? 'win' : 'loss',
      timestamp: new Date(),
      seed: gameState.seed,
      nonce: gameState.nonce,
      config: gameConfig,
      finalState: gameState,
      spinResult: {
        initialGrid: gameState.grid,
        cascades: [],
        finalGrid: gameState.grid,
        totalPayout,
        finalMultiplier: gameState.totalMultiplier,
        maxCascadeLevel: cascadeLevels
      },
      clustersWon: clusters,
      cascadeLevels,
      maxMultiplier: gameState.totalMultiplier
    }
  }

  /**
   * Start a new game
   */
  const handleNewGame = useCallback(() => {
    setGameState(null)
    setGameStatus('idle')
    setError(null)
    setCascadeAnimation(false)
  }, [])

  /**
   * Update game configuration
   */
  const handleConfigChange = useCallback((newConfig: Partial<SugarRushConfig>) => {
    setGameConfig((prev: SugarRushConfig) => ({ ...prev, ...newConfig }))
  }, [])

  /**
   * Update bet amount
   */
  const handleBetChange = useCallback((newBet: number) => {
    setCurrentBet(newBet)
  }, [])

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Error display */}
      {error && (
        <Card className="border-danger bg-danger/10">
          <CardBody>
            <p className="text-danger text-sm">{error}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Grid */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                Sugar Rush
              </h2>
              {gameStatus === 'loading' && <Spinner size="sm" />}
            </CardHeader>
            <CardBody className="flex-1">
              {gameState ? (
                <SugarRushGrid
                  gameState={gameState}
                  cascadeAnimation={cascadeAnimation}
                  disabled={gameStatus === 'loading'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold">Sweet Wins Await!</h3>
                    <p className="text-default-500">Match 5+ candy symbols to create cascading wins</p>
                    <Button
                      color="primary"
                      size="lg"
                      onPress={initializeGame}
                      isDisabled={gameStatus === 'loading' || !isAuthenticated}
                      isLoading={gameStatus === 'loading'}
                      className="bg-gradient-to-r from-pink-500 to-violet-500"
                    >
                      {!isAuthenticated ? 'Login to Play' : 'Spin to Win'}
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Controls and Stats */}
        <div className="space-y-6">
          <SugarRushControls
            config={gameConfig}
            onConfigChange={handleConfigChange}
            betAmount={currentBet}
            onBetChange={handleBetChange}
            balance={balance}
            minBet={minBet}
            maxBet={maxBet}
            gameState={gameState}
            gameStatus={gameStatus}
            onStartGame={initializeGame}
            onNewGame={handleNewGame}
          />

          <SugarRushStats
            gameHistory={gameHistory}
            currentBalance={balance}
            currentGame={gameState}
          />
        </div>
      </div>
    </div>
  )
}