'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BrunoAvatar, SpeechBubble, BrunoChatInput } from '@/components/bruno';
import { useAudioPlayback } from '@/lib/hooks/use-audio-playback';
import { useLipSync } from '@/lib/hooks/use-lip-sync';
import type { BrunoState, MouthState, BrunoMessage } from '@/types/bruno';

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_MESSAGE = "Hi! I'm Bruno, your unemployment eligibility guide. I'm here to help you understand if you might qualify for benefits. Tell me a bit about your situation - why did you leave your last job?";

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function BrunoChatPage() {
  // Chat state
  const [messages, setMessages] = useState<BrunoMessage[]>([
    {
      id: '1',
      role: 'bruno',
      content: INITIAL_MESSAGE,
      timestamp: Date.now(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Bruno state
  const [brunoState, setBrunoState] = useState<BrunoState>('idle');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Current message being displayed by Bruno (for streaming display)
  const [currentDisplayMessage, setCurrentDisplayMessage] = useState(INITIAL_MESSAGE);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback hook
  const {
    play: playAudio,
    stop: stopAudio,
    isPlaying: isAudioPlaying,
    isLoading: isAudioLoading,
    analyserNode,
    initAudioContext,
    isAudioContextReady,
  } = useAudioPlayback({
    onPlaybackStart: () => setBrunoState('talking'),
    onPlaybackEnd: () => setBrunoState('idle'),
  });

  // Lip sync hook
  const { mouthState } = useLipSync({
    analyserNode,
    enabled: isAudioPlaying,
  });

  // Initialize audio context on first user interaction
  const handleUserInteraction = useCallback(() => {
    if (!audioInitialized && isVoiceEnabled) {
      initAudioContext();
      setAudioInitialized(true);
    }
  }, [audioInitialized, isVoiceEnabled, initAudioContext]);

  // Fetch TTS audio and play it
  const speakMessage = useCallback(async (text: string) => {
    if (!isVoiceEnabled || !isAudioContextReady) return;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('TTS request failed');
        return;
      }

      const audioBuffer = await response.arrayBuffer();
      await playAudio(audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
    }
  }, [isVoiceEnabled, isAudioContextReady, playAudio]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (text: string) => {
    // Cancel any pending TTS to prevent audio overlap
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    stopAudio();

    handleUserInteraction();

    // Add user message
    const userMessage: BrunoMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Set Bruno to thinking
    setBrunoState('thinking');
    setIsStreaming(true);
    setIsTypingComplete(false);

    try {
      // Send to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'bruno' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullResponse = '';

      // Create placeholder for Bruno's response
      const brunoMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: brunoMessageId,
        role: 'bruno',
        content: '',
        timestamp: Date.now(),
      }]);

      // Stream the response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        // Update the message
        setMessages(prev => prev.map(m =>
          m.id === brunoMessageId
            ? { ...m, content: fullResponse }
            : m
        ));
        setCurrentDisplayMessage(fullResponse);
      }

      // Response complete - speak it if voice is enabled
      setIsStreaming(false);
      setBrunoState('idle');

      // Trigger TTS after a short delay to let typing complete
      if (isVoiceEnabled && fullResponse) {
        ttsTimeoutRef.current = setTimeout(() => {
          ttsTimeoutRef.current = null;
          speakMessage(fullResponse);
        }, 500);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setBrunoState('idle');
      setIsStreaming(false);

      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bruno',
        content: "I'm sorry, I had trouble understanding. Could you try again?",
        timestamp: Date.now(),
      }]);
    }
  }, [messages, handleUserInteraction, isVoiceEnabled, speakMessage, stopAudio]);

  // Toggle voice
  const handleToggleVoice = useCallback(() => {
    if (isAudioPlaying) {
      stopAudio();
    }
    setIsVoiceEnabled(prev => !prev);
  }, [isAudioPlaying, stopAudio]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Speak initial message on first voice enable
  useEffect(() => {
    if (isVoiceEnabled && isAudioContextReady && messages.length === 1 && !isTypingComplete) {
      setIsTypingComplete(true);
      speakMessage(INITIAL_MESSAGE);
    }
  }, [isVoiceEnabled, isAudioContextReady, messages.length, isTypingComplete, speakMessage]);

  // Cleanup TTS timeout on unmount
  useEffect(() => {
    return () => {
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
      }
    };
  }, []);

  // Get the latest Bruno message for display
  const latestBrunoMessage = messages.filter(m => m.role === 'bruno').pop();

  return (
    <div className="min-h-screen w-full flex items-center justify-start bg-white relative">
      {/* Back button */}
      <a
        href="/assess"
        className="absolute top-6 left-6 z-10 p-2 rounded-full bg-white/80 text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-sm"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </a>

      {/* Grouped container with Bruno and Chat side by side - pushed left */}
      <div className="flex items-center gap-12">
        {/* Bruno Character */}
        <div className="flex flex-col items-center">
          <BrunoAvatar
            brunoState={brunoState}
            mouthState={mouthState}
            size="xl"
            className="!w-[90rem] !h-[90rem]"
          />

          {/* State indicator */}
          <div className="mt-4 flex items-center gap-2 text-gray-600 h-6">
            {brunoState === 'thinking' && (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Bruno is thinking...</span>
              </>
            )}
            {brunoState === 'talking' && (
              <>
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-sm font-medium">Bruno is speaking...</span>
              </>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="w-96 h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border-2 border-gray-300">
          {/* Header */}
          <header className="flex-shrink-0 bg-blue-600 text-white px-6 py-4 rounded-t-2xl">
            <h1 className="text-xl font-semibold">Talk to Bruno</h1>
          </header>

          {/* Chat History */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 bg-white border-t-2 border-gray-200 rounded-b-2xl">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 bg-transparent px-3 py-2 text-gray-900 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const input = e.currentTarget;
                    if (input.value.trim()) {
                      handleSendMessage(input.value.trim());
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input?.value.trim()) {
                    handleSendMessage(input.value.trim());
                    input.value = '';
                  }
                }}
                disabled={isStreaming}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
