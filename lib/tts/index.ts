import type { TTSProvider } from '@/types/bruno';
import { ElevenLabsProvider } from './elevenlabs';

export type TTSProviderName = 'elevenlabs';

// Factory function to get the configured TTS provider
export function getTTSProvider(providerName?: TTSProviderName): TTSProvider {
  const name = providerName || (process.env.TTS_PROVIDER as TTSProviderName) || 'elevenlabs';

  switch (name) {
    case 'elevenlabs':
      return new ElevenLabsProvider();
    default:
      throw new Error(`Unknown TTS provider: ${name}`);
  }
}

// Check if TTS is available (API key configured)
export function isTTSAvailable(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export { ElevenLabsProvider };
