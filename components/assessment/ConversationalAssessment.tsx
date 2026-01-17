'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { BrunoAvatar } from '@/components/bruno';
import { US_STATES, QUARTERS_WITH_WAGES_OPTIONS } from '@/lib/engine/schemas/eligibility-questions';
import {
    runMonetaryEligibility,
    getRequiredInputs,
    type MonetaryEligibilityResult,
} from '@/lib/engine/pipeline/monetary-eligibility';
import { convertToMonetaryInputs } from '@/lib/engine/schemas/eligibility-questions';
import { AssessmentResults, type AssessmentResultData } from './AssessmentResults';
import { BenefitsDisplay, type BenefitData } from './BenefitsDisplay';
import { type Language, getStrings, translateCheckExplanation, translateSummary } from '@/lib/i18n/strings';

// ============================================================================
// TYPES
// ============================================================================

type StepId =
    | 'intro'
    | 'ask_name'
    | 'greet'
    | 'ask_state'
    | 'wages'
    | 'quarters'
    | 'highest_quarter'
    | 'hours'
    | 'weeks'
    | 'monetary_check'
    | 'separation'
    | 'assessing'
    | 'results'
    | 'monetary_failure';

type InputType = 'none' | 'text' | 'state_select' | 'currency' | 'quarters' | 'highest_quarter' | 'number' | 'separation_chat';

type Message = {
    id: string;
    from: 'bruno' | 'user';
    content: string;
};

type UserData = {
    name: string | null;
    stateCode: string | null;
    basePeriodWages: number | null;
    quartersWithWages: number | null;
    highestQuarterWages: { mode: 'even' | 'specific'; amount?: number } | null;
    hoursWorked: number | null;
    weeksWorked: number | null;
    separationNarrative: string | null;
};

type HistoryEntry = {
    step: StepId;
    userData: UserData;
    messages: Message[];
    separationMessages: { role: 'user' | 'assistant'; content: string }[];
    conditionalSteps: ConditionalSteps;
};

type ConditionalSteps = {
    needsHours: boolean;
    needsWeeks: boolean;
    minHours?: number;
    minWeeks?: number;
};

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

type StepConfig = {
    prompt: string | ((data: UserData) => string);
    inputType: InputType;
    validate?: (input: string) => boolean;
    onSubmit?: (input: string, data: UserData) => Partial<UserData>;
    getNextStep: (data: UserData, conditionalSteps: ConditionalSteps) => StepId;
    autoAdvanceDelay?: number;
};

const STEPS: Record<StepId, StepConfig> = {
    intro: {
        prompt: "Hi! I'm Bruno. I'll help you check if you qualify for unemployment benefits!",
        inputType: 'none',
        getNextStep: () => 'ask_name',
        autoAdvanceDelay: 1500,
    },
    ask_name: {
        prompt: "First, what's your name?",
        inputType: 'text',
        validate: (input) => input.trim().length > 0,
        onSubmit: (input) => ({ name: input.trim() }),
        getNextStep: () => 'greet',
    },
    greet: {
        prompt: (data) => `Nice to meet you, ${data.name}! Let's see if you qualify for benefits.`,
        inputType: 'none',
        getNextStep: () => 'ask_state',
        autoAdvanceDelay: 1500,
    },
    ask_state: {
        prompt: (data) => `Which state did you work in, ${data.name}?`,
        inputType: 'state_select',
        onSubmit: (input) => ({ stateCode: input }),
        getNextStep: () => 'wages',
    },
    wages: {
        prompt: "How much did you earn before taxes in the last 12 months?",
        inputType: 'currency',
        validate: (input) => {
            const val = parseFloat(input.replace(/[,$]/g, ''));
            return !isNaN(val) && val >= 0;
        },
        onSubmit: (input) => ({ basePeriodWages: parseFloat(input.replace(/[,$]/g, '')) }),
        getNextStep: () => 'quarters',
    },
    quarters: {
        prompt: "How many quarters did you receive a paycheck?",
        inputType: 'quarters',
        onSubmit: (input) => ({ quartersWithWages: parseInt(input, 10) }),
        getNextStep: () => 'highest_quarter',
    },
    highest_quarter: {
        prompt: "Was your income steady, or was one quarter higher than the others?",
        inputType: 'highest_quarter',
        onSubmit: (input, _data) => {
            if (input === 'even') {
                return { highestQuarterWages: { mode: 'even' } };
            }
            return { highestQuarterWages: { mode: 'specific', amount: parseFloat(input) } };
        },
        getNextStep: (_data, conditionalSteps) => {
            if (conditionalSteps.needsHours) return 'hours';
            if (conditionalSteps.needsWeeks) return 'weeks';
            return 'monetary_check';
        },
    },
    hours: {
        prompt: (data) => {
            const required = data.stateCode ? getRequiredInputs(data.stateCode) : null;
            const minHours = required?.min_hours || 680;
            return `How many hours did you work in the last 12 months? (Your state requires at least ${minHours} hours)`;
        },
        inputType: 'number',
        validate: (input) => {
            const val = parseInt(input, 10);
            return !isNaN(val) && val >= 0;
        },
        onSubmit: (input) => ({ hoursWorked: parseInt(input, 10) }),
        getNextStep: (_data, conditionalSteps) => {
            if (conditionalSteps.needsWeeks) return 'weeks';
            return 'monetary_check';
        },
    },
    weeks: {
        prompt: (data) => {
            const required = data.stateCode ? getRequiredInputs(data.stateCode) : null;
            const minWeeks = required?.min_weeks || 20;
            return `How many weeks did you work in the past year? (Your state requires at least ${minWeeks} weeks)`;
        },
        inputType: 'number',
        validate: (input) => {
            const val = parseInt(input, 10);
            return !isNaN(val) && val >= 0 && val <= 52;
        },
        onSubmit: (input) => ({ weeksWorked: parseInt(input, 10) }),
        getNextStep: () => 'monetary_check',
    },
    monetary_check: {
        prompt: '',
        inputType: 'none',
        getNextStep: () => 'separation',
    },
    separation: {
        prompt: "Now let's talk about why you left your job. How did your employment end?",
        inputType: 'separation_chat',
        onSubmit: (input) => ({ separationNarrative: input }),
        getNextStep: () => 'assessing',
    },
    assessing: {
        prompt: "Let me analyze your eligibility...",
        inputType: 'none',
        getNextStep: () => 'results',
    },
    results: {
        prompt: '',
        inputType: 'none',
        getNextStep: () => 'results',
    },
    monetary_failure: {
        prompt: '',
        inputType: 'none',
        getNextStep: () => 'monetary_failure',
    },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: '0s' }} />
            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }} />
            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400" style={{ animationDelay: '0.4s' }} />
        </div>
    );
}

function TypewriterText({ text, speed = 30, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const onCompleteRef = useRef(onComplete);

    // Keep ref up to date
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        setDisplayedText('');
        setIsComplete(false);

        let index = 0;
        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(timer);
                setIsComplete(true);
                onCompleteRef.current?.();
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <span>
            {displayedText}
            {!isComplete && <span className="animate-pulse">|</span>}
        </span>
    );
}

function ChatBubble({ message, animate = false, onAnimationComplete }: { message: Message; animate?: boolean; onAnimationComplete?: () => void }) {
    const isBruno = message.from === 'bruno';

    return (
        <div className={cn('flex', isBruno ? 'justify-start' : 'justify-end')}>
            <div
                className={cn(
                    'chat-bubble max-w-[80%] px-5 py-4 rounded-2xl text-lg whitespace-pre-wrap',
                    isBruno
                        ? 'bg-white/90 text-black rounded-bl-md shadow-lg'
                        : 'bg-[#A897C6] text-black rounded-br-md shadow-lg'
                )}
            >
                {isBruno && animate ? (
                    <TypewriterText text={message.content} speed={25} onComplete={onAnimationComplete} />
                ) : (
                    message.content
                )}
            </div>
        </div>
    );
}

function StateSelector({ onSelect, filter }: { onSelect: (code: string) => void; filter: string }) {
    const filteredStates = US_STATES.filter(
        (s) =>
            s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.code.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {filteredStates.map((state) => (
                <button
                    key={state.code}
                    onClick={() => onSelect(state.code)}
                    className="px-3 py-2 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 hover:border-[#A897C6] hover:bg-[#E8E0F0] transition-colors"
                >
                    <span className="font-medium">{state.code}</span>
                    <span className="text-gray-500 ml-2 hidden sm:inline">{state.name}</span>
                </button>
            ))}
        </div>
    );
}

function StateSelectorWithChat({ onSelect, placeholder }: { onSelect: (code: string) => void; placeholder: string }) {
    const [search, setSearch] = useState('');

    return (
        <div className="space-y-4">
            <StateSelector onSelect={onSelect} filter={search} />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    // Check if search matches exactly one state
                    const match = US_STATES.find(
                        (s) =>
                            s.name.toLowerCase() === search.toLowerCase() ||
                            s.code.toLowerCase() === search.toLowerCase()
                    );
                    if (match) {
                        onSelect(match.code);
                    }
                }}
                className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#A897C6] px-4 py-3 shadow-sm"
            >
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg cursor-text"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!search.trim()}
                    className="p-3 bg-[#A897C6] text-black rounded-xl hover:bg-[#9787B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
}

function UnifiedChatInput({
    onSubmit,
    placeholder = 'Type your message...',
    disabled = false,
}: {
    onSubmit: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim() && !disabled) {
            onSubmit(value.trim());
            setValue('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#A897C6] px-4 py-3 shadow-sm">
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg cursor-text disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
            />
            <button
                type="submit"
                disabled={!value.trim() || disabled}
                className="p-3 bg-[#A897C6] text-black rounded-xl hover:bg-[#9787B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </form>
    );
}

function TextInput({
    onSubmit,
    placeholder = 'Type your message...',
}: {
    onSubmit: (value: string) => void;
    placeholder?: string;
}) {
    return <UnifiedChatInput onSubmit={onSubmit} placeholder={placeholder} />;
}

function CurrencyInput({ onSubmit }: { onSubmit: (value: string) => void }) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(value.replace(/[,$]/g, ''));
        if (!isNaN(num) && num >= 0) {
            onSubmit(String(num));
            setValue('');
        }
    };

    const formatDisplay = (val: string) => {
        const num = parseFloat(val.replace(/[,$]/g, ''));
        if (isNaN(num)) return '';
        return num.toLocaleString();
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#A897C6] px-4 py-3 shadow-sm">
            <span className="text-xl text-gray-400">$</span>
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={() => value && setValue(formatDisplay(value))}
                placeholder="45,000"
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
                autoFocus
            />
            <button
                type="submit"
                disabled={!value || parseFloat(value.replace(/[,$]/g, '')) < 0}
                className="p-3 bg-[#A897C6] text-black rounded-xl hover:bg-[#9787B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </form>
    );
}

function QuartersInput({ onSubmit }: { onSubmit: (value: string) => void }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {QUARTERS_WITH_WAGES_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onSubmit(option.value)}
                    className="p-4 text-left bg-gray-50 border-2 border-[#A897C6] rounded-xl hover:bg-[#E8E0F0] transition-all"
                >
                    <div className="text-2xl font-semibold text-gray-900">{option.value}</div>
                    <div className="text-sm text-gray-500">quarter{option.value !== '1' ? 's' : ''}</div>
                </button>
            ))}
        </div>
    );
}

function HighestQuarterInput({ onSubmit, strings }: { onSubmit: (value: string) => void; strings: ReturnType<typeof getStrings> }) {
    const [mode, setMode] = useState<'specific' | null>(null);
    const [amount, setAmount] = useState('');

    const handleSpecific = () => {
        const val = parseFloat(amount.replace(/[,$]/g, ''));
        if (!isNaN(val) && val >= 0) {
            onSubmit(String(val));
        }
    };

    if (mode === 'specific') {
        return (
            <div className="space-y-4">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">$</span>
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="15,000"
                        className="w-full pl-10 pr-4 py-4 text-xl font-medium bg-gray-50 border-2 border-[#A897C6] rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none transition-all"
                        autoFocus
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setMode(null)}
                        className="flex-1 py-3 px-4 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        {strings.back}
                    </button>
                    <button
                        onClick={handleSpecific}
                        disabled={!amount || parseFloat(amount.replace(/[,$]/g, '')) < 0}
                        className="flex-1 py-3 px-4 font-bold text-black bg-[#A897C6] rounded-xl hover:bg-[#9787B6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {strings.continue}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => onSubmit('even')}
                className="w-full p-4 text-left bg-gray-50 border-2 border-[#A897C6] rounded-xl hover:bg-[#E8E0F0] transition-all"
            >
                <div className="font-medium text-gray-900">{strings.evenQuarter}</div>
                <div className="text-sm text-gray-500 mt-1">{strings.evenQuarterDesc}</div>
            </button>
            <button
                onClick={() => setMode('specific')}
                className="w-full p-4 text-left bg-gray-50 border-2 border-[#A897C6] rounded-xl hover:bg-[#E8E0F0] transition-all"
            >
                <div className="font-medium text-gray-900">{strings.higherQuarter}</div>
                <div className="text-sm text-gray-500 mt-1">{strings.higherQuarterDesc}</div>
            </button>
        </div>
    );
}

function NumberInput({ onSubmit, suffix }: { onSubmit: (value: string) => void; suffix: string }) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
            onSubmit(String(num));
            setValue('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#A897C6] px-4 py-3 shadow-sm">
            <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                min="0"
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
            />
            <span className="text-gray-400">{suffix}</span>
            <button
                type="submit"
                disabled={!value || parseInt(value, 10) < 0}
                className="p-3 bg-[#A897C6] text-black rounded-xl hover:bg-[#9787B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </form>
    );
}

type SeparationType = 'laid_off' | 'quit' | 'fired' | 'other';

const SEPARATION_OPTIONS: { type: SeparationType; label: string; description: string }[] = [
    { type: 'laid_off', label: 'Laid off', description: 'Position eliminated, downsizing, company closed, or contract ended' },
    { type: 'quit', label: 'Quit', description: 'I resigned or left voluntarily' },
    { type: 'fired', label: 'Fired', description: 'I was terminated or let go by my employer' },
    { type: 'other', label: 'Other', description: 'Reduced hours, mutual agreement, or something else' },
];

const FOLLOW_UP_PROMPTS: Record<SeparationType, string> = {
    laid_off: "Got it. Can you briefly describe what happened? For example: Was it a company-wide layoff? Did your position get eliminated? Was it a temporary/contract job that ended?",
    quit: "I understand. What led you to quit? For example: Were there issues with working conditions, pay cuts, safety concerns, or was it for personal reasons?",
    fired: "I see. Can you tell me more about what happened? What reason did your employer give? Do you agree with their reason?",
    other: "Can you describe your situation? For example: Were your hours reduced? Was it a mutual decision? Something else?",
};

function SeparationChatInput({
    onSubmit,
    isStreaming,
    stateCode,
    onAddUserMessage,
    onAddAssistantMessage,
    onUpdateAssistantMessage,
    separationMessages,
    separationOptions,
    getFollowUpPrompt,
    language,
    strings,
}: {
    onSubmit: (narrative: string, separationType: SeparationType) => void;
    isStreaming: boolean;
    stateCode: string | null;
    onAddUserMessage: (content: string) => void;
    onAddAssistantMessage: (content: string) => string; // returns message id
    onUpdateAssistantMessage: (id: string, content: string) => void;
    separationMessages: { role: 'user' | 'assistant'; content: string }[];
    separationOptions: { type: SeparationType; label: string; description: string }[];
    getFollowUpPrompt: (type: SeparationType) => string;
    language: Language;
    strings: ReturnType<typeof getStrings>;
}) {
    const [separationType, setSeparationType] = useState<SeparationType | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentAssistantMsgId, setCurrentAssistantMsgId] = useState<string | null>(null);

    // Throttle refs for smooth streaming
    const lastUpdateRef = useRef<number>(0);
    const pendingContentRef = useRef<string>('');

    const handleSelectType = (type: SeparationType) => {
        setSeparationType(type);
        const option = separationOptions.find(o => o.type === type)!;
        // Add the selection as a user message
        onAddUserMessage(option.label);
        // Add the follow-up prompt as Bruno's response
        onAddAssistantMessage(getFollowUpPrompt(type));
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);
        onAddUserMessage(userMessage);

        // Reset throttle refs
        lastUpdateRef.current = 0;
        pendingContentRef.current = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...separationMessages, { role: 'user', content: userMessage }],
                    state_code: stateCode,
                    language,
                }),
            });

            if (!response.ok) throw new Error('Failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let assistantMsg = '';
            let msgId: string | null = null;
            const THROTTLE_MS = 50; // Update UI at most every 50ms

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                assistantMsg += chunk;

                const now = Date.now();

                // Only create the message bubble once we have actual content
                if (!msgId && assistantMsg.length > 0) {
                    setIsLoading(false);
                    msgId = onAddAssistantMessage(assistantMsg);
                    setCurrentAssistantMsgId(msgId);
                    lastUpdateRef.current = now;
                } else if (msgId) {
                    // Throttle updates to reduce re-renders
                    if (now - lastUpdateRef.current >= THROTTLE_MS) {
                        onUpdateAssistantMessage(msgId, assistantMsg);
                        lastUpdateRef.current = now;
                    } else {
                        pendingContentRef.current = assistantMsg;
                    }
                }
            }

            // Final update to ensure all content is displayed
            if (msgId) {
                onUpdateAssistantMessage(msgId, assistantMsg);
            }
        } catch {
            setIsLoading(false);
            onAddAssistantMessage("Sorry, I had trouble responding. Please try again.");
        } finally {
            setIsLoading(false);
            setCurrentAssistantMsgId(null);
            pendingContentRef.current = '';
        }
    };

    // Get narrative excluding the initial type selection
    const getNarrative = () => {
        const userMessages = separationMessages.filter(m => m.role === 'user');
        // Skip the first message (separation type label) and get the actual narrative
        return userMessages.slice(1).map(m => m.content).join('\n\n');
    };

    // Need type selected + at least one narrative message
    const hasEnoughInfo = separationType && separationMessages.filter(m => m.role === 'user').length >= 2;

    // Step 1: Show separation type selection
    if (!separationType) {
        return (
            <div className="grid grid-cols-2 gap-3">
                {separationOptions.map((option) => (
                    <button
                        key={option.type}
                        onClick={() => handleSelectType(option.type)}
                        className="p-4 text-left bg-gray-50 border-2 border-[#A897C6] rounded-xl hover:bg-[#E8E0F0] transition-all"
                    >
                        <div className="text-2xl font-semibold text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                ))}
            </div>
        );
    }

    // Step 2: Show chat input after type selected
    return (
        <div className="space-y-4">
            {/* Bruno is thinking indicator */}
            {isLoading && (
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm">{strings.brunoThinking}</span>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-3 bg-white rounded-2xl border-2 border-[#A897C6] px-4 py-3 shadow-sm">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={strings.describeWhat}
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
                    disabled={isLoading || isStreaming}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isStreaming}
                    className="p-3 bg-[#A897C6] text-black rounded-xl hover:bg-[#9787B6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>

            {/* Submit for assessment - show after user has typed at least one message */}
            {hasEnoughInfo && !isLoading && (
                <button
                    onClick={() => onSubmit(getNarrative(), separationType)}
                    disabled={isLoading || isStreaming}
                    className="w-full py-4 px-6 text-lg font-bold text-black bg-[#A897C6] rounded-xl hover:bg-[#9787B6] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {strings.getAssessment}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            )}

                    </div>
    );
}

function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
    if (disabled) return null;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 text-base font-semibold text-black hover:text-gray-700 transition-colors"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            back
        </button>
    );
}

function MonetaryFailure({ result, onReset, strings }: { result: MonetaryEligibilityResult; onReset: () => void; strings: ReturnType<typeof getStrings> }) {
    const failedChecks = result.checks.filter(c => c.required && !c.passed);
    const passedChecks = result.checks.filter(c => c.required && c.passed);

    return (
        <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-red-900">{strings.monetaryFailTitle}</h3>
                        <p className="mt-1 text-red-700 text-sm">{translateSummary(result.summary, result, strings)}</p>
                    </div>
                </div>

                {(failedChecks.length > 0 || passedChecks.length > 0) && (
                    <div className="mt-4 space-y-2 pl-11">
                        {failedChecks.map((check, i) => (
                            <div key={`fail-${i}`} className="flex items-start gap-2 text-sm">
                                <span className="text-red-500">✗</span>
                                <span className="text-red-700">{translateCheckExplanation(check, strings)}</span>
                            </div>
                        ))}
                        {passedChecks.map((check, i) => (
                            <div key={`pass-${i}`} className="flex items-start gap-2 text-sm">
                                <span className="text-green-600">✓</span>
                                <span className="text-gray-700">{translateCheckExplanation(check, strings)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-2">{strings.whatYouCanDo}</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                    <li>• {strings.contactOffice}</li>
                    <li>• {strings.askAlternative}</li>
                    <li>• {strings.checkCircumstances}</li>
                </ul>
            </div>

            <button
                onClick={onReset}
                className="w-full py-3 px-6 font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
                {strings.startOver}
            </button>
        </div>
    );
}

function MonetarySuccess({ result, onContinue, strings }: { result: MonetaryEligibilityResult; onContinue: () => void; strings: ReturnType<typeof getStrings> }) {
    const passedChecks = result.checks.filter(c => c.required && c.passed);

    return (
        <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-medium text-green-900">{strings.monetaryPassTitle}</h3>
                        <p className="mt-1 text-green-700 text-sm">{translateSummary(result.summary, result, strings)}</p>
                    </div>
                </div>

                {passedChecks.length > 0 && (
                    <div className="mt-4 space-y-2 pl-11">
                        {passedChecks.map((check, i) => (
                            <div key={`pass-${i}`} className="flex items-start gap-2 text-sm">
                                <span className="text-green-600">✓</span>
                                <span className="text-gray-700">{translateCheckExplanation(check, strings)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                    {strings.monetaryNext}
                </p>
            </div>

            <button
                onClick={onContinue}
                className="w-full py-4 px-6 text-lg font-bold text-black bg-[#A897C6] rounded-xl hover:bg-[#9787B6] transition-all flex items-center justify-center gap-2"
            >
                {strings.continue}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </button>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConversationalAssessment() {
    const [language, setLanguage] = useState<Language | null>(null);
    const [step, setStep] = useState<StepId>('intro');
    const [userData, setUserData] = useState<UserData>({
        name: null,
        stateCode: null,
        basePeriodWages: null,
        quartersWithWages: null,
        highestQuarterWages: null,
        hoursWorked: null,
        weeksWorked: null,
        separationNarrative: null,
    });
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [conditionalSteps, setConditionalSteps] = useState<ConditionalSteps>({
        needsHours: false,
        needsWeeks: false,
    });
    const [monetaryResult, setMonetaryResult] = useState<MonetaryEligibilityResult | null>(null);
    const [assessmentResult, setAssessmentResult] = useState<AssessmentResultData | null>(null);
    const [benefitData, setBenefitData] = useState<BenefitData | null>(null);
    const [isAssessing, setIsAssessing] = useState(false);
    const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
    const [separationMessages, setSeparationMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    // Get i18n strings based on selected language
    const t = language ? getStrings(language) : getStrings('en');

    // Get translated prompt for a step
    const getStepPrompt = useCallback((stepId: StepId, data: UserData): string => {
        const required = data.stateCode ? getRequiredInputs(data.stateCode) : null;
        switch (stepId) {
            case 'intro': return t.intro;
            case 'ask_name': return t.askName;
            case 'greet': return t.greet(data.name || '');
            case 'ask_state': return t.askState(data.name || '');
            case 'wages': return t.wages;
            case 'quarters': return t.quarters;
            case 'highest_quarter': return t.highestQuarter;
            case 'hours': return t.hours(required?.min_hours || 680);
            case 'weeks': return t.weeks(required?.min_weeks || 20);
            case 'separation': return t.separation;
            case 'assessing': return t.assessing;
            default: return '';
        }
    }, [t]);

    // Get translated separation options
    const separationOptions = useMemo(() => [
        { type: 'laid_off' as const, label: t.laidOff, description: t.laidOffDesc },
        { type: 'quit' as const, label: t.quit, description: t.quitDesc },
        { type: 'fired' as const, label: t.fired, description: t.firedDesc },
        { type: 'other' as const, label: t.other, description: t.otherDesc },
    ], [t]);

    // Get translated follow-up prompts
    const getFollowUpPrompt = useCallback((type: SeparationType): string => {
        switch (type) {
            case 'laid_off': return t.followUpLaidOff;
            case 'quit': return t.followUpQuit;
            case 'fired': return t.followUpFired;
            case 'other': return t.followUpOther;
        }
    }, [t]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const lastAddedStepRef = useRef<StepId | null>(null);

    // Callbacks for separation chat integration
    const handleAddUserMessage = useCallback((content: string) => {
        const newMsg: Message = { id: `user-${Date.now()}`, from: 'user', content };
        setMessages(prev => [...prev, newMsg]);
        setSeparationMessages(prev => [...prev, { role: 'user', content }]);
    }, []);

    const handleAddAssistantMessage = useCallback((content: string): string => {
        const id = `bruno-sep-${Date.now()}`;
        const newMsg: Message = { id, from: 'bruno', content };
        setMessages(prev => [...prev, newMsg]);
        setSeparationMessages(prev => [...prev, { role: 'assistant', content }]);
        return id;
    }, []);

    const handleUpdateAssistantMessage = useCallback((id: string, content: string) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
        setSeparationMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1] = { ...updated[updated.length - 1], content };
            }
            return updated;
        });
    }, []);

    // Scroll to bottom (but not on results page)
    useEffect(() => {
        if (step !== 'results' && step !== 'monetary_failure') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, step]);

    // Scroll to top when entering results
    useEffect(() => {
        if (step === 'results' || step === 'monetary_failure') {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [step]);

    // Add Bruno message - only when step actually changes
    const addBrunoMessage = useCallback((content: string, forStep: StepId) => {
        if (lastAddedStepRef.current === forStep) return; // Prevent duplicates
        lastAddedStepRef.current = forStep;

        setIsTyping(true);
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { id: `bruno-${Date.now()}`, from: 'bruno', content },
            ]);
            setIsTyping(false);
        }, 800);
    }, []);

    // Handle step changes
    useEffect(() => {
        // Don't add messages before language is selected
        if (!language) return;

        if (step === 'results' || step === 'monetary_failure' || step === 'assessing' || step === 'monetary_check') {
            return;
        }

        const config = STEPS[step];
        const prompt = getStepPrompt(step, userData);

        if (prompt) {
            addBrunoMessage(prompt, step);
        }

        // Auto-advance for 'none' input types
        if (config.inputType === 'none' && config.autoAdvanceDelay) {
            const timer = setTimeout(() => {
                const nextStep = config.getNextStep(userData, conditionalSteps);
                setStep(nextStep);
            }, config.autoAdvanceDelay + 800);
            return () => clearTimeout(timer);
        }
    }, [step, language]); // Include language so effect runs when language is first selected

    // Update conditional steps when state changes
    useEffect(() => {
        if (userData.stateCode) {
            const required = getRequiredInputs(userData.stateCode);
            setConditionalSteps({
                needsHours: required.needs_hours,
                needsWeeks: required.needs_weeks,
                minHours: required.min_hours,
                minWeeks: required.min_weeks,
            });
        }
    }, [userData.stateCode]);

    // Build properly typed highest quarter wages
    const buildHighestQuarterWages = (hq: { mode: 'even' | 'specific'; amount?: number }) => {
        if (hq.mode === 'specific' && hq.amount !== undefined) {
            return { mode: 'specific' as const, amount: hq.amount };
        }
        return { mode: 'even' as const };
    };

    // Run monetary eligibility check
    const runMonetaryCheck = useCallback(() => {
        if (!userData.stateCode || userData.basePeriodWages === null ||
            userData.quartersWithWages === null || !userData.highestQuarterWages) {
            return null;
        }

        const input = {
            state_code: userData.stateCode,
            base_period_wages: userData.basePeriodWages,
            quarters_with_wages: userData.quartersWithWages,
            highest_quarter_wages: buildHighestQuarterWages(userData.highestQuarterWages),
            hours_worked: userData.hoursWorked ?? undefined,
            weeks_worked: userData.weeksWorked ?? undefined,
        };

        const monetaryInputs = convertToMonetaryInputs(input);
        const result = runMonetaryEligibility(monetaryInputs);
        setMonetaryResult(result);
        return result;
    }, [userData]);

    // Format monetary result as detailed message
    const formatMonetaryMessage = useCallback((result: MonetaryEligibilityResult) => {
        const passedChecks = result.checks.filter(c => c.required && c.passed);
        const failedChecks = result.checks.filter(c => c.required && !c.passed);

        let message = result.eligible
            ? `${t.monetaryPass}\n\n`
            : `${t.monetaryFail}\n\n`;

        if (failedChecks.length > 0) {
            failedChecks.forEach(check => {
                message += `✗ ${translateCheckExplanation(check, t)}\n`;
            });
        }

        if (passedChecks.length > 0) {
            passedChecks.forEach(check => {
                message += `✓ ${translateCheckExplanation(check, t)}\n`;
            });
        }

        return message.trim();
    }, [t]);

    // Handle monetary check step
    useEffect(() => {
        if (step !== 'monetary_check') return;

        // Run the monetary eligibility check
        const result = runMonetaryCheck();
        if (!result) return;

        // Add Bruno's detailed message about the result
        const message = formatMonetaryMessage(result);

        setMessages(prev => [...prev, {
            id: `bruno-monetary-${Date.now()}`,
            from: 'bruno',
            content: message,
        }]);

        // If not eligible, move to failure step
        if (!result.eligible) {
            setStep('monetary_failure');
        }
    }, [step, runMonetaryCheck, formatMonetaryMessage]);

    // Handle user input
    const handleInput = useCallback((input: string) => {
        const config = STEPS[step];

        // Validate if needed
        if (config.validate && !config.validate(input)) {
            return;
        }

        // Save current state to history before advancing (for steps that accept user input)
        if (config.inputType !== 'none') {
            setHistory(prev => [...prev, {
                step,
                userData,
                messages,
                separationMessages,
                conditionalSteps,
            }]);
        }

        // Format display message
        let displayMessage = input;
        if (step === 'ask_state') {
            const state = US_STATES.find(s => s.code === input);
            displayMessage = state ? `${state.name} (${state.code})` : input;
        } else if (step === 'wages') {
            displayMessage = `$${parseFloat(input).toLocaleString()}`;
        } else if (step === 'quarters') {
            displayMessage = `${input} ${t.quarterUnit(parseInt(input))}`;
        } else if (step === 'highest_quarter') {
            displayMessage = input === 'even' ? t.evenQuarter : `$${parseFloat(input).toLocaleString()} ${t.inMyHighestQuarter}`;
        } else if (step === 'hours') {
            displayMessage = `${parseInt(input).toLocaleString()} ${t.hoursUnit}`;
        } else if (step === 'weeks') {
            displayMessage = `${input} ${t.weeksUnit}`;
        }

        // Add user message (except for separation which handles its own)
        if (step !== 'separation') {
            setMessages((prev) => [
                ...prev,
                { id: `user-${Date.now()}`, from: 'user', content: displayMessage },
            ]);
        }

        // Update user data
        let newUserData = userData;
        if (config.onSubmit) {
            const updates = config.onSubmit(input, userData);
            newUserData = { ...userData, ...updates };
            setUserData(newUserData);
        }

        // Get next step using potentially updated conditional steps
        let nextConditionalSteps = conditionalSteps;
        if (step === 'ask_state') {
            const required = getRequiredInputs(input);
            nextConditionalSteps = {
                needsHours: required.needs_hours,
                needsWeeks: required.needs_weeks,
                minHours: required.min_hours,
                minWeeks: required.min_weeks,
            };
        }

        // Get next step
        const nextStep = config.getNextStep(newUserData, nextConditionalSteps);

        // Move to next step
        setTimeout(() => {
            setStep(nextStep);
        }, 300);
    }, [step, userData, messages, separationMessages, conditionalSteps]);

    // Handle separation assessment submission
    const handleAssessmentSubmit = useCallback(async (narrative: string, separationType: SeparationType) => {
        // Save current state to history before advancing
        setHistory(prev => [...prev, {
            step,
            userData,
            messages,
            separationMessages,
            conditionalSteps,
        }]);

        setUserData(prev => ({ ...prev, separationNarrative: narrative }));
        setStep('assessing');
        setIsAssessing(true);

        // Add assessing message
        setMessages(prev => [...prev, {
            id: `bruno-${Date.now()}`,
            from: 'bruno',
            content: t.assessing
        }]);

        try {
            let hqWages = userData.basePeriodWages! / 4;
            if (userData.highestQuarterWages?.mode === 'specific' && userData.highestQuarterWages.amount) {
                hqWages = userData.highestQuarterWages.amount;
            }

            const response = await fetch('/api/separation-assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state_code: userData.stateCode,
                    separation_type: separationType,
                    separation_narrative: narrative,
                    base_period_wages: userData.basePeriodWages,
                    highest_quarter_wages: hqWages,
                    language,
                }),
            });

            if (!response.ok) throw new Error('Assessment failed');

            const data = await response.json();

            setAssessmentResult({
                assessment: data.assessment.likelihood,
                confidence_score: data.assessment.confidence_score,
                reasoning_summary: data.assessment.reasoning_summary,
                risk_factors: data.assessment.risk_factors,
                key_citations: data.assessment.key_citations,
            });

            if (data.benefit_calculation) {
                setBenefitData(data.benefit_calculation);
            }

            setStep('results');
        } catch (error) {
            console.error('Assessment error:', error);
            setAssessmentResult({
                assessment: 'uncertain',
                confidence_score: 30,
                reasoning_summary: 'We had trouble analyzing your case. Please try again or contact your state unemployment office.',
                risk_factors: ['Unable to complete analysis'],
                key_citations: [],
            });
            setStep('results');
        } finally {
            setIsAssessing(false);
        }
    }, [step, userData, messages, separationMessages, conditionalSteps]);

    // Reset everything
    const handleReset = useCallback(() => {
        setStep('intro');
        setUserData({
            name: null,
            stateCode: null,
            basePeriodWages: null,
            quartersWithWages: null,
            highestQuarterWages: null,
            hoursWorked: null,
            weeksWorked: null,
            separationNarrative: null,
        });
        setMessages([]);
        setConditionalSteps({ needsHours: false, needsWeeks: false });
        setMonetaryResult(null);
        setAssessmentResult(null);
        setBenefitData(null);
        setAnimatedMessageIds(new Set());
        setSeparationMessages([]);
        setHistory([]);
        lastAddedStepRef.current = null;
    }, []);

    // Go back to previous step
    const goBack = useCallback(() => {
        if (history.length === 0) return;

        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));

        setStep(previousState.step);
        setUserData(previousState.userData);
        setMessages(previousState.messages);
        setSeparationMessages(previousState.separationMessages);
        setConditionalSteps(previousState.conditionalSteps);
        setMonetaryResult(null);
        lastAddedStepRef.current = previousState.step;
    }, [history]);

    // Check if back is available
    const canGoBack = history.length > 0 &&
        step !== 'intro' &&
        step !== 'assessing' &&
        step !== 'results';

    // Calculate progress
    const allSteps: StepId[] = useMemo(() => {
        const steps: StepId[] = ['intro', 'ask_name', 'greet', 'ask_state', 'wages', 'quarters', 'highest_quarter'];
        if (conditionalSteps.needsHours) steps.push('hours');
        if (conditionalSteps.needsWeeks) steps.push('weeks');
        steps.push('monetary_check', 'separation', 'results');
        return steps;
    }, [conditionalSteps]);

    const currentStepIndex = allSteps.indexOf(step);
    const progress = Math.max(0, Math.min(100, ((currentStepIndex + 1) / allSteps.length) * 100));

    // Get current step config
    const currentConfig = STEPS[step];

    // Handle continue from monetary check to separation
    const handleMonetaryContinue = useCallback(() => {
        // Save current state to history before advancing
        setHistory(prev => [...prev, {
            step,
            userData,
            messages,
            separationMessages,
            conditionalSteps,
        }]);
        setStep('separation');
    }, [step, userData, messages, separationMessages, conditionalSteps]);

    // Render input for current step
    const renderInput = () => {
        if (step === 'monetary_failure' && monetaryResult) {
            return (
                <div ref={resultsRef}>
                    <MonetaryFailure result={monetaryResult} onReset={handleReset} strings={t} />
                </div>
            );
        }

        if (step === 'monetary_check' && monetaryResult && monetaryResult.eligible) {
            return <MonetarySuccess result={monetaryResult} onContinue={handleMonetaryContinue} strings={t} />;
        }

        if (step === 'results') {
            return (
                <div ref={resultsRef} className="space-y-6">
                    {assessmentResult && <AssessmentResults result={assessmentResult} strings={t} />}
                    {benefitData && userData.stateCode && (
                        <BenefitsDisplay benefits={benefitData} stateCode={userData.stateCode} strings={t} />
                    )}
                    <button
                        onClick={handleReset}
                        className="w-full py-3 px-6 font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        {t.startNew}
                    </button>
                </div>
            );
        }

        if (step === 'assessing') {
            return (
                <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-4">
                        <svg className="w-10 h-10 text-[#A897C6] animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-gray-600">{t.analyzing}</p>
                    </div>
                </div>
            );
        }

        switch (currentConfig.inputType) {
            case 'text':
                return <TextInput onSubmit={handleInput} placeholder={t.typeName} />;
            case 'state_select':
                return <StateSelectorWithChat onSelect={handleInput} placeholder={t.searchStates} />;
            case 'currency':
                return <CurrencyInput onSubmit={handleInput} />;
            case 'quarters':
                return <QuartersInput onSubmit={handleInput} />;
            case 'highest_quarter':
                return <HighestQuarterInput onSubmit={handleInput} strings={t} />;
            case 'number':
                return <NumberInput onSubmit={handleInput} suffix={step === 'hours' ? t.hoursUnit : t.weeksUnit} />;
            case 'separation_chat':
                return (
                    <SeparationChatInput
                        onSubmit={handleAssessmentSubmit}
                        isStreaming={isAssessing}
                        stateCode={userData.stateCode}
                        onAddUserMessage={handleAddUserMessage}
                        onAddAssistantMessage={handleAddAssistantMessage}
                        onUpdateAssistantMessage={handleUpdateAssistantMessage}
                        separationMessages={separationMessages}
                        separationOptions={separationOptions}
                        getFollowUpPrompt={getFollowUpPrompt}
                        language={language!}
                        strings={t}
                    />
                );
            case 'none':
            default:
                return <UnifiedChatInput onSubmit={() => {}} placeholder="Type your message..." disabled={true} />;
        }
    };

    // Language selector - show first before anything else
    if (!language) {
        return (
            <div className="relative h-screen overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#D8EEF6' }}>
                <div className="absolute top-6 left-6 z-10">
                    <span className="text-4xl font-black text-black tracking-tight" style={{ fontWeight: 950 }}>bruno</span>
                </div>
                <div className="text-center space-y-8">
                    <BrunoAvatar brunoState="idle" mouthState="closed" size="lg" className="mx-auto" />
                    <div className="space-y-4">
                        <button
                            onClick={() => setLanguage('en')}
                            className="block w-56 mx-auto py-4 px-6 text-xl font-bold text-black bg-[#A897C6] rounded-xl hover:bg-[#9787B6] transition-colors"
                        >
                            English
                        </button>
                        <button
                            onClick={() => setLanguage('es')}
                            className="block w-56 mx-auto py-4 px-6 text-xl font-bold text-black bg-[#A897C6] rounded-xl hover:bg-[#9787B6] transition-colors"
                        >
                            Español
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen overflow-hidden" style={{ backgroundColor: '#D8EEF6' }}>
            {/* Logo */}
            <div className="absolute top-6 left-6 z-10">
                <span className="text-4xl font-black text-black tracking-tight" style={{ fontWeight: 950 }}>bruno</span>
            </div>

            {/* Desktop layout - chat centered with Bruno to the left */}
            <div className="hidden lg:flex h-full items-center justify-start pl-12">
                {/* Bruno Avatar - positioned to the left of chat */}
                <div className="flex-shrink-0 mr-8">
                    <BrunoAvatar
                        brunoState={isAssessing ? 'thinking' : 'idle'}
                        mouthState="closed"
                        size="xl"
                        className="!w-[700px] !h-[700px]"
                    />
                </div>

                {/* Chat - centered */}
                <div className="w-full max-w-md h-full flex flex-col py-6">
                    {/* Progress bar with back button */}
                    {step !== 'results' && step !== 'monetary_failure' && (
                        <div className="flex-shrink-0 px-4 pb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <BackButton onClick={goBack} disabled={!canGoBack} />
                            </div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#A897C6] transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Messages - hidden on results page */}
                    {step !== 'results' && step !== 'monetary_failure' && (
                        <div className="flex-1 overflow-y-auto px-4 flex flex-col justify-end">
                            <div className="space-y-4 w-full">
                                {messages.map((msg, index) => {
                                    const isLatestBrunoMessage = msg.from === 'bruno' &&
                                        index === messages.length - 1;
                                    // Don't animate streamed messages (they already have natural typing from streaming)
                                    const isStreamedMessage = msg.id.startsWith('bruno-sep-');
                                    const shouldAnimate = isLatestBrunoMessage && !animatedMessageIds.has(msg.id) && !isStreamedMessage;

                                    return (
                                        <ChatBubble
                                            key={msg.id}
                                            message={msg}
                                            animate={shouldAnimate}
                                            onAnimationComplete={() => {
                                                setAnimatedMessageIds(prev => new Set([...prev, msg.id]));
                                            }}
                                        />
                                    );
                                })}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-2xl rounded-bl-md">
                                            <TypingIndicator />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Input/Results Area */}
                    <div className={step === 'results' || step === 'monetary_failure'
                        ? "flex-1 overflow-y-auto px-4 py-4"
                        : "flex-shrink-0 px-4 pt-4"
                    }>
                        {renderInput()}
                    </div>

                    {/* Footer */}
                    <footer className="flex-shrink-0 px-4 pt-4 pb-2">
                        <p className="text-center text-xs text-gray-400">
                            {t.footer}
                        </p>
                    </footer>
                </div>
            </div>

            {/* Mobile: Stacked layout */}
            <div className="lg:hidden h-full flex flex-col">
                {/* Mobile Bruno Header */}
                <div className="flex-shrink-0 flex items-center gap-3 px-6 pt-6">
                    <BrunoAvatar
                        brunoState={isAssessing ? 'thinking' : 'idle'}
                        mouthState="closed"
                        size="sm"
                        className="!w-12 !h-12"
                    />
                    <div>
                        <div className="font-semibold text-gray-900">Bruno</div>
                        <div className="text-xs text-gray-500">Unemployment Assistant</div>
                    </div>
                </div>

                {/* Progress bar with back button */}
                {step !== 'results' && step !== 'monetary_failure' && (
                    <div className="flex-shrink-0 px-6 pt-4">
                        <div className="flex items-center gap-3 mb-2">
                            <BackButton onClick={goBack} disabled={!canGoBack} />
                        </div>
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#A897C6] transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Messages - hidden on results page */}
                {step !== 'results' && step !== 'monetary_failure' && (
                    <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-end">
                        <div className="space-y-4 w-full">
                            {messages.map((msg, index) => {
                                const isLatestBrunoMessage = msg.from === 'bruno' &&
                                    index === messages.length - 1;
                                // Don't animate streamed messages (they already have natural typing from streaming)
                                const isStreamedMessage = msg.id.startsWith('bruno-sep-');
                                const shouldAnimate = isLatestBrunoMessage && !animatedMessageIds.has(msg.id) && !isStreamedMessage;

                                return (
                                    <ChatBubble
                                        key={msg.id}
                                        message={msg}
                                        animate={shouldAnimate}
                                        onAnimationComplete={() => {
                                            setAnimatedMessageIds(prev => new Set([...prev, msg.id]));
                                        }}
                                    />
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 rounded-2xl rounded-bl-md">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}

                {/* Input/Results Area */}
                <div className={step === 'results' || step === 'monetary_failure'
                    ? "flex-1 overflow-y-auto px-6 py-6"
                    : "flex-shrink-0 px-6 pb-6"
                }>
                    {renderInput()}
                </div>

                {/* Footer */}
                <footer className="flex-shrink-0 px-6 py-3">
                    <p className="text-center text-xs text-gray-400">
                        {t.footer}
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default ConversationalAssessment;
