/**
 * Shared constants module
 * Contains application-wide constant values
 */

/**
 * Game configuration constants
 */
export const GAME_CONSTANTS = {
  MIN_BET: 0.01,
  MAX_BET: 1000.00,
  DEFAULT_HOUSE_EDGE: 0.01, // 1%
  MAX_PAYOUT_MULTIPLIER: 10000,
} as const;

/**
 * API configuration constants
 */
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

/**
 * Socket.IO configuration constants
 */
export const SOCKET_CONSTANTS = {
  PING_TIMEOUT: 60000, // 60 seconds
  PING_INTERVAL: 25000, // 25 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000, // 1 second
} as const;

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
} as const;

/**
 * Crash game specific constants
 */
export const CRASH_CONSTANTS = {
  MIN_BET: 0.01,
  MAX_BET: 10000,
  MIN_MULTIPLIER: 1.01,
  MAX_MULTIPLIER: 1000000,
  MIN_CRASH_POINT: 1.0,
  MAX_CRASH_POINT: 1000000,
  DEFAULT_HOUSE_EDGE: 0.01,
  BETTING_WINDOW: 12, // seconds
  MAX_ROUND_DURATION: 60, // seconds
  GROWTH_RATE: 0.00006, // Controls multiplier growth speed
  MIN_AUTO_CASHOUT: 1.01,
  MAX_AUTO_CASHOUT: 100,
  DEFAULT_AUTO_CASHOUT: 2.0,
  AUTO_PLAY: {
    MAX_ROUNDS: 1000,
    MIN_ROUNDS: 1,
    DEFAULT_ROUNDS: 10,
  },
} as const;

/**
 * Limbo game specific constants
 */
export const LIMBO_CONSTANTS = {
  MIN_BET: 0.01,
  MAX_BET: 10000,
  MIN_TARGET_MULTIPLIER: 1.01,
  MAX_TARGET_MULTIPLIER: 1000000,
  DEFAULT_HOUSE_EDGE: 0.01, // 1%
  MULTIPLIER_PRECISION: 2, // Decimal places
  
  // Quick presets for multiplier selection
  QUICK_PRESETS: [2.00, 5.00, 10.00, 100.00, 1000.00],
  
  // Auto-betting configuration
  AUTO_BETTING: {
    MIN_BETS: 1,
    MAX_BETS: 1000,
    DEFAULT_BETS: 10,
    MIN_SPEED: 500,   // Minimum delay between bets (ms)
    MAX_SPEED: 3000,  // Maximum delay between bets (ms)
    DEFAULT_SPEED: 1000,
    MAX_INCREASE_PERCENTAGE: 100, // Maximum bet increase percentage
  },
  
  // UI and animation settings
  ROLL_ANIMATION_DURATION: 2000, // 2 seconds
  RESULT_REVEAL_DURATION: 500,   // 0.5 seconds
  CELEBRATION_DURATION: 1500,    // 1.5 seconds
  
  // Mathematical constants
  WIN_PROBABILITY_NUMERATOR: 99, // 99/target for win probability calculation
  BIG_WIN_THRESHOLD: 10.00,      // Default threshold for "big win"
} as const;