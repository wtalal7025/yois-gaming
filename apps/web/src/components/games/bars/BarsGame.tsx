/**
 * Main Bars Game Component  
 * Integrates all Bars slot machine components and manages game state
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner } from '@heroui/react'
import type {
  BarsGameState,
  BarsConfig,
  BarsResult,
  BarsReel,
  BarsPayline,
  BarsPaylineWin,
  BarsSymbol
} from '@yois-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { SlotMachine } from './SlotMachine'
import { BarsControls } from './BarsControls'
import { PaylineDisplay } from './PaylineDisplay'

/**
 * Game status for UI state management
 */
type GameStatus = 'idle' | 'spinning' | 'evaluating' | 'displaying-wins' | 'finished' | 'loading'

/**
 * Props for BarsGame component
 */
interface BarsGameProps {
  onGameResult?: (result: BarsResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Main Bars slot machine game component
 */
export function BarsGame({
  onGameResult,
  minBet = 0.01,
  maxBet = 100
}: BarsGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<BarsGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<BarsConfig>({
    activePaylines: 5,
    betPerLine: 0.20,
    turboMode: false,
    soundEnabled: true
  })
  const [gameHistory, setGameHistory] = useState<BarsResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAutoSpin, setIsAutoSpin] = useState(false)
  const [autoSpinCount, setAutoSpinCount] = useState(0)

  // Calculate current total bet
  const totalBet = gameConfig.activePaylines * gameConfig.betPerLine

  /**
   * Initialize slot machine reels with default symbols
   */
  const initializeReels = (): BarsReel[] => {
    const reels: BarsReel[] = []
    const defaultSymbols: BarsSymbol[] = ['grape', 'plum', 'lemon', 'orange', 'cherry', 'bell', 'single-bar', 'double-bar', 'triple-bar']

    for (let i = 0; i < 9; i++) {
      const symbolIndex = i % defaultSymbols.length
      const symbol = defaultSymbols[symbolIndex]!
      reels.push({
        id: i,
        row: Math.floor(i / 3),
        col: i % 3,
        symbol,
        state: 'normal',
        isWinning: false,
        paylineIds: getPaylineIdsForPosition(i)
      })
    }

    return reels
  }

  /**
   * Get payline IDs that include a specific reel position
   */
  const getPaylineIdsForPosition = (position: number): number[] => {
    const paylineConfigs = [
      { id: 1, positions: [0, 1, 2] }, // Top line
      { id: 2, positions: [3, 4, 5] }, // Middle line  
      { id: 3, positions: [6, 7, 8] }, // Bottom line
      { id: 4, positions: [0, 4, 8] }, // Diagonal down
      { id: 5, positions: [6, 4, 2] }  // Diagonal up
    ]

    return paylineConfigs
      .filter(config => config.positions.includes(position))
      .map(config => config.id)
  }

  /**
   * Initialize paylines based on active paylines setting
   */
  const initializePaylines = (activeCount: number): BarsPayline[] => {
    const paylineConfigs = [
      { id: 1, name: 'Top Line', positions: [0, 1, 2] },
      { id: 2, name: 'Middle Line', positions: [3, 4, 5] },
      { id: 3, name: 'Bottom Line', positions: [6, 7, 8] },
      { id: 4, name: 'Diagonal Down', positions: [0, 4, 8] },
      { id: 5, name: 'Diagonal Up', positions: [6, 4, 2] }
    ]

    return paylineConfigs.slice(0, activeCount).map(config => ({
      ...config,
      positions: config.positions as [number, number, number],
      isActive: true,
      betAmount: gameConfig.betPerLine
    }))
  }

  /**
   * Spin the slot machine reels
   */
  const handleSpin = useCallback(async () => {
    try {
      setGameStatus('loading')
      setError(null)

      // Validate authentication
      if (!isAuthenticated) {
        throw new Error('Please log in to play')
      }

      // Validate bet amount
      if (!canAfford(totalBet)) {
        throw new Error('Insufficient balance')
      }

      if (totalBet < minBet || totalBet > maxBet) {
        throw new Error(`Total bet must be between ${minBet} and ${maxBet}`)
      }

      // Place bet through wallet store
      const betResult = await bet(totalBet, 'bars')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Create new game state
      const gameId = `bars_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const reels = initializeReels()
      const paylines = initializePaylines(gameConfig.activePaylines)

      const newGameState: BarsGameState = {
        gameId,
        playerId: user?.id || 'anonymous',
        betPerLine: gameConfig.betPerLine,
        activePaylines: gameConfig.activePaylines,
        totalBet,
        reels,
        paylines,
        winningPaylines: [],
        totalMultiplier: 0,
        totalPayout: 0,
        gameStatus: 'spinning',
        spinCount: 1,
        startTime: new Date(),
        seed: `demo-seed-${Date.now()}`,
        nonce: Math.floor(Math.random() * 1000000),
        isAutoSpin,
        autoSpinRemaining: isAutoSpin ? autoSpinCount - 1 : 0
      }

      setGameState(newGameState)
      setGameStatus('spinning')

      // Simulate reel spinning duration
      const spinDuration = gameConfig.turboMode ? 1000 : 2000
      await new Promise(resolve => setTimeout(resolve, spinDuration))

      // Generate random reel results (in production this would come from server)
      const symbols: BarsSymbol[] = ['triple-bar', 'double-bar', 'single-bar', 'seven', 'bell', 'cherry', 'lemon', 'orange', 'plum', 'grape']
      const finalSymbols: BarsSymbol[] = []

      for (let i = 0; i < 9; i++) {
        // Weighted random selection (simplified)
        const randomIndex = Math.floor(Math.random() * symbols.length)
        const selectedSymbol = symbols[randomIndex]!
        finalSymbols.push(selectedSymbol)
      }

      // Update reels with final symbols
      const updatedReels = newGameState.reels.map((reel, index) => ({
        ...reel,
        symbol: finalSymbols[index]!,
        state: 'stopped' as const
      }))

      // Check for wins (simplified win detection)
      const winningPaylines = checkForWins(updatedReels, paylines)
      const totalPayout = winningPaylines.reduce((sum, win) => sum + win.totalPayout, 0)
      const multiplier = totalBet > 0 ? totalPayout / totalBet : 0

      // Mark winning reels
      const finalReels = updatedReels.map(reel => ({
        ...reel,
        isWinning: winningPaylines.some(win => win.positions.includes(reel.id)),
        state: winningPaylines.some(win => win.positions.includes(reel.id)) ? 'winning' as const : 'stopped' as const
      }))

      const finalGameState: BarsGameState = {
        ...newGameState,
        reels: finalReels,
        winningPaylines,
        totalMultiplier: multiplier,
        totalPayout,
        gameStatus: 'complete',
        endTime: new Date()
      }

      setGameState(finalGameState)

      if (totalPayout > 0) {
        setGameStatus('displaying-wins')

        // Handle winnings through wallet store
        await win(totalPayout, gameId)

        // Show win animation, then finish
        setTimeout(() => {
          setGameStatus('finished')
        }, gameConfig.turboMode ? 1500 : 3000)
      } else {
        setGameStatus('finished')
      }

      // Create game result
      const result: BarsResult = {
        gameId: finalGameState.gameId,
        gameType: 'bars',
        playerId: finalGameState.playerId,
        betAmount: totalBet,
        multiplier,
        payout: totalPayout,
        status: totalPayout > 0 ? 'win' : 'loss',
        timestamp: new Date(),
        seed: finalGameState.seed,
        nonce: finalGameState.nonce,
        config: gameConfig,
        finalState: finalGameState,
        spinResult: {
          finalReels,
          winningPaylines,
          totalPayout,
          totalMultiplier: multiplier,
          hasWin: totalPayout > 0,
          isBigWin: multiplier >= 20,
          isMaxWin: multiplier >= 1000
        },
        symbolCombinations: getSymbolCombinations(finalSymbols),
        paylineHits: winningPaylines.length,
        biggestWin: Math.max(...winningPaylines.map(w => w.totalPayout), 0)
      }

      setGameHistory((prev: BarsResult[]) => [...prev, result])
      onGameResult?.(result)

      // Handle auto-spin
      if (isAutoSpin && autoSpinCount > 1) {
        setAutoSpinCount((prev: number) => prev - 1)
        setTimeout(() => {
          handleSpin()
        }, gameConfig.turboMode ? 500 : 1000)
      } else if (isAutoSpin) {
        setIsAutoSpin(false)
        setAutoSpinCount(0)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spin reels')
      setGameStatus('idle')
      setIsAutoSpin(false)
    }
  }, [totalBet, minBet, maxBet, gameConfig, isAutoSpin, autoSpinCount, onGameResult, isAuthenticated, user?.id, canAfford, bet, win]) // Reason: All dependencies included for handleSpin callback

  /**
   * Simple win detection logic
   */
  const checkForWins = (reels: BarsReel[], paylines: BarsPayline[]): BarsPaylineWin[] => {
    const wins: BarsPaylineWin[] = []

    for (const payline of paylines) {
      const symbols = payline.positions.map(pos => reels[pos]?.symbol).filter(Boolean) as BarsSymbol[]

      if (symbols.length === 3) {
        // Check for three matching symbols
        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
          const symbol = symbols[0]!
          const basePayout = getSymbolPayout(symbol)

          if (basePayout > 0) {
            wins.push({
              paylineId: payline.id,
              symbol,
              positions: payline.positions,
              matchCount: 3,
              basePayout,
              multiplier: 1,
              totalPayout: basePayout * payline.betAmount
            })
          }
        }
        // Special cherry rules (2 cherries pay)
        else if (symbols.filter(s => s === 'cherry').length >= 2) {
          wins.push({
            paylineId: payline.id,
            symbol: 'cherry',
            positions: payline.positions,
            matchCount: 2,
            basePayout: 5,
            multiplier: 1,
            totalPayout: 5 * payline.betAmount
          })
        }
      }
    }

    return wins
  }

  /**
   * Get payout multiplier for symbol
   */
  const getSymbolPayout = (symbol: BarsSymbol): number => {
    const payouts: Record<BarsSymbol, number> = {
      'triple-bar': 300,
      'double-bar': 150,
      'single-bar': 75,
      'seven': 200,
      'bell': 50,
      'cherry': 25,
      'lemon': 20,
      'orange': 15,
      'plum': 12,
      'grape': 10
    }

    return payouts[symbol] || 0
  }

  /**
   * Get symbol combinations from final symbols
   */
  const getSymbolCombinations = (symbols: BarsSymbol[]): { [symbol: string]: number } => {
    const combinations: { [symbol: string]: number } = {}

    symbols.forEach(symbol => {
      combinations[symbol] = (combinations[symbol] || 0) + 1
    })

    return combinations
  }

  /**
   * Start new game
   */
  const handleNewGame = useCallback(() => {
    setGameState(null)
    setGameStatus('idle')
    setError(null)
    setIsAutoSpin(false)
    setAutoSpinCount(0)
  }, [])

  /**
   * Update game configuration
   */
  const handleConfigChange = useCallback((newConfig: Partial<BarsConfig>) => {
    setGameConfig((prev: BarsConfig) => ({ ...prev, ...newConfig }))
  }, [])

  /**
   * Start auto-spin
   */
  const handleAutoSpin = useCallback((count: number) => {
    setIsAutoSpin(true)
    setAutoSpinCount(count)
    handleSpin()
  }, [handleSpin])

  /**
   * Stop auto-spin
   */
  const handleStopAutoSpin = useCallback(() => {
    setIsAutoSpin(false)
    setAutoSpinCount(0)
  }, [])

  // Determine if spin is allowed
  const canSpin = (gameStatus === 'idle' || gameStatus === 'finished') && isAuthenticated
  const isSpinning = gameStatus === 'spinning' || gameStatus === 'loading'

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
        {/* Slot Machine */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Bars Slot Machine</h2>
              {isSpinning && <Spinner size="sm" />}
            </CardHeader>
            <CardBody className="flex-1">
              <div className="space-y-4">
                {/* Payline Display */}
                {gameState && (
                  <PaylineDisplay
                    paylines={gameState.paylines}
                    winningPaylines={gameState.winningPaylines}
                    reels={gameState.reels}
                  />
                )}

                {/* Slot Machine Reels */}
                <SlotMachine
                  reels={gameState?.reels || initializeReels()}
                  isSpinning={isSpinning}
                  turboMode={gameConfig.turboMode ?? false}
                />

                {/* Spin Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    color="primary"
                    size="lg"
                    className="px-12 py-3 text-lg font-bold"
                    onPress={handleSpin}
                    isDisabled={!canSpin || (isAuthenticated && !canAfford(totalBet))}
                    isLoading={isSpinning}
                  >
                    {!isAuthenticated
                      ? 'Login to Play'
                      : isAutoSpin
                        ? `Auto Spin (${autoSpinCount})`
                        : 'Spin'
                    }
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <BarsControls
            config={gameConfig}
            onConfigChange={handleConfigChange}
            balance={balance}
            totalBet={totalBet}
            minBet={minBet}
            maxBet={maxBet}
            gameState={gameState}
            gameStatus={gameStatus}
            onSpin={handleSpin}
            onAutoSpin={handleAutoSpin}
            onStopAutoSpin={handleStopAutoSpin}
            onNewGame={handleNewGame}
            isAutoSpin={isAutoSpin}
            autoSpinCount={autoSpinCount}
          />

          {/* Game Stats */}
          {gameHistory.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Game Statistics</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Spins:</span>
                    <span>{gameHistory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wagered:</span>
                    <span>${gameHistory.reduce((sum, game) => sum + game.betAmount, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Won:</span>
                    <span className="text-success">${gameHistory.reduce((sum, game) => sum + game.payout, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Win Rate:</span>
                    <span>{((gameHistory.filter(g => g.status === 'win').length / gameHistory.length) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biggest Win:</span>
                    <span className="text-success">${Math.max(...gameHistory.map(g => g.payout), 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}