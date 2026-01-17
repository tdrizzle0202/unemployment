import type { TTSProvider, TTSOptions, TTSVoice } from '@/types/bruno';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice - "Rachel" which is a clear, friendly voice
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

export class ElevenLabsProvider implements TTSProvider {
  name = 'elevenlabs';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
  }

  async synthesize(text: string, options?: TTSOptions): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const voiceId = options?.voiceId || DEFAULT_VOICE_ID;

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    return response.arrayBuffer();
  }

  async getVoices(): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices.map((v: { voice_id: string; name: string; preview_url?: string }) => ({
      id: v.voice_id,
      name: v.name,
      preview_url: v.preview_url,
    }));
  }
}
