export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export type TodoStatus = 'completed' | 'urgent' | 'normal' | 'working';

export interface ProjectTodo {
  id: string;
  title: string;
  status: TodoStatus; // [ X ], [ ! ], [   ], [ ~ ]
  estimatedTime?: string; // e.g. "4h", "45m"
  estimatedMinutes?: number;
  completedAt?: string;
  notes?: string;
}

export interface ProjectPhase {
  id: string;
  title: string;
  level: number; // 1 for #, 2 for ##, 3 for ###... endless depth
  timeBudget?: string; // e.g. "12h", "4.5h"
  timeBudgetMinutes?: number;
  todos: ProjectTodo[];
  subphases: ProjectPhase[];
  isCollapsed?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  deadline: string; // ISO date string e.g. "2026-09-28T18:00"
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes?: number;
  completedAt?: string; // ISO date string when completed
  subtasks: Subtask[];
  tags: string[];
  focusMinutesLogged?: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string; // e.g. "#D4AF37"
  icon: string;
  category: string;
  targetDeadline?: string;
  createdAt: string;
  rawMarkdown?: string;
  phases: ProjectPhase[];
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;
  durationMinutes: number;
  completedAt: string; // ISO date string
}

export interface AIChangelogReport {
  period: 'daily' | 'weekly' | 'monthly';
  generatedAt: string;
  headerLine?: string;
  shippedCount?: number;
  shippedBullets?: string[];
  headline: string;
  summary: string;
  bulletPoints: string[];
  velocityStatus: string;
  nextStrategicPriorities: string[];
}

export interface WallpaperOption {
  id: string;
  name: string;
  type: 'image' | 'gradient' | 'minimal';
  value: string; // Image URL or CSS gradient or color
  thumbnail?: string;
}

export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number; // tasks completed
  focusMinutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}
