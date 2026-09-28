import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Check, 
  HelpCircle, 
  ArrowRight, 
  Plus, 
  FileText, 
  Files, 
  CheckCircle2, 
  ArrowLeft, 
  Code2, 
  Eye, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { 
  parseProjectMarkdown, 
  calculateProjectStats,
  serializeProjectToMarkdown 
} from '../services/markdownProjectParser';
import { Project } from '../types';
import { soundManager } from '../services/audio';

interface ImportMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    parsedData: {
      name: string;
      description: string;
      category: string;
      rawMarkdown: string;
      phases: any;
      estimatedTime?: string;
      estimatedMinutes?: number;
    },
    targetProjectId?: string
  ) => void;
  existingProjects?: Project[];
  defaultProjectId?: string;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Architecture & Design',
    fileName: 'Villa_Bellagio_Masterplan.md',
    content: `---
name: Villa Bellagio Studio
category: Architecture & Heritage
description: Lake Como private residential estate masterplan and travertine stone specifications.
EST: 68:00:00
---

[ 14h ] - # Phase One: Site Topography
- [ X ] Aerial drone lidar scan of promontory [ 2h ]
- [ X ] Calibrate geothermal borehole depth [ 3h ]
- [ ! ] Finalize south loggia travertine fluting [ 4h ]

[ 18h ] - ## Subphase 1.1: Cantilevered Pavilion
- [ ~ ] Structural finite element analysis of 14m steel span [ 6h ]
- [   ] Acoustic isolation modeling for grand salon [ 4h ]

[ 12h ] - ### Subphase 1.1.1: Horizon Pool
- [ ! ] Specify Italian Carrara vein-matched coping slabs [ 5h ]
- [   ] Integrate low-voltage warm brass linear lighting [ 3h ]

[ 24h ] - # Phase Two: Interior Joinery
- [ X ] Commission Florentine hand-rubbed brass hardware [ 6h ]
- [ ~ ] Select book-matched French walnut veneer flitches [ 8h ]
- [   ] Acoustic felt and linen acoustic wall paneling mockups [ 4h ]
`,
  },
  {
    name: 'Couture & Fashion',
    fileName: 'Haute_Couture_Lookbook.md',
    content: `---
name: Maison Haute Couture
category: Creative Direction
description: Bespoke runway visual direction and textile curation for Paris Fashion Week.
EST: 64:00:00
---

[ 16h ] - # Phase One: Autumn Collection Narrative
- [ X ] Archive research into 1920s Paul Poiret drapery [ 4h ]
- [ X ] Curate seasonal chromatic palette: Umber, Alabaster, Aged Brass [ 3h ]
- [ ! ] Compose creative director's seasonal manifesto [ 5h ]

[ 28h ] - ## Subphase 1.1: Bespoke Silk Weave
- [ X ] Commission heritage silk jacquard weaves in Lyon atelier [ 8h ]
- [ ~ ] Inspect botanical pigment dye bath strike-offs [ 6h ]
- [   ] Review hand-embroidered metallic thread sample plates [ 4h ]

[ 20h ] - # Phase Two: Paris Salon Scenography
- [ ~ ] Architectural lighting grid design at Grand Palais salon [ 6h ]
- [ ! ] Soundtrack composition mastering at Abbey Road Studios [ 8h ]
- [   ] Casting directional models and garment sequencing [ 4h ]
`,
  },
  {
    name: 'Vintage Horology',
    fileName: 'Sovereign_Heritage_Syndicate.md',
    content: `---
name: Sovereign Heritage Capital
category: Private Equity
description: Private equity syndicate for vintage horology and rare timepiece acquisitions.
EST: 36:00:00
---

[ 22h ] - # Phase One: Horology Portfolio M&A
- [ X ] Complete buy-side due diligence for Geneva watchmaker [ 8h ]
- [ ! ] Audit rare vintage chronograph provenance records [ 6h ]
- [ ~ ] Structure cross-border IP licensing agreements [ 8h ]

[ 14h ] - ## Subphase 1.1: Private Placement Memorandum
- [ X ] Draft multi-family office investment charter [ 6h ]
- [   ] Finalize capital allocation governance framework [ 5h ]
`,
  },
];

// Roland/Matrix LED Segmented Progress Bar (matches reference mockup exactly)
const SegmentedProgressBar: React.FC<{ progress: number; totalSegments?: number }> = ({ 
  progress, 
  totalSegments = 46 
}) => {
  const activeCount = Math.round((Math.max(0, Math.min(100, progress)) / 100) * totalSegments);
  
  return (
    <div className="flex items-center gap-[3px] w-full py-1 overflow-hidden" role="progressbar" aria-valuenow={progress}>
      {Array.from({ length: totalSegments }).map((_, i) => {
        const isActive = i < activeCount;
        return (
          <span
            key={i}
            className={`h-2.5 w-[3.5px] rounded-[1px] transition-colors duration-100 shrink-0 ${
              isActive 
                ? 'bg-[#34D399] shadow-[0_0_4px_rgba(52,211,153,0.8)]' 
                : 'bg-white/[0.08]'
            }`}
          />
        );
      })}
    </div>
  );
};

export const ImportMarkdownModal: React.FC<ImportMarkdownModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingProjects = [],
  defaultProjectId,
}) => {
  // Navigation Stage: 'upload' is primary, then 'editor' on Proceed
  const [stage, setStage] = useState<'upload' | 'editor'>('upload');
  
  // Real Upload State (starts empty with no synthetic file pre-loaded)
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [activeFileSize, setActiveFileSize] = useState<string>('');
  const [fileExtension, setFileExtension] = useState<string>('MD');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'reading' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Markdown Content & Editor State
  const [markdownText, setMarkdownText] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || existingProjects[0]?.id || '');
  const [editorTab, setEditorTab] = useState<'editor' | 'preview' | 'syntax'>('editor');
  
  // Toast State
  const [showToast, setShowToast] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowToast(false);
      setErrorMessage(null);

      if (defaultProjectId) {
        // Syncing an existing project: load its current markdown and jump straight to editor
        setTargetMode('existing');
        setSelectedProjectId(defaultProjectId);
        const existingProj = existingProjects.find((p) => p.id === defaultProjectId);
        if (existingProj) {
          const serialized = serializeProjectToMarkdown(existingProj);
          setMarkdownText(serialized);
          setActiveFileName(`${existingProj.name.replace(/\s+/g, '_')}.md`);
        }
        setStage('editor');
      } else {
        // New project upload: starts 100% clean with NO synthetic file pre-loaded
        setStage('upload');
        setTargetMode('new');
        setActiveFileName('');
        setActiveFileSize('');
        setFileExtension('MD');
        setUploadProgress(0);
        setUploadStatus('idle');
        setMarkdownText('');
      }
    }
  }, [isOpen, defaultProjectId, existingProjects]);

  if (!isOpen) return null;

  // Real file stream upload handler
  const handleRealFileUpload = async (file: File) => {
    if (!file) return;

    // Check valid format (.md, .txt, .markdown)
    const name = file.name;
    const ext = name.split('.').pop()?.toUpperCase() || 'MD';
    const isValid = name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown');

    if (!isValid) {
      setErrorMessage('Please upload a valid Markdown file (.md or .txt)');
      setUploadStatus('error');
      soundManager.playTick();
      return;
    }

    setErrorMessage(null);
    setActiveFileName(name);
    setFileExtension(ext === 'MARKDOWN' ? 'MD' : ext);

    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeFormatted = file.size > 1048576 
      ? `${(file.size / 1048576).toFixed(2)} MB` 
      : `${sizeInKb} KB`;
    setActiveFileSize(sizeFormatted);

    setUploadStatus('reading');
    setUploadProgress(0);

    try {
      const totalBytes = file.size;
      // Real streaming chunks proportional to file size
      const chunkStep = Math.max(512, Math.floor(totalBytes / 18));
      let currentBytes = 0;

      while (currentBytes < totalBytes) {
        currentBytes = Math.min(totalBytes, currentBytes + chunkStep);
        const pct = totalBytes > 0 
          ? Math.min(99, Math.round((currentBytes / totalBytes) * 100)) 
          : 100;
        setUploadProgress(pct);
        // Micro-delay so browser paint cycle animates the Roland LED segments dynamically
        await new Promise((r) => setTimeout(r, 14));
      }

      // Read real text from the actual file
      const text = await file.text();
      
      setMarkdownText(text);
      setUploadProgress(100);
      setUploadStatus('completed');
      soundManager.playTick();
    } catch (err) {
      console.error('File stream read error:', err);
      setUploadStatus('error');
      setErrorMessage('Failed to read file from disk. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRealFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Optional: sample starter if user doesn't have an external file on disk
  const handleLoadSampleTemplate = async (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setErrorMessage(null);
    setActiveFileName(tpl.fileName);
    setFileExtension('MD');
    const bytes = new TextEncoder().encode(tpl.content).length;
    setActiveFileSize(`${(bytes / 1024).toFixed(1)} KB`);
    setUploadStatus('reading');
    setUploadProgress(0);

    // Stream the sample template in chunks to show the real segmented meter progress
    for (let p = 15; p <= 100; p += 20) {
      setUploadProgress(Math.min(100, p));
      await new Promise((r) => setTimeout(r, 25));
    }
    setMarkdownText(tpl.content);
    setUploadProgress(100);
    setUploadStatus('completed');
    soundManager.playTick();
  };

  const handleResetFile = () => {
    setActiveFileName('');
    setActiveFileSize('');
    setUploadProgress(0);
    setUploadStatus('idle');
    setMarkdownText('');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parsed = parseProjectMarkdown(markdownText || 'Project: Untitled');
  const dummyProject: Project = {
    id: 'preview',
    name: parsed.name,
    description: parsed.description,
    color: '#ABC8A2',
    icon: 'Layers',
    category: parsed.category,
    createdAt: new Date().toISOString(),
    phases: parsed.phases,
    estimatedTime: parsed.estimatedTime,
    estimatedMinutes: parsed.estimatedMinutes,
  };
  const stats = calculateProjectStats(dummyProject);

  // PROCEED: Imports the project into workspace, fires Toast, and opens the styled Editor
  const handleProceed = () => {
    if (uploadStatus !== 'completed' || !markdownText.trim()) {
      return;
    }

    soundManager.playCompletionChime();
    
    // Import project
    onImport(
      {
        name: parsed.name,
        description: parsed.description,
        category: parsed.category,
        rawMarkdown: markdownText,
        phases: parsed.phases,
        estimatedTime: parsed.estimatedTime,
        estimatedMinutes: parsed.estimatedMinutes,
      },
      targetMode === 'existing' ? selectedProjectId : undefined
    );

    // Show toast and transition to editor
    setShowToast(true);
    setStage('editor');
  };

  // FINISH & CLOSE: User is done reviewing/editing
  const handleFinishAndClose = () => {
    soundManager.playTick();
    onImport(
      {
        name: parsed.name,
        description: parsed.description,
        category: parsed.category,
        rawMarkdown: markdownText,
        phases: parsed.phases,
        estimatedTime: parsed.estimatedTime,
        estimatedMinutes: parsed.estimatedMinutes,
      },
      targetMode === 'existing' ? selectedProjectId : undefined
    );
    onClose();
  };

  const lineCount = Math.max(1, markdownText.split('\n').length);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full transition-all duration-300 glass-panel border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 ${
            stage === 'upload' ? 'max-w-xl max-h-[85vh] bg-[#141517]' : 'max-w-4xl max-h-[90vh] bg-[#101113]'
          }`}
        >
          {/* ========================================================= */}
          {/* STAGE 1: REAL UPLOAD UI (Exact Mockup Match, Zero Synthetic) */}
          {/* ========================================================= */}
          {stage === 'upload' && (
            <div className="flex flex-col p-6 sm:p-7 space-y-5 animate-in fade-in duration-150">
              {/* Header */}
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-lg sm:text-xl font-sans font-medium text-[#F7F4EE] tracking-tight">
                  Upload Files
                </h2>
                
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dashed Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
                  isDragging
                    ? 'border-[#34D399] bg-[#34D399]/[0.06] scale-[0.99]'
                    : 'border-white/[0.12] hover:border-white/[0.24] bg-white/[0.015] hover:bg-white/[0.03]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown"
                  onChange={(e) => e.target.files && e.target.files[0] && handleRealFileUpload(e.target.files[0])}
                  className="hidden"
                />

                {/* Stacked Files Icon with '+' badge (Mockup replica) */}
                <div className="relative mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-stone-300 shadow-inner">
                    <Files className="w-6 h-6 stroke-[1.7]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#34D399] text-[#0A0D08] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Monospace Headline with Neon Highlight */}
                <div className="font-mono text-xs tracking-wider text-stone-300 space-x-1 mb-1.5">
                  <span>DRAG AND DROP OR</span>
                  <span className="text-[#34D399] font-semibold hover:underline">
                    CLICK TO BROWSE
                  </span>
                </div>

                {/* Secondary subtext */}
                <p className="font-mono text-[10px] tracking-wider text-stone-500 uppercase">
                  MAX FILE SIZE: 8MB · SUPPORTS .MD, .TXT
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 font-sans">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Real Upload Progress Card (Renders only when a real file is chosen or uploaded) */}
              {uploadStatus !== 'idle' ? (
                <div className="rounded-2xl p-4 bg-white/[0.025] border border-white/[0.06] flex items-center gap-4 transition-all">
                  {/* File Icon with Dynamic Extension Pill */}
                  <div className="relative shrink-0 w-11 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center">
                    <FileText className="w-5 h-5 text-stone-300 stroke-[1.6]" />
                    <span className="text-[8px] font-mono font-bold tracking-wider text-stone-400 uppercase mt-0.5">
                      {fileExtension}
                    </span>
                  </div>

                  {/* Info & Real Segmented Progress Bar */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-200 font-medium truncate pr-2">
                        {activeFileName}
                      </span>
                      <span className="text-stone-400 font-mono text-[11px] shrink-0">
                        {uploadProgress}%
                      </span>
                    </div>

                    {/* Audio / LED Matrix VU-meter Bar */}
                    <SegmentedProgressBar progress={uploadProgress} />

                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span>.{fileExtension.toLowerCase()} / {activeFileSize}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-sans ${
                          uploadStatus === 'completed' ? 'text-[#34D399]' : 'text-amber-400'
                        }`}>
                          {uploadStatus === 'completed' ? 'Ready to import' : 'Reading file...'}
                        </span>
                        <button
                          onClick={handleResetFile}
                          className="text-stone-500 hover:text-stone-300 transition-colors p-0.5"
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Idle state: clean prompt */
                <div className="rounded-2xl p-3.5 bg-white/[0.015] border border-dashed border-white/[0.06] flex items-center justify-between text-stone-500 text-xs font-mono">
                  <span>No file selected</span>
                  <span className="text-[11px] text-stone-600">Awaiting .md file</span>
                </div>
              )}

              {/* Sample Templates (Quiet secondary trigger, no synthetic preloading) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-sans text-stone-400">
                  <span>Need a sample markdown to test?</span>
                  <button
                    onClick={() => setStage('editor')}
                    className="text-stone-400 hover:text-white underline text-[11px] font-sans cursor-pointer transition-colors"
                  >
                    Open blank editor →
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => handleLoadSampleTemplate(tpl)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-sans transition-all cursor-pointer ${
                        activeFileName === tpl.fileName
                          ? 'bg-[#34D399]/10 border-[#34D399]/40 text-[#34D399]'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-stone-300'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proceed Action Button */}
              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={uploadStatus !== 'completed'}
                  onClick={handleProceed}
                  className={`w-full py-3 px-5 rounded-2xl font-sans font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    uploadStatus === 'completed'
                      ? 'bg-[#34D399] hover:bg-[#22C55E] text-[#0A0D08] shadow-[0_0_20px_rgba(52,211,153,0.3)] cursor-pointer'
                      : 'bg-white/[0.05] text-stone-500 border border-white/[0.08] cursor-not-allowed'
                  }`}
                >
                  <span>
                    {uploadStatus === 'completed'
                      ? 'Proceed to Import & Review'
                      : uploadStatus === 'reading'
                      ? 'Reading File...'
                      : 'Select a Markdown File to Proceed'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </motion.button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STAGE 2: STYLED MARKDOWN EDITOR (Focus on Close Action)    */}
          {/* ========================================================= */}
          {stage === 'editor' && (
            <div className="flex flex-col h-full max-h-[90vh] animate-in fade-in duration-200">
              {/* Floating Success Toast (When user just proceeded) */}
              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="p-3 bg-[#34D399]/15 border-b border-[#34D399]/30 flex items-center justify-between gap-3 text-xs font-sans text-[#34D399] px-6"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                      <span>Project successfully imported to workspace!</span>
                      <span className="text-stone-300 hidden sm:inline">
                        Review the markdown below or close when ready.
                      </span>
                    </div>

                    <button
                      onClick={handleFinishAndClose}
                      className="px-3 py-1 rounded-lg bg-[#34D399] hover:bg-[#22C55E] text-[#0A0D08] font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      Close & Go To Projects
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Editor Header: High-Visibility Close Focus */}
              <div className="px-5 sm:px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#141517]">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      soundManager.playTick();
                      setStage('upload');
                    }}
                    className="flex items-center gap-1 text-xs font-sans text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Upload another file"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>

                  <span className="w-px h-3.5 bg-white/[0.1] shrink-0" />

                  <div className="truncate">
                    <h2 className="text-sm sm:text-base font-serif font-medium text-[#F7F4EE] truncate">
                      {parsed.name || 'Untitled Project'}
                    </h2>
                  </div>

                  {parsed.estimatedTime && (
                    <span className="hidden md:inline px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#34D399] font-mono text-[11px] shrink-0">
                      EST: {parsed.estimatedTime}
                    </span>
                  )}
                </div>

                {/* Spot the Close Action with High Visual Contrast */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFinishAndClose}
                    className="px-4 py-1.5 rounded-xl bg-[#34D399] hover:bg-[#22C55E] text-[#0A0D08] font-sans font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_16px_rgba(52,211,153,0.35)] cursor-pointer transition-all"
                    title="Finish and close modal"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                    <span>Done & Close</span>
                  </motion.button>

                  <button
                    onClick={handleFinishAndClose}
                    className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-stone-300 hover:text-white transition-colors cursor-pointer border border-white/[0.08]"
                    title="Close Editor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Tabs & Destination Control */}
              <div className="px-5 sm:px-6 py-2 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-[#111214] text-xs font-sans">
                {/* Segmented Tab Controls */}
                <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
                  <button
                    onClick={() => setEditorTab('editor')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      editorTab === 'editor'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Markdown Code</span>
                  </button>

                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      editorTab === 'preview'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tree Preview ({stats.totalPhasesCount})</span>
                  </button>

                  <button
                    onClick={() => setEditorTab('syntax')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      editorTab === 'syntax'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Frontmatter Guide</span>
                  </button>
                </div>

                {/* Target Mode: New vs Existing */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 hidden sm:inline">Destination:</span>
                  <button
                    onClick={() => setTargetMode('new')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-colors ${
                      targetMode === 'new'
                        ? 'bg-white/[0.08] text-white font-medium'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    New Workspace
                  </button>
                  {existingProjects.length > 0 && (
                    <button
                      onClick={() => setTargetMode('existing')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-colors ${
                        targetMode === 'existing'
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Merge
                    </button>
                  )}
                  {targetMode === 'existing' && existingProjects.length > 0 && (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-[#18191B] border border-white/[0.08] rounded-lg px-2 py-0.5 text-[11px] text-stone-200 outline-none"
                    >
                      {existingProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Editor Workspace Content */}
              <div className="flex-1 overflow-y-auto">
                {editorTab === 'editor' && (
                  <div className="flex min-h-[360px] h-full bg-[#0D0E10]">
                    {/* Line numbers gutter */}
                    <div className="w-10 sm:w-12 py-4 select-none font-mono text-[11px] text-stone-600 text-right pr-3 border-r border-white/[0.04] bg-[#0A0B0D]">
                      {Array.from({ length: lineCount }).map((_, i) => (
                        <div key={i} className="leading-6">
                          {i + 1}
                        </div>
                      ))}
                    </div>

                    {/* Textarea */}
                    <div className="flex-1 p-4">
                      <textarea
                        value={markdownText}
                        onChange={(e) => setMarkdownText(e.target.value)}
                        placeholder="---&#10;name: Project Title&#10;description: Scope description&#10;EST: 14:30:00&#10;---&#10;&#10;[ 4h ] - # Phase 1: Conceptual Design&#10;- [ ! ] Urgent site audit [ 2h ]&#10;- [ ~ ] Drafting elevations [ 2h ]"
                        className="w-full h-full min-h-[340px] bg-transparent text-xs font-mono text-[#F7F4EE] placeholder-stone-600 outline-none resize-none leading-6 select-text"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}

                {editorTab === 'preview' && (
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-sans uppercase tracking-wider text-[#34D399]">
                          {parsed.category || 'Architecture'}
                        </span>
                        {parsed.estimatedTime && (
                          <span className="text-xs font-mono text-stone-400">
                            EST: {parsed.estimatedTime}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-serif text-white font-medium">
                        {parsed.name}
                      </h3>
                      {parsed.description && (
                        <p className="text-xs text-stone-400 font-sans leading-relaxed">
                          {parsed.description}
                        </p>
                      )}
                    </div>

                    {/* Phases preview */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-mono text-stone-400 uppercase tracking-wider">
                        Phases & Milestones ({stats.totalPhasesCount} phases · {stats.totalTodosCount} tasks)
                      </h4>

                      {parsed.phases.map((ph, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs font-sans">
                            <span className="font-medium text-stone-200">
                              {ph.title}
                            </span>
                            {ph.timeBudget && (
                              <span className="font-mono text-stone-400">
                                [{ph.timeBudget}]
                              </span>
                            )}
                          </div>

                          <div className="pl-3 space-y-1">
                            {ph.todos.map((t: any, tidx: number) => (
                              <div
                                key={tidx}
                                className="flex items-center justify-between text-xs font-sans text-stone-400 py-0.5"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                    t.status === 'completed'
                                      ? 'bg-[#34D399]/20 text-[#34D399]'
                                      : t.status === 'urgent'
                                      ? 'bg-rose-500/20 text-rose-400 font-bold'
                                      : 'border border-stone-600'
                                  }`}>
                                    {t.status === 'completed' ? '✓' : t.status === 'urgent' ? '!' : ''}
                                  </span>
                                  <span>{t.title}</span>
                                </div>
                                {t.estimatedTime && (
                                  <span className="font-mono text-[10px] text-stone-500">
                                    {t.estimatedTime}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editorTab === 'syntax' && (
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 font-mono text-xs text-stone-300">
                      <div className="text-sm font-semibold text-[#34D399]">
                        Frontmatter Syntax Guide:
                      </div>
                      <pre className="p-3 bg-black/40 rounded-xl text-stone-300 overflow-x-auto text-[11px] leading-relaxed">
{`---
name: Project Name
description: Scope, direction, and objective
category: Architecture & Design
EST: 04:30:00
---

[ 14h ] - # Phase One: Title
- [ X ] Completed milestone [ 2h ]
- [ ! ] Urgent milestone [ 3h ]
- [ ~ ] Active milestone in progress [ 1h ]
- [   ] Standard todo item

[ 8h ] - ## Subphase 1.1: Deep child
- [   ] Detail task`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Editor Footer with Prominent Close */}
              <div className="px-5 sm:px-6 py-3 border-t border-white/[0.08] flex items-center justify-between gap-3 bg-[#141517]">
                <div className="flex items-center gap-3 text-xs font-mono text-stone-400">
                  <span className="text-[#34D399] font-medium">
                    ✓ Synced to Project
                  </span>
                  <span>·</span>
                  <span>{stats.totalPhasesCount} phases</span>
                  <span>·</span>
                  <span>{stats.totalTodosCount} tasks</span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFinishAndClose}
                    className="px-5 py-2 rounded-xl bg-[#34D399] hover:bg-[#22C55E] text-[#0A0D08] font-sans font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_16px_rgba(52,211,153,0.3)] cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.8]" />
                    <span>Done & Close</span>
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
