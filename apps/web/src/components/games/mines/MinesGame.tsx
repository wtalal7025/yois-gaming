/**
 * Main Mines Game Component
 * Integrates all Mines game components and manages game state
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner } from '@heroui/react'
import type {
  MinesGameState,
  MinesConfig,
  MinesMove,
  MinesResult,
  MinesTile
} from '@yois-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { MinesBoard } from './MinesBoard'
import { MinesControls } from './MinesControls'
import { MinesStats } from './MinesStats'

/**
 * Game status for UI state management
 */
type GameStatus = 'idle' | 'configuring' | 'playing' | 'finished' | 'loading'

/**
 * Props for MinesGame component
 */
interface MinesGameProps {
  onGameResult?: (result: MinesResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Main Mines game component
 */
export function MinesGame({
  onGameResult,
  minBet = 0.01,
  maxBet = 1000
}: MinesGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<MinesGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<MinesConfig>({
    mineCount: 3,
    autoReveal: false
  })
  const [currentBet, setCurrentBet] = useState(1)
  const [gameHistory, setGameHistory] = useState<MinesResult[]>([])
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
      const betResult = await bet(currentBet, 'mines')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Create initial game state
      const gameId = `mines_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tiles: MinesTile[] = []

      // Initialize 5x5 grid (25 tiles)
      for (let i = 0; i < 25; i++) {
        tiles.push({
          id: i,
          row: Math.floor(i / 5),
          col: i % 5,
          state: 'hidden',
          hasMine: false, // Will be set by server
          isRevealed: false,
          isFlagged: false
        })
      }

      const newGameState: MinesGameState = {
        gameId,
        playerId: user?.id || 'anonymous',
        betAmount: currentBet,
        mineCount: gameConfig.mineCount,
        tiles,
        minePositions: [], // Hidden from client
        revealedTiles: [],
        currentMultiplier: 1,
        potentialPayout: currentBet,
        gameStatus: 'playing',
        canCashOut: false,
        startTime: new Date(),
        seed: `demo-seed-${Date.now()}`,
        nonce: Math.floor(Math.random() * 1000000)
      }

      setGameState(newGameState)
      setGameStatus('playing')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game')
      setGameStatus('idle')
    }
  }, [currentBet, minBet, maxBet, gameConfig, isAuthenticated, user?.id, canAfford, bet])

  /**
   * Process a tile reveal
   */
  const handleTileReveal = useCallback(async (tileId: number) => {
    if (!gameState || gameStatus !== 'playing') return

    try {
      setGameStatus('loading')

      // Simulate server processing
      await new Promise(resolve => setTimeout(resolve, 200))

      // For demo: randomly determine if tile is safe or mine
      // Reason: In production, this would be determined by server using provably fair system
      const isMine = Math.random() < (gameConfig.mineCount / (25 - gameState.revealedTiles.length))

      const move: MinesMove = {
        type: 'reveal',
        tileId,
        timestamp: new Date()
      }

      const newGameState = { ...gameState }
      const tile = newGameState.tiles.find(t => t.id === tileId)

      if (!tile || tile.isRevealed) {
        setGameStatus('playing')
        return
      }

      tile.isRevealed = true
      tile.state = 'revealed'
      tile.hasMine = isMine

      if (isMine) {
        // Hit mine - game over
        newGameState.gameStatus = 'lost'
        newGameState.endTime = new Date()
        setGameStatus('finished')

        // Create game result
        const result: MinesResult = {
          gameId: newGameState.gameId,
          gameType: 'mines',
          playerId: newGameState.playerId,
          betAmount: newGameState.betAmount,
          multiplier: 0,
          payout: 0,
          status: 'loss',
          timestamp: new Date(),
          seed: newGameState.seed,
          nonce: newGameState.nonce,
          config: gameConfig,
          finalState: newGameState,
          moves: [move],
          revealedSafeTiles: newGameState.revealedTiles.length,
          hitMine: true,
          minePositions: [tileId]
        }

        setGameHistory((prev: MinesResult[]) => [...prev, result])
        onGameResult?.(result)

      } else {
        // Safe tile revealed
        newGameState.revealedTiles.push(tileId)
        const revealedCount = newGameState.revealedTiles.length

        // Calculate multiplier (simplified formula)
        const totalSafeTiles = 25 - gameConfig.mineCount
        newGameState.currentMultiplier = 1 + (revealedCount * 0.1 * gameConfig.mineCount)
        newGameState.potentialPayout = currentBet * newGameState.currentMultiplier

        tile.multiplier = newGameState.currentMultiplier
        newGameState.canCashOut = revealedCount >= 1

        // Check if all safe tiles revealed
        if (revealedCount >= totalSafeTiles) {
          newGameState.gameStatus = 'won'
          newGameState.endTime = new Date()
          setGameStatus('finished')

          // Handle winnings through wallet store
          await win(newGameState.potentialPayout, newGameState.gameId)
        } else {
          setGameStatus('playing')
        }
      }

      setGameState(newGameState)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal tile')
      setGameStatus('playing')
    }
  }, [gameState, gameStatus, gameConfig, currentBet, onGameResult, win])

  /**
   * Cash out current game
   */
  const handleCashOut = useCallback(async () => {
    if (!gameState || !gameState.canCashOut) return

    try {
      setGameStatus('loading')

      const newGameState = { ...gameState }
      newGameState.gameStatus = 'won'
      newGameState.endTime = new Date()

      // Handle winnings through wallet store
      await win(newGameState.potentialPayout, newGameState.gameId)
      setGameStatus('finished')

      const result: MinesResult = {
        gameId: newGameState.gameId,
        gameType: 'mines',
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
        revealedSafeTiles: newGameState.revealedTiles.length,
        hitMine: false,
        cashOutMultiplier: newGameState.currentMultiplier,
        minePositions: []
      }

      setGameHistory((prev: MinesResult[]) => [...prev, result])
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
  const handleConfigChange = useCallback((newConfig: Partial<MinesConfig>) => {
    setGameConfig((prev: MinesConfig) => ({ ...prev, ...newConfig }))
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
        {/* Game Board */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mines Game</h2>
              {gameStatus === 'loading' && <Spinner size="sm" />}
            </CardHeader>
            <CardBody className="flex-1">
              {gameState ? (
                <MinesBoard
                  gameState={gameState}
                  onTileReveal={handleTileReveal}
                  disabled={gameStatus !== 'playing'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold">Ready to Play?</h3>
                    <p className="text-default-500">Configure your game and place your bet to start</p>
                    <Button
                      color="primary"
                      size="lg"
                      onPress={initializeGame}
                      isDisabled={gameStatus === 'loading' || !isAuthenticated}
                      isLoading={gameStatus === 'loading'}
                    >
                      {!isAuthenticated ? 'Login to Play' : 'Start Game'}
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Controls and Stats */}
        <div className="space-y-6">
          <MinesControls
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

          <MinesStats
            gameHistory={gameHistory}
            currentBalance={balance}
            currentGame={gameState}
          />
        </div>
      </div>
    </div>
  )
}