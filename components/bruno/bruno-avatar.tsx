'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import type { BrunoState, MouthState } from '@/types/bruno';
import { BrunoMouth } from './bruno-mouth';

// ============================================================================
// TYPES
// ============================================================================

interface BrunoAvatarProps {
  brunoState: BrunoState;
  mouthState: MouthState;
  showMouth?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CLASSES = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-80 h-80',
  xl: 'w-96 h-96',
} as const;

const MOUTH_POSITIONS = {
  sm: 'bottom-[20%] left-1/2 -translate-x-1/2 w-10 h-5',
  md: 'bottom-[20%] left-1/2 -translate-x-1/2 w-14 h-7',
  lg: 'bottom-[20%] left-1/2 -translate-x-1/2 w-20 h-10',
  xl: 'bottom-[20%] left-1/2 -translate-x-1/2 w-24 h-12',
} as const;

// State-based image mapping
const BRUNO_IMAGES: Record<BrunoState, { base: string; blink: string | null }> = {
  idle: {
    base: '/bruno/bruno-idle.png',
    blink: '/bruno/bruno-blinking.png',
  },
  talking: {
    base: '/bruno/bruno-talking.png',
    blink: '/bruno/bruno-talkingblinking.png',
  },
  thinking: {
    base: '/bruno/bruno-thinking.png',
    blink: null, // No blinking during thinking
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BrunoAvatar({
  brunoState,
  mouthState,
  showMouth = true,
  size = 'md',
  className = '',
}: BrunoAvatarProps) {
  // Get images for current state
  const images = BRUNO_IMAGES[brunoState];

  // Determine animation class based on state
  const animationClass = (() => {
    switch (brunoState) {
      case 'idle':
        return 'animate-bruno-idle';
      case 'talking':
        return 'animate-bruno-talking';
      case 'thinking':
        return 'animate-bruno-thinking';
      default:
        return 'animate-bruno-idle';
    }
  })();

  return (
    <div
      className={cn(
        'relative animate-bruno-enter bruno',
        SIZE_CLASSES[size],
        className
      )}
    >
      {/* Base avatar image with state animation */}
      <div className={cn('w-full h-full', animationClass)}>
        <Image
          src={images.base}
          alt="Bruno"
          fill
          className="object-contain"
          priority
          unoptimized
        />

      </div>

      {/* Mouth overlay for lip sync (only when talking) */}
      {showMouth && brunoState === 'talking' && (
        <BrunoMouth
          mouthState={mouthState}
          className={MOUTH_POSITIONS[size]}
        />
      )}
    </div>
  );
}

export default BrunoAvatar;
