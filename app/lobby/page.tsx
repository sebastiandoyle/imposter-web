'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PlayerSlot from '@/components/PlayerSlot';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';

export default function Lobby() {
  const router = useRouter();
  const {
    roomState,
    isConnected,
    error,
    createRoom,
    joinRoom,
    joinQuickMatch,
    leaveRoom,
    startGame,
  } = useAgoraRoom();

  const [displayRoomCode, setDisplayRoomCode] = useState('----');
  const [isHost, setIsHost] = useState(false);
  const [isQuickMatch, setIsQuickMatch] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);

  // Initialize room on mount
  useEffect(() => {
    console.log('[Lobby] Init useEffect: hasInitialized=' + hasInitialized);
    if (hasInitialized) return;

    const playerName = sessionStorage.getItem('playerName');
    const hostFlag = sessionStorage.getItem('isHost') === 'true';
    const quickMatchFlag = sessionStorage.getItem('isQuickMatch') === 'true';
    const roomCode = sessionStorage.getItem('roomCode');

    console.log('[Lobby] Session data: playerName=' + playerName + ', hostFlag=' + hostFlag + ', quickMatchFlag=' + quickMatchFlag + ', roomCode=' + roomCode);

    if (!playerName) {
      console.log('[Lobby] No playerName, redirecting to home');
      router.push('/');
      return;
    }

    setIsHost(hostFlag);
    setIsQuickMatch(quickMatchFlag);
    setHasInitialized(true);

    // Don't clear isQuickMatch until after connection - prevents issues with remounts
    // sessionStorage.removeItem('isQuickMatch');

    const initRoom = async () => {
      try {
        if (quickMatchFlag) {
          console.log('[Lobby] Starting Quick Match for:', playerName);
          await joinQuickMatch(playerName);
          setDisplayRoomCode('QUICK');
          // Clear isQuickMatch after successful connection
          sessionStorage.removeItem('isQuickMatch');
        } else if (hostFlag) {
          console.log('[Lobby] Creating room for host:', playerName);
          const code = await createRoom(playerName);
          setDisplayRoomCode(code);
        } else if (roomCode) {
          console.log('[Lobby] Joining room:', roomCode);
          await joinRoom(roomCode, playerName);
          setDisplayRoomCode(roomCode);
          sessionStorage.removeItem('roomCode');
        } else {
          console.log('[Lobby] No valid path, redirecting to home');
          router.push('/');
        }
      } catch (e) {
        console.error('[Lobby] Failed to initialize room:', e);
      }
    };

    initRoom();
  }, [hasInitialized, router, createRoom, joinRoom, joinQuickMatch]);

  // Navigate to game when phase changes
  useEffect(() => {
    if (roomState?.gamePhase === 'playing') {
      router.push('/game');
    }
  }, [roomState?.gamePhase, router]);

  // Track when connection succeeds
  useEffect(() => {
    if (isConnected) {
      setWasConnected(true);
    }
  }, [isConnected]);

  // Handle disconnection - only redirect if was previously connected
  // Add a delay to avoid race conditions during connection setup
  useEffect(() => {
    console.log('[Lobby] Connection state: hasInitialized=' + hasInitialized + ', wasConnected=' + wasConnected + ', isConnected=' + isConnected + ', error=' + error);
    if (hasInitialized && wasConnected && !isConnected && !error) {
      console.log('[Lobby] Detected disconnect, waiting before redirect...');
      // Was connected but now disconnected - wait a moment to confirm
      const timer = setTimeout(() => {
        // Double-check still disconnected before redirecting
        console.log('[Lobby] Redirect check - isConnected:', isConnected);
        if (!isConnected) {
          console.log('[Lobby] Redirecting to home due to disconnect');
          router.push('/');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, hasInitialized, wasConnected, error, router]);

  const handleStartGame = async () => {
    await startGame();
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    sessionStorage.removeItem('playerName');
    sessionStorage.removeItem('isHost');
    router.push('/');
  };

  const copyRoomCode = () => {
    if (displayRoomCode !== '----' && displayRoomCode !== 'QUICK') {
      navigator.clipboard.writeText(displayRoomCode);
    }
  };

  const playerCount = roomState?.players.length ?? 0;
  const canStartGame = isHost && playerCount >= 2 && isConnected;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 safe-area-top safe-area-bottom">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full flex-1">
        {/* Header */}
        <motion.h1
          className="text-xl font-bold text-white tracking-widest mt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isQuickMatch ? 'QUICK MATCH' : isHost ? 'YOUR ROOM' : 'JOINING ROOM'}
        </motion.h1>

        {/* Room code display */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-sm font-medium text-white/60">Room Code</p>
          <button
            className="flex gap-3 items-center"
            onClick={copyRoomCode}
            disabled={displayRoomCode === '----' || displayRoomCode === 'QUICK'}
          >
            {displayRoomCode.split('').map((char, i) => (
              <motion.div
                key={i}
                className="w-14 h-16 flex items-center justify-center text-3xl font-black text-white rounded-xl"
                style={{
                  backgroundColor: '#1E1E3F',
                  borderWidth: 2,
                  borderColor: 'rgba(99, 102, 241, 0.5)',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                {char}
              </motion.div>
            ))}
          </button>
          {isHost && !isQuickMatch && (
            <p className="text-xs text-indigo-400 mt-1">
              Tap to copy • Share with friends!
            </p>
          )}
        </motion.div>

        {/* Player slots */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm font-bold text-white/60 tracking-wide text-center mb-3">
            PLAYERS ({playerCount}/4)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((slot) => {
              const player = roomState?.players.find((p) => p.slotIndex === slot);
              const isLocal = player?.id === roomState?.localUserId;
              return (
                <motion.div
                  key={slot}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + slot * 0.1 }}
                >
                  <PlayerSlot slot={slot} player={player} isLocal={isLocal} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Connection status */}
        <div className="flex-1 flex items-center">
          {error ? (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          ) : !isConnected ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin text-xl">⏳</span>
              <p className="text-white/60 text-sm">Connecting...</p>
            </div>
          ) : isQuickMatch && playerCount < 4 ? (
            <p className="text-white/40 text-xs text-center">
              Game will start when 4 players join
            </p>
          ) : null}
        </div>

        {/* Action buttons */}
        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isHost && isConnected && !isQuickMatch && (
            <button
              className="btn-green w-full flex items-center justify-center gap-2"
              onClick={handleStartGame}
              disabled={!canStartGame}
            >
              <span>▶️</span>
              <span>START GAME</span>
            </button>
          )}

          <button
            className="btn-secondary w-full"
            onClick={handleLeaveRoom}
          >
            LEAVE ROOM
          </button>
        </motion.div>
      </div>
    </main>
  );
}
