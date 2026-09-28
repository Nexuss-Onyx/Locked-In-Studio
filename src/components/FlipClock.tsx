import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from 'lucide-react';

interface SolidTileProps {
  value: string;
  className?: string;
  textSize?: string;
  textColor?: string;
  subLabel?: string;
  subLabelPos?: 'bottom-left' | 'bottom-right';
}

// Single solid unbroken tile (Luxury Horology Styling)
const SolidTile: React.FC<SolidTileProps> = ({
  value,
  className = 'flex-1 max-w-[72px] h-[48px] sm:h-[52px]',
  textSize = 'text-2xl sm:text-3xl',
  textColor = 'text-[#FDFBFA]',
  subLabel,
  subLabelPos = 'bottom-left',
}) => {
  return (
    <div
      className={`relative ${className} rounded-xl bg-gradient-to-b from-[#251E17] to-[#15110D] border border-[#3F3323] shadow-[0_4px_16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,245,220,0.08)] flex items-center justify-center overflow-hidden select-none shrink-0 group`}
    >
      {/* Top subtle gold specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent pointer-events-none" />

      {/* Solid Unbroken Digits Container with Smooth Notebook Slide */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            initial={{ y: '65%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-65%', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`font-mono font-bold tracking-tight ${textSize} ${textColor} leading-none select-none`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Solid Sub-label (e.g. AM / PM) positioned cleanly in corner */}
      {subLabel && (
        <span
          className={`absolute ${
            subLabelPos === 'bottom-left' ? 'bottom-1 left-1.5' : 'bottom-1 right-1.5'
          } text-[7.5px] sm:text-[8px] font-mono font-bold tracking-wider text-[#D4AF37]/80 select-none z-10 pointer-events-none`}
        >
          {subLabel}
        </span>
      )}
    </div>
  );
};

export const FlipClock: React.FC = () => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Time calculations
  const rawHours = now.getHours();
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = rawHours % 12 || 12;
  const hoursStr = hours12.toString().padStart(2, '0');
  const minutesStr = now.getMinutes().toString().padStart(2, '0');
  const secondsStr = now.getSeconds().toString().padStart(2, '0');

  // Linear Date Segment formatting
  const weekdayShort = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayStr = now.getDate().toString().padStart(2, '0');
  const monthShort = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const yearStr = now.getFullYear().toString();

  return (
    <div
      className="w-full p-2 sm:p-2.5 rounded-2xl bg-[#14100C]/95 border border-[#D4AF37]/20 shadow-2xl select-none space-y-2"
    >
      {/* 1. Linear Responsive Date Row: Luxury Horology Presentation */}
      <div className="w-full flex items-center justify-center px-2 py-1.5 rounded-xl bg-gradient-to-r from-[#201A14] via-[#14110E] to-[#201A14] border border-[#D4AF37]/25">
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono whitespace-nowrap overflow-hidden">
          <Calendar className="w-3 h-3 text-[#E5C158] shrink-0" />
          
          <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
            {/* Weekday badge */}
            <span className="font-bold text-[#E5C158] tracking-wider">
              {weekdayShort}
            </span>

            <span className="text-stone-600 text-[10px]">/</span>

            {/* Day */}
            <span className="font-semibold text-white">
              {dayStr}
            </span>

            <span className="text-stone-600 text-[10px]">·</span>

            {/* Month */}
            <span className="font-semibold text-stone-200">
              {monthShort}
            </span>

            <span className="text-stone-600 text-[10px]">·</span>

            {/* Year */}
            <span className="font-normal text-stone-400">
              {yearStr}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Responsive Solid Time Tiles: Adapts fluidly across device widths */}
      <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 pt-0.5">
        {/* Hours Tile with AM/PM label */}
        <SolidTile
          value={hoursStr}
          className="flex-1 min-w-[56px] max-w-[72px] h-[48px] sm:h-[52px]"
          textSize="text-2xl sm:text-3xl"
          subLabel={ampm}
          subLabelPos="bottom-right"
        />

        {/* Minutes Tile */}
        <SolidTile
          value={minutesStr}
          className="flex-1 min-w-[56px] max-w-[72px] h-[48px] sm:h-[52px]"
          textSize="text-2xl sm:text-3xl"
        />

        {/* Seconds Tile */}
        <div className="pb-0.5">
          <SolidTile
            value={secondsStr}
            className="w-[32px] sm:w-[36px] h-[26px] sm:h-[30px]"
            textSize="text-xs"
            textColor="text-[#E5C158]"
          />
        </div>
      </div>
    </div>
  );
};
