import React, { useState } from 'react';
import { ContributionDay } from '../types';
import { motion } from 'motion/react';

interface ContributionViewProps {
  activity: {
    days: ContributionDay[];
    currentStreak: number;
    longestStreak: number;
    totalTasksCompleted: number;
    totalFocusHours: number;
  };
}

export const ContributionView: React.FC<ContributionViewProps> = ({ activity }) => {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);

  // Group 364 days into 52 weeks
  const weeks: ContributionDay[][] = [];
  for (let i = 0; i < activity.days.length; i += 7) {
    weeks.push(activity.days.slice(i, i + 7));
  }

  const monthLabels = [
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'
  ];

  // Monestra Apple Palette
  const getColorClass = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 0:
        return 'bg-white/[0.03] border border-white/[0.04] hover:border-white/20';
      case 1:
        return 'bg-[#0C4137]/80 border border-[#0f5346] hover:border-[#06D6A0]';
      case 2:
        return 'bg-[#0b6953] border border-[#0d8469] hover:border-[#06D6A0]';
      case 3:
        return 'bg-[#06D6A0] border border-[#05ba8b] hover:border-white';
      case 4:
        return 'bg-[#E6FBF6] border border-white shadow-[0_0_8px_rgba(230,251,246,0.5)]';
      default:
        return 'bg-white/[0.03]';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="border-b border-white/[0.06] pb-3">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white/95">
          Activity & Streaks
        </h2>
      </div>

      {/* Metrics Row: Degraded text, crisp typography */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-4">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Active Streak</span>
          <div className="text-3xl font-semibold text-[#06D6A0] font-mono mt-2">
            {activity.currentStreak} <span className="text-xs text-zinc-500 font-normal">days</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-4">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Longest Streak</span>
          <div className="text-3xl font-semibold text-white font-mono mt-2">
            {activity.longestStreak} <span className="text-xs text-zinc-500 font-normal">days</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-4">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Tasks Done</span>
          <div className="text-3xl font-semibold text-white font-mono mt-2">
            {activity.totalTasksCompleted}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-card rounded-2xl p-4">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Focus Logged</span>
          <div className="text-3xl font-semibold text-white font-mono mt-2">
            {activity.totalFocusHours} <span className="text-xs text-zinc-500 font-normal">hrs</span>
          </div>
        </motion.div>
      </div>

      {/* Heatmap Card */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase font-mono tracking-wider">
            Annual Activity
          </span>

          {/* Clean Legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
            <span>Less</span>
            <div className="flex items-center gap-1">
              {([0, 1, 2, 3, 4] as const).map((lvl) => (
                <div key={lvl} className={`w-2.5 h-2.5 rounded-xs ${getColorClass(lvl)}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Scrollable Heatmap */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px]">
            {/* Months Header */}
            <div className="flex text-[10px] text-zinc-500 justify-between pl-6 pr-2 mb-2 font-mono">
              {monthLabels.map((m, idx) => (
                <span key={idx}>{m}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="flex gap-2">
              {/* Day Labels */}
              <div className="flex flex-col justify-between text-[9px] text-zinc-500 font-mono py-0.5 select-none">
                <span>Mon</span>
                <span className="opacity-0">Tue</span>
                <span>Wed</span>
                <span className="opacity-0">Thu</span>
                <span>Fri</span>
                <span className="opacity-0">Sat</span>
                <span>Sun</span>
              </div>

              {/* 52 Columns */}
              <div className="flex gap-1 flex-1">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 flex-1">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-full aspect-square rounded-xs transition-colors cursor-pointer ${getColorClass(
                          day.level
                        )}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hover Info Footer */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-xs font-mono text-zinc-400 min-h-6 flex items-center justify-between">
          {hoveredDay ? (
            <span>
              {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              : <strong className="text-white font-medium">{hoveredDay.count}</strong> tasks, <strong className="text-[#06D6A0] font-medium">{hoveredDay.focusMinutes}m</strong> focused
            </span>
          ) : (
            <span className="text-zinc-500">Hover over any day for breakdown</span>
          )}
        </div>
      </div>
    </div>
  );
};
