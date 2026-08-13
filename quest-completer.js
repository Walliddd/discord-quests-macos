/*
 * Discord Quests Completer — Universal build (macOS · Windows · Linux)
 * -------------------------------------------------------------------
 * Paste this whole file into the Discord DevTools Console (see README).
 * It auto-detects your operating system and spoofs the right process /
 * stream metadata for the quest you have enrolled in.
 *
 * Supported quest tasks:
 *   WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE  — works in browser or desktop
 *   PLAY_ON_DESKTOP                      — desktop client only
 *   STREAM_ON_DESKTOP                    — desktop client only (needs a 2nd person in VC)
 *   PLAY_ACTIVITY                        — works in browser or desktop
 *
 * For educational/research use only. Automating quest progress violates
 * Discord's Terms of Service. Use at your own risk.
 */

(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. Locate Discord's internal webpack stores
  // ---------------------------------------------------------------------------
  let wpRequire;
  try {
    delete window.$;
    wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
    webpackChunkdiscord_app.pop();
  } catch (e) {
    console.error("❌ Could not hook into Discord's webpack. Are you running this in the Discord client/web console?", e);
    return;
  }

  const modules = Object.values(wpRequire.c);
  const findStore = (label, predicate) => {
    const mod = modules.find(predicate);
    if (!mod) {
      throw new Error(`Store not found: ${label}. Discord may have updated its internals — the script needs to be refreshed.`);
    }
    return mod.exports;
  };

  let ApplicationStreamingStore, RunningGameStore, QuestsStore,
      ChannelStore, GuildChannelStore, FluxDispatcher, api;
  try {
    ApplicationStreamingStore = findStore("ApplicationStreamingStore", x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata).A;
    RunningGameStore          = findStore("RunningGameStore",          x => x?.exports?.Ay?.getRunningGames).Ay;
    QuestsStore               = findStore("QuestsStore",               x => x?.exports?.A?.__proto__?.getQuest).A;
    ChannelStore              = findStore("ChannelStore",              x => x?.exports?.A?.__proto__?.getAllThreadsForParent).A;
    GuildChannelStore         = findStore("GuildChannelStore",         x => x?.exports?.Ay?.getSFWDefaultChannel).Ay;
    FluxDispatcher            = findStore("FluxDispatcher",            x => x?.exports?.h?.__proto__?.flushWaitQueue).h;
    api                       = findStore("HTTP api",                  x => x?.exports?.Bo?.get).Bo;
  } catch (e) {
    console.error("❌ " + e.message);
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. Detect platform
  // ---------------------------------------------------------------------------
  const isApp = typeof DiscordNative !== "undefined";
  const rawPlatform =
    (isApp && DiscordNative.process && DiscordNative.process.platform) ||
    (navigator.userAgentData && navigator.userAgentData.platform) ||
    navigator.platform || "";

  const OS = /win/i.test(rawPlatform) ? "win32"
           : /mac|darwin/i.test(rawPlatform) ? "darwin"
           : "linux";

  console.log(`🖥️  Detected platform: ${OS}${isApp ? " (desktop client)" : " (browser)"}`);

  // ---------------------------------------------------------------------------
  // 3. Build a platform-correct fake "running game" object
  // ---------------------------------------------------------------------------
  // Discord has moved the quest's application object around across config
  // versions: older quests expose `config.application`, newer ones ship an
  // `applications` array, and some carry only a bare id. Normalise all of them.
  const resolveApp = config => {
    const fallbackName = config.messages?.gameTitle ?? config.messages?.questName ?? "Unknown";
    const app = config.application ?? config.applications?.[0];
    if (app?.id) return { id: app.id, name: app.name ?? fallbackName };

    // configVersion 2+ quests dropped the top-level `application` and bury the
    // id somewhere deeper (ctaConfig, taskConfigV2, …). Scan for an
    // application-ish key instead of hardcoding a path Discord will move again.
    const scan = (node, depth) => {
      if (!node || typeof node !== "object" || depth > 5) return null;
      for (const [key, value] of Object.entries(node)) {
        if (/^application(_?id)?$/i.test(key)) {
          if (typeof value === "string" && /^\d{17,20}$/.test(value)) return { id: value, name: fallbackName };
          if (value?.id) return { id: value.id, name: value.name ?? fallbackName };
        }
        const nested = scan(value, depth + 1);
        if (nested) return nested;
      }
      return null;
    };
    return scan(config, 0);
  };

  const getTaskConfig = quest => quest?.config?.taskConfig ?? quest?.config?.taskConfigV2 ?? null;
  const getTasks = quest => getTaskConfig(quest)?.tasks ?? {};

  const buildFakeGame = (appData, applicationId, pid) => {
    const name = appData.name;
    const exe = appData.executables?.find(x => x.os === OS)?.name?.replace(/^>/, "");

    if (OS === "win32") {
      const exeName = exe ?? `${name}.exe`;
      return {
        cmdLine: `C:\\Program Files\\${name}\\${exeName}`,
        exeName,
        exePath: `c:/program files/${name.toLowerCase()}/${exeName}`,
        hidden: false, isLauncher: false,
        id: applicationId, name, pid, pidPath: [pid],
        processName: name, start: Date.now(),
      };
    }

    // darwin / linux
    const exeName = exe ?? (OS === "darwin" ? `${name}.app` : name);
    return {
      cmdLine: OS === "darwin"
        ? `/Applications/${name}.app/Contents/MacOS/${name}`
        : `/usr/bin/${name.toLowerCase()}`,
      exeName,
      exePath: OS === "darwin"
        ? `/applications/${name.toLowerCase()}.app`
        : `/usr/bin/${name.toLowerCase()}`,
      hidden: false, isLauncher: false,
      id: applicationId, name, pid, pidPath: [pid],
      processName: name, start: Date.now(),
    };
  };

  // ---------------------------------------------------------------------------
  // 4. Collect enrolled, not-yet-completed, non-expired quests
  // ---------------------------------------------------------------------------
  const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
  const quests = [...QuestsStore.quests.values()].filter(x =>
    x.userStatus?.enrolledAt &&
    !x.userStatus?.completedAt &&
    new Date(x.config.expiresAt).getTime() > Date.now() &&
    supportedTasks.some(y => getTasks(x)[y] != null)
  );

  if (quests.length === 0) {
    console.log("❌ No quests to complete! Enroll in a quest under Discover ▸ Quests first.");
    return;
  }
  console.log(`📋 Found ${quests.length} quest(s) to process.`);

  // ---------------------------------------------------------------------------
  // 5. Process each quest
  // ---------------------------------------------------------------------------
  const doJob = () => {
    const quest = quests.pop();
    if (!quest) {
      console.log("🏁 All done — claim your rewards under the Quests tab!");
      return;
    }

    const pid = Math.floor(Math.random() * 30000) + 1000;
    // Only the game/stream tasks actually need an application — resolve it
    // lazily so a video/activity quest never dies on a missing app object.
    const app = resolveApp(quest.config);
    const applicationId = app?.id;
    const applicationName = app?.name ?? "Unknown";
    const questName = quest.config.messages?.questName ?? quest.id;
    const taskConfig = getTaskConfig(quest);
    const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
    const secondsNeeded = taskConfig.tasks[taskName].target;
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

    // --- WATCH_VIDEO ---------------------------------------------------------
    if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
      const maxFuture = 10, speed = 7, interval = 1;
      const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
      let completed = false;
      (async () => {
        while (true) {
          const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
          const diff = maxAllowed - secondsDone;
          const timestamp = secondsDone + speed;
          if (diff >= speed) {
            const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
            completed = res.body.completed_at != null;
            secondsDone = Math.min(secondsNeeded, timestamp);
          }
          if (timestamp >= secondsNeeded) break;
          await new Promise(r => setTimeout(r, interval * 1000));
        }
        if (!completed) {
          await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
        }
        console.log(`✅ Quest completed: ${questName}`);
        doJob();
      })();
      console.log(`🎬 Video spoof started for: ${questName}`);

    // --- PLAY_ON_DESKTOP -----------------------------------------------------
    } else if (taskName === "PLAY_ON_DESKTOP") {
      if (!isApp) {
        console.log("⚠️ Game quests can't run in the browser. Open the Discord desktop app to complete:", questName);
        doJob();
        return;
      }
      if (!applicationId) {
        console.log("⚠️ No application in this quest's config — skipping:", questName);
        console.log("   config keys were:", Object.keys(quest.config).join(", "));
        doJob();
        return;
      }
      api.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
        const appData = res.body?.[0] ?? { name: applicationName };
        const fakeGame = buildFakeGame(appData, applicationId, pid);

        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];
        const realGetRunningGames = RunningGameStore.getRunningGames;
        const realGetGameForPID = RunningGameStore.getGameForPID;
        RunningGameStore.getRunningGames = () => fakeGames;
        RunningGameStore.getGameForPID = p => fakeGames.find(x => x.pid === p);
        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

        const fn = data => {
          const progress = quest.config.configVersion === 1
            ? data.userStatus.streamProgressSeconds
            : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
          console.log(`📊 Game progress: ${progress}/${secondsNeeded}s`);
          if (progress >= secondsNeeded) {
            console.log(`✅ Quest completed: ${questName}`);
            RunningGameStore.getRunningGames = realGetRunningGames;
            RunningGameStore.getGameForPID = realGetGameForPID;
            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
            doJob();
          }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
        console.log(`🎮 Spoofed game "${applicationName}". Wait ~${Math.ceil((secondsNeeded - secondsDone) / 60)} minute(s).`);
      });

    // --- STREAM_ON_DESKTOP ---------------------------------------------------
    } else if (taskName === "STREAM_ON_DESKTOP") {
      if (!isApp) {
        console.log("⚠️ Stream quests can't run in the browser. Open the Discord desktop app to complete:", questName);
        doJob();
        return;
      }
      if (!applicationId) {
        console.log("⚠️ No application in this quest's config — skipping:", questName);
        console.log("   config keys were:", Object.keys(quest.config).join(", "));
        doJob();
        return;
      }
      const realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
      ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });

      const fn = data => {
        const progress = quest.config.configVersion === 1
          ? data.userStatus.streamProgressSeconds
          : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
        console.log(`📊 Stream progress: ${progress}/${secondsNeeded}s`);
        if (progress >= secondsNeeded) {
          console.log(`✅ Quest completed: ${questName}`);
          ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
          FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
          doJob();
        }
      };
      FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
      console.log(`📺 Spoofed stream for "${applicationName}". Share any screen/window in a voice channel for ~${Math.ceil((secondsNeeded - secondsDone) / 60)} minute(s).`);
      console.log("💡 Note: at least one other person (or a second account) must be in the voice channel.");

    // --- PLAY_ACTIVITY -------------------------------------------------------
    } else if (taskName === "PLAY_ACTIVITY") {
      const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id
        ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0)?.VOCAL[0]?.channel?.id;
      if (!channelId) {
        console.log("⚠️ No voice channel or DM found to anchor the activity. Join a server with a voice channel and retry:", questName);
        doJob();
        return;
      }
      const streamKey = `call:${channelId}:1`;
      (async () => {
        console.log(`🕹️ Completing activity: ${questName}`);
        while (true) {
          const res = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
          const progress = res.body.progress.PLAY_ACTIVITY.value;
          console.log(`📊 Activity progress: ${progress}/${secondsNeeded}s`);
          await new Promise(r => setTimeout(r, 20 * 1000));
          if (progress >= secondsNeeded) {
            await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
            break;
          }
        }
        console.log(`✅ Quest completed: ${questName}`);
        doJob();
      })();
    }
  };

  doJob();
})();
