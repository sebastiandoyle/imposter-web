'use client';

import { motion } from 'framer-motion';
import AnimatedFace from './AnimatedFace';
import { ExpressionState, defaultExpression } from '@/lib/expressions';

interface PlayerCardProps {
  name: string;
  faceColor: string; // Hex color without #
  isSpeaking: boolean;
  expressionState?: ExpressionState;
  word: string;
  isImposter: boolean;
  isSelected: boolean;
  showWord?: boolean;
}

export default function PlayerCard({
  name,
  faceColor,
  isSpeaking,
  expressionState = defaultExpression,
  word,
  isImposter,
  isSelected,
  showWord = true,
}: PlayerCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 p-4 rounded-2xl w-full"
      style={{
        backgroundColor: '#1E1E3F',
        boxShadow: isSelected
          ? '0 8px 24px rgba(34, 197, 94, 0.3)'
          : isSpeaking
          ? '0 8px 24px rgba(99, 102, 241, 0.4)'
          : 'none',
      }}
      animate={{
        borderColor: isSelected
          ? '#22C55E'
          : isSpeaking
          ? 'rgba(99, 102, 241, 0.5)'
          : 'rgba(255, 255, 255, 0.1)',
        borderWidth: isSelected ? 2 : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Word label above face */}
      {showWord ? (
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold tracking-wide ${
            isImposter
              ? 'bg-red-500/20 text-red-500 border border-red-500/50'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {word}
        </div>
      ) : (
        <div className="px-3 py-1 rounded-full text-sm font-bold tracking-wide bg-white/5 text-white/30 border border-white/10">
          ???
        </div>
      )}

      {/* Animated face */}
      <AnimatedFace
        faceColor={faceColor}
        expressionState={expressionState}
        isSpeaking={isSpeaking}
        size={100}
      />

      {/* Player name with YOU badge if selected */}
      <div className="flex items-center gap-1.5">
        <span className="text-white font-bold text-lg">{name}</span>
        {isSelected && (
          <span className="px-1.5 py-0.5 text-[10px] font-black text-white bg-green-500 rounded-full">
            YOU
          </span>
        )}
      </div>

      {/* Speaking indicator */}
      <div className="h-4">
        {isSpeaking ? (
          <motion.span
            className="text-xs font-medium"
            style={{ color: '#6366F1' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Speaking
          </motion.span>
        ) : (
          <span className="text-xs text-transparent">-</span>
        )}
      </div>
    </motion.div>
  );
}
