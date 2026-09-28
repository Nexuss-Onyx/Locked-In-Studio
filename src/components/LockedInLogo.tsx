import React from 'react';
import { motion } from 'motion/react';

interface LockedInLogoProps {
  size?: number; // Size in px (default 48px)
  isLockedIn?: boolean; // Active focus session state
  className?: string;
}

export const LockedInLogo: React.FC<LockedInLogoProps> = ({
  size = 48,
  isLockedIn = false,
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-[#1A1612] border border-[#D8C9A3]/30 shadow-md shrink-0 select-none overflow-hidden ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Padlock + Stopwatch Fusion Logomark */}
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* 1. U-SHAPED SHACKLE / CROWN (Bronze) */}
        {/* At rest: slightly raised (-3.5px) for open/unlocked state */}
        {/* When locked-in: animates closed (0px) */}
        <motion.path
          d="M 23.5 24 V 16 A 8.5 8.5 0 0 1 40.5 16 V 24"
          stroke="#A38350"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={false}
          animate={{
            y: isLockedIn ? 0 : -3.5,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 22,
          }}
        />

        {/* 2. CIRCULAR STOPWATCH / PADLOCK BODY (Brand Gold) */}
        <circle
          cx="32"
          cy="37"
          r="17"
          stroke="#D8C9A3"
          strokeWidth="3.5"
          fill="none"
        />

        {/* 3. SINGLE CLOCK HAND (Brand Gold) */}
        {/* At rest: still at 12 o'clock */}
        {/* When locked-in: sweeps slowly (1 rotation per 60 seconds) */}
        <motion.line
          x1="32"
          y1="37"
          x2="32"
          y2="24"
          stroke="#D8C9A3"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transformOrigin: '32px 37px' }}
          animate={
            isLockedIn
              ? { rotate: [0, 360] }
              : { rotate: 0 }
          }
          transition={
            isLockedIn
              ? { duration: 60, ease: 'linear', repeat: Infinity }
              : { duration: 0.3 }
          }
        />

        {/* Center Pivot Point Dot */}
        <circle cx="32" cy="37" r="2.2" fill="#D8C9A3" />
      </svg>
    </div>
  );
};
