# Benny's Accessibility Hub 2.0

**A bespoke software suite for two and one-switch accessibility, built with Electron.**

This project provides an accessible computing environment designed for users who operate a computer with limited input methods (such as a single switch). The hub provides games, communication tools, a journal, media streaming control, and more—all navigable via switch scanning.

## ⚠️ Disclaimer
This software was created by caregivers for a specific individual with TUBB4A-related Leukodystrophy (H-ABC). It is **not** professional medical software. It serves as an open-source example of how families can use AI tools (ChatGPT, GitHub Copilot) to build accessible technology tailored to specific needs.

---

## Architecture

The system is built on **Electron** (Node.js + Chromium) with specific Python components for features that require system-level access:

### Core (Electron/Node.js)
- **`main.js`** — Electron main process, launches the hub
- **`preload.js`** — Secure bridge between web pages and Node.js
- **`bennyshub/`** — All HTML/CSS/JS applications (games, tools, hub interface)

### Python Components (Windows-specific)
These run as separate processes when needed:
- **`messenger/ben_discord_app.py`** — Discord GUI client with switch-accessible interface
- **`messenger/simple_dm_listener.py`** — Background service that announces incoming DMs via TTS
- **`search/narbe_scan_browser.py`** — Web search with accessible scanning interface
- **`streaming/server.py`** — Local server for streaming app control
- **`streaming/utils/control_bar.py`** — Always-on-top overlay for controlling streaming apps

---

## Features

### 🎮 Games
Located in `bennyshub/apps/games/`:
- **Benny's Bowling** — 3D physics-based bowling (Three.js/Ammo.js)
- **Trivia Master** — Customizable trivia with local/online question packs
- **Word Jumble** — Word unscrambling game
- **Matchy Match** — Memory matching game
- **Benny's Peggle** — Peggle-style arcade game
- **Bug Blaster** — Arcade shooter
- **Chess & Checkers** — Classic board games
- **Mini Golf** — Course-based mini golf with course creator
- **Dice** — Accessible dice rolling
- **Tic Tac Toe** — Classic game with AI opponent
- **Benny Says** — Simon-style memory game
- **Basketball Shooter** — Basketball arcade game
- **Baseball** — Baseball game

### 🛠️ Tools
Located in `bennyshub/apps/tools/`:
- **Journal** — Voice-enabled daily journal
- **Phrase Board** — Quick-access communication tiles
- **Keyboard** — Predictive on-screen keyboard
- **Search** — Accessible web/YouTube search (Python)

### 💬 Messenger (Discord)
A complete Discord client designed for switch access:
- Full DM and channel support
- TTS announcements for incoming messages
- Predictive keyboard for composing messages
- Background listener for notifications

### 📺 Streaming Dashboard
Control streaming services (Netflix, Plex, etc.) with switch access:
- **Unified launcher** — Browse and launch shows across services
- **Episode tracking** — Remember progress in series
- **Control Bar** — Always-on-top overlay with Play/Pause, Volume, Skip, and Exit

---

## Installation

### Prerequisites
- **Windows 10/11** (required for Python components)
- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org/)
- **Python 3.10+** — [Download from python.org](https://www.python.org/)
- **Git** (optional) — For cloning the repository

### Step 1: Clone or Download
```bash
git clone https://github.com/NARBEHOUSE/Benny-s-Accessibility-Hub-2.0.git
cd Benny-s-Accessibility-Hub-2.0
```
Or download and extract the ZIP file.

### Step 2: Install Node.js Dependencies
Run the included batch file or use npm directly:
```bash
# Option A: Use the batch file
install_dependencies.bat

# Option B: Use npm directly
npm install
```

### Step 3: Install Python Dependencies
For the Messenger, Search, and Streaming features:
```bash
pip install -r requirements.txt
```

### Step 4: Run the Hub
```bash
# Option A: Use the batch file
start_hub.bat

# Option B: Use npm
npm start
```

---

## Configuration

### Discord Messenger Setup

The messenger requires a Discord bot. Here's how to set it up:

#### 1. Create a Discord Bot
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name
3. Go to the **"Bot"** tab and click **"Add Bot"**
4. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **Message Content Intent**
   - ✅ **Server Members Intent** (optional, for nicknames)
5. Click **"Reset Token"** and copy your bot token

#### 2. Invite the Bot to Your Server
1. Go to **"OAuth2" → "URL Generator"**
2. Select scopes: `bot`
3. Select permissions: `Send Messages`, `Read Message History`, `Add Reactions`
4. Copy the generated URL and open it in your browser to invite the bot

#### 3. Get Your Server/Channel IDs
1. In Discord, go to **User Settings → Advanced → Enable Developer Mode**
2. Right-click your server name → **"Copy Server ID"** (this is your `GUILD_ID`)
3. Right-click a channel → **"Copy Channel ID"** (for `CHANNEL_IDS`)
4. Create a private channel for DM bridging and copy its ID (for `DM_BRIDGE_CHANNEL_ID`)

#### 4. Configure the App
1. Copy `bennyshub/apps/tools/messenger/config.example.json` to `config.json`
2. Fill in your values:
```json
{
  "DISCORD_TOKEN": "your_bot_token_here",
  "GUILD_ID": "your_server_id",
  "CHANNEL_IDS": ["channel_id_1", "channel_id_2"],
  "DM_BRIDGE_CHANNEL_ID": "your_dm_bridge_channel_id"
}
```

### Streaming Dashboard Setup (Optional)

For movie/TV show metadata and artwork:

1. Create a free account at [The Movie Database (TMDB)](https://www.themoviedb.org/)
2. Go to Settings → API and request an API key
3. Copy `bennyshub/apps/tools/streaming/timd-api.example.json` to `timd-api.json`
4. Add your key:
```json
{
    "key": "your_tmdb_api_key_here"
}
```

---

## Auto-Start on Windows

For a seamless "appliance-like" experience:

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `start_hub.bat` in this folder

The hub will automatically start the background DM listener when it launches.

---

## File Structure
```
Benny-s-Accessibility-Hub-2.0/
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── package.json            # Node.js dependencies
├── start_hub.bat           # Launch script
├── install_dependencies.bat
└── bennyshub/
    ├── index.html          # Main hub interface
    ├── shared/             # Shared JS modules (voice, scanning)
    └── apps/
        ├── games/          # All games
        └── tools/
            ├── journal/
            ├── keyboard/
            ├── messenger/  # Discord integration
            ├── phraseboard/
            ├── search/     # Web search (Python)
            └── streaming/  # Media control (Python)
```

---

## License & Usage

**This software is free for PERSONAL USE only.**

It is intended to help individuals with disabilities, their families, and caregivers.
- ✅ **Allowed:** Personal use, modification for personal needs, sharing with other caregivers for free
- ❌ **Prohibited:** Any commercial use, selling the software, or bundling it with paid products/services

See the [LICENSE](LICENSE) file for full details.

---

## Credits
- **Concept & Caregiving:** Nancy & Ari
- **Development:** AI-Assisted (ChatGPT / GitHub Copilot) & NarbeHouse
- **Libraries:** [Electron](https://electronjs.org/), [Three.js](https://threejs.org/), [Ammo.js](https://github.com/kripken/ammo.js), [Discord.py](https://discordpy.readthedocs.io/), [PySide6](https://wiki.qt.io/Qt_for_Python)

---

**Dedicated to Ben. 💙**
