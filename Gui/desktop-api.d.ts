import type { RocketConfig, TelemetryPoint } from './types';

interface SaveProjectPayload {
  directory: string;
  config: RocketConfig;
}

interface ListProjectsPayload {
  directory: string;
}

interface DeleteProjectPayload {
  directory: string;
  id: string;
}

interface RunSimulationPayload {
  config: RocketConfig;
}

interface RunSimulationResult {
  ok: boolean;
  telemetry?: TelemetryPoint[];
  points?: number;
  returnedPoints?: number;
  reason?: string;
  stderr?: string;
}

interface DesktopAppBridge {
  platform: string;
  selectDirectory: () => Promise<string | null>;
  saveProject: (payload: SaveProjectPayload) => Promise<{ ok: boolean; filePath?: string; reason?: string }>;
  listProjects: (payload: ListProjectsPayload) => Promise<RocketConfig[]>;
  deleteProject: (payload: DeleteProjectPayload) => Promise<{ ok: boolean; reason?: string }>;
  runSimulation: (payload: RunSimulationPayload) => Promise<RunSimulationResult>;
  quitApp: () => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    desktopApp?: DesktopAppBridge;
  }
}

export {};
