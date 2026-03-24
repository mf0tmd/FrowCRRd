const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

const toSafeFilePart = (value) => {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
};

const getProjectFileName = (config) => {
  const rawId = config && config.id ? config.id : Date.now().toString();
  const safeId = toSafeFilePart(rawId) || Date.now().toString();
  return `${safeId}.json`;
};

const ensureDirectory = async (directoryPath) => {
  await fs.mkdir(directoryPath, { recursive: true });
};

const getRunnerExecutableName = () => (process.platform === 'win32' ? 'frowcrrd_runner.exe' : 'frowcrrd_runner');

const getRunnerCandidates = () => {
  const executable = getRunnerExecutableName();
  const guiRoot = path.join(__dirname, '..');
  const repoRoot = path.join(guiRoot, '..');
  const externalFromEnv = process.env.FROWCRRD_RUNNER_PATH ? [process.env.FROWCRRD_RUNNER_PATH] : [];

  return [
    ...externalFromEnv,
    path.join(repoRoot, 'build', 'gui-release', 'bin', executable),
    path.join(repoRoot, 'build', 'gui-debug', 'bin', executable),
    path.join(repoRoot, 'build', 'bin', executable),
    path.join(guiRoot, 'sim-core', executable),
    path.join(process.resourcesPath, 'sim-core', executable),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'sim-core', executable),
    // Legacy fallback paths:
    path.join(guiRoot, 'FrowCRRd', 'build', 'bin', executable),
    path.join(guiRoot, 'FrowCRRd', 'build-codex', 'bin', executable),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'FrowCRRd', 'build', 'bin', executable),
  ];
};

const resolveRunnerPath = () => {
  const candidates = getRunnerCandidates();
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const resolveWindowIconPath = () => {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'icon.ico'),
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const runProcess = (binaryPath, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const baseEnv = options.env || process.env;
    const runtimePathEntries = [];
    const msysUcrtBin = 'C:\\msys64\\ucrt64\\bin';
    if (fsSync.existsSync(msysUcrtBin)) {
      runtimePathEntries.push(msysUcrtBin);
    }
    runtimePathEntries.push(path.dirname(binaryPath));

    const mergedPath = `${runtimePathEntries.join(path.delimiter)}${path.delimiter}${baseEnv.PATH || ''}`;

    const child = spawn(binaryPath, args, {
      windowsHide: true,
      env: {
        ...baseEnv,
        PATH: mergedPath,
      },
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('close', (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
};

const toFiniteNumber = (value, fallback = 0) => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeTelemetry = (points) => {
  if (!Array.isArray(points)) return [];

  return points.map((point) => ({
    t: toFiniteNumber(point.t),
    altitude: toFiniteNumber(point.altitude),
    downrange: toFiniteNumber(point.downrange),
    vVert: toFiniteNumber(point.vVert),
    vHor: toFiniteNumber(point.vHor),
    vTotal: toFiniteNumber(point.vTotal),
    accel: toFiniteNumber(point.accel),
    mass: toFiniteNumber(point.mass),
    thrust: toFiniteNumber(point.thrust),
    mach: toFiniteNumber(point.mach),
    pitch: toFiniteNumber(point.pitch, 90),
  }));
};

ipcMain.handle('dialog:select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled || !filePaths[0]) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle('projects:save', async (_event, payload) => {
  const directory = payload && payload.directory ? String(payload.directory) : '';
  const config = payload ? payload.config : null;

  if (!directory || !config || !config.id) {
    return { ok: false, reason: 'invalid_payload' };
  }

  await ensureDirectory(directory);
  const fileName = getProjectFileName(config);
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');

  return { ok: true, filePath };
});

ipcMain.handle('projects:list', async (_event, payload) => {
  const directory = payload && payload.directory ? String(payload.directory) : '';
  if (!directory) return [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => entry.name);

    const projects = [];
    for (const fileName of jsonFiles) {
      const filePath = path.join(directory, fileName);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          projects.push(parsed);
        }
      } catch {
        // Skip invalid JSON files in selected directory.
      }
    }

    projects.sort((a, b) => Number(b.id) - Number(a.id));
    return projects;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
});

ipcMain.handle('projects:delete', async (_event, payload) => {
  const directory = payload && payload.directory ? String(payload.directory) : '';
  const id = payload && payload.id ? String(payload.id) : '';

  if (!directory || !id) {
    return { ok: false, reason: 'invalid_payload' };
  }

  const fileName = `${toSafeFilePart(id)}.json`;
  const filePath = path.join(directory, fileName);

  try {
    await fs.unlink(filePath);
    return { ok: true };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ok: false, reason: 'not_found' };
    }
    throw error;
  }
});

ipcMain.handle('simulation:run', async (_event, payload) => {
  const config = payload && payload.config ? payload.config : null;
  if (!config || typeof config !== 'object') {
    return { ok: false, reason: 'invalid_payload' };
  }

  const runnerPath = resolveRunnerPath();
  if (!runnerPath) {
    console.error('[simulation:run] Native runner not found. Checked paths:', getRunnerCandidates());
    return { ok: false, reason: 'runner_not_found', searched: getRunnerCandidates() };
  }

  const tempFileName = `frowcrrd_input_${Date.now()}_${Math.random().toString(16).slice(2)}.json`;
  const tempInputPath = path.join(app.getPath('temp'), tempFileName);

  try {
    await fs.writeFile(tempInputPath, JSON.stringify(config), 'utf-8');

    const cwdCandidates = [
      path.join(__dirname, '..', '..'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'FrowCRRd'),
      path.join(process.resourcesPath, 'app.asar.unpacked'),
    ];
    const cwd = cwdCandidates.find((candidate) => (
      fsSync.existsSync(path.join(candidate, 'Configs', 'config.json'))
    )) || path.dirname(runnerPath);

    const result = await runProcess(runnerPath, ['--input', tempInputPath], { cwd });
    if (result.code !== 0) {
      console.error('[simulation:run] Runner exited with non-zero code', {
        code: result.code,
        stderr: (result.stderr || '').trim(),
      });
      return {
        ok: false,
        reason: 'runner_failed',
        stderr: (result.stderr || '').trim(),
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      console.error('[simulation:run] Runner returned invalid JSON output');
      return {
        ok: false,
        reason: 'invalid_runner_output',
        stderr: 'Runner output is not valid JSON.',
      };
    }

    if (!parsed || !Array.isArray(parsed.telemetry)) {
      console.error('[simulation:run] Runner JSON has no telemetry array');
      return {
        ok: false,
        reason: 'invalid_runner_output',
        stderr: 'Runner JSON does not contain telemetry array.',
      };
    }

    const telemetry = normalizeTelemetry(parsed.telemetry);

    return {
      ok: true,
      telemetry,
      points: toFiniteNumber(parsed.points),
      returnedPoints: toFiniteNumber(parsed.returnedPoints),
    };
  } catch (error) {
    console.error('[simulation:run] Exception while running native simulation', error);
    return {
      ok: false,
      reason: 'runner_exception',
      stderr: error && error.message ? error.message : String(error),
    };
  } finally {
    await fs.unlink(tempInputPath).catch(() => {});
  }
});

ipcMain.handle('app:quit', () => {
  app.quit();
  return { ok: true };
});

function createMainWindow() {
  const iconPath = resolveWindowIconPath();
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
