import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw,
  Check,
  Maximize2, 
  Minimize2, 
  Image as ImageIcon, 
  Volume2, 
  Music, 
  CheckSquare, 
  Plus, 
  Trash2, 
  X, 
  Sliders, 
  ZoomIn, 
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WALLPAPERS } from '../services/wallpapers';
import { soundManager } from '../services/audio';
import { StorageService } from '../services/storage';

interface LockInViewProps {
  tasks?: any[];
  selectedTask?: any;
  onSelectTask?: (task: any) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onSessionComplete: (session: { taskId?: string; taskTitle?: string; durationMinutes: number }) => void;
  currentWallpaperId: string;
  onSaveWallpaper: (id: string) => void;
  // Lifted Timer State & Handlers
  selectedMinutes: number;
  secondsLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  currentTag: string;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onToggleTimer: () => void;
  onChangeDuration: (mins: number) => void;
  onAdjustSecondsLeft: (deltaSecs: number) => void;
  onSetCurrentTag: (tag: string) => void;
}

const ALL_PRESETS = [
  { label: '5m', mins: 5 },
  { label: '10m', mins: 10 },
  { label: '15m', mins: 15 },
  { label: '20m', mins: 20 },
  { label: '25m', mins: 25 },
  { label: '30m', mins: 30 },
  { label: '45m', mins: 45 },
  { label: '1h', mins: 60 },
  { label: '1.5h', mins: 90 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
  { label: '4h', mins: 240 },
  { label: '5h', mins: 300 },
];

const TAB_WIDTH = 60;

const AMBIENT_SOUNDS = [
  { id: 'none', label: 'Off' },
  { id: 'rain', label: 'Heavy Rain' },
  { id: 'binaural', label: '40Hz Gamma Flow' },
  { id: 'brown_noise', label: 'Deep Brown Noise' },
  { id: 'waves', label: 'Ocean Waves' },
  { id: 'cafe', label: 'Cozy Cafe' },
  { id: 'fireplace', label: 'Fireplace' },
];

export const LockInView: React.FC<LockInViewProps> = ({
  tasks = [],
  selectedTask,
  onSelectTask,
  onToggleTaskComplete,
  onSessionComplete,
  currentWallpaperId,
  onSaveWallpaper,
  selectedMinutes,
  secondsLeft,
  isRunning,
  isPaused,
  currentTag,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onToggleTimer,
  onChangeDuration,
  onAdjustSecondsLeft,
  onSetCurrentTag,
}) => {
  // Customization & UI Popovers
  const [clockScale, setClockScale] = useState<number>(100); // 100%, 110%, 125%, 150%
  const [isEditingTag, setIsEditingTag] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const [showWallpaperPicker, setShowWallpaperPicker] = useState<boolean>(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [wallpaperRotations, setWallpaperRotations] = useState<Record<string, number>>(() => StorageService.getWallpaperRotations());
  const [showAmbientMenu, setShowAmbientMenu] = useState<boolean>(false);
  const [showMusicMenu, setShowMusicMenu] = useState<boolean>(false);
  const [showTodoDrawer, setShowTodoDrawer] = useState<boolean>(false);
  const [completedSessionToast, setCompletedSessionToast] = useState<boolean>(false);

  // Quick Tasks State for To-Do Drawer
  const [quickTasks, setQuickTasks] = useState<{ id: string; title: string; completed: boolean }[]>([
    { id: '1', title: 'Refactor focus timer UI layout', completed: true },
    { id: '2', title: 'Review deep work sprint metrics', completed: false },
    { id: '3', title: 'Submit code changes for approval', completed: false },
  ]);
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  // Audio State
  const [activeAmbient, setActiveAmbient] = useState<string>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);

  const hoursColRef = useRef<HTMLSpanElement>(null);
  const minsColRef = useRef<HTMLSpanElement>(null);
  const secsColRef = useRef<HTMLSpanElement>(null);

  // Wheel accumulation refs for Apple-style scroll
  const hoursAccumRef = useRef<number>(0);
  const minsAccumRef = useRef<number>(0);
  const secsAccumRef = useRef<number>(0);

  const currentWallpaper = WALLPAPERS.find((w) => w.id === currentWallpaperId) || WALLPAPERS[0];

  const activePresetIndex = Math.max(
    0,
    ALL_PRESETS.findIndex((p) => p.mins === selectedMinutes) !== -1
      ? ALL_PRESETS.findIndex((p) => p.mins === selectedMinutes)
      : ALL_PRESETS.findIndex((p) => p.mins >= selectedMinutes) !== -1
      ? ALL_PRESETS.findIndex((p) => p.mins >= selectedMinutes)
      : ALL_PRESETS.length - 1
  );

  // Sync selected task title to currentTag if selected
  useEffect(() => {
    if (selectedTask?.title) {
      onSetCurrentTag(selectedTask.title);
    }
  }, [selectedTask]);

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        onToggleTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused, onToggleTimer]);

  // Apple-style calibrated scroll handlers
  useEffect(() => {
    const hoursElem = hoursColRef.current;
    const minsElem = minsColRef.current;
    const secsElem = secsColRef.current;

    const handleHoursWheel = (e: WheelEvent) => {
      if (isRunning) return;
      e.preventDefault();
      hoursAccumRef.current += e.deltaY;
      const absDelta = Math.abs(e.deltaY);
      const threshold = absDelta > 80 ? 40 : 80;

      if (Math.abs(hoursAccumRef.current) >= threshold) {
        const sign = hoursAccumRef.current < 0 ? 1 : -1;
        const velocityFactor = absDelta > 120 ? Math.floor(absDelta / 60) : 1;
        const deltaSecs = sign * velocityFactor * 3600;

        onAdjustSecondsLeft(deltaSecs);
        soundManager.playTick();
        hoursAccumRef.current = 0;
      }
    };

    const handleMinsWheel = (e: WheelEvent) => {
      if (isRunning) return;
      e.preventDefault();
      minsAccumRef.current += e.deltaY;
      const absDelta = Math.abs(e.deltaY);
      const threshold = absDelta > 80 ? 30 : 60;

      if (Math.abs(minsAccumRef.current) >= threshold) {
        const sign = minsAccumRef.current < 0 ? 1 : -1;
        const velocityFactor = absDelta > 120 ? Math.floor(absDelta / 40) : 1;
        const deltaSecs = sign * velocityFactor * 60;

        onAdjustSecondsLeft(deltaSecs);
        soundManager.playTick();
        minsAccumRef.current = 0;
      }
    };

    const handleSecsWheel = (e: WheelEvent) => {
      if (isRunning) return;
      e.preventDefault();
      secsAccumRef.current += e.deltaY;
      const absDelta = Math.abs(e.deltaY);
      const threshold = absDelta > 80 ? 25 : 50;

      if (Math.abs(secsAccumRef.current) >= threshold) {
        const sign = secsAccumRef.current < 0 ? 1 : -1;
        const velocityFactor = absDelta > 120 ? Math.floor(absDelta / 30) : 1;
        const deltaSecs = sign * velocityFactor * 15;

        onAdjustSecondsLeft(deltaSecs);
        soundManager.playTick();
        secsAccumRef.current = 0;
      }
    };

    hoursElem?.addEventListener('wheel', handleHoursWheel, { passive: false });
    minsElem?.addEventListener('wheel', handleMinsWheel, { passive: false });
    secsElem?.addEventListener('wheel', handleSecsWheel, { passive: false });

    return () => {
      hoursElem?.removeEventListener('wheel', handleHoursWheel);
      minsElem?.removeEventListener('wheel', handleMinsWheel);
      secsElem?.removeEventListener('wheel', handleSecsWheel);
    };
  }, [isRunning, onAdjustSecondsLeft]);

  const startTimer = () => {
    onStartTimer();
  };

  const pauseTimer = () => {
    onPauseTimer();
  };

  const resumeTimer = () => {
    onResumeTimer();
  };

  const resetTimer = () => {
    onResetTimer();
  };

  const toggleTimer = () => {
    onToggleTimer();
  };

  const changeDuration = (mins: number) => {
    onChangeDuration(mins);
  };

  const handleAmbientChange = (id: string) => {
    soundManager.playTick();
    setActiveAmbient(id);
    soundManager.startAmbient(id as any);
  };

  const handleVolumeChange = (v: number) => {
    setAmbientVolume(v);
    soundManager.setVolume(v / 100);
  };

  const toggleFullscreen = () => {
    soundManager.playTick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setQuickTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), title: newTaskInput.trim(), completed: false },
    ]);
    setNewTaskInput('');
    soundManager.playTick();
  };

  const toggleQuickTask = (id: string) => {
    setQuickTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    soundManager.playTick();
  };

  const deleteQuickTask = (id: string) => {
    setQuickTasks((prev) => prev.filter((t) => t.id !== id));
    soundManager.playTick();
  };

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const hrStr = hours.toString().padStart(2, '0');
  const minStr = mins.toString().padStart(2, '0');
  const secStr = secs.toString().padStart(2, '0');

  const totalSeconds = selectedMinutes * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const activeLabel = ALL_PRESETS[activePresetIndex]?.label || `${selectedMinutes}m`;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-500 p-4 sm:p-6 ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen p-6' : ''
      }`}
      style={{
        backgroundColor: currentWallpaper.type === 'minimal' ? currentWallpaper.value : '#080604',
      }}
    >
      {/* Background Wallpaper Image */}
      {currentWallpaper.type === 'image' && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
          style={{
            backgroundImage: `url(${currentWallpaper.value})`,
            filter: 'brightness(0.95) contrast(1.02) saturate(1.05)',
            transform: `rotate(${wallpaperRotations[currentWallpaper.id] || 0}deg)`,
          }}
        />
      )}

      {currentWallpaper.type === 'gradient' && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700"
          style={{ background: currentWallpaper.value }}
        />
      )}

      {/* Main Focus Clock & Primary Action Row */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto px-1 sm:px-4 max-w-4xl mx-auto w-full text-center shrink-0 overflow-hidden">
        
        {/* Crisp Large Clock Display */}
        <div 
          onTouchStart={(e) => (touchStartYRef.current = e.touches[0].clientY)}
          onTouchMove={(e) => {
            if (isRunning || touchStartYRef.current === null) return;
            const diff = touchStartYRef.current - e.touches[0].clientY;
            if (Math.abs(diff) > 25) {
              const delta = diff > 0 ? 1 : -1;
              touchStartYRef.current = e.touches[0].clientY;
              changeDuration(Math.max(1, selectedMinutes + delta));
            }
          }}
          onTouchEnd={() => (touchStartYRef.current = null)}
          className="relative group select-none mb-3 sm:mb-6 transition-transform duration-300 w-full max-w-full flex flex-col items-center"
          style={{ transform: `scale(${clockScale / 100})` }}
        >
          {/* Digits: 00:44:52 - Responsive Fluid Sizing */}
          <div className="font-mono tabular-nums text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] font-medium tracking-tight text-white drop-shadow-[0_4px_50px_rgba(0,0,0,0.6)] leading-none flex items-center justify-center gap-0.5 sm:gap-2 max-w-full">
            {/* Hours */}
            <span 
              ref={hoursColRef}
              title="Scroll gently to change hours"
              className="w-14 xs:w-20 sm:w-28 md:w-36 lg:w-40 text-center cursor-ns-resize hover:text-[#D8C9A3] transition-colors rounded-2xl py-1 hover:bg-white/[0.04] shrink-0"
            >
              {hrStr}
            </span>

            <span className="text-stone-400 font-light select-none shrink-0">:</span>

            {/* Minutes */}
            <span 
              ref={minsColRef}
              title="Scroll gently to change minutes"
              className="w-14 xs:w-20 sm:w-28 md:w-36 lg:w-40 text-center cursor-ns-resize hover:text-[#D8C9A3] transition-colors rounded-2xl py-1 hover:bg-white/[0.04] shrink-0"
            >
              {minStr}
            </span>

            <span className="text-stone-400 font-light select-none shrink-0">:</span>

            {/* Seconds */}
            <span 
              ref={secsColRef}
              title="Scroll gently to change seconds"
              className="w-14 xs:w-20 sm:w-28 md:w-36 lg:w-40 text-center cursor-ns-resize hover:text-[#D8C9A3] transition-colors rounded-2xl py-1 hover:bg-white/[0.04] shrink-0"
            >
              {secStr}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 sm:mt-8 w-52 sm:w-96 h-1.5 bg-white/15 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#8C7355] to-[#D8C9A3]"
              style={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={resetTimer}
            className="p-3.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-stone-300 hover:text-white cursor-pointer shadow-lg"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>

          {!isRunning ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startTimer}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#D8C9A3] to-[#B5A478] text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(216,201,163,0.35)] hover:scale-105 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Session</span>
            </motion.button>
          ) : isPaused ? (
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={resumeTimer}
                className="px-7 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={resetTimer}
                className="px-6 py-3.5 rounded-full bg-black/70 backdrop-blur-xl border border-white/20 text-white font-bold text-xs tracking-wider uppercase cursor-pointer hover:bg-black/90"
              >
                End Early
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={pauseTimer}
              className="px-8 py-3.5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </motion.button>
          )}
        </div>

      </div>

      {/* Integrated Floating Toolbar Dock at Bottom */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-xl mx-auto shrink-0">
        
        {/* Preset Time Reel (Stationary Center Bulb + Horizontal Scroll) */}
        <div className="relative flex items-center justify-center w-full mb-3">
          <button
            onClick={() => {
              if (activePresetIndex > 0) {
                changeDuration(ALL_PRESETS[activePresetIndex - 1].mins);
              }
            }}
            disabled={activePresetIndex === 0}
            className={`p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 mr-2 shrink-0 cursor-pointer ${
              activePresetIndex === 0 ? 'opacity-20 pointer-events-none' : 'text-stone-300 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative w-64 sm:w-80 h-13 bg-black/80 backdrop-blur-2xl border border-white/15 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.8)] flex items-center overflow-hidden">
            {/* Stationary Central Bulb & Notch */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center justify-start h-full">
              <svg className="w-16 h-3.5 text-[#0F0D0B] fill-current" viewBox="0 0 64 14">
                <path d="M0,0 C16,0 16,14 32,14 C48,14 48,0 64,0 Z" />
              </svg>

              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#C2B28A] to-[#F2E8CF] text-black font-bold shadow-[0_0_20px_rgba(216,201,163,0.5)] flex items-center justify-center border-2 border-[#121110] -mt-1 scale-105">
                <span className="text-[11px] font-mono font-bold text-black">{activeLabel}</span>
              </div>
            </div>

            {/* Sliding Options Reel */}
            <div className="w-full h-full flex items-center justify-center relative">
              <motion.div
                animate={{ x: -(activePresetIndex * TAB_WIDTH) }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="flex items-center h-full absolute"
                style={{ left: 'calc(50% - 30px)' }}
              >
                {ALL_PRESETS.map((opt, idx) => {
                  const isActive = idx === activePresetIndex;
                  return (
                    <button
                      key={opt.mins}
                      onClick={() => changeDuration(opt.mins)}
                      style={{ width: `${TAB_WIDTH}px` }}
                      className="h-full flex items-center justify-center shrink-0 cursor-pointer text-xs font-mono select-none"
                    >
                      <span className={`transition-all ${isActive ? 'opacity-0' : 'text-stone-400 hover:text-white'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </div>
          </div>

          <button
            onClick={() => {
              if (activePresetIndex < ALL_PRESETS.length - 1) {
                changeDuration(ALL_PRESETS[activePresetIndex + 1].mins);
              }
            }}
            disabled={activePresetIndex === ALL_PRESETS.length - 1}
            className={`p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 ml-2 shrink-0 cursor-pointer ${
              activePresetIndex === ALL_PRESETS.length - 1 ? 'opacity-20 pointer-events-none' : 'text-stone-300 hover:text-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Control Tools Bar (YouTube / Ambient / Scale / Settings / Fullscreen) */}
        <div className="bg-black/75 backdrop-blur-2xl border border-white/15 rounded-full px-3 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.8)] flex items-center gap-1.5 sm:gap-2">
          
          {/* Lofi Radio / YouTube */}
          <button
            onClick={() => {
              soundManager.playTick();
              setShowMusicMenu(!showMusicMenu);
              setShowAmbientMenu(false);
              setShowWallpaperPicker(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              showMusicMenu ? 'bg-white/20 text-white' : 'text-stone-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Lofi Radio</span>
          </button>

          {/* Ambient Noise Mixer */}
          <button
            onClick={() => {
              soundManager.playTick();
              setShowAmbientMenu(!showAmbientMenu);
              setShowMusicMenu(false);
              setShowWallpaperPicker(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeAmbient !== 'none' || showAmbientMenu ? 'bg-[#D8C9A3]/20 text-[#D8C9A3]' : 'text-stone-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeAmbient !== 'none' ? AMBIENT_SOUNDS.find((s) => s.id === activeAmbient)?.label : 'Ambient'}
            </span>
          </button>

          <div className="w-px h-4 bg-white/20 my-auto" />

          {/* Clock Zoom Scale */}
          <div className="flex items-center gap-1 px-1 text-xs font-mono text-stone-300">
            <button
              onClick={() => {
                soundManager.playTick();
                setClockScale((prev) => Math.max(80, prev - 10));
              }}
              className="p-1 rounded hover:bg-white/10 text-stone-400 hover:text-white cursor-pointer"
              title="Decrease clock size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono min-w-[36px] text-center">{clockScale}%</span>
            <button
              onClick={() => {
                soundManager.playTick();
                setClockScale((prev) => Math.min(150, prev + 10));
              }}
              className="p-1 rounded hover:bg-white/10 text-stone-400 hover:text-white cursor-pointer"
              title="Increase clock size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-white/20 my-auto" />

          {/* Backdrop / Wallpaper Selector */}
          <button
            onClick={() => {
              soundManager.playTick();
              if (!showWallpaperPicker) {
                setActiveCardId(null);
              }
              setShowWallpaperPicker(!showWallpaperPicker);
              setShowAmbientMenu(false);
              setShowMusicMenu(false);
            }}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              showWallpaperPicker ? 'bg-white/20 text-white' : 'text-stone-300 hover:text-white hover:bg-white/10'
            }`}
            title="Backdrop Wallpapers"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

        </div>

      </div>

      {/* Popover: Ambient Sound Mixer Menu */}
      <AnimatePresence>
        {showAmbientMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-72 p-4 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold text-white">Ambient Soundscape</span>
              <button onClick={() => setShowAmbientMenu(false)} className="text-stone-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 mb-4">
              {AMBIENT_SOUNDS.map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => handleAmbientChange(snd.id)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono text-left transition-all flex items-center justify-between cursor-pointer ${
                    activeAmbient === snd.id
                      ? 'bg-[#D8C9A3] text-black font-semibold shadow-md'
                      : 'text-stone-300 hover:bg-white/10'
                  }`}
                >
                  <span>{snd.label}</span>
                  {activeAmbient === snd.id && <span className="w-2 h-2 rounded-full bg-black" />}
                </button>
              ))}
            </div>

            {/* Volume Slider */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={ambientVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-[#D8C9A3] cursor-pointer h-1 rounded bg-white/20"
              />
              <span className="text-[10px] font-mono text-stone-400 min-w-[24px] text-right">{ambientVolume}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popover: Lofi Music Stream Player */}
      <AnimatePresence>
        {showMusicMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-80 p-4 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white">
                <Music className="w-3.5 h-3.5 text-rose-400" />
                <span>Lofi Beats & Chill Stream</span>
              </div>
              <button onClick={() => setShowMusicMenu(false)} className="text-stone-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Embedded Lofi Girl / Chill Audio Stream Embed */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-3 border border-white/10">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=0&controls=1"
                title="Lofi Girl Radio Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <a
              href="https://www.youtube.com/watch?v=jfKfPfyJRdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-stone-400 hover:text-white flex items-center justify-center gap-1 w-full text-center py-1"
            >
              <span>Open live stream in new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popover Modal: Settings / Backdrop Selector */}
      <AnimatePresence>
        {showWallpaperPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl p-5 bg-black/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh]"
          >
            {/* If an image is selected: Show Pop-Up Big Card View */}
            {activeCardId ? (
              (() => {
                const selectedWp = WALLPAPERS.find((wp) => wp.id === activeCardId) || WALLPAPERS[0];
                const rotation = wallpaperRotations[selectedWp.id] || 0;

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center w-full"
                  >
                    {/* Big Card Header */}
                    <div className="flex items-center justify-between w-full mb-3 shrink-0">
                      <button
                        onClick={() => {
                          soundManager.playTick();
                          setActiveCardId(null);
                        }}
                        className="flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>All Backdrops</span>
                      </button>

                      <span className="text-xs font-mono font-bold text-white truncate max-w-[200px]">
                        {selectedWp.name}
                      </span>

                      <button
                        onClick={() => {
                          soundManager.playTick();
                          setShowWallpaperPicker(false);
                          setActiveCardId(null);
                        }}
                        className="p-1 text-stone-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Pop-Up Big Image Display (Height constrained so icons are always visible outside without scrolling) */}
                    <div className="w-full h-48 sm:h-60 rounded-2xl overflow-hidden bg-black/80 border border-white/15 relative my-2 shadow-2xl flex items-center justify-center shrink-0">
                      {selectedWp.type === 'image' && (
                        <img
                          src={selectedWp.value}
                          alt={selectedWp.name}
                          className="w-full h-full object-cover transition-transform duration-300"
                          style={{ transform: `rotate(${rotation}deg)` }}
                        />
                      )}
                      {selectedWp.type === 'gradient' && (
                        <div
                          className="w-full h-full transition-transform duration-300"
                          style={{
                            background: selectedWp.value,
                            transform: `rotate(${rotation}deg)`,
                          }}
                        />
                      )}
                      {selectedWp.type === 'minimal' && (
                        <div className="w-full h-full" style={{ backgroundColor: selectedWp.value }} />
                      )}
                    </div>

                    {/* Action Controls Underneath the Big Card - Always Static & Visible Outside Image */}
                    <div className="flex items-center justify-center gap-10 pt-4 pb-1 w-full shrink-0">
                      {/* Rotate Icon Button */}
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTick();
                          setWallpaperRotations((prev) => {
                            const updated = {
                              ...prev,
                              [selectedWp.id]: ((prev[selectedWp.id] || 0) + 90) % 360,
                            };
                            StorageService.saveWallpaperRotations(updated);
                            return updated;
                          });
                        }}
                        title="Rotate Image 90°"
                        className="p-3 sm:p-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-[#D8C9A3] hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
                      >
                        <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>

                      {/* Confirm / Check Icon Button */}
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTick();
                          onSaveWallpaper(selectedWp.id);
                          setShowWallpaperPicker(false);
                          setActiveCardId(null);
                        }}
                        title="Confirm & Set Wallpaper"
                        className="p-3 sm:p-3.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg"
                      >
                        <Check className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    </div>
                  </motion.div>
                );
              })()
            ) : (
              /* Grid View when no wallpaper is selected for preview */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white">Backdrop Wallpapers</h3>
                    <p className="text-[11px] font-mono text-stone-400">Click a wallpaper to open preview</p>
                  </div>
                  <button
                    onClick={() => setShowWallpaperPicker(false)}
                    className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {WALLPAPERS.map((wp) => {
                    const rotation = wallpaperRotations[wp.id] || 0;

                    return (
                      <div
                        key={wp.id}
                        onClick={() => {
                          soundManager.playTick();
                          setActiveCardId(wp.id);
                        }}
                        className="relative h-28 sm:h-32 rounded-2xl overflow-hidden cursor-pointer select-none group transition-all border border-white/10 hover:border-[#D8C9A3]/60 hover:scale-[1.02]"
                      >
                        {/* Vivid Thumbnail Element */}
                        {wp.type === 'image' && (
                          <img
                            src={wp.thumbnail || wp.value}
                            alt={wp.name}
                            className="w-full h-full object-cover transition-transform duration-300 pointer-events-none"
                            style={{ transform: `rotate(${rotation}deg)` }}
                          />
                        )}
                        {wp.type === 'gradient' && (
                          <div
                            className="w-full h-full transition-transform duration-300"
                            style={{
                              background: wp.value,
                              transform: `rotate(${rotation}deg)`,
                            }}
                          />
                        )}
                        {wp.type === 'minimal' && (
                          <div className="w-full h-full" style={{ backgroundColor: wp.value }} />
                        )}

                        {/* Current Wallpaper Active Badge */}
                        {currentWallpaperId === wp.id && (
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md p-1 rounded-full text-emerald-400 border border-emerald-500/40">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Drawer: Quick To-Do Panel */}
      <AnimatePresence>
        {showTodoDrawer && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed top-16 right-6 z-40 w-80 sm:w-88 p-5 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#D8C9A3]" />
                <span className="text-sm font-mono font-bold text-white">Focus Tasks</span>
              </div>
              <button
                onClick={() => setShowTodoDrawer(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleAddQuickTask} className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="Add focus item..."
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                className="flex-1 bg-white/10 text-xs font-mono text-white placeholder-stone-400 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#D8C9A3]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[#D8C9A3] text-black font-bold cursor-pointer hover:bg-[#F2E8CF]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {quickTasks.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-all"
                >
                  <button
                    onClick={() => toggleQuickTask(t.id)}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer mr-2"
                  >
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <span
                      className={`text-xs font-mono line-clamp-2 ${
                        t.completed ? 'line-through text-stone-500' : 'text-stone-200'
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>

                  <button
                    onClick={() => deleteQuickTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Completed Toast */}
      <AnimatePresence>
        {completedSessionToast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-black/90 backdrop-blur-2xl border border-[#D8C9A3]/40 rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="text-base font-semibold text-white mb-1">Sprint Complete</div>
              <p className="text-xs text-stone-400 mb-5 font-mono">
                {selectedMinutes >= 60 ? `${selectedMinutes / 60} hour(s)` : `${selectedMinutes} minutes`} logged for "{currentTag}".
              </p>

              <button
                onClick={() => {
                  soundManager.playTick();
                  setCompletedSessionToast(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D8C9A3] to-[#B5A478] text-black font-bold text-xs cursor-pointer shadow-lg"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
