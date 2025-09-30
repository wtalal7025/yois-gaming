/**
 * Main Homepage - Gaming Platform Lobby
 * Shows the complete gaming experience with all available games
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button, Card, CardBody, Divider } from '@heroui/react'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'
import { HeroSection } from '../components/home/HeroSection'
import { GamesLobby } from './games/GamesLobby'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'

/**
 * Main Homepage Component
 * Reason: Provides complete gaming platform experience with lobby integration
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-default-50">
      {/* Header Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <HeroSection />
      </section>

      <Divider className="bg-gradient-to-r from-transparent via-default-300 to-transparent my-8" />

      {/* Quick Access Section */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-orbitron">
            Ready to Play?
          </h2>
          <p className="text-lg text-foreground-600 max-w-2xl mx-auto">
            Jump straight into the action with our most popular games or explore our complete game library below.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/games">
              <Button
                color="primary"
                size="lg"
                endContent={<ArrowRightIcon className="w-5 h-5" />}
                className="font-semibold"
              >
                Browse All Games
              </Button>
            </Link>
            
            <Link href="/games/mines">
              <Button
                variant="bordered"
                size="lg"
                startContent={<PlayIcon className="w-5 h-5" />}
                className="font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Play Mines
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Platform Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardBody className="text-center p-6">
              <div className="text-3xl mb-2">🎮</div>
              <h3 className="text-xl font-bold text-foreground mb-1">6 Games</h3>
              <p className="text-foreground-600 text-sm">Available Now</p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardBody className="text-center p-6">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-xl font-bold text-foreground mb-1">Instant Play</h3>
              <p className="text-foreground-600 text-sm">No Downloads Required</p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardBody className="text-center p-6">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="text-xl font-bold text-foreground mb-1">100% Fair</h3>
              <p className="text-foreground-600 text-sm">Provably Fair Gaming</p>
            </CardBody>
          </Card>
        </motion.div>
      </section>

      {/* Games Lobby Section */}
      <section className="bg-default-50/50">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <GamesLobby />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}