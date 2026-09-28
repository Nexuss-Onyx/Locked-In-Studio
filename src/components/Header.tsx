import React, { useRef, useEffect } from 'react';
import { Search, Timer, Plus, Menu, X, Command, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { soundManager } from '../services/audio';

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewProject: () => void;
  onGoToLockIn: () => void;
  onOpenShortcuts?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  searchQuery,
  onSearchChange,
  onOpenNewProject,
  onGoToLockIn,
  onOpenShortcuts,
  onOpenMobileMenu,
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
        {/* Lock-In Icon Button */}
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

        {/* New Project Button */}
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
