/**
 * Benny's Hub - Preload Script
 * 
 * Bridges the Electron main process with the renderer (web pages).
 * Exposes safe APIs via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ============ VOICE SETTINGS API ============
  voice: {
    getSettings: () => ipcRenderer.invoke('voice:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('voice:saveSettings', settings),
    onSettingsChanged: (callback) => {
      ipcRenderer.on('voice-settings-changed', (event, settings) => callback(settings));
    }
  },
  
  // ============ KEYBOARD API ============
  keyboard: {
    getPredictions: () => ipcRenderer.invoke('keyboard:getPredictions'),
    savePrediction: (data) => ipcRenderer.invoke('keyboard:savePrediction', data),
    saveNgram: (data) => ipcRenderer.invoke('keyboard:saveNgram', data),
    clearPredictions: () => ipcRenderer.invoke('keyboard:clearPredictions')
  },
  
  // ============ JOURNAL API ============
  journal: {
    getEntries: () => ipcRenderer.invoke('journal:getEntries'),
    saveEntries: (data) => ipcRenderer.invoke('journal:saveEntries', data),
    getQuestions: () => ipcRenderer.invoke('journal:getQuestions')
  },
  
  // ============ STREAMING API ============
  streaming: {
    getData: () => ipcRenderer.invoke('streaming:getData'),
    getEpisodes: (showTitle) => ipcRenderer.invoke('streaming:getEpisodes', showTitle),
    getLastWatched: (showTitle) => ipcRenderer.invoke('streaming:getLastWatched', showTitle),
    saveProgress: (data) => ipcRenderer.invoke('streaming:saveProgress', data),
    getSearchHistory: () => ipcRenderer.invoke('streaming:getSearchHistory'),
    saveSearch: (term) => ipcRenderer.invoke('streaming:saveSearch', term),
    clearSearchHistory: () => ipcRenderer.invoke('streaming:clearSearchHistory'),
    launch: (data) => ipcRenderer.invoke('streaming:launch', data)
  },
  
  // ============ EXTERNAL APP LAUNCHERS ============
  launch: {
    messenger: () => ipcRenderer.invoke('launch:messenger'),
    search: () => ipcRenderer.invoke('launch:search'),
    ytsearchServer: () => ipcRenderer.invoke('launch:ytsearch-server')
  },
  
  // ============ WINDOW CONTROL ============
  window: {
    focus: () => ipcRenderer.invoke('window:focus'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen')
  },
  
  // ============ CHROME/CONTROL BAR ============
  chrome: {
    close: () => ipcRenderer.invoke('chrome:close')
  },
  controlBar: {
    close: () => ipcRenderer.invoke('controlBar:close')
  },
  
  // ============ SYSTEM CONTROLS ============
  system: {
    volumeUp: () => ipcRenderer.invoke('system:volumeUp'),
    volumeDown: () => ipcRenderer.invoke('system:volumeDown'),
    volumeMute: () => ipcRenderer.invoke('system:volumeMute'),
    volumeMax: () => ipcRenderer.invoke('system:volumeMax'),
    shutdownTimer: (minutes) => ipcRenderer.invoke('system:shutdownTimer', minutes),
    cancelShutdown: () => ipcRenderer.invoke('system:cancelShutdown'),
    restart: () => ipcRenderer.invoke('system:restart'),
    shutdown: () => ipcRenderer.invoke('system:shutdown'),
    closeApp: () => ipcRenderer.invoke('system:closeApp')
  },
  
  // ============ UTILITY ============
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // ============ NAVIGATION EVENTS ============
  onNavSignal: (callback) => {
    ipcRenderer.on('nav-signal', (event, signal) => callback(signal));
  },
  
  // Check if running in Electron
  isElectron: true
});

// Also expose a simpler check
contextBridge.exposeInMainWorld('isElectron', true);
