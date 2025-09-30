/**
 * Enhanced Win Celebrations and Feedback System
 * Provides spectacular celebration effects for game wins and achievements
 */

// Types for celebration effects
export interface CelebrationConfig {
  type: 'confetti' | 'fireworks' | 'sparkle' | 'coins' | 'custom';
  intensity: 'low' | 'medium' | 'high' | 'epic';
  duration: number;
  colors?: string[];
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  customParticles?: ParticleConfig[];
}

export interface ParticleConfig {
  emoji?: string;
  color?: string;
  size?: number;
  velocity?: { x: number; y: number };
  gravity?: number;
  rotation?: number;
  lifetime?: number;
}

export interface WinCelebrationConfig extends CelebrationConfig {
  winAmount?: number;
  multiplier?: number;
  gameType?: string;
  showWinAmount?: boolean;
  cascadeEffect?: boolean;
}

export interface AchievementConfig extends CelebrationConfig {
  title: string;
  description?: string;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * Particle System Engine
 */
class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private isActive = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.setupCanvas();
  }

  /**
   * Start particle system
   */
  start(container: HTMLElement): void {
    container.appendChild(this.canvas);
    this.isActive = true;
    this.animate();
  }

  /**
   * Stop particle system
   */
  stop(): void {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.particles = [];
  }

  /**
   * Add particles to system
   */
  addParticles(configs: ParticleConfig[], count: number, origin: { x: number; y: number }): void {
    for (let i = 0; i < count; i++) {
      const config = configs[Math.floor(Math.random() * configs.length)];
      const particle = new Particle(origin.x, origin.y, config);
      this.particles.push(particle);
    }
  }

  /**
   * Create confetti burst
   */
  createConfettiBurst(origin: { x: number; y: number }, intensity: number): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    const particleCount = intensity * 20;

    for (let i = 0; i < particleCount; i++) {
      const config: ParticleConfig = {
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        velocity: {
          x: (Math.random() - 0.5) * intensity * 8,
          y: Math.random() * -intensity * 4 - 2
        },
        gravity: 0.3,
        rotation: Math.random() * 360,
        lifetime: 3000 + Math.random() * 2000
      };
      
      const particle = new Particle(origin.x, origin.y, config);
      this.particles.push(particle);
    }
  }

  /**
   * Create fireworks effect
   */
  createFireworks(origin: { x: number; y: number }, intensity: number): void {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const burstCount = intensity + 1;

    for (let burst = 0; burst < burstCount; burst++) {
      setTimeout(() => {
        const particleCount = intensity * 15;
        const burstColors = colors.slice(0, 3 + intensity);

        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const speed = intensity * 3 + Math.random() * 2;

          const config: ParticleConfig = {
            color: burstColors[Math.floor(Math.random() * burstColors.length)],
            size: Math.random() * 4 + 2,
            velocity: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed
            },
            gravity: 0.1,
            lifetime: 2000 + Math.random() * 1000
          };

          const particle = new Particle(
            origin.x + (Math.random() - 0.5) * 50,
            origin.y + (Math.random() - 0.5) * 50,
            config
          );
          this.particles.push(particle);
        }
      }, burst * 200);
    }
  }

  /**
   * Create sparkle effect
   */
  createSparkles(origin: { x: number; y: number }, intensity: number): void {
    const particleCount = intensity * 30;
    
    for (let i = 0; i < particleCount; i++) {
      const config: ParticleConfig = {
        emoji: '✨',
        size: Math.random() * 6 + 2,
        velocity: {
          x: (Math.random() - 0.5) * intensity * 2,
          y: (Math.random() - 0.5) * intensity * 2
        },
        gravity: 0,
        rotation: Math.random() * 360,
        lifetime: 1500 + Math.random() * 1000
      };

      const particle = new Particle(
        origin.x + (Math.random() - 0.5) * 100,
        origin.y + (Math.random() - 0.5) * 100,
        config
      );
      this.particles.push(particle);
    }
  }

  /**
   * Create coin rain effect
   */
  createCoinRain(intensity: number): void {
    const coinCount = intensity * 25;
    
    for (let i = 0; i < coinCount; i++) {
      const config: ParticleConfig = {
        emoji: '🪙',
        size: Math.random() * 8 + 6,
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: Math.random() * 2 + 1
        },
        gravity: 0.2,
        rotation: Math.random() * 360,
        lifetime: 4000 + Math.random() * 2000
      };

      const particle = new Particle(
        Math.random() * this.canvas.width,
        -20,
        config
      );
      this.particles.push(particle);
    }
  }

  private setupCanvas(): void {
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private animate(): void {
    if (!this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    this.particles = this.particles.filter(particle => {
      particle.update();
      particle.draw(this.ctx);
      return !particle.isDead();
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

/**
 * Individual Particle Class
 */
class Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private gravity: number;
  private size: number;
  private color: string;
  private emoji: string;
  private rotation: number;
  private rotationSpeed: number;
  private lifetime: number;
  private age: number = 0;
  private opacity: number = 1;

  constructor(x: number, y: number, config: ParticleConfig) {
    this.x = x;
    this.y = y;
    this.vx = config.velocity?.x || 0;
    this.vy = config.velocity?.y || 0;
    this.gravity = config.gravity || 0;
    this.size = config.size || 4;
    this.color = config.color || '#ffffff';
    this.emoji = config.emoji || '';
    this.rotation = config.rotation || 0;
    this.rotationSpeed = (Math.random() - 0.5) * 5;
    this.lifetime = config.lifetime || 2000;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotationSpeed;
    this.age += 16; // Assuming 60fps

    // Fade out over lifetime
    this.opacity = Math.max(0, 1 - (this.age / this.lifetime));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);

    if (this.emoji) {
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }

  isDead(): boolean {
    return this.age >= this.lifetime;
  }
}

/**
 * Audio Effects Manager
 */
class AudioEffectsManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  /**
   * Play celebration sound
   */
  playCelebrationSound(type: string, intensity: number): void {
    if (!this.audioContext) return;

    switch (type) {
      case 'confetti':
        this.playPopSound(intensity);
        break;
      case 'fireworks':
        this.playExplosionSound(intensity);
        break;
      case 'coins':
        this.playCoinSound(intensity);
        break;
      case 'sparkle':
        this.playChimeSound(intensity);
        break;
    }
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not supported');
    }
  }

  private playPopSound(intensity: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(400 + intensity * 200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  private playExplosionSound(intensity: number): void {
    if (!this.audioContext) return;

    // Create noise
    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioContext.createBufferSource();
    whiteNoise.buffer = buffer;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(200 + intensity * 300, this.audioContext.currentTime);

    const gainNode = this.audioContext.createGain();

    whiteNoise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    whiteNoise.start(this.audioContext.currentTime);
    whiteNoise.stop(this.audioContext.currentTime + 0.5);
  }

  private playCoinSound(intensity: number): void {
    if (!this.audioContext) return;

    for (let i = 0; i < intensity + 1; i++) {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext!.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext!.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.2);

        oscillator.start(this.audioContext!.currentTime);
        oscillator.stop(this.audioContext!.currentTime + 0.2);
      }, i * 50);
    }
  }

  private playChimeSound(intensity: number): void {
    if (!this.audioContext) return;

    const frequencies = [523, 659, 784, 1047]; // C, E, G, C notes
    
    frequencies.slice(0, intensity + 1).forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.15, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.8);

        oscillator.start(this.audioContext!.currentTime);
        oscillator.stop(this.audioContext!.currentTime + 0.8);
      }, index * 100);
    });
  }
}

/**
 * Main Celebration Effects Manager
 */
export class CelebrationEffectsManager {
  private static instance: CelebrationEffectsManager;
  private particleSystem: ParticleSystem;
  private audioManager: AudioEffectsManager;
  private activeCelebrations = new Set<string>();

  private constructor() {
    this.particleSystem = new ParticleSystem();
    this.audioManager = new AudioEffectsManager();
  }

  static getInstance(): CelebrationEffectsManager {
    if (!CelebrationEffectsManager.instance) {
      CelebrationEffectsManager.instance = new CelebrationEffectsManager();
    }
    return CelebrationEffectsManager.instance;
  }

  /**
   * Trigger win celebration
   */
  async celebrateWin(config: WinCelebrationConfig): Promise<void> {
    const celebrationId = this.generateId();
    this.activeCelebrations.add(celebrationId);

    try {
      // Start particle system
      this.particleSystem.start(document.body);

      // Get intensity multiplier
      const intensityMap = { low: 1, medium: 2, high: 3, epic: 5 };
      const intensity = intensityMap[config.intensity] || 2;

      // Play sound effects
      if (config.soundEnabled) {
        this.audioManager.playCelebrationSound(config.type, intensity);
      }

      // Haptic feedback
      if (config.hapticEnabled && 'vibrate' in navigator) {
        const pattern = intensity === 5 ? [100, 50, 100, 50, 200] : [100, 50, 100];
        navigator.vibrate(pattern);
      }

      // Show win amount if specified
      if (config.showWinAmount && config.winAmount) {
        await this.showWinAmount(config.winAmount, config.multiplier);
      }

      // Create particle effects
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      switch (config.type) {
        case 'confetti':
          this.particleSystem.createConfettiBurst({ x: centerX, y: centerY }, intensity);
          if (config.cascadeEffect) {
            for (let i = 1; i <= 3; i++) {
              setTimeout(() => {
                this.particleSystem.createConfettiBurst(
                  { x: centerX + (Math.random() - 0.5) * 200, y: centerY },
                  intensity
                );
              }, i * 300);
            }
          }
          break;

        case 'fireworks':
          this.particleSystem.createFireworks({ x: centerX, y: centerY - 100 }, intensity);
          break;

        case 'sparkle':
          this.particleSystem.createSparkles({ x: centerX, y: centerY }, intensity);
          break;

        case 'coins':
          this.particleSystem.createCoinRain(intensity);
          break;

        case 'custom':
          if (config.customParticles) {
            this.particleSystem.addParticles(
              config.customParticles,
              intensity * 20,
              { x: centerX, y: centerY }
            );
          }
          break;
      }

      // Auto-stop after duration
      setTimeout(() => {
        this.stopCelebration(celebrationId);
      }, config.duration);

    } catch (error) {
      console.error('Celebration effect failed:', error);
      this.stopCelebration(celebrationId);
    }
  }

  /**
   * Trigger achievement celebration
   */
  async celebrateAchievement(config: AchievementConfig): Promise<void> {
    const achievementElement = this.createAchievementNotification(config);
    document.body.appendChild(achievementElement);

    // Animate achievement notification
    await this.animateAchievementNotification(achievementElement, config);

    // Trigger celebration effects
    await this.celebrateWin({
      type: config.type,
      intensity: this.getRarityIntensity(config.rarity || 'common'),
      duration: config.duration,
      soundEnabled: config.soundEnabled,
      hapticEnabled: config.hapticEnabled
    });

    // Remove notification after delay
    setTimeout(() => {
      if (achievementElement.parentElement) {
        achievementElement.remove();
      }
    }, 5000);
  }

  /**
   * Stop specific celebration
   */
  stopCelebration(celebrationId: string): void {
    if (this.activeCelebrations.has(celebrationId)) {
      this.activeCelebrations.delete(celebrationId);
      
      // Stop particle system if no active celebrations
      if (this.activeCelebrations.size === 0) {
        this.particleSystem.stop();
      }
    }
  }

  /**
   * Stop all celebrations
   */
  stopAllCelebrations(): void {
    this.activeCelebrations.clear();
    this.particleSystem.stop();
  }

  private async showWinAmount(amount: number, multiplier?: number): Promise<void> {
    const winElement = document.createElement('div');
    winElement.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #1a1a1a;
      padding: 24px 48px;
      border-radius: 16px;
      font-size: 48px;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10001;
      border: 4px solid #ffffff;
    `;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    winElement.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 8px;">🎉 BIG WIN! 🎉</div>
        <div>${formattedAmount}</div>
        ${multiplier ? `<div style="font-size: 24px; margin-top: 8px;">${multiplier}x Multiplier!</div>` : ''}
      </div>
    `;

    document.body.appendChild(winElement);

    // Animate win amount display
    const animation = winElement.animate([
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.1)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'forwards'
    });

    await new Promise(resolve => animation.addEventListener('finish', resolve));

    // Remove after delay
    setTimeout(() => {
      winElement.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 }
      ], {
        duration: 400,
        fill: 'forwards'
      }).addEventListener('finish', () => {
        winElement.remove();
      });
    }, 3000);
  }

  private createAchievementNotification(config: AchievementConfig): HTMLElement {
    const notification = document.createElement('div');
    const rarityColors = {
      common: '#10b981',
      rare: '#3b82f6',
      epic: '#8b5cf6',
      legendary: '#f59e0b'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, ${rarityColors[config.rarity || 'common']}, ${rarityColors[config.rarity || 'common']}aa);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 300px;
      transform: translateX(100%);
      border: 2px solid rgba(255,255,255,0.2);
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 32px;">${config.icon || '🏆'}</div>
        <div>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">
            ${config.title}
          </div>
          ${config.description ? `<div style="font-size: 14px; opacity: 0.9;">${config.description}</div>` : ''}
        </div>
      </div>
    `;

    return notification;
  }

  private async animateAchievementNotification(element: HTMLElement, config: AchievementConfig): Promise<void> {
    const slideIn = element.animate([
      { transform: 'translateX(100%)' },
      { transform: 'translateX(0)' }
    ], {
      duration: 500,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });

    await new Promise(resolve => slideIn.addEventListener('finish', resolve));

    // Add glow effect for higher rarities
    if (config.rarity === 'epic' || config.rarity === 'legendary') {
      element.style.animation = 'glow 2s ease-in-out infinite alternate';
      
      // Inject glow animation if not exists
      if (!document.querySelector('#achievement-glow-styles')) {
        const style = document.createElement('style');
        style.id = 'achievement-glow-styles';
        style.textContent = `
          @keyframes glow {
            from { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.1); }
            to { box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 30px rgba(255,255,255,0.3); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  private getRarityIntensity(rarity: string): 'low' | 'medium' | 'high' | 'epic' {
    const intensityMap = {
      common: 'low' as const,
      rare: 'medium' as const,
      epic: 'high' as const,
      legendary: 'epic' as const
    };
    return intensityMap[rarity as keyof typeof intensityMap] || 'low';
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export convenience functions
export const celebrations = CelebrationEffectsManager.getInstance();

export const celebrateWin = (config: WinCelebrationConfig) =>
  celebrations.celebrateWin(config);

export const celebrateAchievement = (config: AchievementConfig) =>
  celebrations.celebrateAchievement(config);

export const stopCelebrations = () =>
  celebrations.stopAllCelebrations();

// Preset celebration configs
export const CELEBRATION_PRESETS = {
  SMALL_WIN: {
    type: 'confetti' as const,
    intensity: 'low' as const,
    duration: 2000,
    soundEnabled: true,
    hapticEnabled: true
  },
  BIG_WIN: {
    type: 'fireworks' as const,
    intensity: 'high' as const,
    duration: 4000,
    soundEnabled: true,
    hapticEnabled: true,
    cascadeEffect: true
  },
  JACKPOT: {
    type: 'confetti' as const,
    intensity: 'epic' as const,
    duration: 6000,
    soundEnabled: true,
    hapticEnabled: true,
    cascadeEffect: true,
    showWinAmount: true
  }
};

// Default export
export default CelebrationEffectsManager;