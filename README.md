# 🚗 CodeDrive — Voice-Powered Mobile Coding App

**Talk your code into existence.**  
CodeDrive lets you write, debug, and summarize code completely hands-free — perfect for creators on the move.  
It combines voice input, live code preview, and smart file summaries in a playful, glassy mobile interface.

---

## 🌈 Features

### 🎙️ Voice-Powered Coding
- Speak your code or edits, and see them appear live.
- Debug or refactor using natural commands like “Fix the syntax error” or “Add a print statement.”

### 🗂️ Drive TL;DR Mode
- Upload a **PDF, TXT, DOCX, or .py** file.
- Get an instant **AI-generated summary** of its contents.
- The summary is read aloud using **ElevenLabs** for natural voice playback.
- Includes **play/pause, rewind 10s, speed controls**, and a glowing waveform animation.

### ☁️ GitHub Sync (Planned)
- Connect your GitHub account.
- Commit or push your latest code changes by voice.
- Automatically save snippets or summaries to your repo.

### 🧭 Offline Support
- Detects connection status via `navigator.onLine`.
- If offline, uses **local voice synthesis** and cached summaries.

---

## 🪩 UI / UX Style
- **Glassy panels** like Apple Vision Pro.
- **Translucent cards** with neon gradients and soft shadows.
- **Rounded fonts**: Comfortaa / Poppins / DM Sans.
- **Floating mascot animation** that reacts while you talk or play audio.

---

## 🧠 Tech Stack
- **Frontend:** React + Vite  
- **Voice:** Web Speech API (local) + ElevenLabs API (cloud)  
- **AI Summarization:** LLM (optional API key)  
- **Storage:** Local cache + GitHub integration (coming soon)

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/elena-jin/code-drive.git
cd code-drive/_apps/web

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
