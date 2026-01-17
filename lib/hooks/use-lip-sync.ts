'use client';

import { useState, useEffect, useRef } from 'react';
import type { MouthState } from '@/types/bruno';

// ============================================================================
// TYPES
// ============================================================================

export interface UseLipSyncOptions {
  analyserNode: AnalyserNode | null;
  enabled: boolean;
}

export interface UseLipSyncReturn {
  mouthState: MouthState;
}

// ============================================================================
// VOLUME THRESHOLDS
// ============================================================================

// These thresholds map average frequency volume to mouth states
// Values may need tuning based on actual TTS audio output
const VOLUME_THRESHOLDS = {
  closed: 15,    // Below this = mouth closed
  open1: 40,     // Below this = slight open
  open2: 80,     // Below this = medium open
  // Above open2 = wide open
} as const;

// How often to update mouth state (ms)
// 60fps = ~16ms, but we can be slightly less frequent for performance
const UPDATE_INTERVAL_MS = 25;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAverageVolume(dataArray: Uint8Array<ArrayBuffer>): number {
  // Focus on voice frequency range (~85-500Hz)
  // With fftSize=256 and 44.1kHz sample rate:
  // Each bin = 44100/256 = ~172Hz
  // So bins 0-3 cover roughly 0-688Hz which includes voice fundamentals
  const voiceRangeEnd = Math.min(4, dataArray.length);

  let sum = 0;
  for (let i = 0; i < voiceRangeEnd; i++) {
    sum += dataArray[i];
  }

  return sum / voiceRangeEnd;
}

function volumeToMouthState(volume: number): MouthState {
  if (volume < VOLUME_THRESHOLDS.closed) {
    return 'closed';
  } else if (volume < VOLUME_THRESHOLDS.open1) {
    return 'open-1';
  } else if (volume < VOLUME_THRESHOLDS.open2) {
    return 'open-2';
  } else {
    return 'open-3';
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useLipSync({ analyserNode, enabled }: UseLipSyncOptions): UseLipSyncReturn {
  const [mouthState, setMouthState] = useState<MouthState>('closed');
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  const [prevAnalyserNode, setPrevAnalyserNode] = useState(analyserNode);

  // Reset mouth when disabled or analyser changes (setState during render pattern)
  if (enabled !== prevEnabled || analyserNode !== prevAnalyserNode) {
    setPrevEnabled(enabled);
    setPrevAnalyserNode(analyserNode);
    if (!enabled || !analyserNode) {
      setMouthState('closed');
    }
  }

  // Refs for animation frame management
  const frameIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    // Skip if disabled or no analyser
    if (!enabled || !analyserNode) {
      return;
    }

    // Initialize data array for frequency data
    if (!dataArrayRef.current || dataArrayRef.current.length !== analyserNode.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyserNode.frequencyBinCount));
    }

    // Animation loop
    const updateMouthState = (timestamp: number) => {
      // Throttle updates to reduce state changes
      if (timestamp - lastUpdateRef.current < UPDATE_INTERVAL_MS) {
        frameIdRef.current = requestAnimationFrame(updateMouthState);
        return;
      }
      lastUpdateRef.current = timestamp;

      if (!analyserNode || !dataArrayRef.current) {
        frameIdRef.current = requestAnimationFrame(updateMouthState);
        return;
      }

      // Get frequency data
      analyserNode.getByteFrequencyData(dataArrayRef.current);

      // Calculate volume and map to mouth state
      const volume = calculateAverageVolume(dataArrayRef.current);
      const newMouthState = volumeToMouthState(volume);

      setMouthState(newMouthState);

      // Continue loop
      frameIdRef.current = requestAnimationFrame(updateMouthState);
    };

    // Start animation loop
    frameIdRef.current = requestAnimationFrame(updateMouthState);

    // Cleanup - just cancel animation frame; state reset happens via render pattern
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [analyserNode, enabled]);

  return { mouthState };
}

export type LipSync = ReturnType<typeof useLipSync>;
