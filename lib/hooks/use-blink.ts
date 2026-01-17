'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseBlinkOptions {
  minInterval?: number;
  maxInterval?: number;
  enabled?: boolean;
}

interface UseBlinkReturn {
  isBlinking: boolean;
  triggerBlink: () => void;
}

const BLINK_DURATION = 150; // matches CSS animation duration

// ~15% chance of a double-blink
const shouldDoubleBlink = () => Math.random() < 0.15;

export function useBlink(options: UseBlinkOptions = {}): UseBlinkReturn {
  const {
    minInterval = 2500,
    maxInterval = 5500,
    enabled = true,
  } = options;

  const [isBlinking, setIsBlinking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isBlinkingRef = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerBlink = useCallback(() => {
    if (isBlinkingRef.current) return;

    isBlinkingRef.current = true;
    setIsBlinking(true);

    timeoutRef.current = setTimeout(() => {
      setIsBlinking(false);
      isBlinkingRef.current = false;

      // Double blink chance
      if (shouldDoubleBlink()) {
        timeoutRef.current = setTimeout(() => {
          isBlinkingRef.current = true;
          setIsBlinking(true);
          timeoutRef.current = setTimeout(() => {
            setIsBlinking(false);
            isBlinkingRef.current = false;
          }, BLINK_DURATION);
        }, 80);
      }
    }, BLINK_DURATION);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimeouts();
      setIsBlinking(false);
      isBlinkingRef.current = false;
      return;
    }

    const scheduleNextBlink = () => {
      const interval = minInterval + Math.random() * (maxInterval - minInterval);

      timeoutRef.current = setTimeout(() => {
        triggerBlink();
        scheduleNextBlink();
      }, interval);
    };

    // Initial delay
    const initialDelay = 500 + Math.random() * 1500;
    timeoutRef.current = setTimeout(scheduleNextBlink, initialDelay);

    return clearTimeouts;
  }, [enabled, minInterval, maxInterval, triggerBlink, clearTimeouts]);

  return { isBlinking, triggerBlink };
}

export default useBlink;
