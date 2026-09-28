import React, { useState } from 'react';
import { Project, Task, Priority } from '../types';
import { 
  CheckSquare, 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronRight,
  CornerDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../services/audio';

interface TasksViewProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onStartLockIn: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onOpenNewProject: () => void;
  onQuickAddTask: (title: string, projectId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  projects,
  tasks,
  selectedProjectId,
  onSelectProject,
  onToggleTaskComplete,
  onToggleSubtask,
  onStartLockIn,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onOpenNewProject,
  onQuickAddTask,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [quickTitle, setQuickTitle] = useState<string>('');

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  const filteredTasks = tasks.filter((task) => {
    if (selectedProjectId && task.projectId !== selectedProjectId) return false;
    if (statusFilter === 'pending' && task.status === 'completed') return false;
    if (statusFilter === 'completed' && task.status !== 'completed') return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    return true;
  });

  const toggleExpand = (taskId: string) => {
    soundManager.playTick();
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const targetProjId = selectedProjectId || projects[0]?.id || 'default';
    onQuickAddTask(quickTitle.trim(), targetProjId);
    setQuickTitle('');
  };

  const formatDeadline = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const hours = Math.round(diff / (1000 * 3600));

    if (diff < 0) {
      const pastHours = Math.abs(hours);
      return {
        label: pastHours < 24 ? `${pastHours}h late` : `${Math.round(pastHours / 24)}d late`,
        isLate: true,
      };
    }
    if (hours <= 24) {
      return {
        label: `${hours}h left`,
        isLate: false,
      };
    }
    const days = Math.round(hours / 24);
    return {
      label: `${days}d left`,
      isLate: false,
    };
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Workspace Track: Minimal Apple Segmented Track */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 shrink-0 bg-black/40 p-1 rounded-xl border border-white/[0.04]">
          <button
            onClick={() => {
              soundManager.playTick();
              onSelectProject(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedProjectId === null
                ? 'glass-button-primary shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({tasks.length})
          </button>

          {projects.map((proj) => {
            const count = tasks.filter((t) => t.projectId === proj.id).length;
            const isSelected = selectedProjectId === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => {
                  soundManager.playTick();
                  onSelectProject(proj.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0C4137] text-white border border-[#06D6A0]/40 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{proj.name}</span>
                <span className="text-[10px] font-mono text-zinc-500">({count})</span>
              </button>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            soundManager.playTick();
            onOpenNewProject();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-zinc-300 hover:text-white text-xs font-medium cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-[#06D6A0]" />
          <span>Workspace</span>
        </motion.button>
      </div>

      {/* Filter Row: Apple Segmented Pill Track */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 glass-panel p-1.5 rounded-xl">
        <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.04]">
          {(['all', 'pending', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                soundManager.playTick();
                setStatusFilter(s);
              }}
              className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : s === 'pending' ? 'Active' : 'Done'}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.04]">
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                soundManager.playTick();
                setPriorityFilter(p);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono capitalize transition-all cursor-pointer ${
                priorityFilter === p
                  ? 'bg-[#0C4137] text-[#06D6A0] font-semibold border border-[#06D6A0]/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            soundManager.playTick();
            onOpenNewTask();
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg glass-button-primary text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Task</span>
        </motion.button>
      </div>

      {/* Quick Inline Task Creator */}
      <form onSubmit={handleQuickSubmit} className="relative group">
        <div className="relative flex items-center">
          <Plus className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#06D6A0] transition-colors" />
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`Quick add task to ${currentProject ? currentProject.name : 'Workspace'}...`}
            className="w-full bg-white/[0.02] group-hover:bg-white/[0.04] focus:bg-black/50 border border-white/[0.06] focus:border-[#06D6A0]/40 rounded-xl pl-10 pr-12 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all font-sans"
          />
          {quickTitle.trim() && (
            <button
              type="submit"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#06D6A0] text-black text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Add</span>
              <CornerDownLeft className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </form>

      {/* Task List Cards */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 glass-card rounded-2xl font-mono">
            Zero tasks matching criteria.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            const isCompleted = task.status === 'completed';
            const deadline = formatDeadline(task.deadline);
            const isExpanded = !!expandedTaskIds[task.id];
            const subtasksCompleted = task.subtasks?.filter((s) => s.completed).length || 0;
            const subtasksTotal = task.subtasks?.length || 0;

            return (
              <motion.div
                layout
                key={task.id}
                className={`glass-card rounded-2xl p-3.5 transition-all duration-150 ${
                  isCompleted ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => {
                        soundManager.playCompletionChime();
                        onToggleTaskComplete(task.id);
                      }}
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-[#06D6A0] border-[#06D6A0] text-[#02120c] shadow-[0_0_8px_rgba(6,214,160,0.35)]'
                          : 'border-zinc-600 hover:border-[#06D6A0] bg-white/[0.02]'
                      }`}
                    >
                      {isCompleted && <CheckSquare className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-medium tracking-tight ${
                            isCompleted ? 'line-through text-zinc-500' : 'text-white/95'
                          }`}
                        >
                          {task.title}
                        </span>

                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {project && (
                          <span className="text-[10px] text-[#06D6A0] font-mono">
                            [{project.name}]
                          </span>
                        )}
                      </div>

                      {/* Clean Details Meta */}
                      <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 mt-1 font-mono">
                        <span className={deadline.isLate ? 'text-rose-400' : 'text-zinc-400'}>
                          {deadline.label}
                        </span>

                        {task.estimatedMinutes && (
                          <span>{task.estimatedMinutes}m</span>
                        )}

                        {task.focusMinutesLogged ? (
                          <span className="text-[#06D6A0]">{task.focusMinutesLogged}m focused</span>
                        ) : null}

                        {subtasksTotal > 0 && (
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>{subtasksCompleted}/{subtasksTotal}</span>
                          </button>
                        )}
                      </div>

                      {/* Subtasks Checklist */}
                      <AnimatePresence>
                        {isExpanded && subtasksTotal > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2.5 pt-2.5 border-t border-white/[0.06] space-y-1.5 overflow-hidden"
                          >
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                onClick={() => {
                                  soundManager.playTick();
                                  onToggleSubtask(task.id, st.id);
                                }}
                                className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white cursor-pointer select-none"
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
                                    st.completed ? 'bg-[#06D6A0] border-[#06D6A0] text-black' : 'border-zinc-600'
                                  }`}
                                >
                                  {st.completed && <CheckSquare className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span className={st.completed ? 'line-through text-zinc-500' : ''}>
                                  {st.title}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCompleted && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          soundManager.playTick();
                          onStartLockIn(task);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#0C4137] hover:bg-[#06D6A0] text-[#E6FBF6] hover:text-[#02120c] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 shadow-xs font-mono"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span className="hidden sm:inline">Focus</span>
                      </motion.button>
                    )}

                    <button
                      onClick={() => {
                        soundManager.playTick();
                        onEditTask(task);
                      }}
                      className="p-1 rounded-md text-zinc-500 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        soundManager.playTick();
                        onDeleteTask(task.id);
                      }}
                      className="p-1 rounded-md text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
