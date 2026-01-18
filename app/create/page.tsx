'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { DEFAULT_PLAYER_NAMES } from '@/lib/agoraConfig';

export default function CreateRoom() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState(
    DEFAULT_PLAYER_NAMES[Math.floor(Math.random() * DEFAULT_PLAYER_NAMES.length)]
  );
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim()) return;

    setIsCreating(true);
    // Store name in sessionStorage for lobby page
    sessionStorage.setItem('playerName', playerName.trim());
    sessionStorage.setItem('isHost', 'true');
    router.push('/lobby');
  };

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
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-0 left-0 text-white/50 hover:text-white transition-colors"
        >
          ← Back
        </Link>

        {/* Title */}
        <motion.div
          className="flex flex-col items-center gap-2 mt-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-4xl">🎮</span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Create Room
          </h1>
          <p className="text-white/60 text-center text-sm">
            Start a new game and invite friends
          </p>
        </motion.div>

        {/* Name input */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <label className="block text-sm font-medium text-white/60 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={12}
            className="w-full px-4 py-4 text-xl font-bold text-white bg-[#1E1E3F] rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
          />
          <p className="text-xs text-white/40 mt-2">
            This is how other players will see you
          </p>
        </motion.div>

        {/* Create button */}
        <motion.button
          className="btn-green w-full flex items-center justify-center gap-3 text-lg"
          onClick={handleCreate}
          disabled={!playerName.trim() || isCreating}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isCreating ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Create Room</span>
            </>
          )}
        </motion.button>

        {/* Info */}
        <motion.p
          className="text-xs text-white/40 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          You&apos;ll get a room code to share with friends
        </motion.p>
      </div>
    </main>
  );
}
