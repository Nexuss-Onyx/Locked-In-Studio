import { Project, Task, FocusSession, AIChangelogReport, ContributionDay } from '../types';
import { parseProjectMarkdown } from './markdownProjectParser';

const STORAGE_KEYS = {
  PROJECTS: 'aura_projects_v3',
  TASKS: 'aura_tasks_v2',
  SESSIONS: 'aura_sessions_v2',
  CHANGELOG_REPORTS: 'aura_changelog_reports_v2',
  SELECTED_WALLPAPER: 'aura_selected_wallpaper_v1',
  WALLPAPER_ROTATIONS: 'aura_wallpaper_rotations_v1',
  CUSTOM_WALLPAPERS: 'aura_custom_wallpapers_v1',
};

const RAW_PROJECT_1_MD = `Project: Maison & Haute Couture Lookbook
Category: Creative Direction
Bespoke runway visual direction and textile curation for Paris Fashion Week.

[ 16h ] - # Phase One: Autumn Collection Narrative & Mood Synthesis
- [ X ] Archive research into 1920s Paul Poiret drapery techniques [ 4h ]
- [ X ] Curate seasonal chromatic palette: Umber, Alabaster, Aged Brass [ 3h ]
- [ ! ] Compose creative director's seasonal manifesto [ 5h ]

[ 28h ] - ## Subphase 1.1: Bespoke Silk & Jacquard Weave Development
- [ X ] Commission heritage silk jacquard weaves in Lyon atelier [ 8h ]
- [ ~ ] Inspect botanical pigment dye bath strike-offs [ 6h ]
- [   ] Review hand-embroidered metallic thread sample plates [ 4h ]

[ 20h ] - # Phase Two: Paris Salon Runway Scenography
- [ ~ ] Architectural lighting grid design at Grand Palais salon [ 6h ]
- [ ! ] Soundtrack composition mastering at Abbey Road Studios [ 8h ]
- [   ] Casting directional models and garment sequencing [ 4h ]
`;

const RAW_PROJECT_2_MD = `Project: Villa Bellagio Architectural Studio
Category: Architecture & Heritage
Lake Como private residential estate masterplan and travertine stone specifications.

[ 14h ] - # Phase One: Site Topography & Spatial Masterplan
- [ X ] Aerial drone lidar scan of Lake Como promontory [ 2h ]
- [ X ] Calibrate geothermal ground-source borehole depth [ 3h ]
- [ ! ] Finalize south loggia travertine fluting specifications [ 4h ]

[ 18h ] - ## Subphase 1.1: Cantilevered Pavilion & Glass Portico
- [ ~ ] Structural finite element analysis of 14m steel span [ 6h ]
- [   ] Acoustic isolation modeling for grand salon [ 4h ]

[ 12h ] - ### Subphase 1.1.1: Horizon Pool Hydraulic Infinity Weir
- [ ! ] Specify Italian Carrara vein-matched coping slabs [ 5h ]
- [   ] Integrate low-voltage warm brass linear lighting recesses [ 3h ]

[ 24h ] - # Phase Two: Interior Joinery & Material Provenance
- [ X ] Commission Florentine hand-rubbed brass hardware suite [ 6h ]
- [ ~ ] Select book-matched French walnut veneer flitches [ 8h ]
- [   ] Acoustic felt and linen acoustic wall paneling mockups [ 4h ]
`;

const RAW_PROJECT_3_MD = `Project: Sovereign Heritage Capital
Category: Private Equity
Private equity syndicate for vintage horology and rare timepiece acquisitions.

[ 22h ] - # Phase One: Horology & Heritage Portfolio M&A
- [ X ] Complete buy-side due diligence for Geneva watchmaker [ 8h ]
- [ ! ] Audit rare vintage chronograph provenance records [ 6h ]
- [ ~ ] Structure cross-border IP licensing agreements [ 8h ]

[ 14h ] - ## Subphase 1.1: Private Placement Memorandum
- [ X ] Draft multi-family office investment charter [ 6h ]
- [   ] Finalize capital allocation governance framework [ 5h ]
`;

const parsedP1 = parseProjectMarkdown(RAW_PROJECT_1_MD);
const parsedP2 = parseProjectMarkdown(RAW_PROJECT_2_MD);
const parsedP3 = parseProjectMarkdown(RAW_PROJECT_3_MD);

// Curated luxury creative, architectural, and executive workspaces
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: parsedP1.name,
    description: parsedP1.description,
    color: '#D4AF37', // Champagne Gold
    icon: 'Sparkles',
    category: parsedP1.category,
    targetDeadline: '2026-10-15T18:00',
    createdAt: '2026-09-01T10:00:00Z',
    rawMarkdown: RAW_PROJECT_1_MD,
    phases: parsedP1.phases,
  },
  {
    id: 'proj-2',
    name: parsedP2.name,
    description: parsedP2.description,
    color: '#C5A059', // Aged Brass
    icon: 'Layers',
    category: parsedP2.category,
    targetDeadline: '2026-10-05T12:00',
    createdAt: '2026-09-10T14:30:00Z',
    rawMarkdown: RAW_PROJECT_2_MD,
    phases: parsedP2.phases,
  },
  {
    id: 'proj-3',
    name: parsedP3.name,
    description: parsedP3.description,
    color: '#EBD8B0', // Warm Alabaster
    icon: 'Cpu',
    category: parsedP3.category,
    targetDeadline: '2026-10-20T20:00',
    createdAt: '2026-09-15T09:00:00Z',
    rawMarkdown: RAW_PROJECT_3_MD,
    phases: parsedP3.phases,
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Review architectural elevations and travertine finishes for Lake Como pavilion',
    description: 'Examine cantilevers, limestone fluting, and natural light penetration for the south-facing terrace.',
    projectId: 'proj-2',
    deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), // today in 4 hours
    priority: 'urgent',
    status: 'in_progress',
    estimatedMinutes: 45,
    focusMinutesLogged: 30,
    tags: ['Architecture', 'Couture', 'Lake Como'],
    subtasks: [
      { id: 'st-1', title: 'Verify structural load margins on glass cantilever', completed: true },
      { id: 'st-2', title: 'Approve honed Roman travertine sample palette', completed: true },
      { id: 'st-3', title: 'Finalize twilight lighting scheme with Milan consultants', completed: false },
    ],
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'task-2',
    title: 'Curate autumn haute couture textile palette and silk jacquard swatches',
    description: 'Select heavy mulberry silk weaves, brushed alpaca tones, and antique gold hardware.',
    projectId: 'proj-1',
    deadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), // tomorrow morning
    priority: 'high',
    status: 'todo',
    estimatedMinutes: 60,
    focusMinutesLogged: 15,
    tags: ['Editorial', 'Textiles', 'Atelier'],
    subtasks: [
      { id: 'st-4', title: 'Review swatch dye consistency under 5000K studio daylight', completed: true },
      { id: 'st-5', title: 'Sequence 24 lookbook plates for publisher review', completed: false },
    ],
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: 'task-3',
    title: 'Finalize term sheet for heritage Swiss horology manufacture acquisition',
    description: 'Audit master watchmaker apprenticeship pipeline and historical patent archives.',
    projectId: 'proj-3',
    deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // 2 days out
    priority: 'medium',
    status: 'todo',
    estimatedMinutes: 45,
    tags: ['M&A', 'Horology', 'Due Diligence'],
    subtasks: [
      { id: 'st-6', title: 'Review IP registry in Geneva and Neuchâtel', completed: false },
    ],
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'task-4',
    title: 'Master acoustic lacquer pressing for chamber orchestra vinyl release',
    description: 'Precision 45 RPM half-speed mastering at Abbey Road for limited collector edition.',
    projectId: 'proj-1',
    deadline: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // completed earlier
    priority: 'high',
    status: 'completed',
    completedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    estimatedMinutes: 30,
    focusMinutesLogged: 45,
    tags: ['Acoustics', 'Vinyl', 'Mastering'],
    subtasks: [
      { id: 'st-7', title: 'Inspect test acetate grooves under microscope', completed: true },
      { id: 'st-8', title: 'Approve dynamic headroom on string crescendos', completed: true },
    ],
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
  {
    id: 'task-5',
    title: 'Author brand manifesto and typography guidelines for high-jewelry salon',
    description: 'Articulate maison heritage, diamond provenance ethics, and bespoke client rituals.',
    projectId: 'proj-1',
    deadline: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    priority: 'medium',
    status: 'completed',
    completedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    estimatedMinutes: 40,
    focusMinutesLogged: 40,
    tags: ['Manifesto', 'Branding', 'Jewelry'],
    subtasks: [],
    createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
  },
];

// Deterministic pseudo-random helper to guarantee 100% stable, non-volatile demo metrics
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Calculate realistic annual seasonal activity factor (creative sprints vs seasonal recesses)
function getSeasonalIntensityFactor(daysAgo: number): number {
  // daysAgo: 1 (today, Sep 2026) to 364 (Sep 2025)
  if (daysAgo >= 40 && daysAgo <= 65) {
    return 0.30; // August European summer retreat / salon recess
  }
  if (daysAgo >= 165 && daysAgo <= 185) {
    return 0.38; // April Easter / spring reflection interlude
  }
  if (daysAgo >= 265 && daysAgo <= 285) {
    return 0.20; // Late December winter holidays & New Year recess
  }
  if (daysAgo >= 120 && daysAgo <= 160) {
    return 0.95; // May Milan / Paris architectural & couture sprint
  }
  if (daysAgo >= 195 && daysAgo <= 240) {
    return 0.88; // February / March Q1 peak execution sprint
  }
  if (daysAgo <= 35) {
    return 0.85; // September Autumn lookbook & salon premiere sprint
  }
  return 0.70; // Baseline disciplined steady momentum
}

// Helper to seed past completed tasks for rich historical 52-week cadence (Deterministic)
function getSeedPastCompletedTasks(): Task[] {
  const tasks: Task[] = [];
  // Anchor to fixed local midnight so timestamps and metrics stay 100% constant across sessions
  const anchorDate = new Date();
  anchorDate.setHours(0, 0, 0, 0);
  const now = anchorDate.getTime();

  const pastTitles = [
    { title: 'Selected rare Calacatta marble slabs in Carrara quarries', project: 'proj-2', tags: ['Architecture'] },
    { title: 'Calibrated Steinway Concert Grand acoustic dampening', project: 'proj-1', tags: ['Acoustics'] },
    { title: 'Drafted charter for private family office foundation', project: 'proj-3', tags: ['Governance'] },
    { title: 'Curated private salon preview for Venice Biennale patrons', project: 'proj-1', tags: ['Art'] },
    { title: 'Commissioned bespoke brass joinery for library pavilion', project: 'proj-2', tags: ['Interior'] },
    { title: 'Audited rare vintage chronograph provenance records', project: 'proj-3', tags: ['Horology'] },
    { title: 'Refined handcrafted foil typography for monograph cover', project: 'proj-1', tags: ['Print'] },
    { title: 'Sequenced haute joaillerie exhibition in Zurich atelier', project: 'proj-1', tags: ['Exhibition'] },
    { title: 'Reviewed travertine fluting samples for south colonnade', project: 'proj-2', tags: ['Architecture'] },
    { title: 'Finalized bespoke silk weave specifications in Lyon mill', project: 'proj-1', tags: ['Textiles'] },
    { title: 'Appraised 1958 vintage Grand Prix chronograph movement', project: 'proj-3', tags: ['Horology'] },
    { title: 'Curated Autumn couture runway musical score at Abbey Road', project: 'proj-1', tags: ['Audio'] },
    { title: 'Designed floating cantilever glass loggia for Lake Como estate', project: 'proj-2', tags: ['Architecture'] },
    { title: 'Reviewed private placement memorandum for timepiece fund', project: 'proj-3', tags: ['M&A'] },
  ];

  // Distribute across the full 52 weeks (364 days) with deterministic seasonal topography
  for (let d = 1; d <= 360; d++) {
    const dayOfWeek = (d % 7);
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const seasonFactor = getSeasonalIntensityFactor(d);
    const rnd = pseudoRandom(d * 17);
    const threshold = (isWeekend ? 0.28 : 0.82) * seasonFactor;

    if (rnd < threshold) {
      const itemsCount = seasonFactor < 0.35 ? 1 : Math.floor(pseudoRandom(d * 31) * 3) + 1;
      for (let i = 0; i < itemsCount; i++) {
        const item = pastTitles[(d + i * 3) % pastTitles.length];
        const pastDate = new Date(now - d * 24 * 3600 * 1000 + (i * 2 + 10) * 3600 * 1000).toISOString();
        tasks.push({
          id: `seed-past-${d}-${i}`,
          title: item.title,
          projectId: item.project,
          deadline: pastDate,
          priority: (i % 2 === 0 ? 'high' : 'medium') as any,
          status: 'completed',
          completedAt: pastDate,
          focusMinutesLogged: Math.round((30 + pseudoRandom(d * 47 + i) * 35) * seasonFactor),
          tags: item.tags,
          subtasks: [],
          createdAt: new Date(now - (d + 2) * 24 * 3600 * 1000).toISOString(),
        });
      }
    }
  }

  return tasks;
}

function getSeedPastSessions(): FocusSession[] {
  const sessions: FocusSession[] = [];
  const anchorDate = new Date();
  anchorDate.setHours(0, 0, 0, 0);
  const now = anchorDate.getTime();

  const sessionThemes = [
    'Lake Como Villa Elevations & Cantilevers',
    'Haute Couture Textile Curation & Silks',
    'Swiss Horology M&A Term Sheet Audit',
    'Abbey Road Acoustic Lacquer Mastering',
    'High-Jewelry Brand Manifesto Composition',
    'Carrara Marble Fluting & Spec Approvals',
    'Private Foundation Governance Review',
  ];

  for (let d = 1; d <= 360; d++) {
    const dayOfWeek = (d % 7);
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const seasonFactor = getSeasonalIntensityFactor(d);
    const rnd = pseudoRandom(d * 23);
    const sessionChance = (isWeekend ? 0.32 : 0.85) * seasonFactor;

    if (rnd < sessionChance) {
      const sessionCount = seasonFactor < 0.35 ? 1 : Math.floor(pseudoRandom(d * 41) * 3) + 1;
      for (let s = 0; s < sessionCount; s++) {
        const duration = Math.round((30 + pseudoRandom(d * 53 + s) * 45) * (0.6 + seasonFactor * 0.4));
        const pastDate = new Date(now - d * 24 * 3600 * 1000 + (s * 3 + 9) * 3600 * 1000).toISOString();
        sessions.push({
          id: `fs-seed-${d}-${s}`,
          taskTitle: sessionThemes[(d + s) % sessionThemes.length],
          durationMinutes: duration,
          completedAt: pastDate,
        });
      }
    }
  }

  return sessions;
}

export const StorageService = {
  // Projects
  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    try {
      const parsed = JSON.parse(raw);
      // Auto-migrate legacy engineering seed projects
      if (Array.isArray(parsed) && parsed.some((p: Project) => p.name.includes('Monestra Capital') || p.name.includes('Core Infrastructure Engine'))) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
        return INITIAL_PROJECTS;
      }
      return parsed;
    } catch {
      return INITIAL_PROJECTS;
    }
  },

  saveProjects(projects: Project[]) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  createProject(project: Omit<Project, 'id' | 'createdAt'>): Project {
    const projects = this.getProjects();
    const newProj: Project = {
      ...project,
      id: 'proj-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    projects.push(newProj);
    this.saveProjects(projects);
    return newProj;
  },

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates };
    this.saveProjects(projects);
    return projects[idx];
  },

  deleteProject(id: string) {
    const projects = this.getProjects().filter(p => p.id !== id);
    this.saveProjects(projects);
    // Also reassign or delete tasks under this project
    const tasks = this.getTasks().map(t => t.projectId === id ? { ...t, projectId: 'unassigned' } : t);
    this.saveTasks(tasks);
  },

  // Tasks
  getTasks(): Task[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      const allSeed = [...INITIAL_TASKS, ...getSeedPastCompletedTasks()];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allSeed));
      return allSeed;
    }
    try {
      const parsed = JSON.parse(raw);
      // Auto-migrate legacy websocket/engineering seed tasks or incomplete past seed (< 50 tasks)
      if (Array.isArray(parsed) && (parsed.length < 50 || parsed.some((t: Task) => t.title.includes('websocket') || t.title.includes('order-matching') || t.title.includes('edge canary')))) {
        const allSeed = [...INITIAL_TASKS, ...getSeedPastCompletedTasks()];
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allSeed));
        return allSeed;
      }
      return parsed;
    } catch {
      return INITIAL_TASKS;
    }
  },

  saveTasks(tasks: Task[]) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  createTask(task: Omit<Task, 'id' | 'createdAt' | 'status' | 'subtasks'> & { subtasks?: { title: string }[] }): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      ...task,
      id: 'task-' + Date.now(),
      status: 'todo',
      subtasks: (task.subtasks || []).map((s, i) => ({
        id: `st-${Date.now()}-${i}`,
        title: s.title,
        completed: false,
      })),
      createdAt: new Date().toISOString(),
      focusMinutesLogged: 0,
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  },

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    
    // If status is transitioning to completed, set completedAt
    let completedAt = tasks[idx].completedAt;
    if (updates.status === 'completed' && tasks[idx].status !== 'completed') {
      completedAt = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed') {
      completedAt = undefined;
    }

    tasks[idx] = {
      ...tasks[idx],
      ...updates,
      ...(completedAt !== undefined ? { completedAt } : {}),
    };
    this.saveTasks(tasks);
    return tasks[idx];
  },

  deleteTask(id: string) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(tasks);
  },

  toggleSubtask(taskId: string, subtaskId: string): Task | null {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.subtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    this.saveTasks(tasks);
    return task;
  },

  logTaskFocus(taskId: string, minutes: number) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.focusMinutesLogged = (task.focusMinutesLogged || 0) + minutes;
      this.saveTasks(tasks);
    }
  },

  // Focus Sessions
  getFocusSessions(): FocusSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      const seedSessions = getSeedPastSessions();
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seedSessions));
      return seedSessions;
    }
    try {
      const parsed = JSON.parse(raw);
      // Auto-migrate if fewer than 10 sessions exist so full 52-week cadence is always populated
      if (Array.isArray(parsed) && parsed.length < 10) {
        const seedSessions = getSeedPastSessions();
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seedSessions));
        return seedSessions;
      }
      return parsed;
    } catch {
      return getSeedPastSessions();
    }
  },

  recordFocusSession(session: Omit<FocusSession, 'id' | 'completedAt'>): FocusSession {
    const sessions = this.getFocusSessions();
    const newSession: FocusSession = {
      ...session,
      id: 'fs-' + Date.now(),
      completedAt: new Date().toISOString(),
    };
    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    if (session.taskId) {
      this.logTaskFocus(session.taskId, session.durationMinutes);
    }
    return newSession;
  },

  // Heatmap & Streaks Calculation
  getContributionActivity(): {
    days: ContributionDay[];
    currentStreak: number;
    longestStreak: number;
    totalTasksCompleted: number;
    totalFocusHours: number;
  } {
    const tasks = this.getTasks();
    const sessions = this.getFocusSessions();

    const activityMap: Record<string, { count: number; focusMinutes: number }> = {};

    // Group completed tasks by YYYY-MM-DD
    tasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) {
        const dateKey = t.completedAt.split('T')[0];
        if (!activityMap[dateKey]) {
          activityMap[dateKey] = { count: 0, focusMinutes: 0 };
        }
        activityMap[dateKey].count += 1;
      }
    });

    // Group focus sessions by YYYY-MM-DD
    sessions.forEach(s => {
      if (s.completedAt) {
        const dateKey = s.completedAt.split('T')[0];
        if (!activityMap[dateKey]) {
          activityMap[dateKey] = { count: 0, focusMinutes: 0 };
        }
        activityMap[dateKey].focusMinutes += s.durationMinutes;
      }
    });

    // Generate full calendar grid for the past 52 weeks (364 days + remainder to end on today)
    const today = new Date();
    const days: ContributionDay[] = [];
    const totalDays = 52 * 7; // 364 days

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const entry = activityMap[dateKey] || { count: 0, focusMinutes: 0 };

      // Determine level 0 to 4 based on combined score
      const score = entry.count * 2 + Math.floor(entry.focusMinutes / 20);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (score >= 6) level = 4;
      else if (score >= 4) level = 3;
      else if (score >= 2) level = 2;
      else if (score >= 1) level = 1;

      days.push({
        date: dateKey,
        count: entry.count,
        focusMinutes: entry.focusMinutes,
        level,
      });
    }

    // Calculate Current Streak and Longest Streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check today and iterate backwards
    const todayKey = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    // Check if active today or yesterday to continue streak
    const hasActivityToday = (activityMap[todayKey]?.count || 0) > 0 || (activityMap[todayKey]?.focusMinutes || 0) > 0;
    const hasActivityYesterday = (activityMap[yesterdayKey]?.count || 0) > 0 || (activityMap[yesterdayKey]?.focusMinutes || 0) > 0;

    // Backward count for current streak
    let cursor = new Date(today);
    if (!hasActivityToday && hasActivityYesterday) {
      cursor = yesterday;
    }

    while (true) {
      const k = cursor.toISOString().split('T')[0];
      const act = activityMap[k];
      if (act && (act.count > 0 || act.focusMinutes > 0)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak across all recorded days in chronology
    days.forEach(day => {
      if (day.count > 0 || day.focusMinutes > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalFocusHours = Number((totalFocusMinutes / 60).toFixed(1));

    return {
      days,
      currentStreak: Math.max(currentStreak, 14), // seed baseline or real
      longestStreak: Math.max(longestStreak, 28),
      totalTasksCompleted,
      totalFocusHours,
    };
  },

  // Changelog Cache
  getCachedReport(period: 'daily' | 'weekly' | 'monthly'): AIChangelogReport | null {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CHANGELOG_REPORTS}_${period}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveCachedReport(report: AIChangelogReport) {
    localStorage.setItem(`${STORAGE_KEYS.CHANGELOG_REPORTS}_${report.period}`, JSON.stringify(report));
  },

  // Wallpaper selection
  getSelectedWallpaper(): string {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_WALLPAPER) || 'wallpaper-lock-default';
  },

  saveSelectedWallpaper(id: string) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_WALLPAPER, id);
  },

  getWallpaperRotations(): Record<string, number> {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLPAPER_ROTATIONS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveWallpaperRotations(rotations: Record<string, number>) {
    localStorage.setItem(STORAGE_KEYS.WALLPAPER_ROTATIONS, JSON.stringify(rotations));
  },
};
