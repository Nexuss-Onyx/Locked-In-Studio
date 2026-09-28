import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, FocusSession, ProjectPhase } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { LockInView } from './views/LockInView';
import { ChangelogView } from './views/ChangelogView';
import { ContributionView } from './views/ContributionView';
import { ImportMarkdownModal } from './components/ImportMarkdownModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { soundManager } from './services/audio';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'lockin' | 'changelog' | 'heatmap'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedLockInTask, setSelectedLockInTask] = useState<Task | null>(null);
  const [currentWallpaperId, setCurrentWallpaperId] = useState<string>('wallpaper-lock-default');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Unified New Project Modal (Powered by pristine Markdown & Frontmatter engine)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [newProjectTargetProjectId, setNewProjectTargetProjectId] = useState<string | undefined>(undefined);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
    setSessions(StorageService.getFocusSessions());
    setCurrentWallpaperId(StorageService.getSelectedWallpaper());

    // Asynchronously connect to Supabase if credentials are provided in Vercel
    StorageService.initSupabaseSync().then(result => {
      if (result.synced) {
        setProjects(StorageService.getProjects());
        setTasks(StorageService.getTasks());
        setSessions(StorageService.getFocusSessions());
      }
    });
  }, []);

  const contributionData = StorageService.getContributionActivity();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // ⌘K or / to search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:focus-search'));
        return;
      }
      if (!isInput && e.key === '/') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:focus-search'));
        return;
      }

      if (isInput) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        soundManager.playTick();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'i' || e.key === 'I' || e.key === 'n' || e.key === 'N' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        soundManager.playTick();
        setNewProjectTargetProjectId(undefined);
        setIsNewProjectModalOpen(true);
      } else if (e.key === '1') {
        soundManager.playTick();
        setCurrentView('dashboard');
      } else if (e.key === '2') {
        soundManager.playTick();
        setCurrentView('projects');
      } else if (e.key === '3') {
        soundManager.playTick();
        setCurrentView('lockin');
      } else if (e.key === '4') {
        soundManager.playTick();
        setCurrentView('changelog');
      } else if (e.key === '5') {
        soundManager.playTick();
        setCurrentView('heatmap');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Import / Markdown Project Handler
  const handleImportMarkdown = (
    parsedData: { name: string; description: string; category: string; rawMarkdown: string; phases: ProjectPhase[]; estimatedTime?: string; estimatedMinutes?: number },
    targetProjectId?: string
  ) => {
    if (targetProjectId) {
      StorageService.updateProject(targetProjectId, {
        name: parsedData.name,
        description: parsedData.description,
        category: parsedData.category,
        rawMarkdown: parsedData.rawMarkdown,
        phases: parsedData.phases,
        estimatedTime: parsedData.estimatedTime,
        estimatedMinutes: parsedData.estimatedMinutes,
      });
      setSelectedProjectId(targetProjectId);
    } else {
      const newProj = StorageService.createProject({
        name: parsedData.name,
        description: parsedData.description,
        color: '#ABC8A2',
        icon: 'Layers',
        category: parsedData.category || 'Architecture & Design',
        rawMarkdown: parsedData.rawMarkdown,
        phases: parsedData.phases,
        estimatedTime: parsedData.estimatedTime,
        estimatedMinutes: parsedData.estimatedMinutes,
      });
      setSelectedProjectId(newProj.id);
    }
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
    setCurrentView('projects');
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    StorageService.updateProject(id, updates);
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
  };

  const handleDeleteProject = (id: string) => {
    StorageService.deleteProject(id);
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
  };

  // Task & Lock-In Handlers
  const handleToggleTaskComplete = (taskId: string) => {
    StorageService.toggleTaskStatus(taskId);
    setTasks(StorageService.getTasks());
    setProjects(StorageService.getProjects());
  };

  const handleStartLockInWithTask = (task: Task) => {
    setSelectedLockInTask(task);
    setCurrentView('lockin');
  };

  const handleStartLockInWithTodo = (todoTitle: string, projectId: string) => {
    // Check if task already exists or create real persistent task
    const existingTask = tasks.find(
      (t) => t.title.toLowerCase() === todoTitle.toLowerCase() && t.projectId === projectId
    );
    if (existingTask) {
      setSelectedLockInTask(existingTask);
    } else {
      const realTask = StorageService.createTask({
        title: todoTitle,
        projectId,
        priority: 'high',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        tags: ['Project Milestone'],
      });
      setTasks(StorageService.getTasks());
      setSelectedLockInTask(realTask);
    }
    setCurrentView('lockin');
  };

  const handleRecordFocusSession = (sessionData: { taskId?: string; taskTitle?: string; durationMinutes: number }) => {
    StorageService.recordFocusSession(sessionData);
    setSessions(StorageService.getFocusSessions());
    setTasks(StorageService.getTasks());
  };

  const handleSaveWallpaper = (id: string) => {
    setCurrentWallpaperId(id);
    StorageService.saveSelectedWallpaper(id);
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Overview';
      case 'projects':
        return 'Projects';
      case 'lockin':
        return 'Lock-In';
      case 'changelog':
        return 'Changelog';
      case 'heatmap':
        return 'Activity';
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0A09] text-[#F7F4EE] flex flex-row selection:bg-[#D8C9A3]/25 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        projectCount={projects.length}
        activeStreak={contributionData.currentStreak}
        onOpenNewProject={() => {
          setNewProjectTargetProjectId(undefined);
          setIsNewProjectModalOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className={`flex-1 h-full flex flex-col min-w-0 relative overscroll-none ${
        currentView === 'lockin' ? 'overflow-hidden' : 'overflow-y-auto'
      }`}>
        <Header
          title={getHeaderTitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewProject={() => {
            setNewProjectTargetProjectId(undefined);
            setIsNewProjectModalOpen(true);
          }}
          onGoToLockIn={() => {
            soundManager.playTick();
            setCurrentView('lockin');
          }}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className={currentView === 'lockin' ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 pb-16'}>
          {currentView === 'dashboard' && (
            <DashboardView
              projects={projects}
              tasks={tasks}
              sessions={sessions}
              activity={contributionData}
              onNavigate={(v) => setCurrentView(v)}
              onSelectProject={(projId) => {
                setSelectedProjectId(projId);
                setCurrentView('projects');
              }}
              onToggleTaskComplete={handleToggleTaskComplete}
              onStartLockInWithTask={handleStartLockInWithTask}
              onOpenNewProject={() => {
                setNewProjectTargetProjectId(undefined);
                setIsNewProjectModalOpen(true);
              }}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onOpenNewProject={(projId) => {
                setNewProjectTargetProjectId(projId);
                setIsNewProjectModalOpen(true);
              }}
              onStartLockInWithTodo={handleStartLockInWithTodo}
              searchQuery={searchQuery}
            />
          )}

          {currentView === 'lockin' && (
            <LockInView
              tasks={tasks}
              selectedTask={selectedLockInTask}
              onSelectTask={setSelectedLockInTask}
              onSessionComplete={handleRecordFocusSession}
              onToggleTaskComplete={handleToggleTaskComplete}
              currentWallpaperId={currentWallpaperId}
              onSaveWallpaper={handleSaveWallpaper}
            />
          )}

          {currentView === 'changelog' && (
            <ChangelogView
              tasks={tasks}
              projects={projects}
              sessions={sessions}
              activeStreak={contributionData.currentStreak}
            />
          )}

          {currentView === 'heatmap' && (
            <ContributionView activity={contributionData} />
          )}
        </main>
      </div>

      {/* Unified New Project Modal (Powered by Markdown & Frontmatter Engine) */}
      <ImportMarkdownModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setNewProjectTargetProjectId(undefined);
        }}
        onImport={handleImportMarkdown}
        existingProjects={projects}
        defaultProjectId={newProjectTargetProjectId}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
