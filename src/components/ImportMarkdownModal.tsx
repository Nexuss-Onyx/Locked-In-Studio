import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Check, 
  HelpCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { parseProjectMarkdown, calculateProjectStats } from '../services/markdownProjectParser';
import { Project } from '../types';
import { soundManager } from '../services/audio';

interface ImportMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedData: { name: string; description: string; category: string; rawMarkdown: string; phases: any; estimatedTime?: string; estimatedMinutes?: number }, targetProjectId?: string) => void;
  existingProjects?: Project[];
  defaultProjectId?: string;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Architecture',
    content: `---
name: Villa Bellagio Studio
category: Architecture
description: Lake Como private residential estate masterplan and travertine stone specifications.
EST: 68:00:00
---

[ 14h ] - # Phase One: Site Topography
- [ X ] Aerial drone lidar scan [ 2h ]
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
    name: 'Couture',
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
    name: 'Horology',
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

export const ImportMarkdownModal: React.FC<ImportMarkdownModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingProjects = [],
  defaultProjectId,
}) => {
  const [markdownText, setMarkdownText] = useState<string>(SAMPLE_TEMPLATES[0].content);
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || existingProjects[0]?.id || '');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSyntaxGuide, setShowSyntaxGuide] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parsed = parseProjectMarkdown(markdownText || 'Project: Untitled');
  const dummyProject: Project = {
    id: 'preview',
    name: parsed.name,
    description: parsed.description,
    color: '#D4AF37',
    icon: 'Layers',
    category: parsed.category,
    createdAt: new Date().toISOString(),
    phases: parsed.phases,
    estimatedTime: parsed.estimatedTime,
    estimatedMinutes: parsed.estimatedMinutes,
  };
  const stats = calculateProjectStats(dummyProject);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setMarkdownText(content);
        soundManager.playTick();
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    soundManager.playCompletionChime();
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

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl glass-panel border border-[#D8C9A3]/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] z-10"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#ABC8A2]" />
              <h2 className="text-base font-serif font-medium text-[#F7F4EE] tracking-wide">
                {defaultProjectId ? 'Sync Project Markdown' : 'New Project'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyntaxGuide(!showSyntaxGuide)}
                className="text-xs font-sans text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Syntax Guide</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Syntax Guide Banner */}
          <AnimatePresence>
            {showSyntaxGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/[0.06] bg-[#120F0C] p-3.5 text-xs font-mono text-stone-400 space-y-1.5"
              >
                <div className="text-[11px] text-stone-300">
                  <span className="text-[#ABC8A2] font-semibold">Frontmatter Syntax:</span>{' '}
                  <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-stone-200">
                    --- name: ... description: ... EST:HH:MM:SS ---
                  </code>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                  <span><strong className="text-[#ABC8A2]">name:</strong> Project title</span>
                  <span><strong className="text-[#ABC8A2]">description:</strong> Scope</span>
                  <span><strong className="text-[#ABC8A2]">EST:HH:MM:SS</strong> Target duration</span>
                  <span><strong className="text-stone-300">#</strong> Phase</span>
                  <span><strong className="text-stone-300">##</strong> Subphase</span>
                  <span><strong className="text-stone-300">[ 4h ] - #</strong> Phase budget</span>
                  <span><strong className="text-stone-300">[ X ]</strong> Done</span>
                  <span><strong className="text-stone-300">[ ! ]</strong> Urgent</span>
                  <span><strong className="text-stone-300">[ ~ ]</strong> Active</span>
                  <span><strong className="text-stone-300">[   ]</strong> Todo</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {/* Template Selector & Upload */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto">
                {SAMPLE_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      soundManager.playTick();
                      setMarkdownText(tpl.content);
                    }}
                    className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] text-stone-300 font-sans cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-md text-xs font-sans text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#D8C9A3]" />
                  <span>Upload .md</span>
                </button>
              </div>
            </div>

            {/* Markdown Textarea */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-xl border transition-all ${
                isDragging
                  ? 'border-[#D8C9A3] bg-[#D8C9A3]/5'
                  : 'border-white/[0.08] bg-[#0E0C0A]'
              }`}
            >
              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                placeholder="---&#10;name: Project Name&#10;description: Project Scope and Objective&#10;EST: 04:30:00&#10;---&#10;&#10;[ 2h ] - # Phase 1: Conceptual Design&#10;- [ ! ] Urgent site audit [ 1h ]&#10;- [ ~ ] Drafting elevations [ 1h ]&#10;- [   ] Review travertine samples"
                className="w-full h-64 sm:h-72 p-3.5 bg-transparent text-xs font-mono text-[#F7F4EE] placeholder-stone-600 outline-none resize-none leading-relaxed select-text"
                spellCheck={false}
              />
            </div>

            {/* Destination Mode */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => setTargetMode('new')}
                  className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                    targetMode === 'new'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  New Project
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('existing')}
                  disabled={existingProjects.length === 0}
                  className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
                    targetMode === 'existing'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Merge Existing
                </button>

                {targetMode === 'existing' && existingProjects.length > 0 && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-[#120F0C] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-stone-200 outline-none font-sans"
                  >
                    {existingProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-[11px] font-mono text-stone-500">
                {stats.totalPhasesCount} phases · {stats.totalTodosCount} milestones
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-[#120F0C]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-sans text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleConfirmImport}
              className="px-4 py-1.5 rounded-lg glass-button-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(171,200,162,0.2)]"
            >
              <span>{targetMode === 'existing' ? 'Update Project' : 'Create Project'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
