'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExpressionState, defaultExpression } from '@/lib/expressions';

interface AnimatedFaceProps {
  faceColor: string; // Hex color without #
  expressionState?: ExpressionState;
  isSpeaking?: boolean;
  size?: number; // Size in pixels
}

export default function AnimatedFace({
  faceColor,
  expressionState = defaultExpression,
  isSpeaking = false,
  size = 100,
}: AnimatedFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size * 0.45;

      // Face background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `#${faceColor}`;
      ctx.fill();

      // Glowing ring when speaking
      if (isSpeaking) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#6366F1';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Calculate scaled positions
      const scale = size / 100;
      const eyeY = centerY - 2 * scale;
      const eyeSpacingX = 18 * scale;
      const eyebrowY = centerY - 22 * scale + expressionState.eyebrowOffset * scale;
      const mouthY = centerY + 28 * scale;

      // Draw eyebrows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';

      // Left eyebrow
      ctx.save();
      ctx.translate(centerX - eyeSpacingX, eyebrowY);
      ctx.rotate((-expressionState.leftEyebrowAngle * Math.PI) / 180);
      ctx.fillRect(-11 * scale, -2.5 * scale, 22 * scale, 5 * scale);
      ctx.restore();

      // Right eyebrow
      ctx.save();
      ctx.translate(centerX + eyeSpacingX, eyebrowY);
      ctx.rotate((expressionState.rightEyebrowAngle * Math.PI) / 180);
      ctx.fillRect(-11 * scale, -2.5 * scale, 22 * scale, 5 * scale);
      ctx.restore();

      // Draw eyes
      const eyeWidth = 18 * scale;
      const eyeHeight = 22 * scale * expressionState.eyeSquint;

      // Left eye (white)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(
        centerX - eyeSpacingX,
        eyeY,
        eyeWidth / 2,
        eyeHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Left pupil
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(centerX - eyeSpacingX, eyeY + 2 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Right eye (white)
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(
        centerX + eyeSpacingX,
        eyeY,
        eyeWidth / 2,
        eyeHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Right pupil
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(centerX + eyeSpacingX, eyeY + 2 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Draw mouth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      const mouthWidth = 35 * scale;
      const mouthHeight = (expressionState.mouthOpen + 5) * scale;

      if (expressionState.mouthOpen < 8) {
        // Closed/slightly open - horizontal oval
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          mouthY,
          mouthWidth / 2,
          mouthHeight / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else {
        // Open mouth - rounded rectangle
        const cornerRadius = Math.min(mouthWidth, mouthHeight) / 3;
        ctx.beginPath();
        ctx.roundRect(
          centerX - mouthWidth / 2,
          mouthY - mouthHeight / 2,
          mouthWidth,
          mouthHeight,
          cornerRadius
        );
        ctx.fill();

        // Teeth visible when mouth is open enough
        if (expressionState.mouthOpen > 12) {
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.roundRect(
            centerX - 12.5 * scale,
            mouthY - mouthHeight / 2 + 2 * scale,
            25 * scale,
            6 * scale,
            2 * scale
          );
          ctx.fill();
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [faceColor, expressionState, isSpeaking, size]);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{
        scale: isSpeaking ? 1.02 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
        }}
        className="rounded-full"
      />
    </motion.div>
  );
}
