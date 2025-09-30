'use client'

import * as React from 'react'
import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ModalRoot } from '../components/common/ModalRoot'

// Reason: Client component wrapper for all global providers
// This ensures proper hydration and theme management
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <HeroUIProvider>
        {children}
        {/* Reason: ModalRoot handles all global modals (auth, etc.) based on UI store state */}
        <ModalRoot />
      </HeroUIProvider>
    </NextThemesProvider>
  )
}