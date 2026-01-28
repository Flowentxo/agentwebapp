/**
 * REVOLUTIONARY SOUND ENGINE
 *
 * Haptic-like feedback through sound.
 * Every interaction has a voice.
 */

type SoundType = 'click' | 'hover' | 'success' | 'error' | 'agent-select' | 'agent-speak' | 'transition';

interface SoundConfig {
  volume: number;
  pitch?: number;
  duration?: number;
}

class SoundEngine {
  private context: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Enable/disable sound
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Set global volume (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play a synthesized sound
   */
  private playTone(frequency: number, config: SoundConfig = { volume: 0.3, duration: 0.1 }) {
    if (!this.enabled || !this.context) return;

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const volume = (config.volume || 0.3) * this.volume;
    const duration = config.duration || 0.1;

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  /**
   * Play click sound
   */
  click() {
    this.playTone(800, { volume: 0.2, duration: 0.05 });
  }

  /**
   * Play hover sound
   */
  hover() {
    this.playTone(600, { volume: 0.1, duration: 0.03 });
  }

  /**
   * Play success sound
   */
  success() {
    setTimeout(() => this.playTone(523.25, { volume: 0.3, duration: 0.1 }), 0); // C
    setTimeout(() => this.playTone(659.25, { volume: 0.3, duration: 0.1 }), 100); // E
    setTimeout(() => this.playTone(783.99, { volume: 0.3, duration: 0.15 }), 200); // G
  }

  /**
   * Play error sound
   */
  error() {
    this.playTone(200, { volume: 0.4, duration: 0.2 });
  }

  /**
   * Play agent selection sound
   */
  agentSelect() {
    setTimeout(() => this.playTone(440, { volume: 0.25, duration: 0.08 }), 0); // A
    setTimeout(() => this.playTone(554.37, { volume: 0.25, duration: 0.08 }), 80); // C#
    setTimeout(() => this.playTone(659.25, { volume: 0.3, duration: 0.12 }), 160); // E
  }

  /**
   * Play agent speaking sound (subtle pulse)
   */
  agentSpeak() {
    this.playTone(330, { volume: 0.15, duration: 0.05 });
  }

  /**
   * Play transition sound
   */
  transition() {
    this.playTone(440, { volume: 0.2, duration: 0.15 });
    setTimeout(() => this.playTone(880, { volume: 0.2, duration: 0.15 }), 150);
  }

  /**
   * Play agent-specific sound based on personality
   */
  playAgentSound(agentId: string, type: 'select' | 'speak' | 'action' = 'select') {
    // Different frequencies for different agents
    const frequencies: Record<string, number> = {
      dexter: 523.25,  // C (analytical, precise)
      cassie: 659.25,  // E (warm, friendly)
      emmie: 783.99,   // G (visionary, high)
      aura: 440,       // A (commanding)
      nova: 880,       // A (octave up, mystical)
      kai: 493.88,     // B (wise, calming)
      lex: 392,        // G (authoritative, lower)
      finn: 587.33,    // D (strategic)
      ari: 739.99,     // F# (adaptive, fluid)
      echo: 329.63,    // E (resonant, lower)
      vera: 698.46,    // F (clear, visual)
      omni: 261.63     // C (low, watchful)
    };

    const frequency = frequencies[agentId] || 440;

    if (type === 'select') {
      this.playTone(frequency, { volume: 0.3, duration: 0.15 });
    } else if (type === 'speak') {
      this.playTone(frequency, { volume: 0.1, duration: 0.05 });
    } else if (type === 'action') {
      this.playTone(frequency, { volume: 0.25, duration: 0.1 });
      setTimeout(() => this.playTone(frequency * 1.5, { volume: 0.25, duration: 0.1 }), 100);
    }
  }
}

// Singleton instance
export const soundEngine = new SoundEngine();

/**
 * React hook for sound effects
 */
export function useSoundEffects() {
  return {
    playClick: () => soundEngine.click(),
    playHover: () => soundEngine.hover(),
    playSuccess: () => soundEngine.success(),
    playError: () => soundEngine.error(),
    playAgentSelect: () => soundEngine.agentSelect(),
    playAgentSpeak: () => soundEngine.agentSpeak(),
    playTransition: () => soundEngine.transition(),
    playAgentSound: (agentId: string, type?: 'select' | 'speak' | 'action') =>
      soundEngine.playAgentSound(agentId, type),
    setEnabled: (enabled: boolean) => soundEngine.setEnabled(enabled),
    setVolume: (volume: number) => soundEngine.setVolume(volume)
  };
}
