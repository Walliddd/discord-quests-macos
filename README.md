# 🎮 Discord Quests Completer

![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-yellow?style=for-the-badge&logo=javascript)
![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A console script that automates **Discord Quests** progress on desktop clients by
spoofing the process / stream metadata Discord uses to track them. The universal
build **auto-detects your operating system** (macOS · Windows · Linux); dedicated
per-platform builds are included too.

---

## 📑 Index
- [📂 Which file do I use?](#-which-file-do-i-use)
- [⚡ How to Use](#-how-to-use)
- [🧪 Requirements & Attention](#-requirements--attention)
- [🎯 Supported quest types](#-supported-quest-types)
- [❓ FAQ & Troubleshooting](#-faq--troubleshooting)
- [🔧 How it works](docs/how-it-works.md)
- [⚖️ Disclaimer](#️-disclaimer)

---

## 📂 Which file do I use?

| File | Use it when |
|------|-------------|
| [`quest-completer.js`](./quest-completer.js) | **Recommended.** Universal build — auto-detects macOS, Windows or Linux. |
| [`platforms/macos.js`](./platforms/macos.js) | You want a macOS-only build. |
| [`platforms/windows.js`](./platforms/windows.js) | You want a Windows-only build. |

All three are self-contained — just copy the whole file into the console.

---

## ⚡ How to Use

1. Open Discord and go to **Discover ▸ Quests**, then **accept** the quest you want.
2. Open the DevTools **Console**:
   - **macOS:** `Cmd + Option + I`
   - **Windows / Linux:** `Ctrl + Shift + I`
3. Switch to the **Console** tab.
4. First time only: type `allow pasting` and press **Enter** to lift Discord's paste guard.
5. Open [`quest-completer.js`](./quest-completer.js), copy the **entire** file, paste it into the console, and press **Enter**.
6. Follow the on-screen instructions for your quest type (see below).
7. Wait for the timer to finish, then **claim your reward** under the Quests tab.

---

## 🧪 Requirements & Attention

- ℹ️ **Video & Activity quests** run fine in a normal web browser — no desktop client needed.
- ℹ️ **Game & Stream quests** require the **Discord desktop app**. The stable build blocks
  DevTools on some systems; if the shortcut does nothing, use the
  [**Discord PTB**](https://discord.com/api/download/ptb) (Public Test Build) client.

---

## 🎯 Supported quest types

| Task | Where it runs | What you do |
|------|---------------|-------------|
| `WATCH_VIDEO` / `WATCH_VIDEO_ON_MOBILE` | Browser or desktop | Nothing — progress is faked automatically. |
| `PLAY_ON_DESKTOP` | Desktop app | Nothing — a fake running game is injected. Just wait. |
| `STREAM_ON_DESKTOP` | Desktop app | Join a voice channel **with at least one other person** and share any window. |
| `PLAY_ACTIVITY` | Browser or desktop | Nothing — heartbeats are sent automatically. |

---

## ❓ FAQ & Troubleshooting

### The DevTools shortcut doesn't open anything
The stable Discord app disables DevTools on some setups. Install the
[**Discord PTB**](https://discord.com/api/download/ptb) client, or run Discord in your web browser
for video/activity quests.

### `Store not found` error in the console
Discord changed its internal code and the script's module lookups are out of date.
Grab the latest version of this repo, or wait for an update.

### `Cannot read properties of undefined (reading 'id')`
Old versions read the quest's application object unconditionally as `quest.config.application`.
Newer quest payloads may ship it as an `applications` array, as a bare id, or not at all — which
crashed even video/activity quests that don't need an application. Fixed: the app is now resolved
through several fallbacks, and quests genuinely missing one are skipped with a message instead of
throwing. Re-copy the script from this repo.

### `Action Limited` / HTTP 429 error
Discord caps quest rewards per day/week. If you run several quests back-to-back you may get
soft-locked. Fully quit Discord, disable rich-presence integrations (Spotify, etc.), wait a few
hours, and try again.

### Stream quest never completes
There **must** be at least one other user (or a second account of yours) in the voice channel,
and you must actually be sharing a screen/window.

---

## ⚖️ Disclaimer

This repository is for **educational and research purposes only**. Automating client actions and
spoofing API heartbeats violates **Discord's Terms of Service**. Use at your own risk — the
maintainers are not responsible for any account suspensions, bans, or restrictions.

Licensed under the [MIT License](./LICENSE).
