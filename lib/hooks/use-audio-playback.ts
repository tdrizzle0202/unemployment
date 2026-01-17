'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAudioPlaybackOptions {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface UseAudioPlaybackReturn {
  play: (audioBuffer: ArrayBuffer) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  analyserNode: AnalyserNode | null;
  isAudioContextReady: boolean;
  initAudioContext: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAudioPlayback(options?: UseAudioPlaybackOptions): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Refs for Web Audio API objects (persist across renders)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Initialize AudioContext (must be called after user gesture on iOS)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      // Resume if suspended (happens after tab switch on some browsers)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return;
    }

    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();

      // Create AnalyserNode for lip sync
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Smaller = faster, less detailed
      analyserRef.current.smoothingTimeConstant = 0.3; // Smooth out rapid changes

      // Create GainNode for volume control
      gainRef.current = audioContextRef.current.createGain();
      gainRef.current.gain.value = 1.0;

      // Connect: source -> analyser -> gain -> destination
      analyserRef.current.connect(gainRef.current);
      gainRef.current.connect(audioContextRef.current.destination);

      setAnalyserNode(analyserRef.current);
      setIsAudioContextReady(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio';
      setError(message);
      options?.onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [options]);

  // Play audio from ArrayBuffer
  const play = useCallback(async (audioBuffer: ArrayBuffer) => {
    // Ensure AudioContext is ready
    if (!audioContextRef.current || !analyserRef.current) {
      initAudioContext();
    }

    if (!audioContextRef.current || !analyserRef.current) {
      const err = new Error('AudioContext not initialized. Call initAudioContext() first.');
      setError(err.message);
      options?.onError?.(err);
      return;
    }

    // Stop any currently playing audio
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch {
        // Ignore errors from already stopped sources
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Decode the audio data
      const decodedBuffer = await audioContextRef.current.decodeAudioData(
        audioBuffer.slice(0) // Clone buffer as decodeAudioData detaches it
      );

      // Create new source node
      sourceRef.current = audioContextRef.current.createBufferSource();
      sourceRef.current.buffer = decodedBuffer;

      // Connect source to analyser (which chains to gain -> destination)
      sourceRef.current.connect(analyserRef.current);

      // Set up playback end handler
      sourceRef.current.onended = () => {
        setIsPlaying(false);
        options?.onPlaybackEnd?.();
      };

      // Start playback
      sourceRef.current.start(0);
      setIsPlaying(true);
      setIsLoading(false);
      options?.onPlaybackStart?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play audio';
      setError(message);
      setIsLoading(false);
      setIsPlaying(false);
      options?.onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [initAudioContext, options]);

  // Stop playback
  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch {
        // Ignore errors from already stopped sources
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any playing audio
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
          sourceRef.current.disconnect();
        } catch {
          // Ignore
        }
      }

      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    play,
    stop,
    isPlaying,
    isLoading,
    error,
    analyserNode,
    isAudioContextReady,
    initAudioContext,
  };
}

export type AudioPlayback = ReturnType<typeof useAudioPlayback>;
