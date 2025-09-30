/**
 * Main Crash Game Component
 * Integrates all Crash game components and manages real-time multiplier game state
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardBody, CardHeader, Button, Spinner } from '@heroui/react'
import type { 
  CrashGameState, 
  CrashConfig, 
  CrashResult,
  CrashAction,
  MultiplierPoint,
  CrashPhase 
} from '@stake-games/shared'
import { useWalletStore } from '../../../stores/wallet'
import { useAuthStore } from '../../../stores/auth'
import { CrashChart } from './CrashChart'
import { CrashControls } from './CrashControls'
import { CrashHistory } from './CrashHistory'

/**
 * Game status for UI state management
 */
type GameStatus = 'idle' | 'waiting' | 'betting-closed' | 'flying' | 'crashed' | 'finished' | 'loading'

/**
 * Props for CrashGame component
 */
interface CrashGameProps {
  onGameResult?: (result: CrashResult) => void
  minBet?: number
  maxBet?: number
}

/**
 * Main Crash multiplier game component
 */
export function CrashGame({ 
  onGameResult, 
  minBet = 0.01, 
  maxBet = 1000 
}: CrashGameProps) {
  // Wallet and auth integration
  const { bet, win, canAfford } = useWalletStore()
  const balance = useWalletStore(state => state.balance?.current || 0)
  const { user, isAuthenticated } = useAuthStore()

  // Game state management
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [gameState, setGameState] = useState<CrashGameState | null>(null)
  const [gameConfig, setGameConfig] = useState<CrashConfig>({
    bettingWindow: 12,
    maxRoundDuration: 60,
    minCrashPoint: 1.00,
    maxCrashPoint: 1000.00,
    houseEdge: 0.01
  })
  const [currentBet, setCurrentBet] = useState(1)
  const [gameHistory, setGameHistory] = useState<CrashResult[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Real-time game state
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00)
  const [multiplierCurve, setMultiplierCurve] = useState<MultiplierPoint[]>([])
  const [crashPoint, setCrashPoint] = useState<number | null>(null)
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [playerCashedOut, setPlayerCashedOut] = useState(false)
  const [cashOutMultiplier, setCashOutMultiplier] = useState<number | null>(null)
  
  // Animation refs
  const animationRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  /**
   * Initialize a new crash game round
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
      const betResult = await bet(currentBet, 'crash')
      if (!betResult.success) {
        throw new Error(betResult.error || 'Failed to place bet')
      }

      // Generate crash point using demo logic (in production, from server)
      const demoHash = Math.floor(Math.random() * Math.pow(2, 32))
      const demoCrashPoint = Math.max(1.00, Math.floor((Math.pow(2, 32) / (Math.pow(2, 32) - demoHash)) * (1 - gameConfig.houseEdge) * 100) / 100)
      
      // Create initial game state
      const gameId = `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const roundNumber = gameHistory.length + 1

      const newGameState: CrashGameState = {
        gameId,
        roundNumber,
        phase: 'waiting',
        startTime: new Date(),
        currentMultiplier: 1.00,
        elapsedTime: 0,
        playerId: user?.id || 'anonymous',
        betAmount: currentBet,
        playerStatus: 'active',
        potentialPayout: currentBet,
        totalPlayers: 1,
        totalBets: currentBet,
        cashedOutPlayers: 0,
        averageCashOut: 0,
        seed: `demo-seed-${Date.now()}`,
        nonce: Math.floor(Math.random() * 1000000),
        autoCashoutEnabled: gameConfig.autoCashout?.enabled || false,
        isAutoPlay: gameConfig.autoPlay?.enabled || false
      }

      // Add optional properties if they exist
      if (gameConfig.autoCashout?.target) {
        newGameState.autoCashoutTarget = gameConfig.autoCashout.target
      }

      setGameState(newGameState)
      setCrashPoint(demoCrashPoint)
      setCurrentMultiplier(1.00)
      setMultiplierCurve([])
      setPlayerCashedOut(false)
      setCashOutMultiplier(null)
      setGameStatus('waiting')

      // Start betting window countdown
      startBettingCountdown()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game')
      setGameStatus('idle')
    }
  }, [currentBet, minBet, maxBet, gameConfig, gameHistory.length, isAuthenticated, user?.id, canAfford, bet])

  /**
   * Start betting countdown and then multiplier growth
   */
  const startBettingCountdown = useCallback(() => {
    let timeLeft = gameConfig.bettingWindow
    setCountdown(timeLeft)

    const countdownInterval = setInterval(() => {
      timeLeft -= 1
      setCountdown(timeLeft)

      if (timeLeft <= 0) {
        clearInterval(countdownInterval)
        setCountdown(null)
        setGameStatus('betting-closed')
        
        // Brief delay then start flying
        setTimeout(() => {
          startMultiplierGrowth()
        }, 1000)
      }
    }, 1000)

    intervalRef.current = countdownInterval
  }, [gameConfig.bettingWindow])

  /**
   * Start multiplier growth animation
   */
  const startMultiplierGrowth = useCallback(() => {
    if (!crashPoint) return

    setGameStatus('flying')
    const startTime = Date.now()
    setRoundStartTime(startTime)
    
    const duration = calculateRoundDuration(crashPoint)
    const growthRate = Math.log(crashPoint) / duration

    const animate = () => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      
      if (elapsed >= duration) {
        // Crash!
        setCurrentMultiplier(crashPoint)
        setGameStatus('crashed')
        finishRound(false, null)
        return
      }

      // Calculate exponential multiplier growth
      const multiplier = Math.min(Math.exp(growthRate * elapsed), crashPoint)
      setCurrentMultiplier(Math.round(multiplier * 100) / 100)
      
      // Update multiplier curve
      const point: MultiplierPoint = {
        time: Math.round(elapsed * 1000),
        multiplier: Math.round(multiplier * 100) / 100,
        elapsedSeconds: Math.round(elapsed * 10) / 10
      }
      
      setMultiplierCurve((prev: MultiplierPoint[]) => [...prev, point])

      // Check auto-cashout
      if (gameState?.autoCashoutEnabled && gameState.autoCashoutTarget && 
          multiplier >= gameState.autoCashoutTarget && !playerCashedOut) {
        handleCashOut()
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
  }, [crashPoint, gameState, playerCashedOut])

  /**
   * Calculate round duration based on crash point
   */
  const calculateRoundDuration = (crashPoint: number): number => {
    const minDuration = 3 // 3 seconds minimum
    const maxDuration = 30 // 30 seconds maximum
    const scaleFactor = 8
    
    const duration = minDuration + (Math.log(crashPoint) * scaleFactor)
    return Math.min(Math.max(duration, minDuration), maxDuration)
  }

  /**
   * Handle player cash out
   */
  const handleCashOut = useCallback(async () => {
    if (!gameState || gameStatus !== 'flying' || playerCashedOut) return

    try {
      const cashOutAt = currentMultiplier
      const payout = gameState.betAmount ? gameState.betAmount * cashOutAt : 0
      
      setPlayerCashedOut(true)
      setCashOutMultiplier(cashOutAt)
      
      // Handle winnings through wallet store
      if (payout > 0) {
        await win(payout, gameState.gameId)
      }
      
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      finishRound(true, cashOutAt)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cash out')
    }
  }, [gameState, gameStatus, currentMultiplier, playerCashedOut, win])

  /**
   * Finish the current round
   */
  const finishRound = useCallback((cashed: boolean, cashOutAt: number | null) => {
    if (!gameState || !crashPoint) return

    // Clean up animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const finalMultiplier = cashOutAt || 0
    const payout = cashed && cashOutAt ? (gameState.betAmount || 0) * cashOutAt : 0

    // Create game result
    const result: CrashResult = {
      gameId: gameState.gameId,
      gameType: 'crash',
      playerId: gameState.playerId,
      betAmount: gameState.betAmount || 0,
      multiplier: finalMultiplier,
      payout,
      status: cashed ? 'win' : 'loss',
      timestamp: new Date(),
      seed: gameState.seed,
      nonce: gameState.nonce,
      config: gameConfig,
      finalState: {
        ...gameState,
        phase: 'crashed',
        currentMultiplier: crashPoint,
        playerStatus: cashed ? 'cashed-out' : 'crashed',
        crashPoint,
        elapsedTime: calculateRoundDuration(crashPoint)
      },
      crashPoint,
      roundDuration: calculateRoundDuration(crashPoint),
      playerCashedOut: cashed,
      totalRoundPlayers: 1,
      playersWhoWon: cashed ? 1 : 0,
      playersWhoLost: cashed ? 0 : 1,
      averageWinMultiplier: finalMultiplier,
      biggestWin: payout,
      multiplierCurve
    }

    // Add cashOutMultiplier if player cashed out
    if (cashed && cashOutAt) {
      (result as any).cashOutMultiplier = cashOutAt
    }

    setGameHistory((prev: CrashResult[]) => [...prev, result])
    onGameResult?.(result)
    setGameStatus('finished')

    // Auto-start next round after delay
    setTimeout(() => {
      setGameStatus('idle')
    }, 3000)

  }, [gameState, crashPoint, gameConfig, multiplierCurve, onGameResult])

  /**
   * Start new game
   */
  const handleNewGame = useCallback(() => {
    // Clean up any running animations/intervals
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setGameState(null)
    setGameStatus('idle')
    setError(null)
    setCurrentMultiplier(1.00)
    setMultiplierCurve([])
    setCrashPoint(null)
    setRoundStartTime(null)
    setCountdown(null)
    setPlayerCashedOut(false)
    setCashOutMultiplier(null)
  }, [])

  /**
   * Update game configuration
   */
  const handleConfigChange = useCallback((newConfig: Partial<CrashConfig>) => {
    setGameConfig((prev: CrashConfig) => ({ ...prev, ...newConfig }))
  }, [])

  /**
   * Update bet amount
   */
  const handleBetChange = useCallback((newBet: number) => {
    setCurrentBet(newBet)
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Determine UI state
  const canPlaceBet = gameStatus === 'idle' && isAuthenticated
  const canCashOut = gameStatus === 'flying' && !playerCashedOut
  const isGameActive = gameStatus === 'flying' || gameStatus === 'waiting' || gameStatus === 'betting-closed'

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
        {/* Game Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Crash Game</h2>
                {gameStatus === 'loading' && <Spinner size="sm" />}
                {countdown && (
                  <div className="text-lg font-semibold text-warning">
                    Betting closes in {countdown}s
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-default-500">Round #{gameState?.roundNumber || '-'}</div>
                {isGameActive && (
                  <div className="text-2xl font-bold">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody className="flex-1">
              <div className="h-96">
                <CrashChart
                  multiplierCurve={multiplierCurve}
                  currentMultiplier={currentMultiplier}
                  crashPoint={gameStatus === 'crashed' || gameStatus === 'finished' ? crashPoint : null}
                  playerCashedOut={playerCashedOut}
                  cashOutMultiplier={cashOutMultiplier}
                  gameStatus={gameStatus}
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-center gap-4 pt-4">
                {!isGameActive ? (
                  <Button
                    color="primary"
                    size="lg"
                    className="px-12 py-3 text-lg font-bold"
                    onPress={initializeGame}
                    isDisabled={gameStatus === 'loading' || !isAuthenticated || (isAuthenticated && !canAfford(currentBet))}
                    isLoading={gameStatus === 'loading'}
                  >
                    {!isAuthenticated 
                      ? 'Login to Play' 
                      : `Place Bet ($${currentBet.toFixed(2)})`
                    }
                  </Button>
                ) : (
                  <Button
                    color="success"
                    size="lg"
                    className="px-12 py-3 text-lg font-bold"
                    onPress={handleCashOut}
                    isDisabled={!canCashOut}
                  >
                    {playerCashedOut 
                      ? `Cashed Out @ ${cashOutMultiplier?.toFixed(2)}x`
                      : gameStatus === 'waiting' 
                        ? 'Waiting for Round...'
                        : `Cash Out @ ${currentMultiplier.toFixed(2)}x`
                    }
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Controls and History */}
        <div className="space-y-6">
          <CrashControls
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
            canPlaceBet={canPlaceBet}
            canCashOut={canCashOut}
          />

          <CrashHistory
            gameHistory={gameHistory}
            currentBalance={balance}
            currentGame={gameState}
          />
        </div>
      </div>
    </div>
  )
}