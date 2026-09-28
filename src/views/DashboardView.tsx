import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, Task, FocusSession, ContributionDay } from '../types';
import { Play, Check, Plus, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { soundManager } from '../services/audio';
import { LuxeTaskIcon, LuxeStreakIcon, LuxeFocusIcon, LuxeVelocityIcon, LuxeApertureIcon } from '../components/icons/LuxeIcons';
import { calculateProjectStats } from '../services/markdownProjectParser';

interface DashboardViewProps {
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  activity: {
    days: ContributionDay[];
    currentStreak: number;
    longestStreak: number;
    totalTasksCompleted: number;
    totalFocusHours: number;
  };
  onNavigate: (view: 'dashboard' | 'projects' | 'lockin' | 'changelog') => void;
  onSelectProject: (projectId: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onStartLockInWithTask: (task: Task) => void;
  onOpenNewProject: () => void;
  liveElapsedSeconds?: number;
  isTimerRunning?: boolean;
  isTimerPaused?: boolean;
  timerSecondsLeft?: number;
  activeTimerTask?: Task | null;
}

interface WeekCadence {
  weekIndex: number;
  startDate: string;
  endDate: string;
  days: ContributionDay[];
  totalTasks: number;
  totalFocusMinutes: number;
  intensityScore: number; // 0 to 100
  isCurrentWeek: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  tasks,
  sessions,
  activity,
  onNavigate,
  onSelectProject,
  onToggleTaskComplete,
  onStartLockInWithTask,
  onOpenNewProject,
  liveElapsedSeconds = 0,
  isTimerRunning = false,
  isTimerPaused = false,
  timerSecondsLeft = 0,
  activeTimerTask = null,
}) => {
  const [hoveredWeek, setHoveredWeek] = useState<WeekCadence | null>(null);
  const [activeMetricView, setActiveMetricView] = useState<'focus' | 'tasks'>('focus');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => s.completedAt.startsWith(todayStr));
  const loggedTodayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  
  // Real-time live focus calculation (accumulating seconds while timer ticks)
  const liveFocusMinutes = Math.floor(liveElapsedSeconds / 60);
  const totalTodayFocusMinutes = loggedTodayFocusMinutes + liveFocusMinutes;

  // Active in-flight timer task or highest priority critical task
  const activeFocusTask = isTimerRunning && activeTimerTask ? activeTimerTask : null;
  const criticalTask = activeFocusTask || pendingTasks.find(
    (t) => t.priority === 'urgent' || t.priority === 'high'
  ) || pendingTasks[0];

  const upcomingDeadlines = [...pendingTasks]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  const formatDeadline = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const hours = Math.round(diff / (1000 * 3600));
    if (diff < 0) {
      const pastHours = Math.abs(hours);
      return { label: pastHours < 24 ? `${pastHours}h late` : `${Math.round(pastHours / 24)}d late`, isLate: true };
    }
    if (hours < 24) return { label: `${hours}h left`, isLate: false };
    return { label: `${Math.round(hours / 24)}d left`, isLate: false };
  };

  // Group 364 days into 52 architectural week cadences
  const weekCadences: WeekCadence[] = [];
  const totalDays = activity.days.length;

  for (let i = 0; i < totalDays; i += 7) {
    const slice = activity.days.slice(i, i + 7);
    const weekTotalTasks = slice.reduce((sum, d) => sum + d.count, 0);
    const isCurrent = slice.some((d) => d.date === todayStr);
    const weekFocusMins = slice.reduce((sum, d) => sum + d.focusMinutes, 0) + (isCurrent ? liveFocusMinutes : 0);

    // Compute proportional height score based on active metric view with true zero baseline
    let score = 0;
    if (activeMetricView === 'focus') {
      // 0 to 480 mins (8h) true zero linear scale
      score = Math.min(100, Math.round((weekFocusMins / 480) * 100));
    } else {
      // 0 to 12 milestones true zero linear scale
      score = Math.min(100, Math.round((weekTotalTasks / 12) * 100));
    }

    weekCadences.push({
      weekIndex: Math.floor(i / 7),
      startDate: slice[0]?.date || '',
      endDate: slice[slice.length - 1]?.date || '',
      days: slice,
      totalTasks: weekTotalTasks,
      totalFocusMinutes: weekFocusMins,
      intensityScore: score,
      isCurrentWeek: isCurrent,
    });
  }

  // Automatically scroll horizontally to the active current date on load
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [activity.days]);

  // Dynamically compute real monthly milestone markers from the actual 52-week dates
  const monthMarkers = useMemo(() => {
    const markers: { label: string; weekIndex: number }[] = [];
    let lastMonth = '';
    weekCadences.forEach((w) => {
      if (!w.startDate) return;
      const d = new Date(w.startDate);
      const mStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      if (mStr !== lastMonth) {
        markers.push({ label: mStr, weekIndex: w.weekIndex });
        lastMonth = mStr;
      }
    });
    return markers;
  }, [weekCadences]);

  const timerMins = Math.floor(timerSecondsLeft / 60);
  const timerSecs = timerSecondsLeft % 60;
  const timeFormatted = `${timerMins.toString().padStart(2, '0')}:${timerSecs.toString().padStart(2, '0')}`;

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* 1. SLIM IMMEDIATE FOCUS BANNER (Aura Luxe Warm Obsidian) */}
      {/* ========================================================= */}
      {criticalTask ? (
        <div className={`px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all ${
          isTimerRunning && !isTimerPaused
            ? 'bg-gradient-to-r from-[#2B2313]/95 via-[#1E180E]/90 to-[#120F09] border border-[#E5C158]/40 shadow-[0_0_20px_rgba(229,193,88,0.2)]'
            : 'bg-gradient-to-r from-[#223020]/90 via-[#1A2417]/80 to-[#121B10] border border-[#ABC8A2]/30 shadow-lg'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isTimerRunning && !isTimerPaused
                ? 'bg-[#E5C158]/20 border border-[#E5C158]/40 text-[#E5C158]'
                : 'bg-[#ABC8A2]/15 border border-[#ABC8A2]/35 text-[#ABC8A2]'
            }`}>
              <LuxeApertureIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[11px] font-sans font-medium tracking-wide shrink-0 hidden xs:inline ${
                isTimerRunning && !isTimerPaused ? 'text-[#E5C158]' : 'text-[#ABC8A2]'
              }`}>
                {isTimerRunning ? 'Active Focus Sprint:' : 'Immediate Focus:'}
              </span>
              <span className="text-xs sm:text-[13px] font-medium text-[#F4F8F3] truncate">
                {criticalTask.title}
              </span>
              {isTimerRunning && timerSecondsLeft > 0 ? (
                <span className="font-mono text-[11px] text-[#E5C158] font-bold px-1.5 py-0.5 rounded bg-[#E5C158]/15 shrink-0">
                  {timeFormatted}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-stone-400 uppercase shrink-0 hidden md:inline">
                  · {criticalTask.priority}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundManager.playCompletionChime();
                onToggleTaskComplete(criticalTask.id);
              }}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-sans text-stone-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3 text-[#ABC8A2]" />
              <span className="hidden sm:inline">Done</span>
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundManager.playTick();
                if (isTimerRunning) {
                  onNavigate('lockin');
                } else {
                  onStartLockInWithTask(criticalTask);
                }
              }}
              className={`px-3.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isTimerRunning && !isTimerPaused
                  ? 'bg-gradient-to-r from-[#E5C158] to-[#C9A645] text-black shadow-[0_0_16px_rgba(229,193,88,0.4)] hover:brightness-110'
                  : 'glass-button-primary shadow-[0_0_16px_rgba(171,200,162,0.3)]'
              }`}
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>{isTimerRunning ? 'Return ↵' : 'Lock-In'}</span>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-400 font-sans">
            <LuxeApertureIcon className="w-3.5 h-3.5 text-[#ABC8A2]" />
            <span>All priority milestones clear. Ready for your next focus session.</span>
          </div>
          <button
            onClick={() => onOpenNewProject()}
            className="text-xs text-[#ABC8A2] hover:underline font-sans cursor-pointer"
          >
            + New Project
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. REFINED TELEMETRY CARDS (Cormorant Garamond Numerals) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Active Tasks */}
        <motion.div
          whileHover={{ y: -1.5 }}
          className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between border border-white/[0.08] hover:border-[#ABC8A2]/35 transition-colors"
        >
          <div className="h-7 flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-stone-300 font-sans truncate">
              Active Tasks
            </span>
            <LuxeTaskIcon className="w-3.5 h-3.5 text-[#ABC8A2] shrink-0" />
          </div>

          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-serif font-light italic text-[#F4F8F3] leading-none">
              {pendingTasks.length}
            </span>
            <span className="text-[11px] font-sans text-stone-400">
              in flight
            </span>
          </div>

          <div className="text-[11px] text-stone-400 font-sans truncate flex items-center gap-1 min-h-[16px]">
            <span className="text-[#F4F8F3] font-medium">{completedTasks.length}</span>
            <span className="truncate">archived</span>
          </div>
        </motion.div>

        {/* Current Streak */}
        <motion.div
          whileHover={{ y: -1.5 }}
          className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between border border-white/[0.08] hover:border-[#ABC8A2]/35 transition-colors"
        >
          <div className="h-7 flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-stone-300 font-sans truncate">
              Current Streak
            </span>
            <LuxeStreakIcon className="w-3.5 h-3.5 text-[#ABC8A2] shrink-0" />
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-serif font-light italic text-[#ABC8A2] leading-none">
              {activity.currentStreak}
            </span>
            <span className="text-xs font-sans text-[#ABC8A2]/90 font-medium">
              days
            </span>
          </div>

          <div className="text-[11px] text-stone-400 font-sans truncate flex items-center gap-1 min-h-[16px]">
            <span className="text-stone-300 font-medium">{activity.longestStreak}d</span>
            <span className="truncate">peak</span>
          </div>
        </motion.div>

        {/* Today's Focus */}
        <motion.div
          whileHover={{ y: -1.5 }}
          className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between border border-white/[0.08] hover:border-[#ABC8A2]/35 transition-colors"
        >
          <div className="h-7 flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-stone-300 font-sans truncate">
              Today's Focus
            </span>
            <LuxeFocusIcon className="w-3.5 h-3.5 text-[#ABC8A2] shrink-0" />
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-serif font-light italic text-[#F4F8F3] leading-none">
              {totalTodayFocusMinutes}
            </span>
            <span className="text-xs font-sans text-stone-400 font-medium">
              mins
            </span>
          </div>

          <div className="text-[11px] text-stone-400 font-sans truncate flex items-center gap-1 min-h-[16px]">
            <span className="text-[#F4F8F3] font-medium">{todaySessions.length}</span>
            <span className="truncate">sprints</span>
          </div>
        </motion.div>

        {/* Velocity Rate */}
        <motion.div
          whileHover={{ y: -1.5 }}
          className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between border border-white/[0.08] hover:border-[#ABC8A2]/35 transition-colors"
        >
          <div className="h-7 flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-stone-300 font-sans truncate">
              Velocity Rate
            </span>
            <LuxeVelocityIcon className="w-3.5 h-3.5 text-[#ABC8A2] shrink-0" />
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-serif font-light italic text-[#F4F8F3] leading-none">
              {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}
            </span>
            <span className="text-xs font-sans text-stone-400 font-medium">
              %
            </span>
          </div>

          <div className="text-[11px] text-stone-400 font-sans truncate flex items-center gap-1 min-h-[16px]">
            <span className="text-[#F4F8F3] font-medium">{tasks.length}</span>
            <span className="truncate">tracked</span>
          </div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 3. BESPOKE ANNUAL CADENCE HORIZON (With Architectural Y-Scale Guidelines) */}
      {/* ========================================================= */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl border border-[#D8C9A3]/15">
        {/* Cadence Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-base sm:text-lg font-serif font-medium text-[#F7F4EE] tracking-wide">
              Annual Cadence
            </h2>
            <span className="text-[11px] font-sans text-stone-400">
              · 52-Week Architectural Continuity
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px] font-sans">
              <button
                onClick={() => setActiveMetricView('focus')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeMetricView === 'focus'
                    ? 'bg-[#2A241C] text-[#D8C9A3] font-medium shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Focus Volume
              </button>
              <button
                onClick={() => setActiveMetricView('tasks')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeMetricView === 'tasks'
                    ? 'bg-[#2A241C] text-[#D8C9A3] font-medium shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Milestones
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-stone-400">
              <span><strong className="text-[#F7F4EE] font-medium font-serif italic text-sm">{activity.totalTasksCompleted}</strong> milestones</span>
              <span className="text-stone-600">·</span>
              <span><strong className="text-[#D8C9A3] font-medium font-serif italic text-sm">{activity.totalFocusHours}h</strong> deep work</span>
            </div>
          </div>
        </div>

        {/* Chrono-Cadence Horizon Columns with Y-Scale Guideline Hairlines */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pb-1 scroll-smooth"
        >
          <div className="min-w-[680px] pt-3 pb-1">
            <div className="flex gap-2">
              {/* Y-Axis Reference Scale (Honest Linear 100% / 50% / 0% True Zero Scale) */}
              <div className="h-32 flex flex-col justify-between text-[9px] font-mono text-stone-500 shrink-0 select-none pb-0.5 text-right w-6">
                <span>{activeMetricView === 'focus' ? '8h' : '12'}</span>
                <span>{activeMetricView === 'focus' ? '4h' : '6'}</span>
                <span>{activeMetricView === 'focus' ? '0h' : '0'}</span>
              </div>

              {/* 52 Architectural Week Columns in Relative Grid with Guidelines */}
              <div className="h-32 flex-1 relative">
                {/* Subtle Horizontal Reference Guidelines */}
                <div className="absolute inset-x-0 top-0 border-b border-white/[0.04] pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 border-b border-white/[0.03] pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 border-b border-white/[0.06] pointer-events-none" />

                {/* 52 Bars */}
                <div className="h-full flex items-end gap-1 sm:gap-1.5 px-0.5 relative z-10">
                  {weekCadences.map((week) => {
                    const heightPercent = week.intensityScore > 0 ? Math.max(3, week.intensityScore) : 0;
                    const isHovered = hoveredWeek?.weekIndex === week.weekIndex;
                    const isCurrent = week.isCurrentWeek;

                    const metricValue = activeMetricView === 'focus' ? week.totalFocusMinutes : week.totalTasks;
                    const highThreshold = activeMetricView === 'focus' ? 240 : 6;
                    const midThreshold = activeMetricView === 'focus' ? 120 : 3;
                    const lowThreshold = activeMetricView === 'focus' ? 40 : 1;

                    let barColorClass = 'bg-[#1D1813] border-t border-[#3A2E20] group-hover:bg-[#3A2E20]';
                    if (isHovered) {
                      barColorClass = 'bg-[#F7F4EE] shadow-[0_0_14px_rgba(247,244,238,0.5)]';
                    } else if (isCurrent) {
                      barColorClass = 'bg-gradient-to-t from-[#8C7355] via-[#BFA378] to-[#F7F4EE] ring-1 ring-[#D8C9A3] shadow-[0_0_10px_rgba(216,201,163,0.4)]';
                    } else if (metricValue >= highThreshold) {
                      barColorClass = 'bg-gradient-to-t from-[#4A3B28] via-[#8C7355] to-[#D8C9A3] border-t border-[#F7F4EE]/40 shadow-sm';
                    } else if (metricValue >= midThreshold) {
                      barColorClass = 'bg-gradient-to-t from-[#362B1D] via-[#5E4B33] to-[#BFA378] border-t border-[#D8C9A3]/30';
                    } else if (metricValue >= lowThreshold) {
                      barColorClass = 'bg-gradient-to-t from-[#261E15] to-[#786144] border-t border-[#8C7355]/30';
                    }

                    return (
                      <div
                        key={week.weekIndex}
                        onMouseEnter={() => setHoveredWeek(week)}
                        onMouseLeave={() => setHoveredWeek(null)}
                        className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                      >
                        <div className="w-full relative flex flex-col justify-end items-center h-full">
                          {isCurrent && (
                            <div className="absolute -top-3 w-2 h-2 rounded-full ring-1 ring-[#D8C9A3] bg-[#D8C9A3]/40 shadow-[0_0_8px_rgba(216,201,163,0.6)] animate-pulse" />
                          )}

                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className={`w-full rounded-t-[2px] transition-all duration-150 ${barColorClass}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monthly Roman / Editorial Milestones Axis */}
            <div className="flex justify-between text-[9px] font-sans text-stone-500 pt-2.5 border-t border-white/[0.06] select-none pl-8 pr-1">
              {monthMarkers.map((m, idx) => (
                <span key={idx} className="tracking-widest">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Chrono-Cadence Inspector */}
        <div className="pt-2 border-t border-white/[0.05] text-xs font-sans text-stone-400 flex items-center justify-between min-h-[26px]">
          {hoveredWeek ? (
            <div className="flex items-center gap-2">
              <span className="text-[#F7F4EE] font-medium">
                Week {hoveredWeek.weekIndex + 1} ({new Date(hoveredWeek.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(hoveredWeek.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
              </span>
              <span className="text-stone-600">·</span>
              <span>
                <strong className="text-[#D8C9A3] font-medium font-serif italic text-sm">{hoveredWeek.totalTasks}</strong> milestones
              </span>
              <span className="text-stone-600">·</span>
              <span>
                <strong className="text-[#F7F4EE] font-medium font-serif italic text-sm">{hoveredWeek.totalFocusMinutes}m</strong> focus
              </span>
            </div>
          ) : (
            <span className="text-stone-500 text-[11px]">
              Hover across the 52-week horizon to inspect architectural cadence & seasonal momentum.
            </span>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D8C9A3]" />
            <span>{activity.currentStreak}d unbroken cadence</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. CURATED MILESTONES & WORKSPACES */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 pt-1">
        {/* Left (7 cols): Urgent Milestones */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06]">
            <span className="text-base font-serif font-medium text-[#F7F4EE] tracking-wide">
              Urgent Milestones
            </span>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-[#D8C9A3] hover:text-[#F7F4EE] transition-colors cursor-pointer font-sans"
            >
              All Projects →
            </button>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-500 font-sans">
              Zero pending deadlines. Everything is in order.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                const deadline = formatDeadline(task.deadline);
                return (
                  <div
                    key={task.id}
                    className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] rounded-xl flex items-center justify-between gap-2.5 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => {
                          soundManager.playCompletionChime();
                          onToggleTaskComplete(task.id);
                        }}
                        className="w-4 h-4 rounded-md border border-stone-600 hover:border-[#D8C9A3] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Mark done"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-white/90 truncate block group-hover:text-white transition-colors">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 font-sans">
                          <span className="text-[#D8C9A3]">{project?.name || 'General'}</span>
                          <span>·</span>
                          <span className={deadline.isLate ? 'text-rose-400 font-semibold' : 'text-stone-400'}>
                            {deadline.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        soundManager.playTick();
                        onStartLockInWithTask(task);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#2A241C] hover:bg-[#D8C9A3] text-[#F7F4EE] hover:text-[#141210] text-[10px] font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1 font-sans"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span className="hidden sm:inline">Focus</span>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (5 cols): Workspaces Progress */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06]">
              <span className="text-base font-serif font-medium text-[#F7F4EE] tracking-wide">
                Workspaces
              </span>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs text-[#D8C9A3] hover:text-[#F7F4EE] transition-colors cursor-pointer font-sans"
              >
                Manage →
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 font-sans">
                No active workspaces yet. Import a Markdown plan or create a new project.
              </div>
            ) : (
              <div className="space-y-2.5">
                {projects.slice(0, 3).map((proj) => {
                  const stats = calculateProjectStats(proj);
                  const pct = stats.completionRate;
                  const doneCount = stats.completedTodosCount;
                  const totalCount = stats.totalTodosCount;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj.id);
                        onNavigate('projects');
                      }}
                      className="p-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] rounded-xl cursor-pointer transition-all duration-150"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-white/90 truncate pr-2">
                          {proj.name}
                        </span>
                        <span className="text-[11px] font-serif italic text-stone-400 shrink-0">{pct}%</span>
                      </div>

                      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-[#8C7355] to-[#ABC8A2]"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1.5 font-sans">
                        <span>{proj.category}</span>
                        <span className="font-mono">{doneCount}/{totalCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              soundManager.playTick();
              onOpenNewProject();
            }}
            className="mt-3.5 w-full py-2 rounded-xl glass-button text-stone-300 hover:text-white text-xs font-medium transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#ABC8A2]" />
            <span className="font-sans">New Project</span>
          </button>
        </div>
      </div>

      {/* 5. Recent Focus Sprints History */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <LuxeFocusIcon className="w-3.5 h-3.5 text-[#D8C9A3]" />
            <span className="text-base font-serif font-medium text-[#F7F4EE] tracking-wide">
              Recent Deep Work Sprints
            </span>
          </div>
          <button
            onClick={() => onNavigate('lockin')}
            className="text-xs text-[#ABC8A2] hover:underline transition-colors cursor-pointer font-sans"
          >
            Open Studio →
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-500 font-sans">
            No focus sessions logged yet today. Launch Lock-In Studio to log your first deep work sprint.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs font-sans"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-white/90 truncate block text-[11px] font-medium">
                    {session.taskTitle || 'Open Session'}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(session.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#2A241C] text-[#ABC8A2] text-[10px] font-mono font-bold shrink-0">
                  +{session.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
