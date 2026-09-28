import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Timer, 
  History, 
  Upload, 
  Plus, 
  X,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../services/audio';
import { FlipClock } from './FlipClock';
import { LockedInLogo } from './LockedInLogo';

interface SidebarProps {
  currentView: 'dashboard' | 'projects' | 'lockin' | 'changelog' | 'heatmap';
  onViewChange: (view: 'dashboard' | 'projects' | 'lockin' | 'changelog' | 'heatmap') => void;
  projectCount: number;
  activeStreak: number;
  onOpenNewProject: () => void;
  onOpenShortcuts: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  projectCount,
  activeStreak,
  onOpenNewProject,
  onOpenShortcuts,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban, badge: projectCount },
    { id: 'lockin', label: 'Lock-In', icon: Timer },
    { id: 'changelog', label: 'Changelog', icon: History },
  ];

  return (
    <>
      {/* Mobile Backdrop with Motion blur */}
      <AnimatePresence>
        {isOpenMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed md:static inset-y-0 left-0 h-full w-[260px] sm:w-60 shrink-0 glass-panel border-r border-white/[0.06] flex flex-col justify-between p-3.5 sm:p-4 z-40 md:z-30 select-none overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-6 px-1 pt-1">
            <div className="flex items-center gap-3">
              <LockedInLogo size={48} isLockedIn={currentView === 'lockin'} />
              <span className="font-brand text-xs sm:text-sm tracking-[0.22em] text-[#F3EFEA] font-bold">
                LOCKED-IN
              </span>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-zinc-400 hover:text-white md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action: New Project */}
          <div className="mb-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                soundManager.playTick();
                onOpenNewProject();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between py-2 px-3 rounded-xl glass-button-primary text-xs font-semibold tracking-wide cursor-pointer group shadow-[0_0_12px_rgba(171,200,162,0.2)]"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
                <span className="font-sans">New Project</span>
              </div>
              <kbd className="text-[9px] font-mono text-[#181208] font-bold bg-black/15 px-1.5 py-0.5 rounded border border-black/10">
                N
              </kbd>
            </motion.button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundManager.playTick();
                    onViewChange(item.id as any);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'text-[#FFF8EC] bg-[#2E2417]/80 border border-[#D4AF37]/35 shadow-[0_2px_14px_rgba(212,175,55,0.15)] font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#E5C158]' : 'text-stone-500'}`} />
                    <span className="font-sans">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                        isActive
                          ? 'bg-[#D4AF37]/20 text-[#E5C158] font-semibold'
                          : 'bg-white/[0.04] text-zinc-400 border border-white/[0.04]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Distinct Date & Mechanical Clock */}
        <div className="pt-3 border-t border-white/[0.06]">
          <FlipClock />
        </div>
      </aside>
    </>
  );
};
