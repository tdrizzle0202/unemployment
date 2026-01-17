'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface SpeechBubbleProps {
  message: string;
  isTyping?: boolean;
  typingSpeed?: number; // ms per character
  onTypingComplete?: () => void;
  showTail?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SpeechBubble({
  message,
  isTyping = false,
  typingSpeed = 30,
  onTypingComplete,
  showTail = true,
  className = '',
}: SpeechBubbleProps) {
  const [charIndex, setCharIndex] = useState(isTyping ? 0 : message.length);
  const [prevMessage, setPrevMessage] = useState(message);

  // Use ref for callback to avoid effect dependency issues
  const onTypingCompleteRef = useRef(onTypingComplete);
  useEffect(() => {
    onTypingCompleteRef.current = onTypingComplete;
  });

  // Reset when message changes (setState during render pattern - React recommended)
  if (message !== prevMessage) {
    setPrevMessage(message);
    setCharIndex(isTyping ? 0 : message.length);
  }

  const displayedText = isTyping ? message.slice(0, charIndex) : message;
  const isComplete = !isTyping || charIndex >= message.length;

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || charIndex >= message.length) {
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex(prev => {
        const next = prev + 1;
        if (next >= message.length) {
          onTypingCompleteRef.current?.();
        }
        return next;
      });
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [message, isTyping, charIndex, typingSpeed]);

  if (!message) return null;

  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl shadow-lg p-4 max-w-md animate-speech-bubble-enter',
        'border-2 border-gray-100',
        className
      )}
    >
      {/* Speech bubble content */}
      <p className="text-gray-800 text-lg leading-relaxed">
        {displayedText}
        {/* Typing cursor */}
        {isTyping && !isComplete && (
          <span className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5 align-middle animate-cursor-blink" />
        )}
      </p>

      {/* Speech bubble tail (pointing to avatar) */}
      {showTail && (
        <div className="absolute -left-3 top-6 w-6 h-6 overflow-hidden">
          <div className="absolute w-4 h-4 bg-white border-l-2 border-b-2 border-gray-100 transform rotate-45 translate-x-2" />
        </div>
      )}
    </div>
  );
}

export default SpeechBubble;
