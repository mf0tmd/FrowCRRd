const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  saveProject: (payload) => ipcRenderer.invoke('projects:save', payload),
  listProjects: (payload) => ipcRenderer.invoke('projects:list', payload),
  deleteProject: (payload) => ipcRenderer.invoke('projects:delete', payload),
  runSimulation: (payload) => ipcRenderer.invoke('simulation:run', payload),
  quitApp: () => ipcRenderer.invoke('app:quit'),
});
