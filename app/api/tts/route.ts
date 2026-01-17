import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTTSProvider, isTTSAvailable } from '@/lib/tts';

const TTSRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voice_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Check if TTS is configured
    if (!isTTSAvailable()) {
      return NextResponse.json(
        { error: 'TTS service not configured', code: 'TTS_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const validated = TTSRequestSchema.parse(body);

    const provider = getTTSProvider();
    const audioBuffer = await provider.synthesize(validated.text, {
      voiceId: validated.voice_id,
    });

    // Return audio as binary response
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('TTS error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = message.includes('not configured');

    return NextResponse.json(
      {
        error: isConfigError ? 'TTS service not configured' : 'TTS synthesis failed',
        code: isConfigError ? 'TTS_NOT_CONFIGURED' : 'TTS_ERROR',
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}

// GET endpoint to check TTS availability
export async function GET() {
  return NextResponse.json({
    available: isTTSAvailable(),
    provider: isTTSAvailable() ? 'elevenlabs' : null,
  });
}
