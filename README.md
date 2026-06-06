# 🎮 Discord Quests Automator (macOS Optimized)

![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-yellow?style=for-the-badge&logo=javascript)
![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue?style=for-the-badge&logo=apple)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

An optimized tool designed to safely automate and bypass **Discord Quests** progress on desktop clients, featuring specific structural compatibility for macOS (`darwin` execution paths).

---

## 📑 Index
- [⚡ How to Use](#-how-to-use-on-macos)
- [🧪 Requirements & Attention](#-requirements--attention)
- [❓ FAQ & Troubleshooting](#-faq--troubleshooting)
- [⚖️ Disclaimer](#%EF%B8%8F-disclaimer)

---

## 🧪 Requirements & Attention
- ℹ️ **Video Quests:** Can be completed directly inside your standard Web Browser. No external client required.
- ℹ️ **Game & Stream Quests:** Due to Discord tracking parameters, you **MUST** use the official **Discord PTB (Public Test Build)** client. [Download Discord PTB here](https://discord.com/api/download/ptb).

---

## ⚡ How to Use on macOS

1. Navigate to **Discover > Quests** inside Discord and accept your desired Quest.
2. Press **`Cmd + Option + I`** on your MacBook keyboard to open the *DevTools*.
3. Switch over to the **Console** tab.
4. If it's your first time opening the console, type `allow pasting` and press **Enter** to bypass Discord's security warning.
5. Copy the entire code from [`code.js`](./code.js), paste it into the console, and press **Enter**.
6. Follow the instructions based on the Quest type:
   - **Game Quests (`PLAY_ON_DESKTOP`):** The script mocks the Unix process background activity. Just wait out the required minutes, no manual interaction needed.
   - **Streaming Quests (`STREAM_ON_DESKTOP`):** Join a voice channel with at least one friend (or an alternative account) and start streaming any random window.
7. Wait for the required timer to run down. 
8. Claim your rewards back under the **Quests** tab!

---

## ❓ FAQ & Troubleshooting

### ❓ `Cmd + Option + I` doesn't open the DevTools
Make sure you are running the **Discord PTB** desktop application or a web browser. The stable vanilla Discord app completely blocks the developer inspect shortcuts on macOS.

### ❓ Console returns `Action Limited` error
Discord enforces a hard daily/weekly cap on rewards. If you automate multiple quests consecutively, the server might return an HTTP 429 or a soft-lock error. If this happens, close Discord (`Cmd + Q`), disable any background integrations like Spotify, wait a few hours, and try again.

---

## ⚖️ Disclaimer

This repository is for educational and research purposes only. Automating client actions and spoofing API heartbeats violates **Discord's Terms of Service (ToS)**. Use this script at your own risk. The maintainers are not responsible for any account suspensions, bans, or restrictions.
