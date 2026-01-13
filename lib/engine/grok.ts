import OpenAI from 'openai';

// xAI's Grok uses OpenAI-compatible API
const grokClient = new OpenAI({
    apiKey: process.env.XAI_API_KEY || 'dummy-key-for-init',
    baseURL: 'https://api.x.ai/v1',
});

export interface GrokCompletionOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
}

export async function grokComplete(
    systemPrompt: string,
    userPrompt: string,
    options: GrokCompletionOptions = {}
): Promise<string> {
    const {
        model = 'grok-4-1-fast-reasoning',
        maxTokens = 4000,
        temperature = 0.3
    } = options;

    const response = await grokClient.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error('No response from Grok');
    }

    return content;
}

export { grokClient };
