import { Project, Task, FocusSession, AIChangelogReport, ContributionDay, Priority, TaskStatus, ProjectPhase, TodoStatus } from '../types';
import { parseProjectMarkdown, parseTimeToMinutes } from './markdownProjectParser';
import { SupabaseService } from './supabase';

const STORAGE_KEYS = {
  PROJECTS: 'aura_projects_v3',
  TASKS: 'aura_tasks_v2',
  SESSIONS: 'aura_sessions_v2',
  CHANGELOG_REPORTS: 'aura_changelog_reports_v2',
  SELECTED_WALLPAPER: 'aura_selected_wallpaper_v1',
  WALLPAPER_ROTATIONS: 'aura_wallpaper_rotations_v1',
  CUSTOM_WALLPAPERS: 'aura_custom_wallpapers_v1',
};

const RAW_PROJECT_1_MD = `---
name: Maison & Haute Couture Lookbook
category: Creative Direction
description: Bespoke runway visual direction and textile curation for Paris Fashion Week.
EST: 64:00:00
---

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

const RAW_PROJECT_2_MD = `---
name: Villa Bellagio Architectural Studio
category: Architecture & Heritage
description: Lake Como private residential estate masterplan and travertine stone specifications.
EST: 68:00:00
---

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

const RAW_PROJECT_3_MD = `---
name: Sovereign Heritage Capital
category: Private Equity
description: Private equity syndicate for vintage horology and rare timepiece acquisitions.
EST: 36:00:00
---

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
    color: '#ABC8A2', // Soft Sage
    icon: 'Sparkles',
    category: parsedP1.category,
    targetDeadline: '2026-10-15T18:00',
    createdAt: '2026-09-01T10:00:00Z',
    rawMarkdown: RAW_PROJECT_1_MD,
    phases: parsedP1.phases,
    estimatedTime: parsedP1.estimatedTime,
    estimatedMinutes: parsedP1.estimatedMinutes,
  },
  {
    id: 'proj-2',
    name: parsedP2.name,
    description: parsedP2.description,
    color: '#8EA985', // Sage Accent
    icon: 'Layers',
    category: parsedP2.category,
    targetDeadline: '2026-10-05T12:00',
    createdAt: '2026-09-10T14:30:00Z',
    rawMarkdown: RAW_PROJECT_2_MD,
    phases: parsedP2.phases,
    estimatedTime: parsedP2.estimatedTime,
    estimatedMinutes: parsedP2.estimatedMinutes,
  },
  {
    id: 'proj-3',
    name: parsedP3.name,
    description: parsedP3.description,
    color: '#73916D', // Deep Sage
    icon: 'Cpu',
    category: parsedP3.category,
    targetDeadline: '2026-10-20T20:00',
    createdAt: '2026-09-15T09:00:00Z',
    rawMarkdown: RAW_PROJECT_3_MD,
    phases: parsedP3.phases,
    estimatedTime: parsedP3.estimatedTime,
    estimatedMinutes: parsedP3.estimatedMinutes,
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

/**
 * Extracts real actionable Tasks from a Project's markdown phases & todos
 */
export function extractTasksFromProject(project: Project): Task[] {
  const tasks: Task[] = [];
  
  function traverse(phase: ProjectPhase) {
    for (const todo of phase.todos) {
      const priority: Priority = 
        todo.status === 'urgent' ? 'urgent' :
        todo.status === 'working' ? 'high' : 'medium';
      
      const status: TaskStatus = 
        todo.status === 'completed' ? 'completed' :
        todo.status === 'working' ? 'in_progress' : 'todo';

      const tagLabel = phase.title ? phase.title.replace(/^#+\s*/, '').replace(/^Phase\s+\w+:\s*/, '').trim() : '';

      tasks.push({
        id: todo.id,
        title: todo.title,
        projectId: project.id,
        deadline: project.targetDeadline || new Date(new Date(project.createdAt).getTime() + 7 * 24 * 3600 * 1000).toISOString(),
        priority,
        status,
        estimatedMinutes: todo.estimatedMinutes || (todo.estimatedTime ? parseTimeToMinutes(todo.estimatedTime) : 30),
        completedAt: todo.status === 'completed' ? (todo.completedAt || project.createdAt) : undefined,
        tags: [project.category || 'Workspace', tagLabel].filter(Boolean),
        subtasks: [],
        createdAt: project.createdAt,
        focusMinutesLogged: 0,
      });
    }

    for (const sub of phase.subphases || []) {
      traverse(sub);
    }
  }

  for (const root of project.phases || []) {
    traverse(root);
  }

  return tasks;
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
    if (SupabaseService.isConfigured()) {
      SupabaseService.upsertProjects(projects).catch(() => {});
    }
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
    let storedTasks: Task[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Purge synthetic seed tasks
          storedTasks = parsed.filter(t => !t.id.startsWith('seed-past-'));
        }
      } catch {
        storedTasks = [];
      }
    }

    // Extract all real tasks from all active projects
    const projects = this.getProjects();
    const projectTasksMap = new Map<string, Task>();
    
    // 1. Populate all tasks defined in project phases
    for (const proj of projects) {
      const tasksInProj = extractTasksFromProject(proj);
      for (const t of tasksInProj) {
        projectTasksMap.set(t.id, t);
      }
    }

    // 2. Merge stored task state (status overrides, completedAt, focus logs)
    for (const stored of storedTasks) {
      if (projectTasksMap.has(stored.id)) {
        const projTask = projectTasksMap.get(stored.id)!;
        projectTasksMap.set(stored.id, {
          ...projTask,
          status: stored.status,
          completedAt: stored.completedAt,
          focusMinutesLogged: stored.focusMinutesLogged || projTask.focusMinutesLogged,
        });
      } else if (!stored.id.startsWith('seed-past-')) {
        // Standalone user-created task
        projectTasksMap.set(stored.id, stored);
      }
    }

    const allRealTasks = Array.from(projectTasksMap.values());
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allRealTasks));
    return allRealTasks;
  },

  saveTasks(tasks: Task[]) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    if (SupabaseService.isConfigured()) {
      SupabaseService.upsertTasks(tasks).catch(() => {});
    }
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

    // If task belongs to a project, update the corresponding todo in project's phases
    if (tasks[idx].projectId) {
      const projects = this.getProjects();
      const proj = projects.find(p => p.id === tasks[idx].projectId);
      if (proj && updates.status) {
        const targetTodoStatus: TodoStatus = updates.status === 'completed' ? 'completed' : 'normal';
        const updateTodos = (phases: ProjectPhase[]): ProjectPhase[] => {
          return phases.map(ph => {
            const updatedTodos = ph.todos.map(td => {
              if (td.id === id) {
                return {
                  ...td,
                  status: targetTodoStatus,
                  completedAt,
                };
              }
              return td;
            });
            return {
              ...ph,
              todos: updatedTodos,
              subphases: updateTodos(ph.subphases || []),
            };
          });
        };
        proj.phases = updateTodos(proj.phases);
        this.saveProjects(projects);
      }
    }

    this.saveTasks(tasks);
    return tasks[idx];
  },

  toggleTaskStatus(id: string): Task | null {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    return this.updateTask(id, { status: nextStatus });
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
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge synthetic seed sessions
        const realSessions = parsed.filter(s => !s.id.startsWith('fs-seed-'));
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(realSessions));
        return realSessions;
      }
      return [];
    } catch {
      return [];
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

    if (SupabaseService.isConfigured()) {
      SupabaseService.upsertSessions([newSession]).catch(() => {});
    }

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

    // Calculate Real Current Streak and Longest Streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check today and iterate backwards
    const todayKey = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    const hasActivityToday = (activityMap[todayKey]?.count || 0) > 0 || (activityMap[todayKey]?.focusMinutes || 0) > 0;
    const hasActivityYesterday = (activityMap[yesterdayKey]?.count || 0) > 0 || (activityMap[yesterdayKey]?.focusMinutes || 0) > 0;

    if (hasActivityToday || hasActivityYesterday) {
      let cursor = hasActivityToday ? new Date(today) : yesterday;
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
      currentStreak,
      longestStreak,
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

  // Automatic Cloud Initialization & Sync
  async initSupabaseSync(): Promise<{ synced: boolean; message: string }> {
    if (!SupabaseService.isConfigured()) {
      return { synced: false, message: 'Local storage active (Supabase not connected)' };
    }

    try {
      const [remoteProjects, remoteTasks, remoteSessions] = await Promise.all([
        SupabaseService.fetchProjects(),
        SupabaseService.fetchTasks(),
        SupabaseService.fetchSessions(),
      ]);

      const localProjects = this.getProjects();
      const localTasks = this.getTasks();
      const localSessions = this.getFocusSessions();

      if (remoteProjects && remoteProjects.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(remoteProjects));
      } else if (localProjects.length > 0) {
        await SupabaseService.upsertProjects(localProjects);
      }

      if (remoteTasks && remoteTasks.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(remoteTasks));
      } else if (localTasks.length > 0) {
        await SupabaseService.upsertTasks(localTasks);
      }

      if (remoteSessions && remoteSessions.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(remoteSessions));
      } else if (localSessions.length > 0) {
        await SupabaseService.upsertSessions(localSessions);
      }

      return { synced: true, message: 'Connected & synced with Supabase' };
    } catch (err) {
      console.warn('Supabase initial sync interlude:', err);
      return { synced: false, message: 'Sync failed, running local storage' };
    }
  },
};
