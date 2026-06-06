import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createProject as apiCreateProject, getLastProject, updateProject as apiUpdateProject } from '../api';
import type { Project } from '../types';

interface ProjectContextValue {
  project: Project | null;
  isLoading: boolean;
  createProject: (name: string, bpm?: number, key?: string, scale?: string) => Promise<Project | null>;
  updateProject: (updates: Partial<Pick<Project, 'name' | 'bpm' | 'key' | 'scale'>>) => Promise<void>;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  const refreshProject = useCallback(async () => {
    try {
      const res = await getLastProject();
      if (res.success && res.data?.project) {
        setProject(res.data.project);
      } else {
        setProject(null);
      }
    } catch {
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  const createProject = useCallback(async (name: string, bpm = 120, key = 'C', scale = 'Major') => {
    try {
      const res = await apiCreateProject(name, bpm, key, scale);
      if (res.success && res.data) {
        const projectRes = await getLastProject();
        if (projectRes.success && projectRes.data?.project) {
          setProject(projectRes.data.project);
          return projectRes.data.project;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateProject = useCallback(async (updates: Partial<Pick<Project, 'name' | 'bpm' | 'key' | 'scale'>>) => {
    if (!project) return;

    setProject((prev) => prev ? { ...prev, ...updates } : prev);

    const serialized = JSON.stringify(updates);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;

      try {
        const res = await apiUpdateProject(project.id, updates);
        if (res.success && res.data?.project) {
          setProject(res.data.project);
        }
      } catch {
        // Revert optimistic update on save failure
        lastSavedRef.current = '';
        refreshProject();
      }
    }, 500);
  }, [project]);

  return (
    <ProjectContext.Provider value={{ project, isLoading, createProject, updateProject, refreshProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
