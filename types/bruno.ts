// Bruno AI Character Interface Types

// Animation states for Bruno avatar
export type BrunoState = 'idle' | 'thinking' | 'talking';

// Mouth positions for lip sync (volume-based)
export type MouthState = 'closed' | 'open-1' | 'open-2' | 'open-3';

// TTS Provider interface for swappable TTS services
export interface TTSProvider {
  name: string;
  synthesize(text: string, options?: TTSOptions): Promise<ArrayBuffer>;
  getVoices?(): Promise<TTSVoice[]>;
}

export interface TTSOptions {
  voiceId?: string;
  speed?: number; // 0.5 to 2.0, default 1.0
  pitch?: number; // 0.5 to 2.0, default 1.0
}

export interface TTSVoice {
  id: string;
  name: string;
  language?: string;
  preview_url?: string;
}

// TTS API request/response types
export interface TTSRequest {
  text: string;
  voice_id?: string;
}

export interface TTSErrorResponse {
  error: string;
  code?: string;
}

// Bruno context for state management
export interface BrunoContext {
  brunoState: BrunoState;
  mouthState: MouthState;
  isAudioPlaying: boolean;
  isVoiceEnabled: boolean;
  currentMessage: string;
  audioError: string | null;
}

// Chat message for Bruno conversation
export interface BrunoMessage {
  id: string;
  role: 'user' | 'bruno';
  content: string;
  timestamp: number;
}

// Audio playback state
export interface AudioPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  duration: number;
  currentTime: number;
}
