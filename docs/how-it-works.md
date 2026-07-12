# 🔧 How it works

This is a short technical walkthrough of what the script does. Nothing here is required to *use* the tool — it's for the curious and for anyone maintaining it.

## 1. Hooking into Discord's webpack

Discord's client is a webpack bundle that exposes a global push array (`webpackChunkdiscord_app`). By pushing a module with a callback we capture the internal `require` (`wpRequire`) and can then read the module cache (`wpRequire.c`):

```js
const wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();
```

## 2. Locating the Flux stores

Discord's state lives in Flux stores. Each is found by a signature method it exposes:

| Store | Signature method | Purpose |
|-------|------------------|---------|
| `QuestsStore` | `getQuest` | The list of quests + your enrolment status |
| `RunningGameStore` | `getRunningGames` | What games Discord thinks you're running |
| `ApplicationStreamingStore` | `getStreamerActiveStreamMetadata` | Your active stream metadata |
| `ChannelStore` / `GuildChannelStore` | `getAllThreadsForParent` / `getSFWDefaultChannel` | Finding a voice channel to anchor activities |
| `FluxDispatcher` | `flushWaitQueue` | Dispatching/subscribing to store events |
| HTTP `api` | `.get` / `.post` | Calling Discord's REST API |

The refactored builds wrap these lookups in a `findStore()` helper that throws a clear
`Store not found` error instead of a cryptic `Cannot read property of undefined` when Discord
updates its internals.

## 3. Completing each quest type

- **`WATCH_VIDEO`** — POSTs increasing `timestamp` values to `/quests/:id/video-progress`, clamped so it never claims more time than has actually elapsed since enrolment.
- **`PLAY_ACTIVITY`** — POSTs heartbeats to `/quests/:id/heartbeat` with a `stream_key` anchored to a voice channel/DM, until the target is reached.
- **`PLAY_ON_DESKTOP`** — monkey-patches `RunningGameStore.getRunningGames` to return a **fake running game**, then dispatches `RUNNING_GAMES_CHANGE`. Discord's heartbeats then report progress until done, after which the original methods are restored.
- **`STREAM_ON_DESKTOP`** — monkey-patches `getStreamerActiveStreamMetadata` to point at the quest's application. You must actually share a screen in a voice channel with someone else present.

## 4. Platform differences (the reason for a Windows build)

Only `PLAY_ON_DESKTOP` is OS-specific. Discord validates the fake game's executable name and paths against the platform it thinks you're on, so the fake object must match:

| Field | macOS (`darwin`) | Windows (`win32`) | Linux |
|-------|------------------|-------------------|-------|
| `exeName` | `App.app` | `App.exe` | `app` |
| `cmdLine` | `/Applications/App.app/Contents/MacOS/App` | `C:\Program Files\App\App.exe` | `/usr/bin/app` |
| `exePath` | `/applications/app.app` | `c:/program files/app/App.exe` | `/usr/bin/app` |

The executable name is read from `appData.executables` filtered by `os`, falling back to a sensible default. Windows entries are sometimes prefixed with `>` (a launcher flag), which the script strips.

The **universal build** (`quest-completer.js`) detects the OS via
`DiscordNative.process.platform` (or `navigator.platform` in the browser) and calls a single
`buildFakeGame()` that produces the correct shape. The per-platform builds hardcode one branch.
