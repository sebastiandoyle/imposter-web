'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerCard from '@/components/PlayerCard';
import GameStartOverlay from '@/components/GameStartOverlay';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';
import { createExpression, ExpressionState, defaultExpression } from '@/lib/expressions';
import { getLocalWord, isLocalImposter } from '@/lib/gameTypes';

export default function Game() {
  const router = useRouter();
  const {
    roomState,
    playerVolumes,
    isConnected,
    leaveRoom,
    returnToLobby,
    isSpeaking,
    getAmplitude,
  } = useAgoraRoom();

  const [showOverlay, setShowOverlay] = useState(true);
  const [wordReady, setWordReady] = useState(false);

  // Check if word is ready
  useEffect(() => {
    if (roomState?.secretWord !== null || roomState?.imposterUserId !== null) {
      setWordReady(true);
    }
  }, [roomState?.secretWord, roomState?.imposterUserId]);

  // Handle disconnection or game ended
  useEffect(() => {
    if (!isConnected && !showOverlay) {
      router.push('/');
      return;
    }

    if (roomState?.gamePhase === 'lobby') {
      router.push('/lobby');
    }
  }, [isConnected, roomState?.gamePhase, showOverlay, router]);

  const handleOverlayComplete = () => {
    setShowOverlay(false);
  };

  const handleLeave = async () => {
    await leaveRoom();
    sessionStorage.clear();
    router.push('/');
  };

  const handleReturnToLobby = () => {
    if (roomState?.hostUserId === roomState?.localUserId) {
      returnToLobby();
    }
  };

  // Calculate expression states based on volume
  const playerExpressions = useMemo(() => {
    const expressions: Record<number, ExpressionState> = {};
    if (!roomState) return expressions;

    roomState.players.forEach((player) => {
      const amplitude = getAmplitude(player.id);
      const speaking = isSpeaking(player.id);

      if (speaking) {
        // Choose expression based on amplitude
        if (amplitude > 0.7) {
          expressions[player.id] = createExpression('intense', amplitude);
        } else if (amplitude > 0.4) {
          expressions[player.id] = createExpression('excited', amplitude);
        } else {
          expressions[player.id] = createExpression('neutral', amplitude);
        }
      } else {
        expressions[player.id] = defaultExpression;
      }
    });

    return expressions;
  }, [roomState, playerVolumes, getAmplitude, isSpeaking]);

  if (!roomState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-xl">⏳</span>
          <p className="text-white/60">Loading...</p>
        </div>
      </main>
    );
  }

  const localWord = getLocalWord(roomState);
  const isImposter = isLocalImposter(roomState);
  const isHost = roomState.hostUserId === roomState.localUserId;

  return (
    <main className="min-h-screen flex flex-col items-center p-4 safe-area-top safe-area-bottom">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Game start overlay */}
      <AnimatePresence>
        {showOverlay && (
          <GameStartOverlay
            isImposter={isImposter}
            secretWord={localWord || '???'}
            wordReady={wordReady}
            onComplete={handleOverlayComplete}
          />
        )}
      </AnimatePresence>

      {/* Main game content */}
      <div className="relative z-10 flex flex-col items-center gap-4 max-w-lg w-full flex-1">
        {/* Header with word */}
        {!showOverlay && (
          <motion.div
            className="flex flex-col items-center gap-2 mt-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-bold text-white/50 tracking-widest">
              {isImposter ? 'YOU ARE THE' : 'YOUR WORD'}
            </p>
            <div
              className={`px-6 py-2 rounded-full text-2xl font-black tracking-wider ${
                isImposter
                  ? 'bg-red-500/20 text-red-500 border border-red-500/50'
                  : 'bg-green-500/20 text-white border border-green-500/50'
              }`}
            >
              {isImposter ? 'IMPOSTER' : localWord?.toUpperCase()}
            </div>
          </motion.div>
        )}

        {/* Player grid */}
        {!showOverlay && (
          <motion.div
            className="w-full grid grid-cols-2 gap-3 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {roomState.players.map((player) => {
              const playerSpeaking = isSpeaking(player.id);
              const isLocal = player.id === roomState.localUserId;
              const expression = playerExpressions[player.id] || defaultExpression;

              // Determine what word to show for this player
              let displayWord = '???';
              let playerIsImposter = false;

              if (isLocal) {
                // Show our own word
                displayWord = localWord || '???';
                playerIsImposter = isImposter;
              }
              // Other players' words stay hidden

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <PlayerCard
                    name={player.name}
                    faceColor={player.faceColorHex}
                    isSpeaking={playerSpeaking}
                    expressionState={expression}
                    word={displayWord}
                    isImposter={playerIsImposter}
                    isSelected={isLocal}
                    showWord={isLocal}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        {!showOverlay && (
          <motion.div
            className="w-full flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isHost && (
              <button
                className="btn-secondary w-full text-sm"
                onClick={handleReturnToLobby}
              >
                Return to Lobby
              </button>
            )}
            <button
              className="btn-secondary w-full text-sm opacity-70"
              onClick={handleLeave}
            >
              Leave Game
            </button>
          </motion.div>
        )}

        {/* Tip */}
        {!showOverlay && (
          <motion.p
            className="text-xs text-white/30 text-center pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Talk and find who doesn&apos;t know the word!
          </motion.p>
        )}
      </div>
    </main>
  );
}
