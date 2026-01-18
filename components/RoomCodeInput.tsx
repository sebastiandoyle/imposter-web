'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface RoomCodeInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export default function RoomCodeInput({
  onComplete,
  disabled = false,
}: RoomCodeInputProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Move to next input if digit entered
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newDigits.every((d) => d !== '')) {
      onComplete(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      onComplete(pasted);
    }
  };

  return (
    <div className="flex gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-16 h-20 text-center text-4xl font-black text-white bg-[#1E1E3F] rounded-xl border-2 border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all disabled:opacity-50"
          style={{ fontFamily: 'monospace' }}
        />
      ))}
    </div>
  );
}
