import React, { useState, useMemo } from 'react';
import { Project, ProjectPhase, ProjectTodo } from '../types';
import { 
  Plus, 
  Upload, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  ArrowLeft, 
  Trash2, 
  Download,
  Check,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  calculateProjectStats, 
  calculatePhaseStats, 
  serializeProjectToMarkdown, 
  formatMinutesToLabel 
} from '../services/markdownProjectParser';
import { soundManager } from '../services/audio';

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onOpenImportModal: (projectId?: string) => void;
  onOpenNewProjectModal: () => void;
  onStartLockInWithTodo: (todoTitle: string, projectId: string) => void;
  searchQuery?: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onUpdateProject,
  onDeleteProject,
  onOpenImportModal,
  onOpenNewProjectModal,
  onStartLockInWithTodo,
  searchQuery = '',
}) => {
  const [collapsedPhaseIds, setCollapsedPhaseIds] = useState<Record<string, boolean>>({});

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Global search filtering if search query is active from header
  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  // Calculate the single active progressing phase ID
  const activePhaseId = useMemo(() => {
    if (!activeProject || !activeProject.phases || activeProject.phases.length === 0) return null;

    // 1. First priority: Phase with active working [~] or urgent [!] tasks
    const phaseWithActiveWork = activeProject.phases.find((p) => {
      const stats = calculatePhaseStats(p);
      return stats.workingTodos > 0 || stats.urgentTodos > 0;
    });
    if (phaseWithActiveWork) return phaseWithActiveWork.id;

    // 2. Second priority: First phase that is not 100% completed
    const firstIncompletePhase = activeProject.phases.find((p) => {
      const stats = calculatePhaseStats(p);
      return stats.totalTodos === 0 || stats.completedTodos < stats.totalTodos;
    });
    if (firstIncompletePhase) return firstIncompletePhase.id;

    return activeProject.phases[0].id;
  }, [activeProject]);

  const togglePhaseCollapse = (phaseId: string) => {
    soundManager.playTick();
    setCollapsedPhaseIds((prev) => {
      const isCurrentlyCollapsed = isPhaseCollapsedById(phaseId, prev);
      return {
        ...prev,
        [phaseId]: !isCurrentlyCollapsed,
      };
    });
  };

  const handleCollapseAll = () => {
    soundManager.playTick();
    if (!activeProject) return;
    const newMap: Record<string, boolean> = {};
    function traverse(phase: ProjectPhase) {
      newMap[phase.id] = true;
      for (const sub of phase.subphases) traverse(sub);
    }
    for (const phase of activeProject.phases || []) traverse(phase);
    setCollapsedPhaseIds(newMap);
  };

  const handleCycleTodoStatus = (phaseId: string, todoId: string) => {
    if (!activeProject) return;
    soundManager.playTick();

    const updatePhaseTodos = (phases: ProjectPhase[]): ProjectPhase[] => {
      return phases.map((phase) => {
        if (phase.id === phaseId) {
          const updatedTodos = phase.todos.map((todo) => {
            if (todo.id === todoId) {
              let nextStatus: 'normal' | 'working' | 'urgent' | 'completed' = 'normal';
              if (todo.status === 'normal') nextStatus = 'working';
              else if (todo.status === 'working') nextStatus = 'urgent';
              else if (todo.status === 'urgent') {
                nextStatus = 'completed';
                soundManager.playCompletionChime();
              } else if (todo.status === 'completed') nextStatus = 'normal';

              return {
                ...todo,
                status: nextStatus,
                completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
              };
            }
            return todo;
          });
          return { ...phase, todos: updatedTodos };
        }
        return { ...phase, subphases: updatePhaseTodos(phase.subphases) };
      });
    };

    const newPhases = updatePhaseTodos(activeProject.phases);
    onUpdateProject(activeProject.id, { phases: newPhases });
  };

  const handleExportMarkdown = (project: Project) => {
    soundManager.playTick();
    const md = serializeProjectToMarkdown(project);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to resolve collapse state
  const isPhaseCollapsedById = (phaseId: string, mapState: Record<string, boolean>): boolean => {
    if (mapState[phaseId] !== undefined) {
      return mapState[phaseId];
    }
    return phaseId !== activePhaseId;
  };

  const isPhaseCollapsed = (phase: ProjectPhase): boolean => {
    return isPhaseCollapsedById(phase.id, collapsedPhaseIds);
  };

  // Render a recursive Phase node of arbitrary depth
  const renderPhaseNode = (phase: ProjectPhase, depth = 0) => {
    const collapsed = isPhaseCollapsed(phase);
    const stats = calculatePhaseStats(phase);
    const isFullyCompleted = stats.totalTodos > 0 && stats.completedTodos === stats.totalTodos;

    return (
      <div
        key={phase.id}
        className="space-y-1 relative"
        style={{ marginLeft: depth > 0 ? `${Math.min(depth * 16, 48)}px` : '0px' }}
      >
        {/* Minimal Phase Header */}
        <div
          onClick={() => togglePhaseCollapse(phase.id)}
          className={`px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
            isFullyCompleted
              ? 'bg-white/[0.01] hover:bg-white/[0.03] opacity-60'
              : phase.level === 1
              ? 'bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06]'
              : 'hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-stone-500 hover:text-stone-300 transition-colors">
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#D8C9A3]" />
              )}
            </span>

            <h4
              className={`truncate ${
                isFullyCompleted
                  ? 'line-through text-stone-500 font-sans text-xs'
                  : phase.level === 1
                  ? 'font-serif font-medium text-xs sm:text-sm text-[#F7F4EE] tracking-wide'
                  : 'font-sans font-medium text-xs text-stone-300'
              }`}
            >
              {phase.title}
            </h4>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-mono text-stone-500">
            {phase.timeBudget && (
              <span className="text-[#D8C9A3] font-sans text-xs">
                [{phase.timeBudget}]
              </span>
            )}
            <span className={isFullyCompleted ? 'text-stone-600' : 'text-stone-400'}>
              {stats.completedTodos}/{stats.totalTodos}
            </span>
          </div>
        </div>

        {/* Phase Body: Todos & Subphases with vertical connecting hairline guide */}
        {!collapsed && (
          <div className="relative pl-5 space-y-1 pt-1 pb-1.5">
            {/* Connecting Vertical Guide Line from Phase Header down through children */}
            <div className="absolute left-2.5 top-0 bottom-2 w-px bg-white/[0.12] pointer-events-none" />

            {/* Todos under this Phase */}
            {phase.todos.map((todo) => {
              const isCompleted = todo.status === 'completed';
              const isUrgent = todo.status === 'urgent';
              const isWorking = todo.status === 'working';

              return (
                <div
                  key={todo.id}
                  className={`group px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                    isCompleted
                      ? 'opacity-40 hover:opacity-75'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Consistent Checkbox Box (Scan Rhythm Preserved) */}
                    <button
                      onClick={() => handleCycleTodoStatus(phase.id, todo.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-[#D8C9A3]/20 text-[#D8C9A3] border border-[#D8C9A3]/40'
                          : isUrgent
                          ? 'border border-[#E05D38] bg-[#E05D38]/10 text-[#E05D38]' // Distinct urgent terracotta hue
                          : isWorking
                          ? 'border border-[#D8C9A3] bg-[#D8C9A3]/10 text-[#D8C9A3]'
                          : 'border border-stone-600 hover:border-stone-400 text-stone-400'
                      }`}
                      title={isUrgent ? 'Urgent' : isWorking ? 'In Progress' : isCompleted ? 'Completed' : 'Todo'}
                    >
                      {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      {!isCompleted && isUrgent && <span className="font-mono text-[9px] font-bold text-[#E05D38]">!</span>}
                      {!isCompleted && isWorking && (
                        /* Progress arc indicator inside uniform checkbox */
                        <span className="w-2 h-2 border-1.5 border-current border-t-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                      )}
                      {!isCompleted && !isUrgent && !isWorking && null}
                    </button>

                    {/* Title with Inline Badges & Time Budget (No wide gaps) */}
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span
                        className={`text-xs font-sans truncate ${
                          isCompleted
                            ? 'line-through text-stone-500'
                            : isUrgent
                            ? 'text-[#F7F4EE] font-medium'
                            : isWorking
                            ? 'text-[#F7F4EE] font-medium'
                            : 'text-stone-300'
                        }`}
                      >
                        {todo.title}
                      </span>

                      {/* Distinct Urgent Badge with quiet grey text */}
                      {!isCompleted && isUrgent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.06] border border-white/[0.08] text-stone-400 font-bold tracking-wider shrink-0">
                          URGENT
                        </span>
                      )}

                      {/* Paired Inline Time Estimate */}
                      {todo.estimatedTime && (
                        <span className="text-[10px] font-mono text-stone-500 bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">
                          {todo.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Focus Sprint Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => {
                          soundManager.playTick();
                          onStartLockInWithTodo(todo.title, activeProject?.id || '');
                        }}
                        className="p-1 rounded text-stone-500 hover:text-[#D8C9A3] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Focus sprint"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Child Subphases */}
            {phase.subphases.length > 0 && (
              <div className="pt-1 space-y-1">
                {phase.subphases.map((sub) => renderPhaseNode(sub, depth + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================
  // VIEW 1: OPENED PROJECT DETAIL VIEW
  // =========================================================
  if (activeProject) {
    const stats = calculateProjectStats(activeProject);

    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <button
            onClick={() => {
              soundManager.playTick();
              onSelectProject(null);
            }}
            className="flex items-center gap-2 text-xs font-sans text-stone-400 hover:text-[#F7F4EE] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Single Collapse All button */}
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded-lg text-xs font-sans text-stone-400 hover:text-white hover:bg-white/[0.04] cursor-pointer transition-colors"
              title="Collapse all phases"
            >
              Collapse All
            </button>

            <span className="w-px h-3 bg-white/[0.1] mx-0.5" />

            <button
              onClick={() => {
                soundManager.playTick();
                onOpenImportModal(activeProject.id);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-sans text-stone-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3 h-3 text-[#D8C9A3]" />
              <span>Sync .md</span>
            </button>

            <button
              onClick={() => handleExportMarkdown(activeProject)}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] transition-colors cursor-pointer"
              title="Export Markdown"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete "${activeProject.name}"?`)) {
                  onDeleteProject(activeProject.id);
                  onSelectProject(null);
                }
              }}
              className="p-2 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-white/[0.04] border border-white/[0.06] transition-colors cursor-pointer"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimal Title Block */}
        <div className="space-y-3 py-1">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#F7F4EE] tracking-wide">
              {activeProject.name}
            </h2>
            <div className="flex items-baseline gap-2.5 shrink-0 text-xs font-mono text-stone-400">
              <span className="font-serif italic text-lg sm:text-xl text-[#ABC8A2]">
                {stats.completionRate}%
              </span>
              <span>
                ({stats.completedTodosCount}/{stats.totalTodosCount})
              </span>
              {(activeProject.estimatedTime || stats.totalBudgetMinutes > 0) && (
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#ABC8A2] font-mono text-[11px]">
                  EST: {activeProject.estimatedTime || formatMinutesToLabel(stats.totalBudgetMinutes)}
                </span>
              )}
            </div>
          </div>

          {activeProject.description && (
            <p className="text-xs sm:text-sm text-stone-400 font-sans leading-relaxed">
              {activeProject.description}
            </p>
          )}

          {/* Minimal hairline progress bar with perfect rounded fill */}
          <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8C7355] to-[#D8C9A3] transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Phase Hierarchy Tree */}
        <div className="pt-2 space-y-2">
          {activeProject.phases && activeProject.phases.length > 0 ? (
            activeProject.phases.map((phase) => renderPhaseNode(phase, 0))
          ) : (
            <div className="py-12 text-center">
              <button
                onClick={() => onOpenImportModal(activeProject.id)}
                className="px-4 py-2 rounded-xl glass-button-primary text-xs font-medium cursor-pointer"
              >
                Import Markdown
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: MINIMAL PROJECT CARDS GRID
  // =========================================================
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header: Open Whitespace with Minimal Action Triggers */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <h2 className="text-xl sm:text-2xl font-serif font-medium text-[#F7F4EE] tracking-wide">
          Projects
        </h2>

        {/* Generous blank space in center, minimal buttons on right */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundManager.playTick();
              onOpenImportModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-button-primary text-xs font-semibold cursor-pointer shadow-[0_0_12px_rgba(216,201,163,0.2)]"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="font-sans">Import</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundManager.playTick();
              onOpenNewProjectModal();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl glass-button text-xs font-medium text-stone-300 hover:text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8C9A3]" />
            <span className="hidden sm:inline font-sans">New</span>
          </motion.button>
        </div>
      </div>

      {/* Cards Grid with Generous Spacing */}
      {filteredProjects.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-dashed border-white/[0.08] space-y-3">
          <p className="text-xs text-stone-400 font-sans">
            No projects found.
          </p>
          <button
            onClick={() => onOpenImportModal()}
            className="px-4 py-2 rounded-xl glass-button-primary text-xs font-medium cursor-pointer"
          >
            Import Markdown
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredProjects.map((project) => {
            const stats = calculateProjectStats(project);

            return (
              <motion.div
                key={project.id}
                whileHover={{ y: -3 }}
                onClick={() => {
                  soundManager.playTick();
                  onSelectProject(project.id);
                }}
                className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/[0.06] hover:border-[#D8C9A3]/30 cursor-pointer flex flex-col justify-between space-y-4 transition-all duration-150 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-sans tracking-wider uppercase text-[#ABC8A2] truncate">
                      {project.category || 'Architecture'}
                    </span>
                    <span className="text-sm font-serif italic text-stone-400">
                      {stats.completionRate}%
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-serif font-medium text-[#F7F4EE] leading-snug group-hover:text-[#ABC8A2] transition-colors">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-xs text-stone-400 font-sans line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {/* Progress Hairline with Seamless Fill */}
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#73916D] to-[#ABC8A2] transition-all duration-300"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>

                  {/* Card Meta */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span>
                      {stats.totalPhasesCount} {stats.totalPhasesCount === 1 ? 'phase' : 'phases'}
                    </span>
                    <div className="flex items-center gap-2">
                      {(project.estimatedTime || stats.totalBudgetMinutes > 0) && (
                        <span className="text-[#ABC8A2]/80 font-medium">
                          EST: {project.estimatedTime || formatMinutesToLabel(stats.totalBudgetMinutes)}
                        </span>
                      )}
                      <span>
                        {stats.completedTodosCount}/{stats.totalTodosCount}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
