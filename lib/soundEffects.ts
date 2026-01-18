// Sound effect types
export type SoundType = 'whoosh' | 'suspense' | 'imposterReveal' | 'wordReveal';

// Sound effect manager using Web Audio API
class SoundEffectManagerClass {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  // Initialize audio context (must be called after user interaction)
  private ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Preload sounds (call after first user interaction)
  preload() {
    if (this.isInitialized) return;
    this.ensureContext();
    this.isInitialized = true;
  }

  // Play a sound effect
  play(sound: SoundType) {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    switch (sound) {
      case 'whoosh':
        this.playWhoosh(ctx);
        break;
      case 'suspense':
        this.playSuspense(ctx);
        break;
      case 'imposterReveal':
        this.playImposterReveal(ctx);
        break;
      case 'wordReveal':
        this.playWordReveal(ctx);
        break;
    }
  }

  // Quick swoosh sound - frequency sweep from high to low
  private playWhoosh(ctx: AudioContext) {
    const duration = 0.3;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const noiseGain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Add noise for texture
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      const progress = i / noiseData.length;
      noiseData[i] = (Math.random() * 2 - 1) * 0.15 * (1 - progress);
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + duration);
  }

  // Low pulsing suspense tone
  private playSuspense(ctx: AudioContext) {
    const duration = 1.5;
    const baseFreq = 80;
    const modFreq = 3;

    // Create oscillators for rich low tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = baseFreq;
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 1.5;
    osc3.type = 'sine';
    osc3.frequency.value = baseFreq * 2;

    lfo.type = 'sine';
    lfo.frequency.value = modFreq;
    lfoGain.gain.value = 0.15;

    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.25);
    masterGain.gain.setValueAtTime(0.25, ctx.currentTime + duration - 0.5);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    osc1.connect(masterGain);
    osc2.connect(masterGain);
    osc3.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc3.start(ctx.currentTime);
    lfo.start(ctx.currentTime);

    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
    osc3.stop(ctx.currentTime + duration);
    lfo.stop(ctx.currentTime + duration);
  }

  // Dramatic low stinger for imposter reveal
  private playImposterReveal(ctx: AudioContext) {
    const duration = 0.8;

    // Create minor chord oscillators
    const freq1 = 65;  // C2
    const freq2 = 78;  // D#2 (minor third)
    const freq3 = 98;  // G2

    const oscillators = [
      { freq: freq1, gain: 0.4 },
      { freq: freq2, gain: 0.32 },
      { freq: freq3, gain: 0.24 },
    ];

    const masterGain = ctx.createGain();
    const distortion = ctx.createWaveShaper();

    // Distortion curve for growl effect
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;

    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillators.forEach(({ freq, gain }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freq * 0.9, ctx.currentTime + duration);

      oscGain.gain.value = gain;

      osc.connect(oscGain);
      oscGain.connect(distortion);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    });

    distortion.connect(masterGain);
    masterGain.connect(ctx.destination);
  }

  // Positive chime/ding for word reveal
  private playWordReveal(ctx: AudioContext) {
    const duration = 0.5;

    // Major chord frequencies (C major, higher register)
    const chords = [
      { freq: 523, decay: 4, gain: 0.2 },   // C5
      { freq: 659, decay: 5, gain: 0.14 },  // E5
      { freq: 784, decay: 6, gain: 0.1 },   // G5
      { freq: 1047, decay: 8, gain: 0.06 }, // C6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    chords.forEach(({ freq, decay, gain }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    });

    masterGain.connect(ctx.destination);
  }
}

// Singleton instance
export const SoundEffectManager = new SoundEffectManagerClass();
