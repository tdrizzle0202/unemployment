'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';
import { InputForm } from './input-form';
import type { UIMessage } from 'ai';

interface ChatInterfaceProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  stateCode: string;
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stateCode,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {stateCode} Unemployment Benefits Assessment
        </h1>
        <p className="text-sm text-gray-500">
          Answer questions to assess your eligibility
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Welcome to BenefitPath
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              I&apos;ll help you understand your unemployment benefit eligibility in {stateCode}.
              Start by telling me about your employment situation.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-500">Common questions to start:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <SuggestedQuestion text="I was laid off from my job" />
                <SuggestedQuestion text="I quit my job" />
                <SuggestedQuestion text="I was fired" />
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <InputForm
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function SuggestedQuestion({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
    >
      {text}
    </button>
  );
}
