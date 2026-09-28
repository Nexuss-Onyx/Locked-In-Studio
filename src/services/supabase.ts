import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, Task, FocusSession } from '../types';

// Detect Supabase variables auto-injected by Vercel's Supabase Integration or Vite .env
const env = (import.meta as any).env || {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY: string =
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('http') &&
    !SUPABASE_URL.includes('your-project')
  );
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
};

// =========================================================================
// Real-time Cloud Sync with Graceful Local Fallback
// =========================================================================

export const SupabaseService = {
  isConfigured: isSupabaseConfigured,
  getClient: getSupabaseClient,

  // Projects
  async fetchProjects(): Promise<Project[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || 'General',
        description: item.description || '',
        color: item.color || '#ABC8A2',
        icon: item.icon || 'folder',
        createdAt: item.created_at || new Date().toISOString(),
        phases: item.phases || [],
        targetDeadline: item.target_deadline,
        rawMarkdown: item.raw_markdown,
        estimatedTime: item.estimated_time,
        estimatedMinutes: item.estimated_minutes,
      }));
    } catch (e) {
      console.warn('Supabase fetchProjects error:', e);
      return null;
    }
  },

  async upsertProjects(projects: Project[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || projects.length === 0) return false;

    try {
      const payload = projects.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        color: p.color,
        icon: p.icon,
        phases: p.phases,
        target_deadline: p.targetDeadline,
        raw_markdown: p.rawMarkdown,
        estimated_time: p.estimatedTime || null,
        estimated_minutes: p.estimatedMinutes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('projects').upsert(payload);
      return !error;
    } catch (e) {
      console.warn('Supabase upsertProjects error:', e);
      return false;
    }
  },

  // Tasks
  async fetchTasks(): Promise<Task[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) return null;

      return data.map((t: any) => ({
        id: t.id,
        projectId: t.project_id,
        title: t.title,
        description: t.description || '',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        deadline: t.deadline || new Date().toISOString(),
        estimatedMinutes: t.estimated_minutes,
        focusMinutesLogged: t.focus_minutes_logged || 0,
        subtasks: t.subtasks || [],
        tags: t.tags || [],
        completedAt: t.completed_at,
        createdAt: t.created_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Supabase fetchTasks error:', e);
      return null;
    }
  },

  async upsertTasks(tasks: Task[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || tasks.length === 0) return false;

    try {
      const payload = tasks.map(t => ({
        id: t.id,
        project_id: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        estimated_minutes: t.estimatedMinutes,
        focus_minutes_logged: t.focusMinutesLogged || 0,
        subtasks: t.subtasks,
        tags: t.tags,
        completed_at: t.completedAt,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('tasks').upsert(payload);
      return !error;
    } catch (e) {
      console.warn('Supabase upsertTasks error:', e);
      return false;
    }
  },

  // Focus Sessions
  async fetchSessions(): Promise<FocusSession[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('focus_sessions')
        .select('*')
        .order('completed_at', { ascending: false });

      if (error || !data || data.length === 0) return null;

      return data.map((s: any) => ({
        id: s.id,
        taskId: s.task_id,
        taskTitle: s.task_title,
        projectId: s.project_id,
        durationMinutes: s.duration_minutes,
        completedAt: s.completed_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Supabase fetchSessions error:', e);
      return null;
    }
  },

  async upsertSessions(sessions: FocusSession[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || sessions.length === 0) return false;

    try {
      const payload = sessions.map(s => ({
        id: s.id,
        task_id: s.taskId || null,
        task_title: s.taskTitle || null,
        project_id: s.projectId || null,
        duration_minutes: s.durationMinutes,
        completed_at: s.completedAt,
      }));

      const { error } = await client.from('focus_sessions').upsert(payload);
      return !error;
    } catch (e) {
      console.warn('Supabase upsertSessions error:', e);
      return false;
    }
  },
};
