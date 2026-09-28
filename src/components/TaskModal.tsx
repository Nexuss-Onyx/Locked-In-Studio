import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Task, Priority, TaskStatus } from '../types';
import { soundManager } from '../services/audio';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  projects: Project[];
  taskToEdit?: Task | null;
  defaultProjectId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  taskToEdit,
  defaultProjectId,
}) => {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setProjectId(taskToEdit.projectId);
      setDeadline(taskToEdit.deadline ? taskToEdit.deadline.slice(0, 16) : '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setEstimatedMinutes(taskToEdit.estimatedMinutes || 25);
      setTagsInput(taskToEdit.tags?.join(', ') || '');
    } else {
      setTitle('');
      setProjectId(defaultProjectId || (projects[0]?.id ?? ''));
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
      setDeadline(d.toISOString().slice(0, 16));
      setPriority('medium');
      setStatus('todo');
      setEstimatedMinutes(25);
      setTagsInput('');
    }
  }, [taskToEdit, defaultProjectId, projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      ...(taskToEdit ? { id: taskToEdit.id } : {}),
      title: title.trim(),
      projectId: projectId || projects[0]?.id || 'default',
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      priority,
      status,
      estimatedMinutes: Number(estimatedMinutes) || 25,
      tags,
      subtasks: taskToEdit?.subtasks || [],
    });
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
          className="w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-white/90">
              {taskToEdit ? 'Edit Task' : 'New Task'}
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
            {/* Title */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/[0.03] focus:bg-black/40 border border-white/[0.07] focus:border-[#06D6A0]/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all font-sans"
              />
            </div>

            {/* Project & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Workspace</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#0a0f0d] border border-white/[0.07] focus:border-[#06D6A0] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0b100e]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.05]">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        soundManager.playTick();
                        setPriority(p);
                      }}
                      className={`py-1 text-[10px] capitalize font-mono rounded-lg transition-colors cursor-pointer ${
                        priority === p
                          ? 'bg-[#06D6A0] text-black font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p === 'medium' ? 'Med' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deadline & Est Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#06D6A0] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Math.max(5, parseInt(e.target.value) || 25))}
                    className="w-16 bg-white/[0.03] border border-white/[0.07] focus:border-[#06D6A0] rounded-xl px-2 py-2 text-xs text-white outline-none font-mono text-center"
                  />
                  <div className="flex gap-1 flex-1">
                    {[15, 25, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEstimatedMinutes(m)}
                        className={`text-xs flex-1 py-1.5 rounded-lg border font-mono transition-colors cursor-pointer ${
                          estimatedMinutes === m
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-white/[0.05]'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">Tags</label>
              <input
                type="text"
                placeholder="architecture, api..."
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.07] focus:border-[#06D6A0] rounded-xl px-3 py-2 text-xs text-white outline-none font-sans"
              />
            </div>

            {/* Actions */}
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
                {taskToEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
