'use client';

import { motion } from 'framer-motion';
import AnimatedFace from './AnimatedFace';
import { Player } from '@/lib/gameTypes';
import { defaultExpression } from '@/lib/expressions';

interface PlayerSlotProps {
  slot: number;
  player: Player | undefined;
  isLocal: boolean;
}

export default function PlayerSlot({ slot, player, isLocal }: PlayerSlotProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-4 rounded-2xl"
      style={{
        backgroundColor: '#1E1E3F',
        borderWidth: isLocal ? 2 : 1,
        borderColor: isLocal ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)',
        borderStyle: 'solid',
      }}
    >
      {player ? (
        <>
          {/* Filled slot */}
          <div className="transform scale-[0.7]">
            <AnimatedFace
              faceColor={player.faceColorHex}
              expressionState={defaultExpression}
              isSpeaking={false}
              size={100}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">{player.name}</span>
            {isLocal && (
              <span className="px-1 py-0.5 text-[8px] font-black text-white bg-green-500 rounded-full">
                YOU
              </span>
            )}
          </div>

          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: player.isConnected ? '#22C55E' : '#EF4444',
            }}
            animate={{
              scale: player.isConnected ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 1.5,
              repeat: player.isConnected ? Infinity : 0,
            }}
          />
        </>
      ) : (
        <>
          {/* Empty slot */}
          <div
            className="w-[70px] h-[70px] rounded-full"
            style={{
              border: '2px dashed rgba(255, 255, 255, 0.2)',
            }}
          />

          <span className="text-sm font-medium text-white/30">Waiting...</span>

          <div className="w-2 h-2 rounded-full bg-white/10" />
        </>
      )}
    </div>
  );
}
