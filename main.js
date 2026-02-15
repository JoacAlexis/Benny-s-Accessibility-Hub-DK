/**
 * Benny's Hub - Electron Main Process
 * 
 * Handles all backend operations:
 * - File I/O for keyboard predictions, journal entries
 * - Launching external Python apps (messenger, search)
 * - Window management
 * - Streaming platform automation
 */

const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

// Paths
const APP_DIR = __dirname;
const BENNYSHUB_DIR = path.join(APP_DIR, 'bennyshub');
const DATA_DIR = path.join(APP_DIR, 'data');
const APPS_DIR = path.join(BENNYSHUB_DIR, 'apps', 'tools');

// Data file paths
const KEYBOARD_PREDICTIONS_PATH = path.join(APPS_DIR, 'keyboard', 'web_keyboard_predictions.json');
const JOURNAL_ENTRIES_PATH = path.join(APPS_DIR, 'journal', 'entries.json');
const JOURNAL_QUESTIONS_PATH = path.join(APPS_DIR, 'journal', 'questions.json');
const STREAMING_DIR = path.join(APPS_DIR, 'streaming');
const STREAMING_DATA_DIR = path.join(STREAMING_DIR, 'data');
const STREAMING_DATA_JSON_PATH = path.join(STREAMING_DIR, 'data.json');
const STREAMING_EPISODES_PATH = path.join(STREAMING_DIR, 'episodes.json');
const STREAMING_LAST_WATCHED_PATH = path.join(STREAMING_DATA_DIR, 'last_watched.json');
const STREAMING_SEARCH_HISTORY_PATH = path.join(STREAMING_DIR, 'search_history.json');

// Shared settings paths
const VOICE_SETTINGS_PATH = path.join(BENNYSHUB_DIR, 'shared', 'voice-settings.json');

// External Python scripts
const MESSENGER_SCRIPT = path.join(APPS_DIR, 'messenger', 'ben_discord_app.py');
const SEARCH_SCRIPT = path.join(APPS_DIR, 'search', 'narbe_scan_browser.py');
const DM_LISTENER_SCRIPT = path.join(APPS_DIR, 'messenger', 'simple_dm_listener.py');
const CONTROL_BAR_SCRIPT = path.join(APPS_DIR, 'streaming', 'utils', 'control_bar.py');
const YTSEARCH_SERVER_SCRIPT = path.join(APPS_DIR, 'ytsearch', 'server.py');

// Chrome path
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// HARDWARE ACCELERATION - Enabled for WebGL games (Dice, Basketball, Bowling)
// Only disable if non-3D games are crashing
// app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu');
// app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
let dmListenerProcess = null;
let ytsearchServerProcess = null;

// Ensure data directories exist
function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STREAMING_DATA_DIR)) {
    fs.mkdirSync(STREAMING_DATA_DIR, { recursive: true });
  }
}

// ============ WINDOW MANAGEMENT ============

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // Allow preload script to work in iframes (same origin)
      nodeIntegrationInSubFrames: false,
      // This allows iframes to access the parent's electronAPI
      sandbox: false
    }
  });

  // Inject preload into all frames (including iframes)
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.session.setPreloads([path.join(__dirname, 'preload.js')]);
  });

  mainWindow.loadFile(path.join(BENNYSHUB_DIR, 'index.html'));
  
  // CRASH HANDLERS - Log renderer crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('!!! RENDERER CRASHED !!!');
    console.error('Reason:', details.reason);
    console.error('Exit code:', details.exitCode);
    // Write to file for persistence
    const crashLog = `[${new Date().toISOString()}] Renderer crashed: ${details.reason} (exit: ${details.exitCode})\n`;
    fs.appendFileSync(path.join(__dirname, 'crash.log'), crashLog);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('!!! WEBCONTENTS CRASHED !!!', killed ? '(killed)' : '');
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('!!! RENDERER UNRESPONSIVE !!!');
  });

  // Aggressively focus window when it finishes loading (critical for startup)
  mainWindow.webContents.on('did-finish-load', () => {
    // Multiple focus attempts with delays to handle startup race conditions
    const focusWindow = () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setFullScreen(true);
        mainWindow.webContents.focus();
      }
    };
    
    // Immediate focus
    focusWindow();
    
    // Delayed focus attempts to overcome other startup apps stealing focus
    setTimeout(focusWindow, 500);
    setTimeout(focusWindow, 1000);
    setTimeout(focusWindow, 2000);
    setTimeout(focusWindow, 3000);
    setTimeout(focusWindow, 5000);
  });

  // Note: Removed aggressive blur handler - it was causing focus fighting
  // with external Python apps (messenger, search). The window will stay
  // minimized when external apps are running, and restore when they close.

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Clean up DM listener
    if (dmListenerProcess) {
      dmListenerProcess.kill();
    }
  });

  // Open DevTools in development (disabled for production)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  ensureDataDirs();
  
  // Configure Content Security Policy to allow CDN resources for games
  // This allows Three.js, Cannon.js, YouTube player, localhost servers, search APIs, and other external libraries
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob: http://localhost:* http://127.0.0.1:*; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com https://www.google.com https://challenges.cloudflare.com http://localhost:* http://127.0.0.1:* blob:; " +
          "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com https://www.youtube.com https://s.ytimg.com https://www.google.com https://challenges.cloudflare.com http://localhost:* http://127.0.0.1:* blob:; " +
          "connect-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://www.google-analytics.com https://*.googleapis.com https://*.workers.dev https://www.youtube.com https://www.google.com https://challenges.cloudflare.com https://api.duckduckgo.com https://*.wikipedia.org http://localhost:* http://127.0.0.1:* wss: ws:; " +
          "img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:* http://127.0.0.1:*; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "worker-src 'self' blob:; " +
          "frame-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com http://localhost:* http://127.0.0.1:*;"
        ]
      }
    });
  });
  
  createWindow();
  
  // Start DM listener in background
  startDMListener();
  
  // Start navigation signal watcher for control bar communication
  startNavSignalWatcher();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (dmListenerProcess) {
    dmListenerProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============ HELPER FUNCTIONS ============

function loadJSON(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e);
  }
  return defaultValue;
}

function saveJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e);
    return false;
  }
}

function startDMListener() {
  if (fs.existsSync(DM_LISTENER_SCRIPT)) {
    try {
      dmListenerProcess = spawn('python', [DM_LISTENER_SCRIPT], {
        cwd: path.dirname(DM_LISTENER_SCRIPT),
        stdio: 'ignore',
        detached: false,
        windowsHide: true
      });
      console.log('[DM-LISTENER] Started');
    } catch (e) {
      console.error('[DM-LISTENER] Failed to start:', e);
    }
  }
}

// Navigation signal file path - control_bar.py writes here to request navigation
const NAV_SIGNAL_PATH = path.join(BENNYSHUB_DIR, 'nav_signal.json');
let lastNavTimestamp = 0;

function startNavSignalWatcher() {
  // Poll the navigation signal file every 300ms
  setInterval(() => {
    try {
      if (fs.existsSync(NAV_SIGNAL_PATH)) {
        const data = fs.readFileSync(NAV_SIGNAL_PATH, 'utf8');
        const signal = JSON.parse(data);
        
        if (signal.timestamp && signal.timestamp > lastNavTimestamp) {
          lastNavTimestamp = signal.timestamp;
          console.log('[NAV-SIGNAL] Received:', signal);
          
          // Restore and focus the main window, ensure fullscreen
          if (mainWindow) {
            mainWindow.restore();
            mainWindow.focus();
            mainWindow.show();
            mainWindow.setFullScreen(true);  // Always restore fullscreen
            
            // Send navigation event to renderer
            mainWindow.webContents.send('nav-signal', signal);
          }
          
          // Delete the signal file after processing
          try {
            fs.unlinkSync(NAV_SIGNAL_PATH);
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }
    } catch (e) {
      // Signal file doesn't exist or invalid JSON - that's fine
    }
  }, 300);
}

// ============ VOICE SETTINGS API ============
// Provides centralized voice settings storage that syncs across all apps

const DEFAULT_VOICE_SETTINGS = {
  ttsEnabled: true,
  voiceIndex: 0,
  voiceName: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
};

ipcMain.handle('voice:getSettings', async () => {
  return loadJSON(VOICE_SETTINGS_PATH, DEFAULT_VOICE_SETTINGS);
});

ipcMain.handle('voice:saveSettings', async (event, settings) => {
  const result = saveJSON(VOICE_SETTINGS_PATH, settings);
  
  // Broadcast to all windows/webContents
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('voice-settings-changed', settings);
    
    // Also send to all iframes
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({
                type: 'narbe-voice-settings-changed',
                settings: ${JSON.stringify(settings)}
              }, '*');
            }
          } catch(e) {}
        });
      })();
    `).catch(() => {});
  }
  
  return result;
});

// ============ KEYBOARD API ============

ipcMain.handle('keyboard:getPredictions', async () => {
  return loadJSON(KEYBOARD_PREDICTIONS_PATH, { frequent_words: {}, bigrams: {}, trigrams: {} });
});

ipcMain.handle('keyboard:savePrediction', async (event, { word, timestamp }) => {
  const data = loadJSON(KEYBOARD_PREDICTIONS_PATH, { frequent_words: {}, bigrams: {}, trigrams: {} });
  
  if (!data.frequent_words) data.frequent_words = {};
  if (!data.frequent_words[word]) {
    data.frequent_words[word] = { count: 0 };
  }
  data.frequent_words[word].count++;
  data.frequent_words[word].last_used = timestamp;
  
  return saveJSON(KEYBOARD_PREDICTIONS_PATH, data);
});

ipcMain.handle('keyboard:saveNgram', async (event, { context, next_word, timestamp }) => {
  const data = loadJSON(KEYBOARD_PREDICTIONS_PATH, { frequent_words: {}, bigrams: {}, trigrams: {} });
  
  const words = context.trim().split(/\s+/);
  const key = words.join(' ').toUpperCase();
  const nextUpper = next_word.toUpperCase();
  
  if (words.length === 1) {
    if (!data.bigrams) data.bigrams = {};
    if (!data.bigrams[key]) data.bigrams[key] = {};
    if (!data.bigrams[key][nextUpper]) {
      data.bigrams[key][nextUpper] = { count: 0 };
    }
    data.bigrams[key][nextUpper].count++;
    data.bigrams[key][nextUpper].last_used = timestamp;
  } else if (words.length === 2) {
    if (!data.trigrams) data.trigrams = {};
    if (!data.trigrams[key]) data.trigrams[key] = {};
    if (!data.trigrams[key][nextUpper]) {
      data.trigrams[key][nextUpper] = { count: 0 };
    }
    data.trigrams[key][nextUpper].count++;
    data.trigrams[key][nextUpper].last_used = timestamp;
  }
  
  return saveJSON(KEYBOARD_PREDICTIONS_PATH, data);
});

ipcMain.handle('keyboard:clearPredictions', async () => {
  const defaultData = { frequent_words: {}, bigrams: {}, trigrams: {} };
  return saveJSON(KEYBOARD_PREDICTIONS_PATH, defaultData);
});

// ============ JOURNAL API ============

ipcMain.handle('journal:getEntries', async () => {
  return loadJSON(JOURNAL_ENTRIES_PATH, { entries: [] });
});

ipcMain.handle('journal:saveEntries', async (event, data) => {
  return saveJSON(JOURNAL_ENTRIES_PATH, data);
});

ipcMain.handle('journal:getQuestions', async () => {
  return loadJSON(JOURNAL_QUESTIONS_PATH, { questions: [] });
});

// ============ STREAMING API ============

// Episode cache (loaded from episodes.json)
let episodeCache = null;

function loadEpisodeCache() {
  if (episodeCache !== null) return episodeCache;
  
  try {
    // Load from episodes.json
    episodeCache = loadJSON(STREAMING_EPISODES_PATH, {});
    const showCount = Object.keys(episodeCache).length;
    let episodeCount = 0;
    for (const show of Object.keys(episodeCache)) {
      for (const season of Object.keys(episodeCache[show])) {
        episodeCount += episodeCache[show][season].length;
      }
    }
    console.log(`[STREAMING] Loaded ${episodeCount} episodes for ${showCount} shows from episodes.json`);
  } catch (e) {
    console.error('[STREAMING] Error loading episodes:', e);
    episodeCache = {};
  }
  
  return episodeCache || {};
}

ipcMain.handle('streaming:getData', async () => {
  return loadJSON(STREAMING_DATA_JSON_PATH, []);
});

ipcMain.handle('streaming:getEpisodes', async (event, showTitle) => {
  const cache = loadEpisodeCache();
  if (showTitle) {
    const key = showTitle.toLowerCase().trim();
    return cache[key] || {};
  }
  return cache;
});

ipcMain.handle('streaming:getLastWatched', async (event, showTitle) => {
  const data = loadJSON(STREAMING_LAST_WATCHED_PATH, {});
  if (showTitle) {
    const key = showTitle.toLowerCase().trim();
    return data[key] || null;
  }
  return data;
});

ipcMain.handle('streaming:saveProgress', async (event, { show, season, episode, url }) => {
  const data = loadJSON(STREAMING_LAST_WATCHED_PATH, {});
  const key = show.toLowerCase().trim();
  data[key] = { season, episode, url, timestamp: Date.now() };
  return saveJSON(STREAMING_LAST_WATCHED_PATH, data);
});

ipcMain.handle('streaming:getSearchHistory', async () => {
  return loadJSON(STREAMING_SEARCH_HISTORY_PATH, []);
});

ipcMain.handle('streaming:saveSearch', async (event, term) => {
  let history = loadJSON(STREAMING_SEARCH_HISTORY_PATH, []);
  term = term.trim();
  if (term) {
    // Remove existing duplicate
    history = history.filter(h => h.toLowerCase() !== term.toLowerCase());
    // Add to front
    history.unshift(term);
    // Keep max 50
    history = history.slice(0, 50);
    saveJSON(STREAMING_SEARCH_HISTORY_PATH, history);
  }
  return history;
});

ipcMain.handle('streaming:clearSearchHistory', async () => {
  return saveJSON(STREAMING_SEARCH_HISTORY_PATH, []);
});

ipcMain.handle('streaming:launch', async (event, { url, title, type }) => {
  try {
    console.log(`[STREAMING] Launching: ${title} | ${url} | ${type}`);
    
    // Launch Chrome with the URL and remote debugging for control_bar.py automation
    const args = ['--new-window', '--start-fullscreen', '--remote-debugging-port=9222', url];
    
    const chromeProcess = spawn(CHROME_PATH, args, {
      detached: true,
      stdio: 'ignore'
    });
    chromeProcess.unref();
    
    // Minimize Electron window so Chrome takes focus
    if (mainWindow) {
      mainWindow.minimize();
    }
    
    // Determine delay for control bar based on platform
    // Control bar launches early for user interaction, then sends automation keys after 3s
    let delay = 5000; // Default - page should be loading
    if (url.includes('plex.tv') || url.includes('plex.direct') || url.includes(':32400')) {
      delay = 10000; // Plex needs more time to load
    } else if (url.includes('pluto.tv')) {
      delay = 12000; // PlutoTV is slow
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      delay = 6000; // YouTube loads faster
    }
    
    // Launch control bar after delay - it handles automation via _bootstrap_once()
    setTimeout(() => {
      launchControlBar('basic', title);
    }, delay);
    
    return { success: true };
  } catch (e) {
    console.error('[STREAMING] Launch error:', e);
    return { success: false, error: e.message };
  }
});

function launchControlBar(mode, showTitle) {
  if (fs.existsSync(CONTROL_BAR_SCRIPT)) {
    const args = [CONTROL_BAR_SCRIPT, '--mode', mode, '--app-title', 'Streaming Hub'];
    if (showTitle) {
      args.push('--show', showTitle);
    }
    
    spawn('python', args, {
      cwd: path.dirname(CONTROL_BAR_SCRIPT),
      detached: true,
      stdio: 'ignore'
    });
  }
}

// ============ EXTERNAL APP LAUNCHERS ============

ipcMain.handle('launch:messenger', async () => {
  try {
    if (fs.existsSync(MESSENGER_SCRIPT)) {
      spawn('python', [MESSENGER_SCRIPT], {
        cwd: path.dirname(MESSENGER_SCRIPT),
        detached: true,
        stdio: 'ignore'
      });
      // Don't minimize - let the messenger app take focus naturally
      // Electron stays fullscreen in the background
      return { success: true };
    }
    return { success: false, error: 'Messenger script not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('launch:search', async () => {
  try {
    if (fs.existsSync(SEARCH_SCRIPT)) {
      spawn('python', [SEARCH_SCRIPT], {
        cwd: path.dirname(SEARCH_SCRIPT),
        detached: true,
        stdio: 'ignore'
      });
      // Do NOT minimize Electron for search app, as requested
      // This allows it to stay in background and be restored more easily
      return { success: true };
    }
    return { success: false, error: 'Search script not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// YouTube Search server launcher - starts a localhost server for YouTube embed to work
ipcMain.handle('launch:ytsearch-server', async () => {
  try {
    // Check if server is already running by checking if port 3000 is in use
    const net = require('net');
    const portInUse = await new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(true))
        .once('listening', () => {
          tester.close();
          resolve(false);
        })
        .listen(3001, '127.0.0.1');
    });
    
    if (portInUse) {
      console.log('[YTSEARCH] Server already running on port 3001');
      return { success: true, url: 'http://localhost:3001' };
    }
    
    if (fs.existsSync(YTSEARCH_SERVER_SCRIPT)) {
      ytsearchServerProcess = spawn('python', [YTSEARCH_SERVER_SCRIPT], {
        cwd: path.dirname(YTSEARCH_SERVER_SCRIPT),
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      });
      
      console.log('[YTSEARCH] Server started on port 3001');
      
      // Wait a moment for the server to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true, url: 'http://localhost:3001' };
    }
    return { success: false, error: 'YTSearch server script not found' };
  } catch (e) {
    console.error('[YTSEARCH] Server launch error:', e);
    return { success: false, error: e.message };
  }
});

// ============ WINDOW CONTROL ============

ipcMain.handle('window:focus', async () => {
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.setFullScreen(true);
  }
});

ipcMain.handle('window:minimize', async () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:close', async () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window:toggleFullscreen', async () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// ============ UTILITY ============

ipcMain.handle('app:getPath', async (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
});

// Kill Chrome browsers (used when returning from streaming)
ipcMain.handle('chrome:close', async () => {
  return new Promise((resolve) => {
    exec('taskkill /F /IM chrome.exe', (error) => {
      resolve({ success: !error });
    });
  });
});

// Kill control bar
ipcMain.handle('controlBar:close', async () => {
  return new Promise((resolve) => {
    exec('taskkill /F /FI "WINDOWTITLE eq Control Bar*"', (error) => {
      // Also try to kill by Python script name
      exec('wmic process where "commandline like \'%control_bar.py%\'" delete', () => {
        resolve({ success: true });
      });
    });
  });
});

// ============ SYSTEM CONTROLS ============

// Volume control using PowerShell and nircmd
ipcMain.handle('system:volumeUp', async () => {
  return new Promise((resolve) => {
    // Use PowerShell to increase volume
    exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"', (error) => {
      if (error) {
        // Fallback: try nircmd if available
        exec('nircmd.exe changesysvolume 6553', (err2) => {
          resolve({ success: !err2 });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('system:volumeDown', async () => {
  return new Promise((resolve) => {
    exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"', (error) => {
      if (error) {
        exec('nircmd.exe changesysvolume -6553', (err2) => {
          resolve({ success: !err2 });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('system:volumeMute', async () => {
  return new Promise((resolve) => {
    exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"', (error) => {
      if (error) {
        exec('nircmd.exe mutesysvolume 2', (err2) => {
          resolve({ success: !err2 });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('system:volumeMax', async () => {
  return new Promise((resolve) => {
    // Set volume to 100% using PowerShell
    const ps = `
      $obj = New-Object -ComObject WScript.Shell
      # Press volume up many times to ensure max
      # Loop 50 times with a delay to ensure the system registers each keypress
      for ($i = 0; $i -lt 50; $i++) { $obj.SendKeys([char]175); Start-Sleep -Milliseconds 60 }
    `;
    exec(`powershell -Command "${ps.replace(/\n/g, '; ')}"`, (error) => {
      if (error) {
        exec('nircmd.exe setsysvolume 65535', (err2) => {
          resolve({ success: !err2 });
        });
      } else {
        resolve({ success: true });
      }
    });
  });
});

// Timer-based shutdown
ipcMain.handle('system:shutdownTimer', async (event, minutes) => {
  return new Promise((resolve) => {
    const seconds = minutes * 60;
    exec(`shutdown /s /t ${seconds}`, (error) => {
      resolve({ success: !error, error: error?.message });
    });
  });
});

// Cancel shutdown timer
ipcMain.handle('system:cancelShutdown', async () => {
  return new Promise((resolve) => {
    exec('shutdown /a', (error) => {
      resolve({ success: !error, error: error?.message });
    });
  });
});

// Restart computer
ipcMain.handle('system:restart', async () => {
  return new Promise((resolve) => {
    exec('shutdown /r /t 5', (error) => {
      resolve({ success: !error, error: error?.message });
    });
  });
});

// Shutdown computer immediately
ipcMain.handle('system:shutdown', async () => {
  return new Promise((resolve) => {
    exec('shutdown /s /t 5', (error) => {
      resolve({ success: !error, error: error?.message });
    });
  });
});

// Close app
ipcMain.handle('system:closeApp', async () => {
  if (dmListenerProcess) {
    dmListenerProcess.kill();
  }
  app.quit();
  return { success: true };
});
