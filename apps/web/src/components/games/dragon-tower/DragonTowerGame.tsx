/**
 * Main Dragon Tower Game Component
 * Integrates all Dragon Tower game components and manages game state
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner } from '@heroui/react'
import type { 
  DragonTowerGameState, 
  DragonTowerConfig, 
  DragonTowerMove, 
  DragonTowerResult,
  DragonTowerDifficulty
} from '@stake-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { TowerDisplay } from './TowerDisplay'
import { DragonTowerControls } from './DragonTowerControls'
import { MultiplierTracker } from './MultiplierTracker'

/**
 * Game status for UI state management
 */
type GameStatus = 'idle' | 'playing' | 'finished' | 'loading'

/**
 * Props for DragonTowerGame component
 */
interface DragonTowerGameProps {
  onGameResult?: (result: DragonTowerResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Tile counts for each difficulty level
 */
const DIFFICULTY_TILE_COUNTS: Record<DragonTowerDifficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5
} as const

/**
 * Calculate multiplier for a given level and difficulty
 */
const calculateLevelMultiplier = (level: number, difficulty: DragonTowerDifficulty): number => {
  const baseMultipliers: Record<DragonTowerDifficulty, number> = {
    easy: 1.5,
    medium: 2,
    hard: 2.67,
    expert: 3.33
  }
  
  const baseMultiplier = baseMultipliers[difficulty]
  if (level <= 0) return 1
  
  // Progressive multiplier system: baseMultiplier^level * 0.97 (house edge)
  const multiplier = Math.pow(baseMultiplier, level) * 0.97
  return Math.round(multiplier * 10000) / 10000
}

/**
 * Main Dragon Tower game component
 */
export function DragonTowerGame({ 
  onGameResult, 
  minBet = 0.01, 
  maxBet = 1000 
}: DragonTowerGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<DragonTowerGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<DragonTowerConfig>({
    difficulty: 'easy',
    autoClimb: { enabled: false }
  })
  const [currentBet, setCurrentBet] = useState<number>(1)
  const [gameHistory, setGameHistory] = useState<DragonTowerResult[]>([])
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize a new game
   */
  const initializeGame = useCallback(async () => {
    try {
      setGameStatus('loading')
      setError(null)

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
      const betResult = await bet(currentBet, 'dragon-tower')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Create initial game state
      const gameId = `dragon_tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tileCount = DIFFICULTY_TILE_COUNTS[gameConfig.difficulty]
      
      // Generate levels with tiles
      const levels = []
      for (let levelId = 1; levelId <= 9; levelId++) {
        // For demo, randomly determine safe tile position
        const safeTileId = Math.floor(Math.random() * tileCount)
        const tiles = []
        
        for (let tileId = 0; tileId < tileCount; tileId++) {
          tiles.push({
            id: tileId,
            levelId,
            state: 'hidden' as const,
            isSafe: tileId === safeTileId,
            isRevealed: false,
            isSelected: false
          })
        }
        
        levels.push({
          id: levelId,
          tiles,
          isCompleted: false,
          isActive: levelId === 1,
          safeTileId,
          multiplier: calculateLevelMultiplier(levelId, gameConfig.difficulty)
        })
      }

      const newGameState: DragonTowerGameState = {
        gameId,
        playerId: user?.id || 'anonymous',
        betAmount: currentBet,
        difficulty: gameConfig.difficulty,
        levels,
        currentLevel: 1,
        completedLevels: 0,
        currentMultiplier: 1,
        potentialPayout: currentBet,
        gameStatus: 'climbing',
        canCashOut: false,
        startTime: new Date(),
        seed: `demo-seed-${Date.now()}`,
        nonce: Math.floor(Math.random() * 1000000),
        totalEggPositions: [] // Would be populated by server
      }

      setGameState(newGameState)
      setGameStatus('playing')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game')
      setGameStatus('idle')
    }
  }, [currentBet, minBet, maxBet, gameConfig, isAuthenticated, user?.id, canAfford, bet])

  /**
   * Process a tile selection
   */
  const handleTileSelect = useCallback(async (levelId: number, tileId: number) => {
    if (!gameState || gameStatus !== 'playing') return

    try {
      setGameStatus('loading')

      // Simulate server processing
      await new Promise(resolve => setTimeout(resolve, 500))

      const move: DragonTowerMove = {
        type: 'select-tile',
        levelId,
        tileId,
        timestamp: new Date()
      }

      const newGameState = { ...gameState }
      const level = newGameState.levels.find((l) => l.id === levelId)
      
      if (!level || !level.isActive) {
        setGameStatus('playing')
        return
      }

      const tile = level.tiles.find((t) => t.id === tileId)
      if (!tile || tile.isRevealed) {
        setGameStatus('playing')
        return
      }

      // Reveal the selected tile
      tile.isRevealed = true
      tile.isSelected = true
      tile.state = tile.isSafe ? 'safe' : 'egg'

      if (tile.isSafe) {
        // Safe tile selected - advance to next level or win
        level.isCompleted = true
        level.isActive = false
        newGameState.completedLevels++
        newGameState.currentMultiplier = level.multiplier
        newGameState.potentialPayout = newGameState.betAmount * newGameState.currentMultiplier
        
        if (levelId >= 9) {
          // Reached the top of the tower - maximum win
          newGameState.gameStatus = 'won'
          newGameState.endTime = new Date()
          newGameState.canCashOut = false
          setGameStatus('finished')
          
          // Handle winnings through wallet store
          await win(newGameState.potentialPayout, newGameState.gameId)
        } else {
          // Move to next level
          newGameState.currentLevel = levelId + 1
          const nextLevel = newGameState.levels.find((l) => l.id === levelId + 1)
          if (nextLevel) {
            nextLevel.isActive = true
          }
          newGameState.gameStatus = 'climbing'
          newGameState.canCashOut = true
          setGameStatus('playing')
        }
      } else {
        // Hit an egg - game over
        newGameState.gameStatus = 'lost'
        newGameState.endTime = new Date()
        newGameState.canCashOut = false
        setGameStatus('finished')
        
        // Reveal all tiles on current level to show where the safe tile was
        level.tiles.forEach((t) => {
          if (!t.isRevealed) {
            t.isRevealed = true
            t.state = t.isSafe ? 'safe' : 'egg'
          }
        })
      }

      setGameState(newGameState)

      // Create game result if game is finished
      if (newGameState.gameStatus === 'won' || newGameState.gameStatus === 'lost') {
        const result: DragonTowerResult = {
          gameId: newGameState.gameId,
          gameType: 'dragon-tower',
          playerId: newGameState.playerId,
          betAmount: newGameState.betAmount,
          multiplier: newGameState.gameStatus === 'won' ? newGameState.currentMultiplier : 0,
          payout: newGameState.gameStatus === 'won' ? newGameState.potentialPayout : 0,
          status: newGameState.gameStatus === 'won' ? 'win' : 'loss',
          timestamp: new Date(),
          seed: newGameState.seed,
          nonce: newGameState.nonce,
          config: gameConfig,
          finalState: newGameState,
          moves: [move],
          levelsCompleted: newGameState.completedLevels,
          maxLevelReached: Math.max(newGameState.currentLevel - 1, 0),
          hitEgg: newGameState.gameStatus === 'lost',
          eggPositions: [] // Would be provided by server
        }
        
        setGameHistory((prev: DragonTowerResult[]) => [...prev, result])
        onGameResult?.(result)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select tile')
      setGameStatus('playing')
    }
  }, [gameState, gameStatus, gameConfig, onGameResult, win])

  /**
   * Cash out current game
   */
  const handleCashOut = useCallback(async () => {
    if (!gameState || !gameState.canCashOut) return

    try {
      setGameStatus('loading')
      
      const newGameState = { ...gameState }
      newGameState.gameStatus = 'cashed-out'
      newGameState.endTime = new Date()
      
      // Handle winnings through wallet store
      await win(newGameState.potentialPayout, newGameState.gameId)
      setGameStatus('finished')

      const result: DragonTowerResult = {
        gameId: newGameState.gameId,
        gameType: 'dragon-tower',
        playerId: newGameState.playerId,
        betAmount: newGameState.betAmount,
        multiplier: newGameState.currentMultiplier,
        payout: newGameState.potentialPayout,
        status: 'win',
        timestamp: new Date(),
        seed: newGameState.seed,
        nonce: newGameState.nonce,
        config: gameConfig,
        finalState: newGameState,
        moves: [],
        levelsCompleted: newGameState.completedLevels,
        maxLevelReached: newGameState.currentLevel,
        hitEgg: false,
        cashOutLevel: newGameState.currentLevel,
        cashOutMultiplier: newGameState.currentMultiplier,
        eggPositions: []
      }
      
      setGameHistory((prev: DragonTowerResult[]) => [...prev, result])
      onGameResult?.(result)
      setGameState(newGameState)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cash out')
      setGameStatus('playing')
    }
  }, [gameState, gameConfig, onGameResult, win])

  /**
   * Start a new game
   */
  const handleNewGame = useCallback(() => {
    setGameState(null)
    setGameStatus('idle')
    setError(null)
  }, [])

  /**
   * Update game configuration
   */
  const handleConfigChange = useCallback((newConfig: Partial<DragonTowerConfig>) => {
    setGameConfig((prev: DragonTowerConfig) => ({ ...prev, ...newConfig }))
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tower Display - Main Game Area */}
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dragon Tower</h2>
              {gameStatus === 'loading' && <Spinner size="sm" />}
            </CardHeader>
            <CardBody className="flex-1">
              {gameState ? (
                <TowerDisplay
                  gameState={gameState}
                  onTileSelect={handleTileSelect}
                  disabled={gameStatus !== 'playing'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="text-6xl mb-4">🏰</div>
                    <h3 className="text-xl font-semibold">Ready to Climb the Dragon Tower?</h3>
                    <p className="text-default-500">
                      {!isAuthenticated ? 'Please log in to play!' : 'Select your difficulty and bet amount to begin your ascent'}
                    </p>
                    <Button
                      color="primary"
                      size="lg"
                      onPress={initializeGame}
                      isDisabled={gameStatus === 'loading' || !isAuthenticated}
                      isLoading={gameStatus === 'loading'}
                    >
                      {!isAuthenticated ? 'Login to Play' : 'Start Climbing'}
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Controls */}
        <div className="lg:col-span-4">
          <DragonTowerControls
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
            onCashOut={handleCashOut}
            onNewGame={handleNewGame}
          />
        </div>

        {/* Multiplier Tracker */}
        <div className="lg:col-span-3">
          <MultiplierTracker
            gameState={gameState}
            betAmount={currentBet}
          />
        </div>
      </div>

      {/* Game Instructions */}
      {!gameState && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">How to Play Dragon Tower</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">🎯 Objective</h4>
                <p className="text-default-600 mb-4">
                  Climb the 9-level tower by selecting the correct tile on each level. 
                  Each correct choice advances you to the next level with a higher multiplier.
                </p>
                
                <h4 className="font-semibold mb-2">⚡ Difficulty Modes</h4>
                <ul className="text-default-600 space-y-1">
                  <li><strong>Easy:</strong> 2 tiles (50% chance)</li>
                  <li><strong>Medium:</strong> 3 tiles (33.33% chance)</li>
                  <li><strong>Hard:</strong> 4 tiles (25% chance)</li>
                  <li><strong>Expert:</strong> 5 tiles (20% chance)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">💰 Strategy</h4>
                <ul className="text-default-600 space-y-1">
                  <li>• Higher difficulty = higher multipliers</li>
                  <li>• You can cash out after any completed level</li>
                  <li>• Each level increases the potential payout</li>
                  <li>• Hitting an egg ends the game with no payout</li>
                </ul>

                <h4 className="font-semibold mb-2 mt-4">🎮 Controls</h4>
                <ul className="text-default-600 space-y-1">
                  <li>• Click tiles to reveal them</li>
                  <li>• Use the Cash Out button to secure winnings</li>
                  <li>• Set auto-cashout for automatic exits</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}