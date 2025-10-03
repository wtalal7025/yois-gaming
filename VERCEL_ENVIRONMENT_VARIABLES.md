# Vercel Environment Variables Setup Guide

## Overview
This document provides guidance on setting up environment variables in Vercel for the Yios Gaming Platform. These variables were temporarily removed from [`vercel.json`](vercel.json) to enable initial deployment without configuring all external services.

## Why Were Environment Variables Removed?
During initial deployment, Vercel was failing with the error:
```
Environment Variable 'NEXT_PUBLIC_APP_NAME' references Secret 'NEXT_PUBLIC_APP_NAME', which does not exist.
```

The environment variables in [`vercel.json`](vercel.json) were using Vercel's secret reference syntax (`@SECRET_NAME`) but the corresponding secrets hadn't been created yet in the Vercel project settings.

## Required Environment Variables

### 1. NEXT_PUBLIC_APP_NAME
**Purpose:** Application name displayed in the frontend UI
**Value:** `"Yios Bet Games"`
**How to set:** Vercel Dashboard → Project Settings → Environment Variables

### 2. NEXT_PUBLIC_API_BASE_URL  
**Purpose:** Base URL for API calls from the frontend
**Development Value:** `"http://localhost:3001/api"`
**Production Value:** `"https://your-backend-domain.com/api"` (Replace with actual backend URL)
**How to set:** Vercel Dashboard → Project Settings → Environment Variables

### 3. NEXT_PUBLIC_SOCKET_URL
**Purpose:** WebSocket connection URL for real-time gaming features
**Development Value:** `"http://localhost:3001"`
**Production Value:** `"https://your-backend-domain.com"` (Replace with actual backend URL)
**How to set:** Vercel Dashboard → Project Settings → Environment Variables

### 4. NEXT_PUBLIC_SUPABASE_URL
**Purpose:** Supabase project URL for database connections
**Production Value:** `"https://aafwiwiknehytaptptek.supabase.co"`
**How to set:** Vercel Dashboard → Project Settings → Environment Variables

### 5. NEXT_PUBLIC_SUPABASE_ANON_KEY
**Purpose:** Supabase anonymous key for client-side database access
**Production Value:** `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"`
**Security Note:** This is a public anonymous key and safe to expose in frontend code
**How to set:** Vercel Dashboard → Project Settings → Environment Variables

## How to Set Up Environment Variables in Vercel

### Method 1: Vercel Dashboard
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the appropriate values
4. Set the environment scope (Production, Preview, or Development)
5. Save the variables

### Method 2: Vercel CLI
```bash
# Set environment variables using Vercel CLI
vercel env add NEXT_PUBLIC_APP_NAME
vercel env add NEXT_PUBLIC_API_BASE_URL
vercel env add NEXT_PUBLIC_SOCKET_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Method 3: Update vercel.json (Future)
Once environment variables are set in Vercel Dashboard, you can add them back to [`vercel.json`](vercel.json):

```json
{
  "env": {
    "NEXT_PUBLIC_APP_NAME": "@NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_API_BASE_URL": "@NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_SOCKET_URL": "@NEXT_PUBLIC_SOCKET_URL", 
    "NEXT_PUBLIC_SUPABASE_URL": "@NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@NEXT_PUBLIC_SUPABASE_ANON_KEY"
  }
}
```

## Environment-Specific Values

### Development Environment
```bash
NEXT_PUBLIC_APP_NAME="Stake Games"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
NEXT_PUBLIC_SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"
```

### Production Environment  
```bash
NEXT_PUBLIC_APP_NAME="Yios Bet Games"
NEXT_PUBLIC_API_BASE_URL="https://yois.io/api"
NEXT_PUBLIC_SOCKET_URL="https://yois.io"
NEXT_PUBLIC_SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"
```

## Dependencies and Prerequisites

Before setting up these environment variables, ensure you have:

1. **Backend Deployment:** Your backend API must be deployed and accessible (for API_BASE_URL and SOCKET_URL)
2. **Supabase Project:** Active Supabase project with the correct URL and anonymous key
3. **Domain Configuration:** If using custom domains, ensure they're properly configured

## Security Notes

- **NEXT_PUBLIC_* variables are publicly accessible** in the frontend bundle
- Only use public/anonymous keys for NEXT_PUBLIC_ variables
- Keep sensitive server-side environment variables in your backend deployment (not in Vercel frontend)
- The Supabase anonymous key is safe to expose as it's designed for client-side use

## Deployment Status

✅ **Current Status:** Environment variables removed to enable initial deployment
⏳ **Next Steps:** Set up environment variables when backend deployment is ready
🔄 **Future:** Add variables back to [`vercel.json`](vercel.json) once configured

## Troubleshooting

### Common Issues
1. **"Secret does not exist" error:** Create the environment variable in Vercel Dashboard first
2. **API connection failures:** Ensure API_BASE_URL points to accessible backend
3. **WebSocket connection issues:** Verify SOCKET_URL matches your backend WebSocket server

### Testing Environment Variables
After setting up variables, you can test them in your Next.js app:

```javascript
console.log('App Name:', process.env.NEXT_PUBLIC_APP_NAME);
console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
console.log('Socket URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

---

**Last Updated:** October 2, 2025  
**Status:** Environment variables temporarily removed for initial deployment
**Next Action:** Configure variables in Vercel Dashboard when backend is ready