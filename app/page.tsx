'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AnimatedFace from '@/components/AnimatedFace';
import { createExpression } from '@/lib/expressions';

export default function Home() {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo / Title */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated faces demo */}
          <div className="flex gap-2">
            {['F97316', '22C55E', '3B82F6', 'EC4899'].map((color, i) => (
              <motion.div
                key={color}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i, type: 'spring' }}
              >
                <AnimatedFace
                  faceColor={color}
                  expressionState={createExpression(
                    ['curious', 'excited', 'suspicious', 'content'][i] as 'curious' | 'excited' | 'suspicious' | 'content',
                    0.5
                  )}
                  isSpeaking={i === 1}
                  size={50}
                />
              </motion.div>
            ))}
          </div>

          <h1 className="text-5xl font-black text-white tracking-tight">
            IMPOSTER
          </h1>
          <p className="text-white/60 text-center">
            Voice chat party game where one player
            <br />
            doesn&apos;t know the secret word
          </p>
        </motion.div>

        {/* Menu buttons */}
        <motion.div
          className="flex flex-col gap-4 w-full mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link href="/create">
            <motion.button
              className="btn-primary w-full flex items-center justify-center gap-3 text-lg"
              onMouseEnter={() => setHoveredButton('create')}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">🎮</span>
              <span>Create Room</span>
            </motion.button>
          </Link>

          <Link href="/join">
            <motion.button
              className="btn-secondary w-full flex items-center justify-center gap-3 text-lg"
              onMouseEnter={() => setHoveredButton('join')}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">🔑</span>
              <span>Join Room</span>
            </motion.button>
          </Link>

          <Link href="/quickmatch">
            <motion.button
              className="btn-secondary w-full flex items-center justify-center gap-3 text-lg"
              onMouseEnter={() => setHoveredButton('quick')}
              onMouseLeave={() => setHoveredButton(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">⚡</span>
              <span>Quick Match</span>
            </motion.button>
          </Link>
        </motion.div>

        {/* How to play */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2 className="text-sm font-bold text-white/50 tracking-widest mb-4">
            HOW TO PLAY
          </h2>
          <div className="flex flex-col gap-3 text-sm text-white/70">
            <p>👥 Join with 2-4 players</p>
            <p>📝 Everyone gets the same secret word</p>
            <p>🎭 Except one player - the IMPOSTER</p>
            <p>🗣️ Talk and figure out who it is!</p>
          </div>
        </motion.div>

        {/* Cross-platform note */}
        <motion.p
          className="text-xs text-white/40 text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Play with friends on iOS or web - same room!
        </motion.p>

        {/* iOS App Link */}
        <motion.a
          href="https://apps.apple.com/app/id6756529558"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Download iOS App →
        </motion.a>
      </div>
    </main>
  );
}
