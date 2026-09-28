import { ProjectPhase, ProjectTodo, Project } from '../types';

/**
 * Utility to parse time strings like "4h", "12.5h", "45m", "2h 30m" into minutes
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  let totalMinutes = 0;

  const hoursMatch = clean.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }

  const minsMatch = clean.match(/(\d+)\s*m/);
  if (minsMatch && !clean.includes('month')) {
    totalMinutes += parseInt(minsMatch[1], 10);
  }

  // If only a number was provided without unit, assume hours if <= 24, else minutes
  if (!hoursMatch && !minsMatch) {
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      totalMinutes = num <= 24 ? num * 60 : num;
    }
  }

  return Math.round(totalMinutes);
}

/**
 * Format minutes into clean human label e.g. "4.5h" or "45m" or "12h"
 */
export function formatMinutesToLabel(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h';
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/**
 * Parse Markdown with arbitrary depth phases (#, ##, ###, ####...) and todos ([X], [!], [ ], [~])
 */
export function parseProjectMarkdown(
  rawContent: string,
  fallbackName = 'Untitled Project'
): { name: string; description: string; category: string; phases: ProjectPhase[] } {
  const lines = rawContent.split(/\r?\n/);
  let projectName = fallbackName;
  let projectDescription = '';
  let projectCategory = 'Architecture & Design';
  const rootPhases: ProjectPhase[] = [];

  // Phase stack: maintains the active ancestry of nested phases
  // stack[0] is level 1, stack[1] is level 2, etc.
  const phaseStack: ProjectPhase[] = [];

  let isReadingHeader = true;

  // Regular Expressions for Markdown Project Syntax
  // 1. Phase line with optional time prefix or suffix:
  // e.g., "[ 4h ] - # Phase Name" or "[ 12.5h ] - ### Deep Subphase" or "## [ 2h ] Subphase" or "# Phase Name [ 6h ]" or "# Phase Name"
  const phaseRegex = /^(?:\[\s*([^\]]+?)\s*\]\s*-\s*)?(#{1,10})\s*(?:\[\s*([^\]]+?)\s*\]\s*)?(.*?)(?:\s*\[\s*([^\]]+?)\s*\])?$/;

  // 2. Todo line:
  // e.g., "- [ X ] Title", "* [ ! ] Urgent task", "[ ~ ] Working on CAD", "[   ] Standard item"
  const todoRegex = /^\s*(?:[-*+]\s+)?\[\s*([Xxi!~ ]?)\s*\]\s*(.*?)(?:\s*\[\s*([^\]]+?)\s*\])?$/;

  // 3. Project Title Header in markdown (e.g. "Project: Lake Como Villa" or "# Project: Title")
  const projectTitleRegex = /^(?:#+\s*)?(?:Project|Workspace)\s*:\s*(.+)$/i;

  let currentPhaseId = 1;
  let currentTodoId = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Check for explicit Project Name header
    const titleMatch = line.match(projectTitleRegex);
    if (titleMatch && isReadingHeader) {
      projectName = titleMatch[1].trim();
      continue;
    }

    // Check for Category tag e.g. "Category: Creative Direction"
    const catMatch = line.match(/^(?:Category|Department)\s*:\s*(.+)$/i);
    if (catMatch && isReadingHeader) {
      projectCategory = catMatch[1].trim();
      continue;
    }

    // Check for Phase Header line (starts with # or [ TIME ] - #)
    const isPhaseLine = phaseRegex.test(line) && (line.includes('#') || line.startsWith('['));
    const phaseMatch = isPhaseLine ? line.match(phaseRegex) : null;

    if (phaseMatch && phaseMatch[2]) {
      isReadingHeader = false;
      const timeBudget = (phaseMatch[1] || phaseMatch[3] || phaseMatch[5] || '').trim();
      const hashtags = phaseMatch[2];
      const level = hashtags.length; // 1 for #, 2 for ##, 3 for ###, etc.
      let phaseTitle = phaseMatch[4].trim();

      // Clean leading/trailing punctuation if any
      phaseTitle = phaseTitle.replace(/^[-:–]\s*/, '').trim() || `Phase Level ${level}`;

      const newPhase: ProjectPhase = {
        id: `phase-${Date.now()}-${currentPhaseId++}`,
        title: phaseTitle,
        level,
        timeBudget: timeBudget || undefined,
        timeBudgetMinutes: timeBudget ? parseTimeToMinutes(timeBudget) : undefined,
        todos: [],
        subphases: [],
      };

      // Hierarchy Stack Management:
      // Elevate or descend based on level
      // Pop items from the stack until the parent's level is strictly less than this phase's level
      while (phaseStack.length > 0 && phaseStack[phaseStack.length - 1].level >= level) {
        phaseStack.pop();
      }

      if (phaseStack.length === 0) {
        // Root Phase (Level 1, or elevated back to top)
        rootPhases.push(newPhase);
      } else {
        // Nested Subphase of the current parent phase
        const parent = phaseStack[phaseStack.length - 1];
        parent.subphases.push(newPhase);
      }

      phaseStack.push(newPhase);
      continue;
    }

    // Check for Todo line
    const todoMatch = line.match(todoRegex);
    if (todoMatch && !line.startsWith('#')) {
      isReadingHeader = false;
      const statusChar = (todoMatch[1] || ' ').trim();
      const rawTitle = todoMatch[2].trim();
      const todoTimeBudget = (todoMatch[3] || '').trim();

      let status: 'completed' | 'urgent' | 'normal' | 'working' = 'normal';
      if (statusChar.toLowerCase() === 'x') {
        status = 'completed';
      } else if (statusChar === '!') {
        status = 'urgent';
      } else if (statusChar === '~') {
        status = 'working';
      } else {
        status = 'normal';
      }

      const newTodo: ProjectTodo = {
        id: `todo-${Date.now()}-${currentTodoId++}`,
        title: rawTitle || 'Untitled Todo',
        status,
        estimatedTime: todoTimeBudget || undefined,
        estimatedMinutes: todoTimeBudget ? parseTimeToMinutes(todoTimeBudget) : undefined,
      };

      // Ensure every todo belongs to a phase:
      // If no phase has been opened yet, create an initial Phase 1
      if (phaseStack.length === 0) {
        const defaultPhase: ProjectPhase = {
          id: `phase-${Date.now()}-${currentPhaseId++}`,
          title: 'Initial Phase',
          level: 1,
          todos: [],
          subphases: [],
        };
        rootPhases.push(defaultPhase);
        phaseStack.push(defaultPhase);
      }

      // Attach todo to the innermost active phase
      const currentActivePhase = phaseStack[phaseStack.length - 1];
      currentActivePhase.todos.push(newTodo);
      continue;
    }

    // Description text before first phase
    if (isReadingHeader && !line.startsWith('#') && !line.startsWith('[')) {
      projectDescription += (projectDescription ? '\n' : '') + line;
    }
  }

  // Ensure at least one phase exists with todos if empty
  if (rootPhases.length === 0) {
    rootPhases.push({
      id: `phase-${Date.now()}-1`,
      title: 'Phase 1: Architecture & Conception',
      level: 1,
      timeBudget: '8h',
      timeBudgetMinutes: 480,
      todos: [
        {
          id: `todo-${Date.now()}-1`,
          title: 'Review elevations and design criteria',
          status: 'urgent',
          estimatedTime: '2h',
          estimatedMinutes: 120,
        },
        {
          id: `todo-${Date.now()}-2`,
          title: 'Specify materials and travertine finishes',
          status: 'working',
          estimatedTime: '4h',
          estimatedMinutes: 240,
        },
      ],
      subphases: [],
    });
  }

  return {
    name: projectName,
    description: projectDescription || 'High-craft architectural and creative direction masterplan.',
    category: projectCategory,
    phases: rootPhases,
  };
}

/**
 * Serialize a Project and its recursive Phase tree into pristine Markdown
 */
export function serializeProjectToMarkdown(project: Project): string {
  let md = '';

  // Project Header
  md += `Project: ${project.name}\n`;
  if (project.category) {
    md += `Category: ${project.category}\n`;
  }
  if (project.description) {
    md += `${project.description}\n`;
  }
  md += `\n`;

  // Recursive Phase Serializer
  function serializePhase(phase: ProjectPhase) {
    const hashes = '#'.repeat(Math.max(1, phase.level));
    const budgetPrefix = phase.timeBudget ? `[ ${phase.timeBudget} ] - ` : '';
    md += `${budgetPrefix}${hashes} ${phase.title}\n`;

    // Todos under this phase
    for (const todo of phase.todos) {
      let statusMark = '   ';
      if (todo.status === 'completed') statusMark = ' X ';
      else if (todo.status === 'urgent') statusMark = ' ! ';
      else if (todo.status === 'working') statusMark = ' ~ ';

      const timeSuffix = todo.estimatedTime ? ` [ ${todo.estimatedTime} ]` : '';
      md += `- [${statusMark}] ${todo.title}${timeSuffix}\n`;
    }

    md += `\n`;

    // Subphases
    for (const sub of phase.subphases) {
      serializePhase(sub);
    }
  }

  for (const phase of project.phases || []) {
    serializePhase(phase);
  }

  return md.trim();
}

/**
 * Deep rollup stats for a phase and all its child subphases
 */
export interface PhaseStats {
  totalTodos: number;
  completedTodos: number;
  urgentTodos: number;
  workingTodos: number;
  normalTodos: number;
  totalBudgetMinutes: number;
  completionRate: number; // 0 to 100
  allTodos: ProjectTodo[];
}

export function calculatePhaseStats(phase: ProjectPhase): PhaseStats {
  let totalTodos = phase.todos.length;
  let completedTodos = phase.todos.filter((t) => t.status === 'completed').length;
  let urgentTodos = phase.todos.filter((t) => t.status === 'urgent').length;
  let workingTodos = phase.todos.filter((t) => t.status === 'working').length;
  let normalTodos = phase.todos.filter((t) => t.status === 'normal').length;
  let totalBudgetMinutes = phase.timeBudgetMinutes || 0;
  const allTodos: ProjectTodo[] = [...phase.todos];

  for (const sub of phase.subphases) {
    const subStats = calculatePhaseStats(sub);
    totalTodos += subStats.totalTodos;
    completedTodos += subStats.completedTodos;
    urgentTodos += subStats.urgentTodos;
    workingTodos += subStats.workingTodos;
    normalTodos += subStats.normalTodos;
    totalBudgetMinutes += subStats.totalBudgetMinutes;
    allTodos.push(...subStats.allTodos);
  }

  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return {
    totalTodos,
    completedTodos,
    urgentTodos,
    workingTodos,
    normalTodos,
    totalBudgetMinutes,
    completionRate,
    allTodos,
  };
}

/**
 * Rollup stats for a Project across all root phases
 */
export interface ProjectStats {
  totalPhasesCount: number;
  totalTodosCount: number;
  completedTodosCount: number;
  urgentTodosCount: number;
  workingTodosCount: number;
  normalTodosCount: number;
  totalBudgetMinutes: number;
  completionRate: number;
  allTodos: ProjectTodo[];
}

export function calculateProjectStats(project: Project): ProjectStats {
  let totalPhasesCount = 0;
  let totalTodosCount = 0;
  let completedTodosCount = 0;
  let urgentTodosCount = 0;
  let workingTodosCount = 0;
  let normalTodosCount = 0;
  let totalBudgetMinutes = 0;
  const allTodos: ProjectTodo[] = [];

  function traverse(phase: ProjectPhase) {
    totalPhasesCount++;
    const stats = calculatePhaseStats(phase);
    // Don't double count subphases in loop since traverse will visit them
    totalTodosCount += phase.todos.length;
    completedTodosCount += phase.todos.filter((t) => t.status === 'completed').length;
    urgentTodosCount += phase.todos.filter((t) => t.status === 'urgent').length;
    workingTodosCount += phase.todos.filter((t) => t.status === 'working').length;
    normalTodosCount += phase.todos.filter((t) => t.status === 'normal').length;
    totalBudgetMinutes += phase.timeBudgetMinutes || 0;
    allTodos.push(...phase.todos);

    for (const sub of phase.subphases) {
      traverse(sub);
    }
  }

  for (const root of project.phases || []) {
    traverse(root);
  }

  const completionRate = totalTodosCount > 0 ? Math.round((completedTodosCount / totalTodosCount) * 100) : 0;

  return {
    totalPhasesCount,
    totalTodosCount,
    completedTodosCount,
    urgentTodosCount,
    workingTodosCount,
    normalTodosCount,
    totalBudgetMinutes,
    completionRate,
    allTodos,
  };
}
