'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import RoomCodeInput from '@/components/RoomCodeInput';
import { DEFAULT_PLAYER_NAMES } from '@/lib/agoraConfig';

export default function JoinRoom() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState(
    DEFAULT_PLAYER_NAMES[Math.floor(Math.random() * DEFAULT_PLAYER_NAMES.length)]
  );
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleCodeComplete = (code: string) => {
    setRoomCode(code);
  };

  const handleJoin = () => {
    if (!playerName.trim() || roomCode.length !== 4) return;

    setIsJoining(true);
    // Store data in sessionStorage for lobby page
    sessionStorage.setItem('playerName', playerName.trim());
    sessionStorage.setItem('isHost', 'false');
    sessionStorage.setItem('roomCode', roomCode);
    router.push('/lobby');
  };

  const canJoin = playerName.trim() && roomCode.length === 4 && !isJoining;

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
          <span className="text-4xl">🔑</span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Join Room
          </h1>
          <p className="text-white/60 text-center text-sm">
            Enter the code from your friend
          </p>
        </motion.div>

        {/* Room code input */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <label className="text-sm font-medium text-white/60">
            Room Code
          </label>
          <RoomCodeInput onComplete={handleCodeComplete} disabled={isJoining} />
        </motion.div>

        {/* Name input */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
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
        </motion.div>

        {/* Join button */}
        <motion.button
          className="btn-primary w-full flex items-center justify-center gap-3 text-lg"
          onClick={handleJoin}
          disabled={!canJoin}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: canJoin ? 1.02 : 1 }}
          whileTap={{ scale: canJoin ? 0.98 : 1 }}
        >
          {isJoining ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Joining...</span>
            </>
          ) : (
            <>
              <span>🎮</span>
              <span>Join Game</span>
            </>
          )}
        </motion.button>
      </div>
    </main>
  );
}
