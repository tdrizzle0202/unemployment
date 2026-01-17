'use client';

import Image from 'next/image';
import type { MouthState } from '@/types/bruno';

// ============================================================================
// TYPES
// ============================================================================

interface BrunoMouthProps {
  mouthState: MouthState;
  className?: string;
}

// ============================================================================
// MOUTH IMAGES MAP
// ============================================================================

const MOUTH_IMAGES: Record<MouthState, string> = {
  closed: '/bruno/mouth-closed.png',
  'open-1': '/bruno/mouth-open-1.png',
  'open-2': '/bruno/mouth-open-2.png',
  'open-3': '/bruno/mouth-open-3.png',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BrunoMouth({ mouthState, className = '' }: BrunoMouthProps) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <Image
        src={MOUTH_IMAGES[mouthState]}
        alt=""
        width={80}
        height={40}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}

export default BrunoMouth;
