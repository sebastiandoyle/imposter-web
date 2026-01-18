'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundEffectManager } from '@/lib/soundEffects';

interface GameStartOverlayProps {
  isImposter: boolean;
  secretWord: string;
  wordReady: boolean;
  onComplete: () => void;
}

type AnimationPhase = 'rules' | 'suspense' | 'reveal' | 'complete';

export default function GameStartOverlay({
  isImposter,
  secretWord,
  wordReady,
  onComplete,
}: GameStartOverlayProps) {
  const [phase, setPhase] = useState<AnimationPhase>('rules');
  const [waitingForWord, setWaitingForWord] = useState(false);

  useEffect(() => {
    SoundEffectManager.preload();

    // Phase 2: Suspense (after 2.5s)
    const suspenseTimer = setTimeout(() => {
      setPhase('suspense');
      SoundEffectManager.play('suspense');
    }, 2500);

    // Phase 3: Attempt reveal (after 4s)
    const revealTimer = setTimeout(() => {
      if (wordReady) {
        proceedToReveal();
      } else {
        setWaitingForWord(true);
      }
    }, 4000);

    return () => {
      clearTimeout(suspenseTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    if (wordReady && waitingForWord) {
      setWaitingForWord(false);
      proceedToReveal();
    }
  }, [wordReady, waitingForWord]);

  const proceedToReveal = () => {
    setPhase('reveal');

    // Play reveal sound
    if (isImposter) {
      SoundEffectManager.play('imposterReveal');
    } else {
      SoundEffectManager.play('wordReveal');
    }

    // Vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Phase 4: Complete (2 seconds after reveal)
    setTimeout(() => {
      setPhase('complete');
      onComplete();
    }, 2000);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {phase === 'rules' && <RulesView key="rules" />}
        {phase === 'suspense' && <SuspenseView key="suspense" />}
        {phase === 'reveal' && (
          <RevealView
            key="reveal"
            isImposter={isImposter}
            word={secretWord}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RulesView() {
  return (
    <motion.div
      className="flex flex-col items-center gap-8 px-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
    >
      <motion.h1
        className="text-3xl font-black text-white tracking-widest"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0, duration: 0.5, type: 'spring' }}
      >
        THE GAME BEGINS
      </motion.h1>

      <div className="flex flex-col gap-5">
        <RuleRow
          icon="👥"
          text="Everyone gets the same secret word..."
          color="#6366F1"
          delay={0.4}
        />
        <RuleRow
          icon="🎭"
          text="...except ONE person - the IMPOSTER"
          color="#EF4444"
          delay={0.8}
        />
        <RuleRow
          icon="💬"
          text="Talk and find out who doesn't know!"
          color="#22C55E"
          delay={1.2}
        />
      </div>
    </motion.div>
  );
}

function RuleRow({
  icon,
  text,
  color,
  delay,
}: {
  icon: string;
  text: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-4"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
    >
      <span className="text-2xl w-10 text-center">{icon}</span>
      <span className="text-lg font-medium text-white/90">{text}</span>
    </motion.div>
  );
}

function SuspenseView() {
  return (
    <motion.div
      className="flex flex-col items-center gap-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="relative">
        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%)',
            width: 200,
            height: 200,
            marginLeft: -50,
            marginTop: -50,
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />

        {/* Question mark */}
        <motion.div
          className="text-9xl font-black text-white"
          animate={{
            scale: [1, 1.15, 1],
            rotate: [-5, 5, -5],
          }}
          transition={{
            scale: { duration: 0.5, repeat: Infinity },
            rotate: { duration: 0.3, repeat: Infinity },
          }}
        >
          ?
        </motion.div>
      </div>

      <motion.p
        className="text-xl font-bold text-white tracking-widest"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        Assigning roles...
      </motion.p>
    </motion.div>
  );
}

function RevealView({
  isImposter,
  word,
}: {
  isImposter: boolean;
  word: string;
}) {
  const imposterRed = '#EF4444';
  const successGreen = '#22C55E';
  const color = isImposter ? imposterRed : successGreen;

  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', damping: 10 }}
    >
      {/* Glow circle */}
      <div className="relative">
        <motion.div
          className="absolute rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}66 0%, ${color}00 70%)`,
            width: 240,
            height: 240,
            marginLeft: -70,
            marginTop: -70,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Icon */}
        <motion.div
          className="text-8xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          {isImposter ? '🎭' : '✅'}
        </motion.div>
      </div>

      {/* Label */}
      <p className="text-sm font-bold text-white/70 tracking-[0.25em]">
        {isImposter ? 'YOU ARE THE' : 'YOUR WORD IS'}
      </p>

      {/* Word/Role */}
      <motion.h1
        className="text-4xl font-black tracking-wider"
        style={{
          color: isImposter ? imposterRed : 'white',
          textShadow: `0 0 30px ${color}80`,
        }}
        animate={
          isImposter
            ? {
                x: [0, -10, 10, -10, 10, 0],
              }
            : {}
        }
        transition={{ duration: 0.4 }}
      >
        {isImposter ? 'IMPOSTER' : word.toUpperCase()}
      </motion.h1>

      {/* Subtitle */}
      <p className="text-sm font-medium text-white/60 mt-2">
        {isImposter
          ? "Blend in and don't get caught!"
          : 'Find the imposter!'}
      </p>

      {/* Particles effect */}
      <ParticleEffect color={color} />
    </motion.div>
  );
}

function ParticleEffect({ color }: { color: string }) {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    angle: Math.random() * Math.PI * 2,
    distance: 100 + Math.random() * 200,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            backgroundColor: color,
            width: particle.size,
            height: particle.size,
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
