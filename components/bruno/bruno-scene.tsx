'use client';

import { cn } from '@/lib/utils/cn';
import type { BrunoState, MouthState } from '@/types/bruno';
import { BrunoAvatar } from './bruno-avatar';
import { SpeechBubble } from './speech-bubble';

// ============================================================================
// TYPES
// ============================================================================

interface BrunoSceneProps {
  brunoState: BrunoState;
  mouthState: MouthState;
  message: string;
  isTyping?: boolean;
  onTypingComplete?: () => void;
  avatarSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BrunoScene({
  brunoState,
  mouthState,
  message,
  isTyping = false,
  onTypingComplete,
  avatarSize = 'md',
  className = '',
}: BrunoSceneProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4',
        className
      )}
    >
      {/* Bruno Avatar */}
      <div className="flex-shrink-0">
        <BrunoAvatar
          brunoState={brunoState}
          mouthState={mouthState}
          size={avatarSize}
        />
      </div>

      {/* Speech Bubble */}
      <div className="flex-1 pt-4">
        <SpeechBubble
          message={message}
          isTyping={isTyping}
          onTypingComplete={onTypingComplete}
        />
      </div>
    </div>
  );
}

export default BrunoScene;
