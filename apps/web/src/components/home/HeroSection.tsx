'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button, Card, CardBody, Chip } from '@heroui/react'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

// Animated background elements
const FloatingCard = ({ delay = 0, className = "" }: { delay?: number, className?: string }) => (
  <motion.div
    className={`absolute w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl backdrop-blur-sm border border-primary/30 ${className}`}
    animate={{
      y: [-20, 20, -20],
      rotate: [0, 5, -5, 0],
      scale: [1, 1.05, 1]
    }}
    transition={{
      duration: 6,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
)

const FloatingIcon = ({ 
  icon, 
  delay = 0, 
  className = "" 
}: { 
  icon: string, 
  delay?: number, 
  className?: string 
}) => (
  <motion.div
    className={`absolute text-4xl ${className}`}
    animate={{
      y: [-15, 15, -15],
      x: [-5, 5, -5],
      rotate: [0, 10, -10, 0]
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    {icon}
  </motion.div>
)

// Game preview cards
const gamePreviewData = [
  { name: 'Sugar Rush', icon: '🍭', color: 'from-pink-500 to-purple-500' },
  { name: 'Mines', icon: '💣', color: 'from-orange-500 to-red-500' },
  { name: 'Dragon Tower', icon: '🐉', color: 'from-green-500 to-blue-500' }
]

export function HeroSection() {
  const { user } = useAuthStore()
  const { openModal } = useUIStore()

  const handleGetStarted = () => {
    if (user) {
      // Redirect to games lobby
      window.location.href = '/games'
    } else {
      openModal('register')
    }
  }

  const handlePlayNow = () => {
    if (user) {
      // Redirect to most popular game
      window.location.href = '/games/sugar-rush'
    } else {
      openModal('login')
    }
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating geometric elements */}
        <FloatingCard delay={0} className="top-1/4 left-[10%] opacity-60" />
        <FloatingCard delay={1} className="top-1/3 right-[15%] opacity-40" />
        <FloatingCard delay={2} className="bottom-1/4 left-[20%] opacity-50" />
        <FloatingCard delay={3} className="bottom-1/3 right-[10%] opacity-30" />

        {/* Floating game icons */}
        <FloatingIcon icon="🎰" delay={0.5} className="top-[20%] left-[5%] opacity-20" />
        <FloatingIcon icon="🎲" delay={1.5} className="top-[60%] right-[8%] opacity-25" />
        <FloatingIcon icon="🚀" delay={2.5} className="bottom-[30%] left-[12%] opacity-20" />
        <FloatingIcon icon="💎" delay={3.5} className="top-[45%] right-[20%] opacity-15" />

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Hero Content */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Chip
                color="primary"
                variant="bordered"
                className="mb-4 bg-primary/10 border-primary/30"
              >
                🎉 Now Live - Provably Fair Gaming
              </Chip>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="gradient-text">Win Big</span>
                <br />
                <span className="text-foreground">Play Fair</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-lg">
                Experience the thrill of provably fair gaming with our collection of exciting games. 
                Every bet is transparent, every win is guaranteed.
              </p>
            </motion.div>

            {/* Statistics */}
            <motion.div
              className="grid grid-cols-3 gap-6 py-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">2.4M+</div>
                <div className="text-sm text-muted-foreground">Games Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">$1.8M</div>
                <div className="text-sm text-muted-foreground">Total Winnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">50k+</div>
                <div className="text-sm text-muted-foreground">Active Players</div>
              </div>
            </motion.div>

            {/* Call-to-Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Button
                color="primary"
                size="lg"
                className="h-14 px-8 text-lg font-semibold shadow-glow hover:scale-105 transition-all duration-300"
                onPress={handleGetStarted}
              >
                {user ? 'Explore Games' : 'Get Started Free'}
                <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </Button>
              
              <Button
                variant="bordered"
                size="lg"
                className="h-14 px-8 text-lg font-semibold border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300"
                onPress={handlePlayNow}
              >
                {user ? 'Play Now' : 'Watch Demo'}
                <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                </svg>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              className="flex items-center space-x-6 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                </svg>
                <span className="text-sm text-muted-foreground">Provably Fair</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm text-muted-foreground">Instant Payouts</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-sm text-muted-foreground">24/7 Support</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Game Previews */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
              {gamePreviewData.map((game, index) => (
                <motion.div
                  key={game.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.2 }}
                >
                  <Card 
                    className="bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 cursor-pointer group"
                    isPressable
                    onPress={() => window.location.href = `/games/${game.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <CardBody className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                          {game.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {game.name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            Join thousands playing now
                          </p>
                          <div className="flex items-center mt-2 space-x-4">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                              <span className="text-xs text-success">
                                {Math.floor(Math.random() * 1000) + 100} playing
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-warning" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              <span className="text-xs text-muted-foreground">Hot</span>
                            </div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
                        </svg>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}

              {/* View All Games Link */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="text-center"
              >
                <Button
                  variant="light"
                  className="text-primary hover:text-primary-400"
                  onPress={() => window.location.href = '/games'}
                >
                  View All 6 Games
                  <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
                  </svg>
                </Button>
              </motion.div>
            </div>

            {/* Floating elements around game cards */}
            <motion.div
              className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-4 -left-4 w-6 h-6 bg-secondary/20 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}