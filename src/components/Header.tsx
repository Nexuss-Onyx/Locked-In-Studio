import React, { useRef, useEffect } from 'react';
import { Search, Timer, Plus, Menu, X, Command, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { soundManager } from '../services/audio';

interface HeaderProps {
  title: string;
  currentView?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewProject: () => void;
  onGoToLockIn: () => void;
  onOpenShortcuts?: () => void;
  onOpenMobileMenu?: () => void;
  isTimerRunning?: boolean;
  isTimerPaused?: boolean;
  secondsLeft?: number;
  selectedMinutes?: number;
  timerTag?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  currentView = 'dashboard',
  searchQuery,
  onSearchChange,
  onOpenNewProject,
  onGoToLockIn,
  onOpenShortcuts,
  onOpenMobileMenu,
  isTimerRunning = false,
  isTimerPaused = false,
  secondsLeft = 0,
  selectedMinutes = 45,
  timerTag = 'Focus Sprint',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener('app:focus-search', handleFocusSearch);
    return () => window.removeEventListener('app:focus-search', handleFocusSearch);
  }, []);

  const isTimerActive = isTimerRunning || isTimerPaused || (secondsLeft > 0 && secondsLeft < selectedMinutes * 60);
  const showActiveTimerButton = currentView !== 'lockin' && isTimerActive;

  const timerHours = Math.floor(secondsLeft / 3600);
  const timerMins = Math.floor((secondsLeft % 3600) / 60);
  const timerSecs = secondsLeft % 60;
  const timeFormatted = timerHours > 0
    ? `${timerHours}:${timerMins.toString().padStart(2, '0')}:${timerSecs.toString().padStart(2, '0')}`
    : `${timerMins.toString().padStart(2, '0')}:${timerSecs.toString().padStart(2, '0')}`;

  return (
    <header className="h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between gap-3 shrink-0 glass-panel border-b border-white/[0.06] sticky top-0 z-30">
      {/* Mobile Menu & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/[0.06] md:hidden cursor-pointer transition-colors"
          title="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-xs sm:text-sm font-medium tracking-wider uppercase font-sans text-stone-300">
          {title}
        </h1>
      </div>

      {/* Spotlight Search: Clean luxury minimalist input with ⌘K indicator */}
      <div className="flex-1 max-w-xs mx-auto hidden sm:block">
        <div className="relative group">
          <Search className="w-3.5 h-3.5 text-stone-500 group-focus-within:text-[#E5C158] absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects & milestones..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) onSearchChange('');
                inputRef.current?.blur();
              }
            }}
            className="w-full bg-white/[0.03] group-hover:bg-white/[0.05] focus:bg-[#120F0A] border border-white/[0.06] focus:border-[#D4AF37]/40 rounded-xl pl-8 pr-12 py-1.5 text-xs text-white placeholder-stone-500 outline-none transition-all font-sans"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-stone-500 px-1 py-0.2 bg-white/[0.04] border border-white/[0.06] rounded pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Navigation Right Corner */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dynamic Action: Active Timer Pill (when away from Lock-In) OR "+ New Project" Button */}
        {showActiveTimerButton ? (
          <div className="flex items-center gap-1.5">
            {/* Live Interactive Timer Button -> Returns to Lock-In */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playTick();
                onGoToLockIn();
              }}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl border text-xs font-mono font-medium tracking-tight cursor-pointer transition-all shadow-md group ${
                isTimerRunning && !isTimerPaused
                  ? 'bg-gradient-to-r from-[#2B2313] to-[#1F190D] border-[#E5C158]/50 text-[#F7F4EE] shadow-[0_0_18px_rgba(229,193,88,0.25)] hover:border-[#E5C158]'
                  : 'bg-white/[0.05] border-white/[0.12] text-stone-300 hover:bg-white/[0.08]'
              }`}
              title="Click to return to Lock-In Studio"
            >
              <div className="flex items-center gap-1.5">
                {isTimerRunning && !isTimerPaused ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5C158] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5C158]" />
                  </span>
                ) : (
                  <Timer className="w-3.5 h-3.5 text-stone-400 group-hover:text-white" />
                )}
                <span className="font-mono text-xs sm:text-[13px] font-bold text-[#F7F4EE]">
                  {timeFormatted}
                </span>
              </div>
              <span className="text-[10px] font-sans font-medium text-[#E5C158] border-l border-white/[0.1] pl-2 hidden xs:inline">
                {isTimerPaused ? 'Paused · Return' : 'Lock-In ↵'}
              </span>
            </motion.button>

            {/* Compact New Project Quick Action Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playTick();
                onOpenNewProject();
              }}
              className="p-2 rounded-xl glass-button text-stone-300 hover:text-white hover:border-[#ABC8A2]/50 transition-all cursor-pointer"
              title="New Project (N)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Lock-In Icon Quick Shortcut */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playTick();
                onGoToLockIn();
              }}
              className="p-2 sm:p-2.5 rounded-xl glass-button text-stone-300 hover:text-white hover:border-[#D4AF37]/40 transition-colors cursor-pointer"
              title="Lock-In Studio (3)"
            >
              <Timer className="w-4 h-4 text-[#E5C158]" />
            </motion.button>

            {/* Standard New Project Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                soundManager.playTick();
                onOpenNewProject();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-button-primary text-xs font-semibold tracking-tight cursor-pointer shadow-[0_0_14px_rgba(171,200,162,0.25)]"
              title="New Project (N)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
              <span className="font-sans">New Project</span>
            </motion.button>
          </div>
        )}

        {/* Shortcuts Icon Button */}
        {onOpenShortcuts && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              soundManager.playTick();
              onOpenShortcuts();
            }}
            className="p-2 sm:p-2.5 rounded-xl glass-button text-stone-400 hover:text-white hover:border-white/20 transition-colors cursor-pointer group"
            title="Keyboard Shortcuts (⌘ / Ctrl / ?)"
          >
            <Command className="w-4 h-4 text-stone-400 group-hover:text-[#E5C158] transition-colors" />
          </motion.button>
        )}
      </div>
    </header>
  );
};
