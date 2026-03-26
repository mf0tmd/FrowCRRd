import type { RocketConfig } from './types';

const RECENT_PROJECTS_KEY = 'recent_projects';
const SAVE_PATH_KEY = 'save_path';

const readLocalProjects = (): RocketConfig[] => {
  const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalProjects = (projects: RocketConfig[]) => {
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
};

const getSavePath = () => (localStorage.getItem(SAVE_PATH_KEY) || '').trim();

const hasDesktopStorageApi = () => {
  return Boolean(
    window.desktopApp &&
      window.desktopApp.saveProject &&
      window.desktopApp.listProjects &&
      window.desktopApp.deleteProject
  );
};

const shouldUseFolderStorage = () => hasDesktopStorageApi() && Boolean(getSavePath());

export const saveProjectToStorage = async (config: RocketConfig) => {
  if (shouldUseFolderStorage()) {
    await window.desktopApp!.saveProject({
      directory: getSavePath(),
      config,
    });
    return;
  }

  const projects = readLocalProjects();
  const existingIndex = projects.findIndex((project) => project.id === config.id);

  if (existingIndex >= 0) {
    projects[existingIndex] = config;
  } else {
    projects.unshift(config);
  }

  writeLocalProjects(projects);
};

export const listProjectsFromStorage = async (): Promise<RocketConfig[]> => {
  if (shouldUseFolderStorage()) {
    return window.desktopApp!.listProjects({
      directory: getSavePath(),
    });
  }

  return readLocalProjects();
};

export const deleteProjectFromStorage = async (projectId: string) => {
  if (shouldUseFolderStorage()) {
    await window.desktopApp!.deleteProject({
      directory: getSavePath(),
      id: projectId,
    });
    return;
  }

  const projects = readLocalProjects().filter((project) => project.id !== projectId);
  writeLocalProjects(projects);
};
