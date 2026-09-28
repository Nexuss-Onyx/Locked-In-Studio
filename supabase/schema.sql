-- =========================================================================
-- LOCKED-IN STUDIO - SUPABASE DATABASE SCHEMA
-- =========================================================================
-- Execute this script in your Supabase SQL Editor (1-click setup)
-- It creates all required tables, JSONB structures, and RLS policies.

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    color TEXT DEFAULT '#ABC8A2',
    icon TEXT DEFAULT 'folder',
    phases JSONB DEFAULT '[]'::jsonb,
    target_deadline TIMESTAMPTZ,
    raw_markdown TEXT,
    estimated_time TEXT,
    estimated_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    estimated_minutes INTEGER,
    focus_minutes_logged INTEGER DEFAULT 0,
    subtasks JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Sessions Table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    task_title TEXT,
    project_id TEXT,
    duration_minutes INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Allow Anonymous Read/Write via Anon Key
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on projects"
    ON public.projects FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read/write on tasks"
    ON public.tasks FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read/write on focus_sessions"
    ON public.focus_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Indexes for fast dashboard and search queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON public.focus_sessions(completed_at DESC);
