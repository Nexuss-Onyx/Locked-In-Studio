import { Project, Task, FocusSession, AIChangelogReport, ContributionDay, Priority, TaskStatus, ProjectPhase, TodoStatus } from '../types';
import { parseTimeToMinutes } from './markdownProjectParser';
import { SupabaseService } from './supabase';

const STORAGE_KEYS = {
  PROJECTS: 'locked_in_projects_v4',
  TASKS: 'locked_in_tasks_v4',
  SESSIONS: 'locked_in_sessions_v4',
  CHANGELOG_REPORTS: 'locked_in_changelog_reports_v4',
  SELECTED_WALLPAPER: 'aura_selected_wallpaper_v1',
  WALLPAPER_ROTATIONS: 'aura_wallpaper_rotations_v1',
  CUSTOM_WALLPAPERS: 'aura_custom_wallpapers_v1',
};

// One-time cleanup of legacy keys containing old synthetic seed tasks & sessions
try {
  [
    'aura_projects_v1', 'aura_projects_v2', 'aura_projects_v3',
    'aura_tasks_v1', 'aura_tasks_v2',
    'aura_sessions_v1', 'aura_sessions_v2',
    'aura_changelog_reports_v1', 'aura_changelog_reports_v2',
  ].forEach((k) => {
    localStorage.removeItem(k);
  });
} catch {}

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
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy seed projects
        const clean = parsed.filter((p: Project) => 
          !p.name.includes('Maison & Haute Couture') &&
          !p.name.includes('Villa Bellagio') &&
          !p.name.includes('Sovereign Heritage') &&
          !p.name.includes('Monestra Capital') &&
          !p.name.includes('Core Infrastructure')
        );
        return clean;
      }
      return [];
    } catch {
      return [];
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
          storedTasks = parsed;
        }
      } catch {
        storedTasks = [];
      }
    }

    // Extract all real tasks from active projects
    const projects = this.getProjects();
    const validProjectIds = new Set(projects.map(p => p.id));
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
      } else if (!stored.projectId || stored.projectId === 'standalone' || stored.projectId === 'unassigned') {
        // True standalone user-created task (no project)
        if (
          !stored.id.startsWith('seed-') && 
          !stored.id.startsWith('task-1') && 
          !stored.id.startsWith('task-2') && 
          !stored.id.startsWith('task-3') && 
          !stored.id.startsWith('task-4') && 
          !stored.id.startsWith('task-5') &&
          !stored.title.includes('Lake Como') &&
          !stored.title.includes('Haute Couture') &&
          !stored.title.includes('lookbook') &&
          !stored.title.includes('manifesto')
        ) {
          projectTasksMap.set(stored.id, stored);
        }
      }
      // If stored.projectId is not in validProjectIds, it is an orphaned task from a deleted project and is dropped
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
