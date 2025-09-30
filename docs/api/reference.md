# 🚀 API Reference Documentation

**Gaming Platform - Complete REST API Reference**

This document provides comprehensive documentation for all REST API endpoints, WebSocket connections, and integration patterns for the gaming platform.

## 📋 API Overview

### Base URLs
- **Development**: `http://localhost:3001`
- **Staging**: `https://api-staging.your-domain.com`
- **Production**: `https://api.your-domain.com`

### API Versioning
- **Current Version**: `v1`
- **Version Header**: `X-API-Version: v1`
- **URL Prefix**: `/api/v1`

### Authentication
- **Method**: JWT Bearer Tokens
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 15 minutes (configurable)
- **Refresh Token**: 7 days (configurable)

## 🔐 Authentication Endpoints

### POST /api/v1/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "player123",
  "email": "player@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123",
  "acceptTerms": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "username": "player123",
      "email": "player@example.com",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2025-09-21T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses:**
```json
// 400 - Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}

// 422 - Password Requirements
{
  "success": false,
  "message": "Password does not meet requirements",
  "requirements": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true
  }
}
```

### POST /api/v1/auth/login
Authenticate user and obtain JWT tokens.

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "SecurePassword123",
  "rememberMe": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "username": "player123",
      "email": "player@example.com",
      "balance": "1000.00",
      "level": 5,
      "experiencePoints": 2500,
      "lastLoginAt": "2025-09-21T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

### POST /api/v1/auth/refresh
Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

### POST /api/v1/auth/logout
Logout user and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /api/v1/auth/profile
Get current user profile information.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "username": "player123",
      "email": "player@example.com",
      "balance": "1000.00",
      "level": 5,
      "experiencePoints": 2500,
      "avatar": "https://cdn.example.com/avatars/uuid.jpg",
      "stats": {
        "totalBets": 150,
        "totalWagered": "15000.00",
        "totalWon": "14500.00",
        "netProfit": "-500.00",
        "biggestWin": "2500.00",
        "currentStreak": 3
      },
      "preferences": {
        "theme": "dark",
        "soundEnabled": true,
        "animationsEnabled": true,
        "language": "en-US"
      }
    }
  }
}
```

## 💰 Wallet & Transaction Endpoints

### GET /api/v1/wallet/balance
Get current wallet balance.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": "1000.00",
    "currency": "USD",
    "lastUpdated": "2025-09-21T12:00:00Z"
  }
}
```

### GET /api/v1/wallet/transactions
Get transaction history with pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `type`: Filter by type (`bet`, `win`, `deposit`, `withdrawal`)
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)

**Example:** `GET /api/v1/wallet/transactions?page=1&limit=20&type=bet`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid-here",
        "type": "bet",
        "amount": "-10.00",
        "balanceAfter": "990.00",
        "description": "Mines game bet",
        "gameSession": "uuid-here",
        "createdAt": "2025-09-21T12:00:00Z"
      },
      {
        "id": "uuid-here",
        "type": "win",
        "amount": "25.00",
        "balanceAfter": "1015.00",
        "description": "Mines game win (2.5x multiplier)",
        "gameSession": "uuid-here",
        "createdAt": "2025-09-21T11:58:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/v1/wallet/deposit
Create a deposit request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": "100.00",
  "paymentMethod": "stripe",
  "paymentDetails": {
    "cardToken": "tok_xxxxxxxxxx"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Deposit initiated",
  "data": {
    "depositId": "uuid-here",
    "amount": "100.00",
    "fees": "0.00",
    "total": "100.00",
    "status": "processing",
    "paymentIntentId": "pi_xxxxxxxxxx",
    "createdAt": "2025-09-21T12:00:00Z"
  }
}
```

### POST /api/v1/wallet/withdraw
Create a withdrawal request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": "500.00",
  "withdrawalMethod": "bank_transfer",
  "bankDetails": {
    "accountNumber": "1234567890",
    "routingNumber": "123456789",
    "accountName": "John Doe"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Withdrawal request submitted",
  "data": {
    "withdrawalId": "uuid-here",
    "amount": "500.00",
    "fees": "12.50",
    "total": "487.50",
    "status": "pending",
    "estimatedProcessingTime": "1-3 business days",
    "createdAt": "2025-09-21T12:00:00Z"
  }
}
```

## 🎮 Game Management Endpoints

### GET /api/v1/games
Get list of available games with metadata.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "mines",
        "name": "Mines",
        "description": "Classic minesweeper-style casino game",
        "category": "skill",
        "rtp": 97.0,
        "minBet": "0.01",
        "maxBet": "1000.00",
        "maxWin": "100000.00",
        "isActive": true,
        "thumbnail": "https://cdn.example.com/games/mines.jpg",
        "features": ["provably_fair", "auto_play", "statistics"]
      },
      {
        "id": "sugar-rush",
        "name": "Sugar Rush",
        "description": "Sweet cascade slot with cluster pays",
        "category": "slots",
        "rtp": 96.5,
        "minBet": "0.01",
        "maxBet": "1000.00",
        "maxWin": "100000.00",
        "isActive": true,
        "thumbnail": "https://cdn.example.com/games/sugar-rush.jpg",
        "features": ["cascades", "multipliers", "free_spins"]
      }
    ]
  }
}
```

### POST /api/v1/games/{gameId}/sessions
Start a new game session.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `gameId`: Game identifier (`mines`, `sugar-rush`, `bars`, `dragon-tower`, `crash`, `limbo`)

**Request Body (Example - Mines):**
```json
{
  "betAmount": "10.00",
  "config": {
    "gridSize": "5x5",
    "mineCount": 5
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Game session started",
  "data": {
    "sessionId": "uuid-here",
    "gameId": "mines",
    "betAmount": "10.00",
    "status": "active",
    "gameState": {
      "grid": "5x5",
      "mineCount": 5,
      "revealedCount": 0,
      "currentMultiplier": "1.00",
      "canCashOut": false
    },
    "provablyFair": {
      "serverSeed": "hashed-server-seed",
      "clientSeed": "client-provided-seed",
      "nonce": 1
    },
    "createdAt": "2025-09-21T12:00:00Z"
  }
}
```

### PUT /api/v1/games/sessions/{sessionId}/action
Perform an action in an active game session.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**
- `sessionId`: Game session identifier

**Request Body (Example - Mines Tile Reveal):**
```json
{
  "action": "reveal",
  "params": {
    "position": {
      "row": 2,
      "col": 3
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-here",
    "action": "reveal",
    "result": {
      "success": true,
      "revealed": "safe",
      "newMultiplier": "1.20",
      "canCashOut": true,
      "gameComplete": false
    },
    "gameState": {
      "revealedCount": 1,
      "currentMultiplier": "1.20",
      "safePositions": [{"row": 2, "col": 3}],
      "canCashOut": true
    }
  }
}
```

### POST /api/v1/games/sessions/{sessionId}/cashout
Cash out from an active game session.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully cashed out",
  "data": {
    "sessionId": "uuid-here",
    "finalMultiplier": "1.20",
    "betAmount": "10.00",
    "winAmount": "12.00",
    "profit": "2.00",
    "status": "completed",
    "completedAt": "2025-09-21T12:05:00Z"
  }
}
```

### GET /api/v1/games/sessions/{sessionId}/history
Get detailed game session history.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid-here",
      "gameId": "mines",
      "betAmount": "10.00",
      "finalMultiplier": "1.20",
      "winAmount": "12.00",
      "status": "completed",
      "duration": 45000,
      "actions": [
        {
          "action": "reveal",
          "params": {"row": 2, "col": 3},
          "result": "safe",
          "multiplier": "1.20",
          "timestamp": "2025-09-21T12:01:00Z"
        }
      ],
      "provablyFair": {
        "serverSeed": "revealed-server-seed",
        "clientSeed": "client-provided-seed",
        "nonce": 1,
        "hash": "verification-hash"
      }
    }
  }
}
```

## 📊 Statistics & Leaderboards

### GET /api/v1/stats/user
Get current user's game statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `gameId`: Filter by specific game (optional)
- `period`: Time period (`day`, `week`, `month`, `all`) (default: `all`)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalBets": 150,
      "totalWagered": "15000.00",
      "totalWon": "14500.00",
      "netProfit": "-500.00",
      "biggestWin": "2500.00",
      "winRate": 48.67,
      "avgBetAmount": "100.00",
      "currentStreak": 3,
      "longestWinStreak": 8,
      "longestLossStreak": 5
    },
    "byGame": {
      "mines": {
        "totalBets": 75,
        "totalWagered": "7500.00",
        "totalWon": "7200.00",
        "winRate": 52.0,
        "avgMultiplier": "1.96",
        "biggestWin": "1250.00"
      },
      "sugar-rush": {
        "totalBets": 50,
        "totalWagered": "5000.00",
        "totalWon": "4800.00",
        "winRate": 44.0,
        "avgMultiplier": "2.35",
        "biggestWin": "2500.00"
      }
    }
  }
}
```

### GET /api/v1/leaderboards
Get global leaderboards.

**Query Parameters:**
- `type`: Leaderboard type (`profit`, `wagered`, `biggest_win`, `win_streak`)
- `period`: Time period (`day`, `week`, `month`, `all`) (default: `week`)
- `gameId`: Filter by specific game (optional)
- `limit`: Number of entries (default: 50, max: 100)

**Example:** `GET /api/v1/leaderboards?type=profit&period=week&limit=10`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "leaderboard": {
      "type": "profit",
      "period": "week",
      "entries": [
        {
          "rank": 1,
          "user": {
            "id": "uuid-here",
            "username": "HighRoller123",
            "avatar": "https://cdn.example.com/avatars/user1.jpg",
            "level": 15
          },
          "value": "5000.00",
          "gamesPlayed": 200,
          "winRate": 55.5
        },
        {
          "rank": 2,
          "user": {
            "id": "uuid-here",
            "username": "LuckyPlayer",
            "avatar": "https://cdn.example.com/avatars/user2.jpg",
            "level": 12
          },
          "value": "4500.00",
          "gamesPlayed": 180,
          "winRate": 52.8
        }
      ],
      "userPosition": {
        "rank": 25,
        "value": "150.00"
      }
    },
    "updatedAt": "2025-09-21T12:00:00Z"
  }
}
```

## 🌐 WebSocket API

### Connection
**URL:** `wss://api.your-domain.com/ws`
**Authentication:** Query parameter `?token=<jwt_token>`

### Connection Example
```javascript
const ws = new WebSocket('wss://api.your-domain.com/ws?token=' + accessToken);

ws.onopen = function() {
    console.log('Connected to gaming platform WebSocket');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    handleMessage(data);
};
```

### Message Format
All WebSocket messages follow this structure:
```json
{
  "type": "message_type",
  "data": {},
  "timestamp": "2025-09-21T12:00:00Z",
  "requestId": "optional-correlation-id"
}
```

### Game Events
```json
// Game session started
{
  "type": "game_session_started",
  "data": {
    "sessionId": "uuid-here",
    "gameId": "mines",
    "betAmount": "10.00"
  }
}

// Game action result
{
  "type": "game_action_result",
  "data": {
    "sessionId": "uuid-here",
    "action": "reveal",
    "result": {
      "success": true,
      "multiplier": "1.20"
    }
  }
}

// Game session completed
{
  "type": "game_session_completed",
  "data": {
    "sessionId": "uuid-here",
    "winAmount": "12.00",
    "profit": "2.00"
  }
}
```

### Real-time Updates
```json
// Balance updated
{
  "type": "balance_updated",
  "data": {
    "newBalance": "1012.00",
    "change": "+2.00",
    "reason": "game_win"
  }
}

// Leaderboard position changed
{
  "type": "leaderboard_update",
  "data": {
    "type": "profit",
    "newRank": 23,
    "previousRank": 25
  }
}
```

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "field": "fieldName"
  },
  "requestId": "uuid-here"
}
```

### Common Error Codes
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: JWT token is invalid or malformed
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_FAILED`: Request validation failed
- `INSUFFICIENT_BALANCE`: User has insufficient balance
- `GAME_SESSION_NOT_FOUND`: Game session does not exist
- `GAME_SESSION_EXPIRED`: Game session has expired
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `MAINTENANCE_MODE`: System is in maintenance mode

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

## 📋 Rate Limiting

### Default Limits
- **General API**: 1000 requests per 15 minutes
- **Authentication**: 5 login attempts per 15 minutes
- **Registration**: 3 attempts per 15 minutes
- **Game Actions**: 100 actions per minute
- **Wallet Operations**: 10 operations per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1632150000
X-RateLimit-Window: 900
```

## 🔐 Security Headers

### Required Headers
- `Authorization`: Bearer token for authenticated endpoints
- `Content-Type`: `application/json` for POST/PUT requests
- `X-Request-ID`: Unique request identifier (recommended)
- `User-Agent`: Client identification

### Response Headers
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `SAMEORIGIN`
- `X-XSS-Protection`: `1; mode=block`
- `Strict-Transport-Security`: HSTS header

## 📊 API Health & Status

### GET /api/health
Health check endpoint (no authentication required).

**Success Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-21T12:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  }
}
```

### GET /api/status
Detailed system status (admin only).

**Headers:** `Authorization: Bearer <admin_token>`

**Success Response (200):**
```json
{
  "system": {
    "status": "operational",
    "version": "1.0.0",
    "environment": "production",
    "uptime": 86400,
    "lastDeployment": "2025-09-21T10:00:00Z"
  },
  "metrics": {
    "activeUsers": 1250,
    "activeSessions": 450,
    "requestsPerMinute": 2500,
    "averageResponseTime": 85,
    "errorRate": 0.01
  }
}
```

---

**Next Steps:**
- Review [Integration Guide](./integration.md)
- Set up [WebSocket Integration](./websocket.md)
- Configure [Security Best Practices](../security/setup.md)