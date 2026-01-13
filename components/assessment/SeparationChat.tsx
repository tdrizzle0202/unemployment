'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import type { QuestionnaireFlow } from '@/lib/hooks/useQuestionnaireFlow';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SeparationChatProps {
    flow: QuestionnaireFlow;
    onSubmitAssessment: (narrative: string) => void;
    isAssessing: boolean;
}

export function SeparationChat({ flow, onSubmitAssessment, isAssessing }: SeparationChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "I'd like to understand more about your situation. Could you tell me why you left your last job? Feel free to share as much detail as you're comfortable with - this helps me give you a more accurate assessment."
        }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const monetaryResult = flow.monetaryResult;

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSendMessage = async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsStreaming(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMessage }],
                    state_code: flow.answers.state_code,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            const decoder = new TextDecoder();
            let assistantMessage = '';

            // Add empty assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantMessage += chunk;

                // Update the last message with accumulated content
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                    return updated;
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm sorry, I encountered an error. Could you try again?"
            }]);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Get all user messages combined for the assessment
    const getUserNarrative = () => {
        return messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join('\n\n');
    };

    const hasEnoughInfo = messages.filter(m => m.role === 'user').length >= 1;

    return (
        <div className="flex flex-col h-full">
            {/* Monetary Result Banner */}
            {monetaryResult && (
                <div className={cn(
                    'p-4 rounded-lg border mb-4',
                    monetaryResult.eligible
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                )}>
                    <div className={cn(
                        'font-semibold text-lg flex items-center gap-2',
                        monetaryResult.eligible ? 'text-green-800' : 'text-red-800'
                    )}>
                        {monetaryResult.eligible ? (
                            <>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                You meet the monetary requirements
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Monetary requirements not met
                            </>
                        )}
                    </div>
                    <p className={cn(
                        'text-sm mt-1',
                        monetaryResult.eligible ? 'text-green-700' : 'text-red-700'
                    )}>
                        {monetaryResult.summary}
                    </p>
                </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-80">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        <div
                            className={cn(
                                'max-w-[80%] rounded-2xl px-4 py-3',
                                message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-800'
                            )}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                    </div>
                ))}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t pt-4">
                <div className="flex gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your situation..."
                        rows={1}
                        className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isStreaming || isAssessing}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isStreaming || isAssessing}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>

                {/* Get Assessment Button */}
                {hasEnoughInfo && (
                    <button
                        onClick={() => onSubmitAssessment(getUserNarrative())}
                        disabled={isStreaming || isAssessing}
                        className="w-full mt-4 py-3 px-6 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isAssessing ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing your eligibility...
                            </>
                        ) : (
                            <>
                                Get My Eligibility Assessment
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

export default SeparationChat;
