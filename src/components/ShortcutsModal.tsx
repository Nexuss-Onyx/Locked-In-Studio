import React from 'react';
import { X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../services/audio';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / /', label: 'Spotlight Search' },
    { key: 'N', label: 'New Task' },
    { key: 'P', label: 'New Project' },
    { key: 'Space', label: 'Start / Pause Lock-In Timer' },
    { key: '1 - 4', label: 'Switch Views (Overview..Changelog)' },
    { key: 'Esc', label: 'Close Modals / Exit Fullscreen' },
    { key: '?', label: 'Open Shortcuts' },
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={() => {
          soundManager.playTick();
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5 text-[#06D6A0]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-white/90">
                Shortcuts
              </h2>
            </div>
            <button
              onClick={() => {
                soundManager.playTick();
                onClose();
              }}
              className="text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs"
              >
                <span className="text-zinc-300 font-sans">{s.label}</span>
                <kbd className="font-mono text-[11px] text-[#06D6A0] bg-black/60 px-2 py-0.5 rounded-md border border-white/[0.08]">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-white/[0.06] text-center">
            <button
              onClick={() => {
                soundManager.playTick();
                onClose();
              }}
              className="w-full py-2 rounded-xl glass-button text-zinc-300 text-xs font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
