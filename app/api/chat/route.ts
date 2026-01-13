import { NextRequest } from 'next/server';
import { z } from 'zod';
import { retrieveHandbookSections } from '@/lib/engine/pipeline/retrieve';
import { buildConversationalPrompt } from '@/lib/engine/prompts/eligibility';
import OpenAI from 'openai';

// xAI's Grok uses OpenAI-compatible API
const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'dummy-key-for-init',
  baseURL: 'https://api.x.ai/v1',
});

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  state_code: z.string().length(2).toUpperCase(),
  session_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ChatRequestSchema.parse(body);

    // Get relevant handbook sections based on conversation
    const lastUserMessage = validated.messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const handbookSections = await retrieveHandbookSections(
      lastUserMessage,
      validated.state_code
    );

    // Build system prompt with handbook context
    const systemPrompt = buildConversationalPrompt(
      validated.state_code,
      handbookSections
    );

    // Stream response using Grok
    const stream = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        ...validated.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 1000,
      temperature: 0.5,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
