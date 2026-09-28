import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use('/lock', express.static(path.resolve(__dirname, 'lock')));
app.use('/lock', express.static(path.resolve(__dirname, 'public/lock')));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface CompletedTaskItem {
  id: string;
  title: string;
  projectTitle: string;
  completedAt: string;
  priority?: string;
  tags?: string[];
  focusMinutes?: number;
}

// AI Changelog & Executive Progress Summary endpoint
app.post('/api/ai/changelog', async (req: Request, res: Response) => {
  try {
    const { 
      period = 'weekly', 
      completedTasks = [], 
      activeProjects = [], 
      focusMinutes = 0, 
      streakCount = 0,
      username = 'tadi'
    } = req.body;

    const now = new Date();
    
    // Real ISO 8601 week calculation and exact Monday-Sunday range
    const targetDate = new Date(now.getTime());
    targetDate.setHours(0, 0, 0, 0);
    targetDate.setDate(targetDate.getDate() + 3 - (targetDate.getDay() + 6) % 7);
    const week1 = new Date(targetDate.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((targetDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatShort = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekRange = `${formatShort(monday)} – ${formatShort(sunday)}`;
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const todayFormatted = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    let headerLine = `Week ${weekNumber} of ${now.getFullYear()} (${weekRange})`;
    if (period === 'daily') {
      headerLine = `Today · ${todayFormatted}`;
    } else if (period === 'monthly') {
      headerLine = `${monthName}`;
    }

    const timeFrameLabel = period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly';

    // Prepare prompt
    const prompt = `You are an expert developer changelog assistant for a developer and founder like on WIP.co, GitHub, or Linear.
Format a shipped changelog summary EXACTLY in this style:
Header: ${headerLine}

Shipped (${completedTasks.length})
• <task title or summary> #<project_slug>
• <task title or summary> #<project_slug>

Input Data:
- Period: ${timeFrameLabel}
- Completed Deliverables (${completedTasks.length}):
${completedTasks.map((t: CompletedTaskItem, i: number) => {
  const projTag = (t.projectTitle || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${i + 1}. [${t.projectTitle || 'General'}] ${t.title} ${t.tags?.length ? '(' + t.tags.join(', ') + ')' : ''}`;
}).join('\n') || 'None recorded yet.'}
- Focus Time: ${focusMinutes}m
- Consistency Streak: ${streakCount}d

Rules:
1. Provide "shippedBullets": each bullet must be succinct, lowercase or natural dev style, incorporating the project hashtag like "#proj" or "#tag".
2. If tasks are empty, invent 3-4 realistic developer accomplishments for active projects with proper hashtags.
3. Keep the text concise, punchy, like developer commit or ship logs.
4. Also provide a short 1-line "summary" and 2-3 "nextStrategicPriorities".

Return strictly JSON:
{
  "headerLine": "${headerLine}",
  "shippedCount": ${completedTasks.length || 3},
  "shippedBullets": string[],
  "headline": string,
  "summary": string,
  "bulletPoints": string[],
  "velocityStatus": string,
  "nextStrategicPriorities": string[]
}`;

    if (!process.env.GEMINI_API_KEY) {
      const fallbackReport = generateLocalFallbackChangelog(period, completedTasks, focusMinutes, streakCount, undefined, headerLine);
      return res.json(fallbackReport);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headerLine: { type: Type.STRING },
            shippedCount: { type: Type.INTEGER },
            shippedBullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            headline: { type: Type.STRING },
            summary: { type: Type.STRING },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            velocityStatus: { type: Type.STRING },
            nextStrategicPriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['headerLine', 'shippedCount', 'shippedBullets', 'headline', 'summary', 'bulletPoints', 'velocityStatus', 'nextStrategicPriorities'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from AI model');
    }

    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Changelog generation error:', error);
    const { period, completedTasks = [], focusMinutes = 0, streakCount = 0 } = req.body;
    const fallbackReport = generateLocalFallbackChangelog(period || 'weekly', completedTasks, focusMinutes, streakCount);
    return res.json(fallbackReport);
  }
});

function generateLocalFallbackChangelog(
  period: string, 
  tasks: CompletedTaskItem[], 
  focusMinutes: number, 
  streak: number,
  _unused?: string,
  customHeader?: string
) {
  const now = new Date();
  const targetDate = new Date(now.getTime());
  targetDate.setHours(0, 0, 0, 0);
  targetDate.setDate(targetDate.getDate() + 3 - (targetDate.getDay() + 6) % 7);
  const week1 = new Date(targetDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((targetDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekRange = `${formatShort(monday)} – ${formatShort(sunday)}`;
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayFormatted = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  let headerLine = customHeader;
  if (!headerLine) {
    if (period === 'daily') headerLine = `Today · ${todayFormatted}`;
    else if (period === 'monthly') headerLine = `${monthName}`;
    else headerLine = `Week ${weekNumber} of ${now.getFullYear()} (${weekRange})`;
  }

  const shippedBullets = tasks.length > 0
    ? tasks.map((t) => {
        const tag = (t.projectTitle || 'core').toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${t.title.toLowerCase()} #${tag}`;
      })
    : [
        'refactored order routing and telemetry pipeline #architecture',
        'fixed tz edge case in streak calculation bot #wip',
        'added dark mode wallpaper shader switcher #studio',
        'optimized postgres query latency under 12ms #db',
        `logged ${focusMinutes}m of deep focus across sprint items #focus`
      ];

  const count = tasks.length || shippedBullets.length;

  return {
    headerLine,
    shippedCount: count,
    shippedBullets,
    headline: `${period.toUpperCase()} Shipped Summary`,
    summary: `Shipped ${count} deliverables with ${focusMinutes}m focused and a ${streak}-day streak.`,
    bulletPoints: shippedBullets,
    velocityStatus: count >= 5 ? 'High Cadence' : 'Steady Cadence',
    nextStrategicPriorities: [
      'expand test coverage for core schemas #testing',
      'prepare next sprint milestone #wip'
    ]
  };
}

// Development with Vite vs Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
