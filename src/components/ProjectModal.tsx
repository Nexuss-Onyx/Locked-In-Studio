import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../services/audio';
import { parseTimeToMinutes } from '../services/markdownProjectParser';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [targetDeadline, setTargetDeadline] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      color: '#ABC8A2',
      icon: 'Folder',
      targetDeadline: targetDeadline ? new Date(targetDeadline).toISOString() : undefined,
      estimatedTime: estimatedTime.trim() || undefined,
      estimatedMinutes: estimatedTime.trim() ? parseTimeToMinutes(estimatedTime) : undefined,
      phases: [],
    });

    setName('');
    setDescription('');
    setCategory('Architecture');
    setTargetDeadline('');
    setEstimatedTime('');
    soundManager.playTick();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-white/90">
              New Project
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="Project title..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.03] focus:bg-black/40 border border-white/[0.07] focus:border-[#ABC8A2] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">Description</label>
              <textarea
                placeholder="Scope, creative manifesto, or architectural goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-white/[0.03] focus:bg-black/40 border border-white/[0.07] focus:border-[#ABC8A2] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all font-sans resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="Creative, Horology..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/[0.03] focus:bg-black/40 border border-white/[0.07] focus:border-[#ABC8A2] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">EST (HH:MM:SS)</label>
                <input
                  type="text"
                  placeholder="04:30:00"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full bg-white/[0.03] focus:bg-black/40 border border-white/[0.07] focus:border-[#ABC8A2] rounded-xl px-3.5 py-2 text-xs text-[#ABC8A2] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">Target Deadline</label>
              <input
                type="datetime-local"
                value={targetDeadline}
                onChange={(e) => setTargetDeadline(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#ABC8A2] rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono"
              />
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playTick();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-semibold glass-button-primary cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
