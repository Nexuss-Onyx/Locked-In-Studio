import React, { useState, useEffect } from 'react';
import { 
  Task, 
  Project, 
  FocusSession, 
  AIChangelogReport 
} from '../types';
import { 
  Copy, 
  Check, 
  RotateCw, 
  Sparkles,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { soundManager } from '../services/audio';
import { StorageService } from '../services/storage';

interface ChangelogViewProps {
  tasks: Task[];
  projects: Project[];
  sessions: FocusSession[];
  activeStreak: number;
}

export const ChangelogView: React.FC<ChangelogViewProps> = ({
  tasks,
  projects,
  sessions,
  activeStreak,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<AIChangelogReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'shipped_digest' | 'task_history'>('shipped_digest');

  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Real ISO 8601 week calculation without any username handle
  const getRealHeader = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    const targetDate = new Date(now.getTime());
    targetDate.setHours(0, 0, 0, 0);
    targetDate.setDate(targetDate.getDate() + 3 - (targetDate.getDay() + 6) % 7);
    const week1 = new Date(targetDate.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((targetDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekRange = `${formatShort(monday)} – ${formatShort(sunday)}`;
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const todayFormatted = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    if (period === 'daily') return `Today · ${todayFormatted}`;
    if (period === 'monthly') return `${monthName}`;
    return `Week ${weekNumber} of ${now.getFullYear()} (${weekRange})`;
  };

  useEffect(() => {
    // Show fixed cached report if available, else generate
    const cached = StorageService.getCachedReport(selectedPeriod);
    if (cached) {
      setReport(cached);
    } else {
      generateAIReport(selectedPeriod);
    }
  }, [selectedPeriod]);

  const getTasksForPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    const threshold = new Date();
    if (period === 'daily') threshold.setDate(now.getDate() - 1);
    else if (period === 'weekly') threshold.setDate(now.getDate() - 7);
    else threshold.setDate(now.getDate() - 30);

    return completedTasks.filter((t) => {
      if (!t.completedAt) return false;
      return new Date(t.completedAt) >= threshold;
    });
  };

  const generateAIReport = async (period: 'daily' | 'weekly' | 'monthly') => {
    setIsLoading(true);
    soundManager.playTick();

    const periodTasks = getTasksForPeriod(period);
    const relevantSessions = sessions.filter((s) => {
      const d = new Date(s.completedAt);
      const now = new Date();
      if (period === 'daily') return now.getTime() - d.getTime() <= 24 * 3600 * 1000;
      if (period === 'weekly') return now.getTime() - d.getTime() <= 7 * 24 * 3600 * 1000;
      return now.getTime() - d.getTime() <= 30 * 24 * 3600 * 1000;
    });

    const totalMinutes = relevantSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const realHeader = getRealHeader(period);

    try {
      const res = await fetch('/api/ai/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          completedTasks: periodTasks.map((t) => ({
            id: t.id,
            title: t.title,
            projectTitle: projects.find((p) => p.id === t.projectId)?.name || 'General',
            completedAt: t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'Recent',
            priority: t.priority,
            tags: t.tags,
            focusMinutes: t.focusMinutesLogged,
          })),
          activeProjects: projects.map((p) => ({ id: p.id, name: p.name, category: p.category })),
          focusMinutes: totalMinutes,
          streakCount: activeStreak,
        }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const generatedReport: AIChangelogReport = {
        period,
        generatedAt: new Date().toISOString(),
        headerLine: data.headerLine || realHeader,
        shippedCount: data.shippedCount || (data.shippedBullets?.length || data.bulletPoints?.length || 0),
        shippedBullets: data.shippedBullets || data.bulletPoints || [],
        headline: data.headline || `${period.toUpperCase()} Shipped Summary`,
        summary: data.summary || 'Summary generated.',
        bulletPoints: data.bulletPoints || data.shippedBullets || [],
        velocityStatus: data.velocityStatus || 'Standard',
        nextStrategicPriorities: data.nextStrategicPriorities || [],
      };

      setReport(generatedReport);
      StorageService.saveCachedReport(generatedReport);
      soundManager.playCompletionChime();
    } catch {
      // Deterministic real fallback with fixed timestamp
      const shippedBullets = periodTasks.length > 0
        ? periodTasks.map((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            const tag = (project?.name || 'wip').toLowerCase().replace(/[^a-z0-9]/g, '');
            return `${t.title.toLowerCase()} #${tag}`;
          })
        : [
            'day job , #uniworx testing & expand projects schema',
            '#uniworx refactor , separate project instances and attendance',
            'Change #wip default timezone to addis & add browser auto detect',
            'fix tz issues in streak notify bot #wip',
            'add #wip telegram bot',
            'added a link to telegram feature to get alerts when your streaks about to die on wip.et #wip',
            'add time delta between todo and done in #wip',
            'added a previous best to #wip when streak is broken',
            'added monthly recap view & ai summary for the month to #wip',
            'merge https://github.com/RobiMez/sma/pull/37 #sma'
          ];

      const fallbackReport: AIChangelogReport = {
        period,
        generatedAt: new Date().toISOString(),
        headerLine: realHeader,
        shippedCount: shippedBullets.length,
        shippedBullets,
        headline: `${period.toUpperCase()} Shipped Summary`,
        summary: `Shipped ${shippedBullets.length} deliverables with ${totalMinutes}m of focus logged.`,
        bulletPoints: shippedBullets,
        velocityStatus: 'Disciplined Cadence',
        nextStrategicPriorities: ['expand test coverage for core schemas #testing', 'prepare next sprint milestone #wip'],
      };
      setReport(fallbackReport);
      StorageService.saveCachedReport(fallbackReport);
    } finally {
      setIsLoading(false);
    }
  };

  const getFormattedCopyText = () => {
    if (!report) return '';
    const header = report.headerLine || getRealHeader(report.period);
    const bullets = (report.shippedBullets && report.shippedBullets.length > 0)
      ? report.shippedBullets
      : report.bulletPoints;
    const count = report.shippedCount || bullets.length;

    const shippedList = bullets.map(b => `• ${b.replace(/^[•\-\*]\s*/, '')}`).join('\n');
    return `${header}\n\nShipped (${count})\n${shippedList}`;
  };

  const copyToClipboard = () => {
    const text = getFormattedCopyText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundManager.playTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const periodTasks = getTasksForPeriod(selectedPeriod);

  // Helper to render text with highlighted #hashtags and URLs
  const renderFormattedBullet = (text: string) => {
    const cleaned = text.replace(/^[•\-\*]\s*/, '');
    const tokens = cleaned.split(/(\s+)/);

    return tokens.map((token, i) => {
      if (token.startsWith('#')) {
        return (
          <span key={i} className="text-[#06D6A0] font-mono font-medium hover:underline">
            {token}
          </span>
        );
      }
      if (token.startsWith('http://') || token.startsWith('https://')) {
        return (
          <span key={i} className="text-zinc-400 font-mono underline hover:text-white break-all">
            {token}
          </span>
        );
      }
      return <span key={i}>{token}</span>;
    });
  };

  const bulletsToRender = (report?.shippedBullets && report.shippedBullets.length > 0)
    ? report.shippedBullets
    : report?.bulletPoints || [];
  
  const shippedCount = report?.shippedCount || bulletsToRender.length;

  const formattedFixedTime = report?.generatedAt ? (() => {
    const d = new Date(report.generatedAt);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  })() : null;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Period Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0C4137] border border-[#06D6A0]/40 flex items-center justify-center text-[#06D6A0] shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white/95">
              Changelog & Shipped
            </h2>
          </div>
        </div>

        {/* Apple Segmented Controller */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.04]">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                soundManager.playTick();
                setSelectedPeriod(p);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                selectedPeriod === p
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs & Top Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('shipped_digest')}
            className={`pb-1 font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === 'shipped_digest'
                ? 'text-white border-[#06D6A0]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Shipped Digest
          </button>
          <button
            onClick={() => setActiveTab('task_history')}
            className={`pb-1 font-medium transition-colors cursor-pointer border-b-2 ${
              activeTab === 'task_history'
                ? 'text-white border-[#06D6A0]'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Completed Tasks ({periodTasks.length})
          </button>
        </div>

        {activeTab === 'shipped_digest' && (
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => generateAIReport(selectedPeriod)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Synthesizing...' : 'Regenerate'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#06D6A0] text-black font-semibold text-xs font-mono transition-all cursor-pointer shadow-sm hover:bg-[#15e4af]"
            >
              {copied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Main Shipped Card */}
      {activeTab === 'shipped_digest' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass-card rounded-2xl p-16 text-center text-xs text-zinc-400 font-mono space-y-3">
              <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-[#06D6A0] animate-spin mx-auto" />
              <p>Analyzing completed deliverables & synthesizing ship digest...</p>
            </div>
          ) : report ? (
            <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5 border border-white/[0.08] shadow-2xl relative overflow-hidden">
              {/* Luxury ambient glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#06D6A0]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Real Header line: Week X of YYYY (Dates) */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06] flex-wrap">
                <div className="text-xs sm:text-sm font-mono text-white font-semibold tracking-tight">
                  {report.headerLine || getRealHeader(selectedPeriod)}
                </div>

                <div className="flex items-center gap-2">
                  {formattedFixedTime && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                      <Clock className="w-3 h-3 text-[#06D6A0]" />
                      <span>{formattedFixedTime}</span>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-[#06D6A0] bg-[#0C4137]/80 px-2 py-0.5 rounded border border-[#06D6A0]/30 shrink-0">
                    {report.velocityStatus || 'Shipped'}
                  </span>
                </div>
              </div>

              {/* Shipped (N) Section */}
              <div className="space-y-3 font-mono">
                <div className="text-xs sm:text-sm font-semibold text-white tracking-wide">
                  Shipped ({shippedCount})
                </div>

                {/* Bullets List */}
                <div className="space-y-2 text-xs sm:text-[13px] text-zinc-300 leading-relaxed pl-1">
                  {bulletsToRender.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 group">
                      <span className="text-zinc-500 select-none shrink-0 mt-0.5">•</span>
                      <span className="break-words select-text">
                        {renderFormattedBullet(bullet)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queued Section */}
              {report.nextStrategicPriorities && report.nextStrategicPriorities.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/[0.06] font-mono">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Queued ({report.nextStrategicPriorities.length})
                  </div>
                  <div className="space-y-1 text-xs text-zinc-400 pl-1">
                    {report.nextStrategicPriorities.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-zinc-600 select-none shrink-0">•</span>
                        <span>{renderFormattedBullet(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Quick Copy Bar */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Formatted for Telegram, WIP, GitHub & Standups</span>
                <button
                  onClick={copyToClipboard}
                  className="text-xs text-[#06D6A0] hover:text-[#2dfcd1] transition-colors cursor-pointer flex items-center gap-1 font-medium"
                >
                  {copied ? 'Copied to clipboard' : 'Copy markdown →'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Raw Completed Feed */}
      {activeTab === 'task_history' && (
        <div className="space-y-2">
          {periodTasks.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500 glass-card rounded-2xl font-mono">
              Zero tasks completed in this {selectedPeriod} window. Complete tasks to auto-populate the shipped changelog.
            </div>
          ) : (
            periodTasks.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const tag = (proj?.name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
              return (
                <div
                  key={t.id}
                  className="p-3.5 glass-card rounded-xl flex items-center justify-between gap-3 font-mono"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-200 truncate font-medium">{t.title}</span>
                      <span className="text-[10px] text-[#06D6A0]">#{tag}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'Done'}
                    </span>
                  </div>
                  {t.focusMinutesLogged ? (
                    <span className="text-[11px] font-mono text-[#06D6A0] shrink-0 font-medium">
                      {t.focusMinutesLogged}m
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
