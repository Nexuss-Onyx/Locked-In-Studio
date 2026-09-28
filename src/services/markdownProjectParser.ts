import { ProjectPhase, ProjectTodo, Project } from '../types';

/**
 * Utility to parse time strings like "4h", "12.5h", "45m", "2h 30m", or "04:30:00" / "04:30" (EST:HH:MM:SS) into minutes
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();

  // 1. Match HH:MM:SS or HH:MM format (e.g., "04:30:00", "14:30:00", "02:15")
  const colonMatch = clean.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    const secs = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    return hours * 60 + mins + Math.round(secs / 60);
  }

  // Also support inline timestamp without prefix e.g. "est:04:30:00"
  const estColonMatch = clean.match(/(?:est\s*:\s*)?(\d+):([0-5]?\d)(?::([0-5]?\d))?/);
  if (estColonMatch && !clean.includes('h') && !clean.includes('m')) {
    const hours = parseInt(estColonMatch[1], 10);
    const mins = parseInt(estColonMatch[2], 10);
    const secs = estColonMatch[3] ? parseInt(estColonMatch[3], 10) : 0;
    return hours * 60 + mins + Math.round(secs / 60);
  }

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
 * Format minutes into modern horology EST:HH:MM:SS format
 */
export function formatMinutesToHHMMSS(minutes?: number): string {
  if (!minutes || minutes <= 0) return '00:00:00';
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export interface ParsedProjectResult {
  name: string;
  description: string;
  category: string;
  phases: ProjectPhase[];
  estimatedTime?: string;
  estimatedMinutes?: number;
}

/**
 * Parse Markdown with frontmatter (--- name: ... description: ... EST:HH:MM:SS ---)
 * and arbitrary depth phases (#, ##, ###, ####...) and todos ([X], [!], [ ], [~])
 */
export function parseProjectMarkdown(
  rawContent: string,
  fallbackName = 'Untitled Project'
): ParsedProjectResult {
  let contentToParse = rawContent.trimStart();
  let projectName = fallbackName;
  let projectDescription = '';
  let projectCategory = 'Architecture & Design';
  let projectEstimatedTime: string | undefined = undefined;
  let projectEstimatedMinutes: number | undefined = undefined;

  // =========================================================================
  // 1. FRONTMATTER SYNTAX: --- name: ... description: ... EST:HH:MM:SS ---
  // Supports both single-line & multi-line YAML frontmatter blocks
  // =========================================================================
  const frontmatterMatch = contentToParse.match(/^---\s*([\s\S]*?)\s*---(?:\r?\n|$)/);
  if (frontmatterMatch) {
    const block = frontmatterMatch[1].trim();
    // Slice off frontmatter block so subsequent phase parsing proceeds cleanly
    contentToParse = contentToParse.slice(frontmatterMatch[0].length);

    // Multi-key inline regex extraction:
    // Matches keys: name, title, project; description, desc; category, department; est, estimate, time
    const nameMatch = block.match(/(?:^|\n|\s)(?:name|title|project)\s*:\s*(.+?)(?=(?:\n|\s)(?:description|desc|category|department|est|estimate|time)\s*:|$)/i);
    if (nameMatch) projectName = nameMatch[1].trim();

    const descMatch = block.match(/(?:^|\n|\s)(?:description|desc)\s*:\s*(.+?)(?=(?:\n|\s)(?:name|title|project|category|department|est|estimate|time)\s*:|$)/i);
    if (descMatch) projectDescription = descMatch[1].trim();

    const catMatch = block.match(/(?:^|\n|\s)(?:category|department)\s*:\s*(.+?)(?=(?:\n|\s)(?:name|title|project|description|desc|est|estimate|time)\s*:|$)/i);
    if (catMatch) projectCategory = catMatch[1].trim();

    const estMatch = block.match(/(?:^|\n|\s)(?:est|estimate|time)\s*:\s*(.+?)(?=(?:\n|\s)(?:name|title|project|description|desc|category|department)\s*:|$)/i);
    if (estMatch) {
      projectEstimatedTime = estMatch[1].trim();
      projectEstimatedMinutes = parseTimeToMinutes(projectEstimatedTime);
    }

    // Line-by-line fallback for structured YAML
    const blockLines = block.split(/\r?\n/);
    for (const bLine of blockLines) {
      const trimmed = bLine.trim();
      const m = trimmed.match(/^([a-zA-Z_-]+)\s*:\s*(.*)$/);
      if (m) {
        const k = m[1].toLowerCase();
        const v = m[2].trim();
        if ((k === 'name' || k === 'title' || k === 'project') && v) projectName = v;
        if ((k === 'description' || k === 'desc') && v) projectDescription = v;
        if ((k === 'category' || k === 'department') && v) projectCategory = v;
        if ((k === 'est' || k === 'estimate' || k === 'time') && v) {
          projectEstimatedTime = v;
          projectEstimatedMinutes = parseTimeToMinutes(v);
        }
      }
    }
  }

  const lines = contentToParse.split(/\r?\n/);
  const rootPhases: ProjectPhase[] = [];
  const phaseStack: ProjectPhase[] = [];
  let isReadingHeader = true;

  // Regular Expressions for Markdown Project Syntax
  // Phase line: "[ 4h ] - # Phase Name" or "[ 04:30:00 ] - # Phase"
  const phaseRegex = /^(?:\[\s*([^\]]+?)\s*\]\s*-\s*)?(#{1,10})\s*(?:\[\s*([^\]]+?)\s*\]\s*)?(.*?)(?:\s*\[\s*([^\]]+?)\s*\])?$/;

  // Todo line: "- [ X ] Title [ 2h ]" or "* [ ! ] Urgent [ 01:30:00 ]"
  const todoRegex = /^\s*(?:[-*+]\s+)?\[\s*([Xxi!~ ]?)\s*\]\s*(.*?)(?:\s*\[\s*([^\]]+?)\s*\])?$/;

  // Project Header in markdown (e.g. "Project: Lake Como Villa" or "# Project: Title")
  const projectTitleRegex = /^(?:#+\s*)?(?:Project|Workspace|Name)\s*:\s*(.+)$/i;

  let currentPhaseId = 1;
  let currentTodoId = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Check for inline frontmatter on an arbitrary line e.g. "--- name: ... description: ... EST:HH:MM:SS ---"
    if (line.startsWith('---') && line.endsWith('---') && line.length > 6) {
      const inner = line.slice(3, -3).trim();
      const nMatch = inner.match(/(?:^|\s)(?:name|title|project)\s*:\s*(.+?)(?=(?:\s)(?:description|desc|category|department|est|estimate|time)\s*:|$)/i);
      if (nMatch) projectName = nMatch[1].trim();

      const dMatch = inner.match(/(?:^|\s)(?:description|desc)\s*:\s*(.+?)(?=(?:\s)(?:name|title|project|category|department|est|estimate|time)\s*:|$)/i);
      if (dMatch) projectDescription = dMatch[1].trim();

      const cMatch = inner.match(/(?:^|\s)(?:category|department)\s*:\s*(.+?)(?=(?:\s)(?:name|title|project|description|desc|est|estimate|time)\s*:|$)/i);
      if (cMatch) projectCategory = cMatch[1].trim();

      const eMatch = inner.match(/(?:^|\s)(?:est|estimate|time)\s*:\s*(.+?)(?=(?:\s)(?:name|title|project|description|desc|category|department)\s*:|$)/i);
      if (eMatch) {
        projectEstimatedTime = eMatch[1].trim();
        projectEstimatedMinutes = parseTimeToMinutes(projectEstimatedTime);
      }
      continue;
    }

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

    // Check for EST: header e.g. "EST: 04:30:00"
    const estHeaderMatch = line.match(/^(?:EST|Estimate|Time)\s*:\s*(.+)$/i);
    if (estHeaderMatch && isReadingHeader) {
      projectEstimatedTime = estHeaderMatch[1].trim();
      projectEstimatedMinutes = parseTimeToMinutes(projectEstimatedTime);
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

      // Hierarchy Stack Management
      while (phaseStack.length > 0 && phaseStack[phaseStack.length - 1].level >= level) {
        phaseStack.pop();
      }

      if (phaseStack.length === 0) {
        rootPhases.push(newPhase);
      } else {
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

      const currentActivePhase = phaseStack[phaseStack.length - 1];
      currentActivePhase.todos.push(newTodo);
      continue;
    }

    // Description text before first phase
    if (isReadingHeader && !line.startsWith('#') && !line.startsWith('[') && !line.startsWith('---')) {
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
    estimatedTime: projectEstimatedTime,
    estimatedMinutes: projectEstimatedMinutes,
  };
}

/**
 * Serialize a Project and its recursive Phase tree into pristine Markdown
 * Formatted with modern frontmatter: --- name: ... description: ... EST:HH:MM:SS ---
 */
export function serializeProjectToMarkdown(project: Project): string {
  let md = '';

  // Determine Project-Level Total Time Estimate
  let est = project.estimatedTime;
  if (!est && project.estimatedMinutes) {
    est = formatMinutesToHHMMSS(project.estimatedMinutes);
  } else if (!est) {
    const stats = calculateProjectStats(project);
    if (stats.totalBudgetMinutes > 0) {
      est = formatMinutesToHHMMSS(stats.totalBudgetMinutes);
    }
  }

  // Modern Frontmatter Block
  md += `---\n`;
  md += `name: ${project.name}\n`;
  if (project.category) {
    md += `category: ${project.category}\n`;
  }
  if (project.description) {
    md += `description: ${project.description}\n`;
  }
  if (est) {
    md += `EST: ${est}\n`;
  }
  md += `---\n\n`;

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
