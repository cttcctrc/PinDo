(() => {
  "use strict";

  const STORAGE_KEY = "pindo.prototype.v4";
  const query = new URLSearchParams(location.search);
  const noteWindowId = query.get("noteWindow");
  const controlWindow = query.get("controlWindow") === "1";
  if (noteWindowId) document.body.classList.add("note-window-mode");
  if (controlWindow) document.body.classList.add("control-window-mode");
  const COLORS = ["#fff0dc", "#dfe8ff", "#f0ddff", "#dff1e7", "#ffe4da", "#e8eef8"];
  const PIN_COLORS = ["#ff7044", "#467df4", "#8356e8", "#4fa674", "#f05f3b", "#386ee8"];
  const NODE_COLORS = ["#ef725f", "#eeaa45", "#6ca97d", "#5795d6", "#8d72be", "#565b64"];
  const DEADLINE_COLORS = { red: "#ee5d53", orange: "#ef9145", blue: "#4b78d1", gray: "#7e848d" };
  const NOTE_ICON_COLORS = ["#ef725f", "#eeaa45", "#62a675", "#5795d6", "#8d72be", "#565b64"];
  const TYPE_TAGS = ["个人", "工作", "纪念日"];
  const NOTE_ICONS = {
    dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6m-5 3h4m4-11a6 6 0 1 0-10.4 4.1C8.5 15 9 16 9 17h6c0-1 .5-2 1.4-2.9A5.9 5.9 0 0 0 18 10Z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.7L16.5 9"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20 8.7C20 14 12 19 12 19S4 14 4 8.7C4 5.4 8 4 10.1 6.5L12 8.7l1.9-2.2C16 4 20 5.4 20 8.7Z"/></svg>'
  };
  const TEXT_COLORS = ["#000000", "#555555", "#777777", "#999999", "#b7b7b7", "#d7d7d7", "#ffffff", "#ff3038", "#ff5960", "#f45ab2", "#d49ae7", "#bf68df", "#8749f5", "#5d13e8", "#079bb3", "#0bb6d3", "#55d3dc", "#39a9ee", "#4b72f3", "#0c50ad", "#1805ab", "#00b76a", "#70d44e", "#a3ef55", "#ffd55c", "#ffbc58", "#ff8e4c", "#ff681e"];
  const icons = {
    desktop: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H4zM9 20h6M12 16v4"/></svg>',
    top: '<svg viewBox="0 0 24 24"><path d="m14 4 6 6-3 1-4 4-1 5-2-6-6-2 5-1 4-4z"/></svg>',
    collapse: '<svg viewBox="0 0 24 24"><path d="M7 12V8.5a1.5 1.5 0 0 1 3 0V11 6.5a1.5 1.5 0 0 1 3 0V11 7.5a1.5 1.5 0 0 1 3 0V12 9.5a1.5 1.5 0 0 1 3 0V15c0 4-2.4 6-6.3 6H11c-2 0-3.1-.8-4.2-2.2L4 15.3a1.6 1.6 0 0 1 2.3-2.2L8 14.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/></svg>',
    archive: '<svg viewBox="0 0 24 24"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 9h18"/></svg>',
    sort: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h8M8 18h4M4 4v16m0 0-2-2m2 2 2-2"/></svg>',
    scan: '<svg viewBox="0 0 24 24"><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4m13 5h4a1 1 0 0 0 1-1v-4M7 9h10M7 13h10M7 17h6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3Zm16 0a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    bellOff: '<svg viewBox="0 0 24 24"><path d="M13.7 4.3A6 6 0 0 0 6 10c0 5-3 5-3 7h12M18 10c0 3 .8 4.2 1.6 5M10 21h4M3 3l18 18"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 6.5h7l2 2h9V19H3z"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5"/></svg>',
    app: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
    viewGrid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    viewList: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/></svg>',
    itemSize: '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="10" height="10" rx="2"/><path d="M10 4h10v10M14 4h6v6"/></svg>',
    organize: '<svg viewBox="0 0 24 24"><path d="M7 6h13M7 12h13M7 18h13"/><path d="m3 5 1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2"/></svg>'
  };

  const desktop = document.querySelector("#desktop");
  const noteLayer = document.querySelector("#noteLayer");
  const bookmarkDock = document.querySelector("#bookmarkDock");
  const toast = document.querySelector("#toast");
  const textToolbar = document.querySelector("#textToolbar");
  const dockTarget = document.querySelector("#dockTarget");
  const leftDockTarget = document.querySelector("#leftDockTarget");
  const assistant = document.querySelector("#assistant");
  const assistantMascot = document.querySelector("#assistantMascot");
  const dodoCanvas = document.querySelector("#dodoCanvas");
  const dodoContext = dodoCanvas.getContext("2d", { alpha: true });
  const dodoNudge = document.querySelector("#dodoNudge");
  const assistantPanel = document.querySelector("#assistantPanel");
  const notificationBadge = document.querySelector("#notificationBadge");
  const assistantTodos = document.querySelector("#assistantTodos");
  const todaySummary = document.querySelector("#todaySummary");
  const recycleSummary = document.querySelector("#recycleSummary");
  const recycleList = document.querySelector("#recycleList");
  const assistantGreeting = document.querySelector("#assistantGreeting");
  const settingsPanel = document.querySelector("#settingsPanel");
  const settingsModal = document.querySelector("#settingsModal");
  const settingsDialog = settingsModal.querySelector(".settings-dialog");
  let zCounter = 20;
  let toastTimer;
  let rendererSaveTimer = 0;
  let activeTextRange = null;
  let activeEditor = null;
  let activeNote = null;
  let todayExpanded = false;
  const organizerEditNotes = new Set();
  let focusedNoteId = null;
  let pinnedCaptureData = null;
  let pendingNoteEntrance = null;
  let dodoIdleTimer = 0;
  let lastReminderSignature = "";

  const DODO_ANIMATIONS = {
    sad_enter: { file: "sad_enter.webp", loop: false, hold: true, priority: 2 },
    sad_loop: { file: "sad_loop.webp", loop: true, priority: 0 },
    depressed_enter: { file: "depressed_enter.webp", loop: false, hold: true, priority: 2 },
    depressed_hold: { file: "depressed_enter.webp", loop: false, hold: true, priority: 0, staticFrame: 17 },
    sleep_enter: { file: "sleep_enter.webp", loop: false, hold: true, priority: 2 },
    sleep_hold: { file: "sleep_enter.webp", loop: false, hold: true, priority: 0, staticFrame: 17 },
    idle_breathe: { file: "idle_breathe.webp", loop: true, priority: 0 },
    blink: { file: "blink.webp", loop: false, priority: 1 },
    look_around: { file: "look_around.webp", loop: false, priority: 1 },
    picked_up: { file: "picked_up.webp", loop: false, hold: true, priority: 5 },
    landing: { file: "landing.webp", loop: false, priority: 5 },
    pet_response: { file: "pet_response.webp", loop: false, priority: 4 },
    celebrate: { file: "celebrate.webp", loop: false, priority: 7 },
  };
  // Sprite sheets use the same 512px cell, but a few poses were authored with
  // more transparent breathing room. Normalize their visible height at draw
  // time so idle/blink/look and action poses read at one consistent size while
  // keeping the foot baseline locked to the same point.
  const DODO_FRAME_SCALE = {
    // These four sheets share the same larger character framing. Reducing them
    // to 84% brings their visible body height in line with the action sheets.
    idle_breathe: .84, blink: .84, look_around: .84, pet_response: .84,
    // Action sheets stay at native scale to preserve their full silhouettes
    // and avoid clipping high jump / pickup poses.
    landing: 1, picked_up: 1, celebrate: 1,
    sad_enter: .74, sad_loop: .86, depressed_enter: .78, depressed_hold: .78,
    sleep_enter: .77, sleep_hold: .77,
  };
  const dodoImages = new Map();
  const dodoPlayback = { token: 0, raf: 0, name: "", priority: -1, interruptible: true };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const nowText = () => new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date()).replaceAll("/", "-");
  const localDateTimeValue = () => { const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return date.toISOString().slice(0, 16); };
  function toDateTimeLocal(value) {
    const match = String(value || "").match(/(\d{4}-\d{2}-\d{2})\D+(\d{2}:\d{2})/);
    return match ? `${match[1]}T${match[2]}` : localDateTimeValue();
  }
  function fromDateTimeLocal(value) { return value ? value.replace("T", " ") : nowText(); }
  function formatTimelineTime(value) { return fromDateTimeLocal(toDateTimeLocal(value)); }

  function starterState() {
    return {
      assistant: { x: null, y: null, tucked: false, tuckSide: "right" },
      settings: { locale: "zh-CN", localFont: "system", englishFont: "nunito", uiSize: "medium", dodoScale: 1 },
      recycleBin: [], attachments: [],
      notes: [
        {
          id: uid(), type: "quick", title: "今日灵感", x: 70, y: 58, w: 430, h: 400,
          color: COLORS[0], icon: "bulb", iconColor: NOTE_ICON_COLORS[1], mode: "desktop", locked: false, font: "nunito", fontSize: 18, fontWeight: 400,
          fontColor: "#2b2c30", ruled: true,
          content: "把复杂的事情写简单一点。\n\n下午和区域确认培训排期，再整理一版需求优先级。"
        },
        {
          id: uid(), type: "todo", title: "本周待办", x: 560, y: 105, w: 470, h: 440,
          color: COLORS[1], icon: "check", iconColor: NOTE_ICON_COLORS[3], mode: "top", locked: true, font: "nunito", fontSize: 17, fontWeight: 400, fontColor: "#2b2c30",
          todos: [
            { id: uid(), text: "确认AIGC培训名单", due: dateOffset(0), dueTime: "16:30", deadlineColor: "red", urgency: "紧急", importance: "重要", customTag: "工作", tagColor: "#df725f", reminder: "before1" },
            { id: uid(), text: "整理便签软件功能清单", due: dateOffset(3), dueTime: "18:00", deadlineColor: "blue", urgency: "一般", importance: "重要", customTag: "产品", tagColor: "#8c71ba", reminder: "" }
          ], history: []
        },
        {
          id: uid(), type: "timeline", title: "产品构思", x: 1090, y: 65, w: 440, h: 445,
          color: COLORS[2], icon: "flag", iconColor: NOTE_ICON_COLORS[4], mode: "desktop", locked: false, font: "nunito", fontSize: 17, fontWeight: 400, fontColor: "#2b2c30",
          events: [
            { id: uid(), text: "确定桌面本地便签方向", time: "2026-09-10 21:30", shape: "circle", size: "medium", color: NODE_COLORS[0], done: true },
            { id: uid(), text: "确认三类便签交互", time: "2026-09-11 09:53", shape: "ring", size: "medium", color: NODE_COLORS[4], done: false },
            { id: uid(), text: "制作Windows交互原型", time: nowText(), shape: "circle", size: "large", color: NODE_COLORS[3], done: false }
          ]
        }
      ]
    };
  }

  function dateOffset(days) {
    const d = new Date(); d.setDate(d.getDate() + days);
    return localDateString(d);
  }

  function localDateString(date) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function datePart(value) {
    return toDateTimeLocal(value).slice(0, 10);
  }

  function calendarDayNumber(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000 : NaN;
  }

  function isWithinCalendarDays(value, days) {
    const delta = calendarDayNumber(datePart(value)) - calendarDayNumber(dateOffset(0));
    return Number.isFinite(delta) && delta >= -days && delta <= days;
  }

  function dateMonthOffset(months) {
    const source = new Date(), day = source.getDate();
    const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay)); return localDateString(target);
  }

  function endOfWeekDate(addWeeks = 0) {
    const d = new Date(), day = d.getDay(), daysToSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysToSunday + addWeeks * 7); return localDateString(d);
  }

  function loadState() {
    try {
      if (noteWindowId) {
        const snapshot = window.pindoNote?.readNote();
        if (snapshot?.note) return { assistant: { x: null, y: null, tucked: false, tuckSide: "right" }, settings: { locale: "zh-CN", localFont: "system", englishFont: "nunito", uiSize: "medium", dodoScale: 1 }, recycleBin: [], attachments: [], notes: [snapshot.note], reminderState: { activeItems: [], handled: {}, emailQueue: [] }, noteWindowVersion: snapshot.version, nativeContext: snapshot.context || {} };
      }
      const desktopState = window.pindoDesktop?.readState();
      if (desktopState) {
        try {
          const saved = JSON.parse(desktopState);
          if (saved?.notes) return saved;
        } catch { /* Recover from the browser's local backup if the file is damaged. */ }
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (window.pindoDesktop && stored?.notes) window.pindoDesktop.writeState(JSON.stringify(stored));
      return stored?.notes ? stored : starterState();
    } catch { return starterState(); }
  }

  let state = loadState();
  let stateRevision = Number(window.pindoDesktop?.readRevision?.() || 0);
  let noteWindowVersion = Number(state.noteWindowVersion);
  delete state.noteWindowVersion;
  let nativeContext = state.nativeContext || {}; delete state.nativeContext;
  if (nativeContext.settings) state.settings = nativeContext.settings;
  state.assistant ||= { x: null, y: null, tucked: false, tuckSide: "right" };
  state.assistant.tuckSide ||= "right";
  state.settings ||= { locale: "zh-CN", localFont: "system", englishFont: "nunito", uiSize: "medium", dodoScale: 1 };
  state.settings.locale ||= "zh-CN"; state.settings.localFont ||= "system"; state.settings.englishFont ||= "nunito"; state.settings.uiSize ||= "medium"; state.settings.dodoScale = clamp(Number(state.settings.dodoScale) || 1, .5, 2);
  state.recycleBin ||= [];
  state.attachments ||= [];
  if (!state.attachments.length && Array.isArray(state.noteLinks)) {
    state.attachments = state.noteLinks.flatMap(link => {
      if (link.side === "top") return [{ parentId: link.b, childId: link.a }];
      if (link.side === "bottom") return [{ parentId: link.a, childId: link.b }];
      return [];
    }).filter((link, index, links) => links.findIndex(item => item.childId === link.childId) === index);
  }
  state.noteLinks = [];
  state.reminderState ||= { activeItems: [], handled: {}, emailQueue: [] };
  state.reminderState.handled ||= {}; state.reminderState.emailQueue ||= [];
  state.reminderState.activeItems ||= state.reminderState.active ? [state.reminderState.active] : [];
  delete state.reminderState.active;
  state.notes.forEach((note, index) => {
    note.z ??= 21 + index;
    note.pinEnabled ??= true;
    note.userEdited ??= note.type === "quick" ? Boolean(note.content?.trim()) : note.type === "todo" ? (note.todos || []).some(item => item.text?.trim()) : (note.events || []).some(item => item.text?.trim());
    if (note.type === "todo") note.todoLayout ||= "basic";
    if (note.type === "todo") (note.todos || []).forEach(todo => { todo.typeTag ||= ""; todo.typeTagColor ||= NOTE_ICON_COLORS[3]; });
    if (note.type === "organizer") { note.desktopItems ||= []; note.organizerItemSize ||= "medium"; note.organizerView ||= "grid"; note.mode = "desktop"; note.locked = false; note.pinEnabled = false; note.color = "#f3f5f8"; }
  });
  zCounter = Math.max(zCounter, ...state.notes.map(note => note.z || 0));
  function save() {
    clearTimeout(rendererSaveTimer); rendererSaveTimer = 0;
    const serialized = JSON.stringify(state);
    if (noteWindowId) {
      const note = state.notes.find(item => item.id === noteWindowId) || state.notes[0];
      if (note && Number.isSafeInteger(noteWindowVersion)) {
        const result = window.pindoNote?.writeNote(noteWindowVersion, note);
        if (result?.accepted) noteWindowVersion = result.current.version;
      }
    } else {
      const result = window.pindoDesktop?.writeState(serialized, stateRevision);
      if (result?.accepted) stateRevision = result.revision;
    }
    // Native note windows use the canonical JSON file through scoped IPC.
    // Never let a one-note renderer overwrite the browser backup for the
    // whole desktop state.
    if (!noteWindowId) {
      try { localStorage.setItem(STORAGE_KEY, serialized); } catch { /* Desktop file remains the primary store. */ }
    }
  }
  function scheduleSave(delay = 90) {
    clearTimeout(rendererSaveTimer);
    rendererSaveTimer = setTimeout(() => { rendererSaveTimer = 0; save(); }, delay);
  }
  function applyInterfaceSettings() {
    const root = document.documentElement;
    root.dataset.uiSize = state.settings.uiSize;
    const localFamilies = { system: '"Microsoft YaHei UI", "Segoe UI", system-ui, sans-serif', dingtalk: '"DingTalk", "Microsoft YaHei UI", sans-serif', muyao: '"Muyao Softbrush", "DingTalk", cursive' };
    const englishFamilies = { nunito: '"Nunito"', segoe: '"Segoe UI"', system: 'system-ui' };
    root.style.setProperty("--ui-local-font", localFamilies[state.settings.localFont] || localFamilies.system);
    root.style.setProperty("--ui-latin-font", englishFamilies[state.settings.englishFont] || englishFamilies.nunito);
    root.style.setProperty("--dodo-scale", String(clamp(Number(state.settings.dodoScale) || 1, .5, 2)));
  }
  applyInterfaceSettings();

  function loadDodoImage(name) {
    if (dodoImages.has(name)) return dodoImages.get(name);
    const config = DODO_ANIMATIONS[name];
    const image = new Image();
    const ready = new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(image), { once: true });
      image.addEventListener("error", reject, { once: true });
    });
    image.src = `./assets/dodo/animations/${config.file}`;
    const record = { image, ready }; dodoImages.set(name, record); return record;
  }

  function drawDodoFrame(name, frame, mirror = false) {
    const record = dodoImages.get(name); if (!record?.image.complete || !record.image.naturalWidth) return;
    const column = frame % 6, row = Math.floor(frame / 6);
    dodoContext.clearRect(0, 0, 512, 512);
    dodoContext.save(); dodoContext.imageSmoothingEnabled = true; dodoContext.imageSmoothingQuality = "high";
    if (mirror) { dodoContext.translate(512, 0); dodoContext.scale(-1, 1); }
    const scale = DODO_FRAME_SCALE[name] || 1;
    const drawSize = 512 * scale;
    const cellW=DODO_ANIMATIONS[name].naturalGrid?record.image.naturalWidth/6:512;
    const cellH=DODO_ANIMATIONS[name].naturalGrid?record.image.naturalHeight/3:512;
    const y=DODO_ANIMATIONS[name].naturalGrid?477-drawSize:512-drawSize;
    dodoContext.drawImage(record.image, column*cellW,row*cellH,cellW,cellH,(512-drawSize)/2,y,drawSize,drawSize);
    dodoContext.restore(); assistant.classList.add("dodo-ready");
  }

  function playDodoAnimation(name, options = {}) {
    if (noteWindowId) return false;
    const config = DODO_ANIMATIONS[name]; if (!config) return false;
    const priority = options.priority ?? config.priority;
    if (dodoPlayback.name && priority < dodoPlayback.priority) return false;
    cancelAnimationFrame(dodoPlayback.raf);
    const token = ++dodoPlayback.token;
    Object.assign(dodoPlayback, { name, priority, interruptible: options.interruptible ?? true, raf: 0 });
    assistant.dataset.animation = name;
    const mirror = options.mirror ?? false;
    loadDodoImage(name).ready.then(() => {
      if (token !== dodoPlayback.token) return;
      if(config.staticFrame!==undefined){drawDodoFrame(name,config.staticFrame,mirror);return;}
      const startedAt = performance.now(), frameDuration = 1000 / 18;
      let lastDrawnFrame = -1;
      const tick = now => {
        if (token !== dodoPlayback.token) return;
        const elapsedFrame = Math.floor((now - startedAt) / frameDuration);
        if (config.loop) {
          const nextFrame = elapsedFrame % 18;
          if (nextFrame !== lastDrawnFrame) { drawDodoFrame(name, nextFrame, mirror); lastDrawnFrame = nextFrame; }
          dodoPlayback.raf = requestAnimationFrame(tick); return;
        }
        if (elapsedFrame < 18) {
          const nextFrame = options.reverse ? 17 - elapsedFrame : elapsedFrame;
          if (nextFrame !== lastDrawnFrame) { drawDodoFrame(name, nextFrame, mirror); lastDrawnFrame = nextFrame; }
          dodoPlayback.raf = requestAnimationFrame(tick); return;
        }
        drawDodoFrame(name, options.reverse ? 0 : 17, mirror); dodoPlayback.raf = 0;
        if (config.hold || options.hold) { options.onComplete?.(); return; }
        Object.assign(dodoPlayback, { name: "", priority: -1, interruptible: true });
        options.onComplete?.();
        if (token !== dodoPlayback.token) return;
        playDodoIdle();
      };
      dodoPlayback.raf = requestAnimationFrame(tick);
    }).catch(() => {
      if (token === dodoPlayback.token) Object.assign(dodoPlayback, { name: "", priority: -1, interruptible: true, raf: 0 });
      assistant.classList.remove("dodo-ready");
    });
    return true;
  }

  let lastPetInteraction=0, dodoAwakeUntil=0, dodoStableMood="idle", dodoMoodSequence=0;
  function ambientDodoState(){
    const desired=PinDoDodo.stateFor({count:todayItems().length,stage:Math.max(1,...state.reminderState.activeItems.map(i=>i.stage||1)),hasReminder:!dodoNudge.hidden,idle:assistantPanel.hidden && !assistant.classList.contains("is-dragging") && Date.now()-lastPetInteraction>30000});
    return desired==="sleep" && Date.now()<dodoAwakeUntil ? "idle" : desired;
  }
  function settleDodoMood(mood,token){
    if(token!==dodoMoodSequence)return;
    dodoStableMood=mood;
    if(mood==="sleep")playDodoAnimation("sleep_hold",{priority:0,hold:true});
    else if(mood==="sad")playDodoAnimation("sad_loop",{priority:0});
    else if(mood==="depressed")playDodoAnimation("depressed_hold",{priority:0,hold:true});
    else {playDodoAnimation("idle_breathe",{priority:0});scheduleDodoIdleAction();}
  }
  function transitionDodoMood(desired){
    if(!["idle","sleep","sad","depressed"].includes(desired))desired="idle";
    if(desired===dodoStableMood){settleDodoMood(desired,++dodoMoodSequence);return;}
    const token=++dodoMoodSequence,steps=[];
    if(dodoStableMood==="sleep")steps.push({name:"sleep_enter",reverse:true});
    else if(dodoStableMood==="sad")steps.push({name:"sad_enter",reverse:true});
    else if(dodoStableMood==="depressed")steps.push({name:"depressed_enter",reverse:true},{name:"sad_enter",reverse:true});
    if(desired==="sleep")steps.push({name:"sleep_enter"});
    else if(desired==="sad")steps.push({name:"sad_enter"});
    else if(desired==="depressed")steps.push({name:"sad_enter"},{name:"depressed_enter"});
    const next=()=>{
      if(token!==dodoMoodSequence)return;
      const step=steps.shift();
      if(!step){
        // Transition sheets intentionally hold their last frame. Release that
        // temporary priority lock before starting the stable loop; otherwise
        // priority-0 idle/sleep/sad playback is rejected and Dodo appears
        // frozen after the state condition has already changed.
        Object.assign(dodoPlayback,{name:"",priority:-1,interruptible:true,raf:0});
        settleDodoMood(desired,token);return;
      }
      dodoPlayback.priority=-1;
      playDodoAnimation(step.name,{priority:2,interruptible:false,hold:true,reverse:Boolean(step.reverse),onComplete:next});
    };
    clearTimeout(dodoIdleTimer);next();
  }
  function refreshDodoMood(){
    if(noteWindowId||state.assistant.tucked||dodoPlayback.priority>1)return;
    const desired=ambientDodoState();
    if(desired===dodoStableMood)return;
    transitionDodoMood(desired);
  }
  assistantMascot.addEventListener("pointerdown",()=>{lastPetInteraction=Date.now();if(dodoStableMood==="sleep"){dodoAwakeUntil=Date.now()+30000;dodoPlayback.priority=-1;transitionDodoMood("idle");}});
  function playDodoIdle() {
    if (noteWindowId) return;
    if (state.assistant.tucked) {
      // Tucked mode intentionally uses the lightweight static peek asset.
      // Keeping the canvas hidden also prevents a stale transition frame from
      // flashing over the side-docked assistant.
      cancelAnimationFrame(dodoPlayback.raf);
      dodoPlayback.token++;
      Object.assign(dodoPlayback, { name: "", priority: -1, interruptible: true, raf: 0 });
      dodoContext.clearRect(0, 0, 512, 512);
      assistant.classList.remove("dodo-ready");
      dodoStableMood="idle";
      return;
    }
    transitionDodoMood(ambientDodoState());
  }

  function scheduleDodoIdleAction() {
    clearTimeout(dodoIdleTimer);
    dodoIdleTimer = setTimeout(() => {
      const busy = document.hidden || state.assistant.tucked || assistant.classList.contains("is-moving") || !assistantPanel.hidden || !dodoNudge.hidden;
      if (busy) { scheduleDodoIdleAction(); return; }
      const choice = Math.random();
      if (choice < .58) playDodoAnimation("blink", { onComplete: scheduleDodoIdleAction });
      else playDodoAnimation("look_around", { onComplete: scheduleDodoIdleAction });
    }, 4400 + Math.random() * 4200);
  }

  function tuckDodo(side) {
    assistantPanel.hidden = true; state.assistant.tuckSide = side; state.assistant.tucked = true;
    if (controlWindow) window.pindoNative.command("dodo-dock", {side,scale:state.settings.dodoScale});
    positionAssistant(); save();
    playDodoIdle();
    showToast(`Dodo已收进${side === "left" ? "左" : "右"}侧`);
  }

  function expandDodo() {
    const side = state.assistant.tuckSide;
    if (controlWindow) window.pindoNative.command("dodo-dock", {side:"expand",scale:state.settings.dodoScale});
    state.assistant.tucked = false; state.assistant.x = side === "left" ? 24 : innerWidth - 150;
    positionAssistant(); save();
    playDodoIdle();
  }

  // Warm only the common idle assets. Mood sheets are decoded lazily when a
  // state is actually entered, reducing startup work and memory pressure.
  if (!noteWindowId) ["idle_breathe", "blink", "look_around"].forEach(loadDodoImage);
  function noteById(id) { return state.notes.find(note => note.id === id); }
  function visibleNoteById(id) { const note = noteById(id); return note?.mode !== "bookmark" ? note : null; }
  function attachmentByChild(noteId) { if (noteWindowId && noteId === noteWindowId && nativeContext.parentId) return {parentId:nativeContext.parentId,childId:noteId}; return state.attachments.find(link => link.childId === noteId); }
  function attachmentRoot(noteId) {
    if (noteWindowId) return noteById(noteId);
    let current = noteById(noteId), guard = state.notes.length + 1;
    while (current && attachmentByChild(current.id) && guard-- > 0) current = noteById(attachmentByChild(current.id).parentId);
    return current || noteById(noteId);
  }
  function attachedTreeIds(noteId) {
    const ids = [noteId], queue = [noteId];
    while (queue.length) {
      const current = queue.shift();
      state.attachments.filter(link => link.parentId === current).forEach(link => {
        if (!ids.includes(link.childId) && visibleNoteById(link.childId)) { ids.push(link.childId); queue.push(link.childId); }
      });
    }
    return ids;
  }
  function detachAttachment(noteId) { state.attachments = state.attachments.filter(link => link.childId !== noteId); }
  function directChildId(noteId) { return state.attachments.find(link => link.parentId === noteId)?.childId || null; }
  function removeAttachmentsFor(noteId) { state.attachments = state.attachments.filter(link => link.childId !== noteId && link.parentId !== noteId); }
  function attachBelow(parentId, childId) {
    if (!parentId || !childId || parentId === childId || attachedTreeIds(childId).includes(parentId) || (directChildId(parentId) && directChildId(parentId) !== childId)) return false;
    detachAttachment(childId); state.attachments.push({ parentId, childId });
    const parent = noteById(parentId), child = noteById(childId);
    if (parent && child) { child.locked = false; child.mode = parent.mode; syncAttachedStack(attachmentRoot(parentId)?.id || parentId); }
    return true;
  }
  function syncAttachedStack(parentId) {
    if (noteWindowId || controlWindow) return;
    const parent = noteById(parentId); if (!parent) return;
    state.attachments.filter(link => link.parentId === parentId).forEach(link => {
      const child = noteById(link.childId); if (!child) return;
      child.x = parent.x; child.y = parent.y + parent.h; child.w = parent.w; child.mode = parent.mode;
      const childEl = noteLayer.querySelector(`[data-id="${child.id}"]`);
      if (childEl) { childEl.style.left = `${child.x}px`; childEl.style.top = `${child.y}px`; childEl.style.width = `${child.w}px`; childEl.style.height = `${child.h}px`; }
      syncAttachedStack(child.id);
    });
  }
  function showToast(message) {
    toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1700);
  }

  function showNearTip(anchor, message) {
    document.querySelectorAll(".inline-tip").forEach(item => item.remove());
    const tip = document.createElement("div"); tip.className = "inline-tip"; tip.textContent = message;
    document.body.appendChild(tip);
    const rect = anchor.getBoundingClientRect(), width = tip.offsetWidth, height = tip.offsetHeight;
    tip.style.left = `${clamp(rect.left + rect.width / 2 - width / 2, 10, innerWidth - width - 10)}px`;
    tip.style.top = `${rect.top > height + 14 ? rect.top - height - 8 : rect.bottom + 8}px`;
    requestAnimationFrame(() => tip.classList.add("show"));
    setTimeout(() => { tip.classList.remove("show"); setTimeout(() => tip.remove(), 160); }, 1900);
  }

  function render(persist = true) {
    textToolbar.hidden = true;
    activeTextRange = activeEditor = activeNote = null;
    state.attachments = state.attachments.filter(link => noteById(link.parentId) && noteById(link.childId));
    state.notes.filter(note => note.mode !== "bookmark" && !attachmentByChild(note.id)).forEach(note => syncAttachedStack(note.id));
    noteLayer.replaceChildren(); bookmarkDock.replaceChildren();
    if (noteWindowId) {
      const note = state.notes.find(item => item.id === noteWindowId) || state.notes[0];
      if (note && note.mode !== "bookmark") renderNote(note);
      if (persist) save();
      return;
    }
    if (controlWindow) {
      // The control renderer is deliberately Dodo/settings-only. All note
      // contents are owned by their independent native windows.
      renderAssistant();
      if (persist) save();
      return;
    }
    const bookmarks = state.notes.filter(note => note.mode === "bookmark");
    const visibleLimit = Math.max(1, Math.floor((desktop.clientHeight - 56) / 120) - (bookmarks.length > 1 ? 1 : 0));
    state.notes.filter(note => note.mode !== "bookmark").forEach(renderNote);
    bookmarks.slice(0, visibleLimit).forEach(renderBookmark);
    if (bookmarks.length > visibleLimit) renderBookmarkOverflow(bookmarks.slice(visibleLimit));
    renderAssistant();
    if (persist) save();
  }

  function renderBookmark(note) {
    const item = document.createElement("div");
    item.className = "bookmark"; item.draggable = true; item.dataset.bookmarkId = note.id; item.style.setProperty("--bookmark-color", note.color);
    item.style.setProperty("--icon-color", note.iconColor || NOTE_ICON_COLORS[0]);
    const title = note.title?.trim() || "";
    item.innerHTML = `<button class="bookmark-icon note-icon" title="更换图标">${noteIcon(note.icon)}</button><button class="bookmark-open" title="展开便签"><strong>${escapeHtml(shortTitle(title))}</strong></button>${bookmarkPreview(note)}`;
    item.querySelector(".bookmark-icon").addEventListener("click", e => { e.stopPropagation(); showNoteIconMenu(e.currentTarget, note); });
    item.querySelector(".bookmark-open").addEventListener("click", () => {
      note.mode = note.previousMode || "desktop";
      if (note.restoreSize) { note.w = note.restoreSize.w; note.h = note.restoreSize.h; }
      render(); showToast("便签已按原尺寸展开");
    });
    item.addEventListener("dragstart", event => {
      event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", note.id);
      item.classList.add("is-sorting");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-sorting"); document.querySelectorAll(".bookmark.drop-before,.bookmark.drop-after").forEach(mark => mark.classList.remove("drop-before", "drop-after"));
    });
    item.addEventListener("dragover", event => {
      event.preventDefault(); const before = event.clientY < item.getBoundingClientRect().top + item.offsetHeight / 2;
      document.querySelectorAll(".bookmark.drop-before,.bookmark.drop-after").forEach(mark => mark.classList.remove("drop-before", "drop-after"));
      item.classList.add(before ? "drop-before" : "drop-after");
    });
    item.addEventListener("drop", event => {
      event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === note.id) return;
      reorderBookmark(sourceId, note.id, event.clientY < item.getBoundingClientRect().top + item.offsetHeight / 2);
    });
    bookmarkDock.appendChild(item);
  }

  function renderBookmarkOverflow(notes) {
    const more = document.createElement("button"); more.className = "bookmark-more"; more.title = `还有${notes.length}个隐藏标签`; more.innerHTML = `<span>•••</span><b>${notes.length}</b>`;
    more.addEventListener("click", event => {
      event.stopPropagation();
      showMiniPopover(more, `<div class="popover-label">隐藏的标签</div><div class="hidden-tabs">${notes.map(note => `<button data-hidden-note="${note.id}"><span class="note-icon" style="--icon-color:${attr(note.iconColor || NOTE_ICON_COLORS[0])}">${noteIcon(note.icon)}</span><span><strong>${escapeHtml(note.title?.trim() || "")}</strong><small>${escapeHtml(bookmarkSummaryText(note))}</small></span>${note.type === "todo" ? `<b>${(note.todos || []).length}</b>` : ""}</button>`).join("")}</div>`, pop => {
        pop.addEventListener("click", e => { const button = e.target.closest("[data-hidden-note]"); if (!button) return; const note = noteById(button.dataset.hiddenNote); if (!note) return; note.mode = note.previousMode || "desktop"; if (note.restoreSize) Object.assign(note, note.restoreSize); pop.remove(); render(); });
      });
    });
    bookmarkDock.appendChild(more);
  }

  function bookmarkPreview(note) {
    const title = note.title?.trim() || "";
    if (note.type === "todo") return `<span class="bookmark-full-title bookmark-preview todo-preview"><b>${(note.todos || []).length}</b><strong>${escapeHtml(title)}</strong></span>`;
    if (note.type === "quick") return `<span class="bookmark-full-title bookmark-preview quick-preview"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(truncateText(note.content || "", 46))}</small></span>`;
    return `<span class="bookmark-full-title bookmark-preview timeline-preview"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(bookmarkSummaryText(note))}</small></span>`;
  }

  function bookmarkSummaryText(note) {
    if (note.type === "todo") return `${(note.todos || []).length}项待办`;
    if (note.type === "quick") return truncateText(note.content || "", 30);
    const texts = (note.events || [])
      .filter(item => isWithinCalendarDays(item.time, 7))
      .sort((a, b) => toDateTimeLocal(a.time).localeCompare(toDateTimeLocal(b.time)))
      .map(item => item.text?.trim()).filter(Boolean);
    return texts.length ? truncateText(`前后7天要进行【${texts.join("、")}】`, 44) : "前后7天暂无节点";
  }

  function reorderBookmark(sourceId, targetId, before) {
    const from = state.notes.findIndex(note => note.id === sourceId);
    if (from < 0 || !state.notes.some(note => note.id === targetId)) return;
    const [moving] = state.notes.splice(from, 1), adjustedTarget = state.notes.findIndex(note => note.id === targetId);
    state.notes.splice(adjustedTarget + (before ? 0 : 1), 0, moving); render(); showToast("收纳顺序已调整");
  }

  function renderNote(note) {
    const el = document.createElement("article");
    note.locked ??= false;
    note.pinEnabled ??= true;
    const parentLink = attachmentByChild(note.id), rootNote = attachmentRoot(note.id) || note;
    const effectiveLocked = Boolean(rootNote.pinEnabled && rootNote.locked);
    el.className = `note ${effectiveLocked ? "is-locked" : ""} ${parentLink ? "is-attached-child" : ""} ${focusedNoteId === note.id ? "focused" : ""} ${organizerEditNotes.has(note.id) ? "organizer-sorting" : ""}`; el.dataset.id = note.id; el.dataset.mode = note.mode; el.dataset.type = note.type; el.dataset.organizerSize = note.organizerItemSize || "medium"; el.dataset.organizerView = note.organizerView || "grid";
    const pinColor = note.pinColor || PIN_COLORS[Math.max(0, COLORS.indexOf(note.color)) % PIN_COLORS.length];
    note.icon ||= "dot"; note.iconColor ||= pinColor;
    const typeTool = note.type === "quick" ? `<button data-action="capture" class="type-tool-button" title="截图识别文字">${icons.scan}</button>` : note.type === "todo" || note.type === "timeline" ? `<button data-action="sort-time" class="type-tool-button" title="按时间从早到晚排序">${icons.sort}</button>` : "";
    const templateFab = note.type !== "quick" && note.type !== "organizer" && !note.userEdited ? `<button class="template-fab" data-action="template-switch" title="切换模板">${icons.swap}</button>` : "";
    const organizer = note.type === "organizer";
    el.style.cssText += `left:${noteWindowId ? 0 : note.x}px;top:${noteWindowId ? 0 : note.y}px;width:${noteWindowId ? "100%" : `${note.w}px`};height:${noteWindowId ? "100%" : `${note.h}px`};--note-color:${note.color};--pin-color:${pinColor};--icon-color:${note.iconColor};z-index:${focusedNoteId === note.id ? 6500 : note.mode === "top" ? 5000 + note.z : note.z}`;
    el.innerHTML = `
      ${!parentLink && note.pinEnabled ? `<button class="pushpin-button ${note.locked ? "inserted" : "raised"}" title="${note.locked ? "已钉住，点击拔出后可移动" : "未钉住，点击插入并固定位置"}" aria-label="${note.locked ? "拔出图钉" : "插入图钉"}"><span></span></button>` : ""}
      <header class="note-header">
        <div class="note-title-wrap">${organizer ? `<span class="organizer-title-icon">${icons.folder}</span>` : `<button class="note-kind-mark note-icon" title="更换标题图标">${noteIcon(note.icon)}</button>`}<div class="note-title" contenteditable="false" spellcheck="false" aria-label="便签标题" data-placeholder="双击输入标题" title="双击编辑 · 最多30个字符">${note.titleHtml || escapeHtml(note.title || "")}</div></div>
        <div class="note-controls">
          ${organizer ? `<button data-action="organizer-edit" class="${organizerEditNotes.has(note.id) ? "active" : ""}" title="${organizerEditNotes.has(note.id) ? "完成整理" : "整理快捷方式"}">${icons.organize}</button><button data-action="organizer-size" title="图标大小：${({ small: "小", medium: "中", large: "大" })[note.organizerItemSize || "medium"]}">${icons.itemSize}</button><button data-action="organizer-view" title="切换为${note.organizerView === "list" ? "图标" : "列表"}显示">${note.organizerView === "list" ? icons.viewGrid : icons.viewList}</button>` : `${typeTool}<button data-action="collapse" class="archive-button" title="收纳到右侧">${icons.archive}</button>`}
          <button data-action="trash" class="trash-button" title="移入回收站">${icons.trash}</button>
          ${organizer ? "" : `<button data-action="menu" title="更多">${icons.menu}</button>`}
        </div>
      </header>
      <div class="note-body"></div>${templateFab}${parentLink ? "" : '<button class="resize-handle" title="拖动调整尺寸" aria-label="调整便签尺寸"></button>'}`;
    noteLayer.appendChild(el);
    renderBody(el, note);
    bindNoteShell(el, note);
    enableResize(el, note);
    if (pendingNoteEntrance?.id === note.id) {
      const origin = pendingNoteEntrance;
      const desktopRect = desktop.getBoundingClientRect();
      el.style.setProperty("--spawn-x", `${origin.x - (desktopRect.left + note.x + note.w / 2)}px`);
      el.style.setProperty("--spawn-y", `${origin.y - (desktopRect.top + note.y + note.h / 2)}px`);
      el.classList.add("note-spawn");
      el.addEventListener("animationend", () => el.classList.remove("note-spawn"), { once: true });
      pendingNoteEntrance = null;
    }
  }

  function renderBody(el, note) {
    const body = el.querySelector(".note-body");
    if (note.type === "quick") renderQuick(body, note);
    if (note.type === "todo") renderTodos(body, note);
    if (note.type === "timeline") renderTimeline(body, note);
    if (note.type === "organizer") renderOrganizer(body, note);
  }

  function refreshOrganizer(note) {
    const el = noteLayer.querySelector(`[data-id="${note.id}"]`);
    if (!el) { render(); return; }
    el.classList.toggle("organizer-sorting", organizerEditNotes.has(note.id));
    el.dataset.organizerSize = note.organizerItemSize || "medium";
    el.dataset.organizerView = note.organizerView || "grid";
    const editButton = el.querySelector("[data-action=organizer-edit]");
    if (editButton) {
      editButton.classList.toggle("active", organizerEditNotes.has(note.id));
      editButton.title = organizerEditNotes.has(note.id) ? "完成整理" : "整理快捷方式";
    }
    const sizeButton = el.querySelector("[data-action=organizer-size]");
    if (sizeButton) sizeButton.title = `图标大小：${({ small: "小", medium: "中", large: "大" })[note.organizerItemSize || "medium"]}`;
    const viewButton = el.querySelector("[data-action=organizer-view]");
    if (viewButton) {
      viewButton.title = `切换为${note.organizerView === "list" ? "图标" : "列表"}显示`;
      viewButton.innerHTML = note.organizerView === "list" ? icons.viewGrid : icons.viewList;
    }
    renderOrganizer(el.querySelector(".note-body"), note);
    save();
  }

  function renderOrganizer(body, note) {
    note.desktopItems ||= [];
    body.innerHTML = `<div class="organizer-drop-zone"><div class="organizer-grid"></div><div class="organizer-empty" ${note.desktopItems.length ? "hidden" : ""}><span>${icons.folder}</span><strong>拖入快捷方式、文件或文件夹</strong><small>在 Windows 安装版中可直接打开</small></div></div>`;
    const zone = body.querySelector(".organizer-drop-zone"), grid = body.querySelector(".organizer-grid");
    note.desktopItems.forEach(item => {
      const card = document.createElement("button"); card.className = "organizer-item"; card.dataset.desktopItem = item.id;
      card.innerHTML = `<span class="organizer-item-icon">${item.icon ? `<img src="${attr(item.icon)}" alt="">` : item.kind === "folder" ? '<span class="organizer-folder-glyph" aria-hidden="true">📁</span>' : item.kind === "app" ? icons.app : icons.file}</span><strong>${escapeHtml(item.name)}</strong>${organizerEditNotes.has(note.id) ? '<span class="organizer-remove" title="从桌面整理中移除" aria-label="从桌面整理中移除">×</span>' : ''}`;
      card.addEventListener("click", async event => {
        event.stopPropagation();
        if (event.target.closest(".organizer-remove")) { note.desktopItems = note.desktopItems.filter(entry => entry.id !== item.id); refreshOrganizer(note); showToast("已从桌面整理中移除，原文件不受影响"); return; }
        if (card.dataset.justDragged || organizerEditNotes.has(note.id)) return;
        if (!noteWindowId) { showNearTip(card, "请在 Windows 版本打开本地项目"); return; }
        const result = await window.pindoNative.command("open-item", item.id);
        if (result?.error) showNearTip(card, result.error);
      });
      card.addEventListener("contextmenu", event => {
        event.preventDefault(); event.stopPropagation();
        showMiniPopover(card, '<button data-reveal-organizer-item>打开文件所在位置</button><button data-remove-organizer-item>从桌面整理中移除</button>', pop => {
          pop.addEventListener("click", async click => {
            if (click.target.closest("[data-reveal-organizer-item]")) { const result = await window.pindoNative.command("reveal-item", item.id); if (result?.error) showNearTip(card, result.error); pop.remove(); return; }
            if (!click.target.closest("[data-remove-organizer-item]")) return; note.desktopItems = note.desktopItems.filter(entry => entry.id !== item.id); pop.remove(); refreshOrganizer(note); showToast("已从桌面整理中移除，原文件不受影响");
          });
        });
      });
      enableOrganizerItemReorder(card, note, item); grid.appendChild(card);
    });
    zone.addEventListener("dragenter", event => { event.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragover", event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"; zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over"); });
    zone.addEventListener("drop", async event => {
      event.preventDefault(); event.stopPropagation(); zone.classList.remove("drag-over");
      if (organizerEditNotes.has(note.id)) return;
      if(noteWindowId){
        const paths=[...(event.dataTransfer?.files||[])].map(file=>window.pindoNative.pathForFile(file)).filter(Boolean);
        if(!paths.length){showNearTip(zone,"没有取得文件路径，请从 Windows 文件资源管理器拖入");return;}
        const result=await window.pindoNative.command("import-files",paths);
        refreshNativeNote();
        if(result.error)showNearTip(document.querySelector(".organizer-drop-zone")||zone,result.error);
        else showToast(`已加入 ${result.count} 项`);
        return;
      }
      const dropped = [];
      for (const entry of [...(event.dataTransfer?.items || [])]) {
        if (entry.kind !== "file") continue;
        let handle = null; try { handle = await entry.getAsFileSystemHandle?.(); } catch {}
        const file = entry.getAsFile(), name = handle?.name || file?.name;
        if (!name) continue;
        const lower = name.toLowerCase(), kind = handle?.kind === "directory" ? "folder" : /\.(exe|lnk|appref-ms|url)$/i.test(lower) ? "app" : "file";
        if (noteWindowId && file) {
          const nativeItem = await window.pindoNative.describeFile(file);
          if (nativeItem?.error) { showNearTip(zone, nativeItem.error); continue; }
          dropped.push({ id: uid(), ...nativeItem });
        } else dropped.push({ id: uid(), name, kind });
      }
      if (!dropped.length) { showNearTip(zone, "请拖入文件、文件夹或快捷方式"); return; }
      note.desktopItems.push(...dropped); note.userEdited = true; render(); showToast(`已加入 ${dropped.length} 项`);
    });
  }

  function enableOrganizerItemReorder(card, note, item) {
    card.addEventListener("pointerdown", event => {
      if (event.button !== 0 || !organizerEditNotes.has(note.id) || event.target.closest(".organizer-remove")) return;
      const startX = event.clientX, startY = event.clientY, rect = card.getBoundingClientRect();
      let ghost = null, target = null, insertAfter = false;
      const clear = () => { target?.classList.remove("organizer-drop-before", "organizer-drop-after"); target = null; };
      const move = pointer => {
        if (!ghost && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < 5) return;
        if (!ghost) { card.setPointerCapture(event.pointerId); card.dataset.justDragged = "true"; ghost = card.cloneNode(true); ghost.querySelector(".organizer-remove")?.remove(); ghost.className = "organizer-item organizer-item-ghost"; ghost.style.width = `${rect.width}px`; document.body.appendChild(ghost); card.classList.add("organizer-item-source"); }
        ghost.style.left = `${pointer.clientX - rect.width / 2}px`; ghost.style.top = `${pointer.clientY - rect.height / 2}px`; clear();
        const candidate = document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest(".organizer-item");
        if (!candidate || candidate === card || candidate.closest(".note")?.dataset.id !== note.id) return;
        target = candidate; const targetRect = candidate.getBoundingClientRect(); insertAfter = note.organizerView === "list" ? pointer.clientY > targetRect.top + targetRect.height / 2 : pointer.clientX > targetRect.left + targetRect.width / 2;
        target.classList.add(insertAfter ? "organizer-drop-after" : "organizer-drop-before");
      };
      const up = () => {
        setTimeout(() => delete card.dataset.justDragged, 150);
        card.removeEventListener("pointermove", move); card.removeEventListener("pointerup", up); card.removeEventListener("pointercancel", up);
        if (!ghost) return; const targetId = target?.dataset.desktopItem; clear(); ghost.remove(); card.classList.remove("organizer-item-source");
        if (!targetId) return; const from = note.desktopItems.findIndex(entry => entry.id === item.id); if (from < 0) return;
        const [moving] = note.desktopItems.splice(from, 1), targetIndex = note.desktopItems.findIndex(entry => entry.id === targetId);
        note.desktopItems.splice(targetIndex + (insertAfter ? 1 : 0), 0, moving); refreshOrganizer(note); showToast("桌面项目顺序已调整");
      };
      card.addEventListener("pointermove", move); card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
    });
  }

  function requireDoubleClickToEdit(element) {
    const isField = element.matches("input,textarea");
    const activate = event => {
      event?.stopPropagation();
      if (isField) element.readOnly = false;
      else element.contentEditable = "true";
      element.classList.add("is-editing");
      requestAnimationFrame(() => {
        element.focus();
        if (!isField) placeCaretAtEnd(element);
      });
    };
    const deactivate = () => {
      if (isField) element.readOnly = true;
      else element.contentEditable = "false";
      element.classList.remove("is-editing");
    };
    deactivate();
    if (!isField && !element.matches(".quick-editor")) element.addEventListener("paste", event => {
      event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    });
    element.addEventListener("dblclick", activate);
    element.addEventListener("blur", deactivate);
    element.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); element.blur(); }
    });
  }

  function renderQuick(body, note) {
    const initialContent = note.contentHtml || escapeHtml(note.content || "").replaceAll("\n", "<br>");
    body.innerHTML = `<div class="quick-editor ${note.ruled ? "ruled" : ""} ${fontClass(note.font)}" contenteditable="false" spellcheck="false" data-placeholder="双击后开始记录……" style="font-size:${note.fontSize}px;font-weight:${note.fontWeight};color:${note.fontColor}">${initialContent}</div>`;
    const editor = body.firstElementChild;
    requireDoubleClickToEdit(editor);
    editor.addEventListener("input", () => { note.content = editor.innerText; note.contentHtml = editor.innerHTML; scheduleSave(); });
    editor.addEventListener("paste", event => {
      event.preventDefault();
      document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    });
  }

  function renderTodos(body, note) {
    note.todos ||= []; note.history ||= [];
    const history = note.history.length ? `<button class="history-toggle">历史记录 ${note.history.length} ›</button><div class="history-list" hidden></div>` : "";
    if (note.todoLayout === "matrix") {
      const quadrants = [["urgent-low", "紧急不重要"], ["urgent-high", "紧急重要"], ["important-low", "重要不紧急"], ["low-low", "不重要不紧急"]];
      body.innerHTML = `<div class="todo-matrix">${quadrants.map(([key, label]) => `<section class="todo-quadrant quadrant-${key}"><h4>${label}</h4><div class="quadrant-list" data-quadrant-list="${key}"></div><button class="quadrant-add" data-add-quadrant="${key}" title="新增待办" aria-label="新增待办"><span class="add-icon">${icons.plus}</span></button></section>`).join("")}</div>${history}`;
      note.todos.forEach(todo => body.querySelector(`[data-quadrant-list="${todo.quadrant || "urgent-low"}"]`)?.appendChild(renderTodoRow(note, todo, true)));
      body.querySelectorAll("[data-add-quadrant]").forEach(button => button.addEventListener("click", () => addTodo(note, true, button.dataset.addQuadrant)));
    } else {
      body.innerHTML = `<div class="todo-list"></div><button class="todo-add"><span class="add-icon">${icons.plus}</span><span>添加一项待办</span></button>${history}`;
      const list = body.querySelector(".todo-list"); note.todos.forEach(todo => list.appendChild(renderTodoRow(note, todo, false)));
      body.querySelector(".todo-add").addEventListener("click", () => addTodo(note, true));
    }
    const historyToggle = body.querySelector(".history-toggle");
    if (historyToggle) {
      const historyList = body.querySelector(".history-list");
      historyList.innerHTML = note.history.map(item => `<div class="history-row"><span>${escapeHtml(item.text)}</span><button data-restore="${item.id}">恢复</button></div>`).join("") + `<button class="history-toggle" data-clear>清空历史记录</button>`;
      historyToggle.addEventListener("click", () => { historyList.hidden = !historyList.hidden; });
      historyList.addEventListener("click", e => {
        const restore = e.target.dataset.restore;
        if (restore) { const index = note.history.findIndex(i => i.id === restore); note.todos.push(note.history.splice(index, 1)[0]); render(); }
        if (e.target.dataset.clear !== undefined && confirm("确定清空全部已完成待办吗？")) { note.history = []; render(); }
      });
    }
  }

  function renderTodoRow(note, todo, compact) {
    const row = document.createElement("div"); row.className = `todo-row ${compact ? "compact" : ""}`; row.dataset.todo = todo.id;
    const categoryTags = compact ? "" : `${todo.urgency ? `<button class="chip urgency-${urgencyKey(todo.urgency)} tag-chip" data-remove="urgency" title="点击移除">${escapeHtml(todo.urgency)}<span>×</span></button>` : ""}${todo.importance === "重要" ? '<button class="chip important tag-chip" data-remove="importance" title="点击移除">重要<span>×</span></button>' : ""}${todo.typeTag ? `<button class="chip type-tag tag-chip" data-remove="type" title="点击移除" style="--tag-color:${todo.typeTagColor || NOTE_ICON_COLORS[3]}">${escapeHtml(todo.typeTag)}<span>×</span></button>` : ""}`;
    row.innerHTML = `<button class="complete-button" title="点击完成“${attr(todo.text || "此待办")}"></button><div class="todo-content"><div class="todo-text ${fontClass(note.font)}" role="textbox" data-placeholder="双击输入待办内容">${todo.textHtml || escapeHtml(todo.text)}</div><div class="todo-sub">${deadlineChip(todo)}${categoryTags}${todo.customTag ? `<button class="chip custom tag-chip" data-remove="custom" title="点击移除" style="--tag-color:${todo.tagColor}">${escapeHtml(todo.customTag)}<span>×</span></button>` : ""}<button class="tag-add" title="新增或修改标签" aria-label="新增或修改标签"><span class="add-icon">${icons.plus}</span></button></div></div><div class="todo-actions"><button class="row-action reminder-button ${todo.reminder ? "reminder-on" : ""}" title="${todo.reminder ? reminderLabel(todo.reminder) : "设置提醒"}">${todo.reminder ? icons.bell : icons.bellOff}</button></div>`;
    const input = row.querySelector(".todo-text");
    requireDoubleClickToEdit(input);
      input.addEventListener("input", e => { todo.text = input.innerText; todo.textHtml = input.innerHTML; if (todo.text.trim()) { note.userEdited = true; noteLayer.querySelector(`[data-id="${note.id}"] .template-fab`)?.remove(); } scheduleSave(); });
    input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTodo(note, true, todo.quadrant || ""); } });
    row.querySelector(".complete-button").addEventListener("click", () => completeTodo(note, todo.id));
    row.querySelector(".deadline-chip").addEventListener("click", e => showDateMenu(e.currentTarget, note, todo));
    row.querySelector(".tag-add").addEventListener("click", e => showTagMenu(e.currentTarget, note, todo));
    row.querySelectorAll(".tag-chip").forEach(chip => chip.addEventListener("click", () => removeTodoTag(todo, chip.dataset.remove)));
    row.querySelector(".reminder-button").addEventListener("click", e => showReminderMenu(e.currentTarget, note, todo));
    enableTodoReorder(row, note, todo);
    return row;
  }

  function addTodo(note, focus, quadrant = "") {
    const todo = { id: uid(), text: "", due: "", dueTime: "18:00", deadlineColor: "red", urgency: "一般", importance: "不重要", typeTag: "", typeTagColor: NOTE_ICON_COLORS[3], customTag: "", tagColor: NOTE_ICON_COLORS[0], reminder: "", quadrant };
    note.todos.push(todo); render();
  }

  function enableTodoReorder(row, note, todo) {
    row.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest("button,select,[contenteditable='true'],input:not([readonly])")) return;
      const startX = event.clientX, startY = event.clientY, rect = row.getBoundingClientRect();
      const offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
      let ghost = null, targetRow = null, targetList = null, insertAfter = false;
      // Capture only after a drag actually starts, preserving double-click targets.
      const clearTarget = () => {
        targetRow?.classList.remove("todo-drop-before", "todo-drop-after");
        targetList?.classList.remove("todo-drop-zone");
        targetRow = null; targetList = null;
      };
      const move = pointer => {
        if (!ghost && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < 5) return;
        if (!ghost) {
          row.setPointerCapture(event.pointerId);
          ghost = row.cloneNode(true); ghost.className = `${row.className} todo-drag-ghost`;
          ghost.style.width = `${rect.width}px`; ghost.style.height = `${rect.height}px`;
          document.body.appendChild(ghost); row.classList.add("todo-drag-source");
        }
        ghost.style.left = `${pointer.clientX - offsetX}px`; ghost.style.top = `${pointer.clientY - offsetY}px`;
        clearTarget();
        const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
        const noteElement = hit?.closest(".note");
        if (noteElement?.dataset.id !== note.id) return;
        const candidate = hit?.closest(".todo-row");
        if (candidate === row) return;
        if (candidate && candidate !== row) {
          targetRow = candidate;
          const candidateRect = candidate.getBoundingClientRect();
          insertAfter = pointer.clientY > candidateRect.top + candidateRect.height / 2;
          candidate.classList.add(insertAfter ? "todo-drop-after" : "todo-drop-before");
          return;
        }
        targetList = hit?.closest(".todo-list,.quadrant-list");
        targetList?.classList.add("todo-drop-zone");
      };
      const up = () => {
        row.removeEventListener("pointermove", move); row.removeEventListener("pointerup", up); row.removeEventListener("pointercancel", up);
        if (!ghost) return;
        const targetId = targetRow?.dataset.todo;
        const targetQuadrant = targetRow
          ? note.todos.find(item => item.id === targetId)?.quadrant || ""
          : targetList?.dataset.quadrantList || "";
        clearTarget(); ghost.remove(); row.classList.remove("todo-drag-source");
        const from = note.todos.findIndex(item => item.id === todo.id);
        if (from < 0) return;
        const [moving] = note.todos.splice(from, 1); moving.quadrant = targetQuadrant;
        if (targetId) {
          const targetIndex = note.todos.findIndex(item => item.id === targetId);
          note.todos.splice(Math.max(0, targetIndex + (insertAfter ? 1 : 0)), 0, moving);
        } else if (targetList) {
          const matching = note.todos.map((item, index) => ({ item, index })).filter(entry => (entry.item.quadrant || "") === targetQuadrant);
          note.todos.splice(matching.length ? matching.at(-1).index + 1 : note.todos.length, 0, moving);
        } else note.todos.splice(from, 0, moving);
        render(); showToast("待办顺序已调整");
      };
      row.addEventListener("pointermove", move); row.addEventListener("pointerup", up); row.addEventListener("pointercancel", up);
    });
  }

  function completeTodo(note, id) {
    const index = note.todos.findIndex(item => item.id === id); if (index < 0) return;
    state.reminderState.activeItems = state.reminderState.activeItems.filter(active => {
      const matches = active.type === "todo" && active.noteId === note.id && active.itemId === id;
      if (matches) state.reminderState.handled[active.key] = true;
      return !matches;
    });
    const [item] = note.todos.splice(index, 1); item.completedAt = nowText(); note.history.unshift(item); render();
    playDodoAnimation("celebrate", { priority: 7, interruptible: false });
    showToast(`已完成“${item.text || "待办"}”`);
  }

  function removeTodoTag(todo, type) {
    if (type === "urgency") todo.urgency = "";
    if (type === "importance") todo.importance = "不重要";
    if (type === "type") todo.typeTag = "";
    if (type === "custom") todo.customTag = "";
    render(); showToast("标签已移除");
  }

  function renderTimeline(body, note) {
    note.events ||= [];
    body.innerHTML = `<div class="timeline-list"></div><button class="timeline-add"><span class="add-icon">${icons.plus}</span><span>添加时间节点</span></button>`;
    const list = body.querySelector(".timeline-list");
    note.events.forEach((item, index) => {
      if (index > 0) {
        const insert = document.createElement("button"); insert.className = "timeline-insert"; insert.title = "在这里插入节点"; insert.innerHTML = icons.plus;
        insert.dataset.previousEvent = note.events[index - 1].id; insert.dataset.nextEvent = item.id;
        insert.addEventListener("click", () => insertTimelineEvent(note, index)); list.appendChild(insert);
      }
      const row = document.createElement("div"); row.className = `timeline-row ${item.done ? "done" : ""}`; row.dataset.eventId = item.id;
      row.innerHTML = `<button class="timeline-node ${item.shape || "circle"} ${item.size || "medium"} ${item.done ? "done" : ""}" style="--node-color:${item.color}" title="设置节点样式"></button><div class="timeline-text ${fontClass(note.font)}" role="textbox" data-placeholder="双击修改内容" style="font-size:${note.fontSize}px;font-weight:${note.fontWeight};color:${item.done ? "" : note.fontColor}">${item.textHtml || escapeHtml(item.text)}</div><button class="timeline-date-control" title="选择日期和时间">${icons.calendar}<span>${escapeHtml(formatTimelineTime(item.time))}</span></button>`;
      requireDoubleClickToEdit(row.querySelector(".timeline-text"));
      row.querySelector(".timeline-text").addEventListener("input", e => { item.text = e.currentTarget.innerText; item.textHtml = e.currentTarget.innerHTML; if (item.text.trim()) { note.userEdited = true; noteLayer.querySelector(`[data-id="${note.id}"] .template-fab`)?.remove(); } scheduleSave(); });
      row.querySelector(".timeline-date-control").addEventListener("click", e => {
        const [date, time] = toDateTimeLocal(item.time).split("T");
        showDateTimePicker(e.currentTarget, { title: "节点日期与时间", date, time, onSave: (nextDate, nextTime) => { item.time = `${nextDate} ${nextTime}`; delete state.reminderState.handled[`timeline:${note.id}:${item.id}`]; render(); } });
      });
      row.querySelector(".timeline-node").addEventListener("click", e => showNodeMenu(e.currentTarget, note, item));
      enableTimelineReorder(row, note, item);
      list.appendChild(row);
    });
    requestAnimationFrame(() => positionTimelineInserts(list));
    body.querySelector(".timeline-add").addEventListener("click", () => insertTimelineEvent(note, note.events.length));
  }

  function positionTimelineInserts(list) {
    const listRect = list.getBoundingClientRect();
    list.querySelectorAll(".timeline-insert").forEach(button => {
      const previous = list.querySelector(`[data-event-id="${button.dataset.previousEvent}"] .timeline-node`);
      const next = list.querySelector(`[data-event-id="${button.dataset.nextEvent}"] .timeline-node`);
      if (!previous || !next) return;
      const first = previous.getBoundingClientRect(), second = next.getBoundingClientRect();
      const midpoint = ((first.top + first.height / 2) + (second.top + second.height / 2)) / 2;
      button.style.top = `${midpoint - listRect.top - button.offsetHeight / 2}px`;
    });
  }

  function insertTimelineEvent(note, index) {
    const item = { id: uid(), text: "", time: nowText(), shape: "circle", size: "medium", color: NODE_COLORS[index % NODE_COLORS.length], done: false };
    note.events.splice(index, 0, item); render();
  }

  function enableTimelineReorder(row, note, item) {
    row.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest("button,select,[contenteditable='true'],input:not([readonly])")) return;
      const startX = event.clientX, startY = event.clientY, rect = row.getBoundingClientRect();
      const offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
      let ghost = null, targetRow = null, insertAfter = false;
      // Capture only after a drag actually starts, preserving double-click targets.
      const clearTarget = () => {
        targetRow?.classList.remove("timeline-drop-before", "timeline-drop-after");
        targetRow = null;
      };
      const move = pointer => {
        if (!ghost && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) < 5) return;
        if (!ghost) {
          row.setPointerCapture(event.pointerId);
          ghost = row.cloneNode(true); ghost.className = `${row.className} timeline-drag-ghost`;
          ghost.style.width = `${rect.width}px`; ghost.style.height = `${rect.height}px`;
          document.body.appendChild(ghost); row.classList.add("timeline-drag-source");
        }
        ghost.style.left = `${pointer.clientX - offsetX}px`; ghost.style.top = `${pointer.clientY - offsetY}px`;
        clearTarget();
        const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
        const noteElement = hit?.closest(".note");
        if (noteElement?.dataset.id !== note.id) return;
        let candidate = hit?.closest(".timeline-row");
        if (!candidate && hit?.closest(".timeline-list")) {
          const rows = [...hit.closest(".timeline-list").querySelectorAll(".timeline-row")].filter(entry => entry !== row);
          candidate = rows.reduce((nearest, entry) => {
            const entryRect = entry.getBoundingClientRect();
            const distance = Math.abs(pointer.clientY - (entryRect.top + entryRect.height / 2));
            return !nearest || distance < nearest.distance ? { entry, distance } : nearest;
          }, null)?.entry;
        }
        if (!candidate || candidate === row) return;
        targetRow = candidate;
        const candidateRect = candidate.getBoundingClientRect();
        insertAfter = pointer.clientY > candidateRect.top + candidateRect.height / 2;
        candidate.classList.add(insertAfter ? "timeline-drop-after" : "timeline-drop-before");
      };
      const up = () => {
        row.removeEventListener("pointermove", move); row.removeEventListener("pointerup", up); row.removeEventListener("pointercancel", up);
        if (!ghost) return;
        const targetId = targetRow?.dataset.eventId;
        clearTarget(); ghost.remove(); row.classList.remove("timeline-drag-source");
        if (!targetId || targetId === item.id) return;
        const from = note.events.findIndex(entry => entry.id === item.id);
        if (from < 0) return;
        const [moving] = note.events.splice(from, 1);
        const targetIndex = note.events.findIndex(entry => entry.id === targetId);
        note.events.splice(Math.max(0, targetIndex + (insertAfter ? 1 : 0)), 0, moving);
        render(); showToast("时间轴顺序已调整");
      };
      row.addEventListener("pointermove", move); row.addEventListener("pointerup", up); row.addEventListener("pointercancel", up);
    });
  }

  function bindNoteShell(el, note) {
    el.addEventListener("pointerdown", () => {
      focusedNoteId = note.id;
      document.querySelectorAll(".note.focused").forEach(n => n.classList.remove("focused"));
      el.classList.add("focused");
      note.z = ++zCounter; el.style.zIndex = 6500; if (noteWindowId) window.pindoNative.command("focus-note"); else save();
    });
    const titleEditor = el.querySelector(".note-title");
    requireDoubleClickToEdit(titleEditor);
    titleEditor.addEventListener("input", event => {
      const titleEl = event.currentTarget, chars = Array.from(titleEl.innerText.replaceAll("\n", ""));
      if (chars.length > 30) { titleEl.textContent = chars.slice(0, 30).join(""); placeCaretAtEnd(titleEl); showNearTip(titleEl, "标题最多30个字符"); }
      note.title = titleEl.innerText.trim(); note.titleHtml = titleEl.innerHTML; scheduleSave();
    });
    el.querySelector(".note-kind-mark")?.addEventListener("click", e => { e.stopPropagation(); showNoteIconMenu(e.currentTarget, note); });
    el.querySelector(".pushpin-button")?.addEventListener("click", e => {
      e.stopPropagation(); note.locked = !note.locked; syncAttachedStack(note.id); render();
      showToast(note.locked ? "图钉已插入，整组便签已固定" : "图钉已拔出，整组便签可以移动");
    });
    el.querySelector("[data-action=collapse]")?.addEventListener("click", e => { e.stopPropagation(); collapseNote(note); });
    el.querySelector("[data-action=sort-time]")?.addEventListener("click", e => { e.stopPropagation(); sortNoteByTime(note, e.currentTarget); });
    el.querySelector("[data-action=capture]")?.addEventListener("click", e => { e.stopPropagation(); captureForQuickNote(note, e.currentTarget); });
    el.querySelector("[data-action=template-switch]")?.addEventListener("click", e => { e.stopPropagation(); if (note.userEdited) { showNearTip(e.currentTarget, "需要空白内容才能切换模板"); return; } showTemplateMenu(e.currentTarget, note); });
    el.querySelector("[data-action=organizer-size]")?.addEventListener("click", e => {
      e.stopPropagation(); const sizes = ["small", "medium", "large"], next = sizes[(sizes.indexOf(note.organizerItemSize || "medium") + 1) % sizes.length];
      note.organizerItemSize = next; refreshOrganizer(note); showToast(`桌面项目大小：${({ small: "小", medium: "中", large: "大" })[next]}`);
    });
    el.querySelector("[data-action=organizer-edit]")?.addEventListener("click", e => {
      e.stopPropagation();
      if (organizerEditNotes.has(note.id)) organizerEditNotes.delete(note.id); else organizerEditNotes.add(note.id);
      refreshOrganizer(note); showToast(organizerEditNotes.has(note.id) ? "整理模式：拖动排序或点击×移除" : "已完成整理");
    });
    el.querySelector("[data-action=organizer-view]")?.addEventListener("click", e => { e.stopPropagation(); note.organizerView = note.organizerView === "list" ? "grid" : "list"; refreshOrganizer(note); showToast(note.organizerView === "list" ? "已切换为列表显示" : "已切换为图标显示"); });
    el.querySelector("[data-action=trash]").addEventListener("click", e => { e.stopPropagation(); if (noteWindowId) { window.pindoNative.command("trash"); } else if (confirm("删除这个便签？删除后可从回收站恢复。")) moveNoteToRecycleBin(note); });
    el.querySelector("[data-action=menu]")?.addEventListener("click", e => { e.stopPropagation(); showNoteMenu(e.currentTarget, note); });
    enableDrag(el, el.querySelector(".note-header"), note);
  }

  function sortNoteByTime(note, anchor) {
    if (note.type === "timeline") note.events.sort((a, b) => new Date(toDateTimeLocal(a.time)) - new Date(toDateTimeLocal(b.time)));
    if (note.type === "todo") note.todos.sort((a, b) => {
      const left = a.due ? `${a.due}T${a.dueTime || "23:59"}` : "9999-12-31T23:59";
      const right = b.due ? `${b.due}T${b.dueTime || "23:59"}` : "9999-12-31T23:59";
      return left.localeCompare(right);
    });
    render(); showNearTip(noteLayer.querySelector(`[data-id="${note.id}"] [data-action="sort-time"]`) || anchor, "已按时间排序");
  }

  async function captureForQuickNote(note, anchor) {
    if (noteWindowId) {
      try { const result = await window.pindoNative.command("capture");
        if (result?.dataUrl) showCapturePreview(note, result.dataUrl);
        else if (result?.error) showNearTip(anchor, result.error);
      } catch { showNearTip(anchor, "截图失败，请重试"); }
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) { showNearTip(anchor, "当前环境不支持截图"); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video"); video.srcObject = stream; video.muted = true; await video.play();
      await new Promise(resolve => video.readyState >= 2 ? resolve() : video.addEventListener("loadeddata", resolve, { once: true }));
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0); stream.getTracks().forEach(track => track.stop());
      showCapturePreview(note, canvas.toDataURL("image/png"));
    } catch (error) { showNearTip(anchor, error?.name === "NotAllowedError" ? "已取消截图" : "无法完成截图"); }
  }

  function showCapturePreview(note, dataUrl) {
    document.querySelector(".capture-preview")?.remove();
    const panel = document.createElement("section"); panel.className = "capture-preview";
    panel.innerHTML = `<img src="${dataUrl}" alt="截图预览"><div><button data-pin-capture>钉住图片</button><button data-ocr-capture>识别文字</button><button data-close-capture>关闭</button></div>`;
    document.body.appendChild(panel);
    panel.querySelector("[data-pin-capture]").addEventListener("click", () => { pinCapturedImage(dataUrl); panel.remove(); });
    panel.querySelector("[data-ocr-capture]").addEventListener("click", e => recognizeCapturedText(note, dataUrl, e.currentTarget, panel));
    panel.querySelector("[data-close-capture]").addEventListener("click", () => panel.remove());
  }

  function pinCapturedImage(dataUrl) {
    if (noteWindowId) { window.pindoNative.command("pin-capture", dataUrl); return; }
    pinnedCaptureData = dataUrl; document.querySelector(".pinned-capture")?.remove();
    const pinned = document.createElement("aside"); pinned.className = "pinned-capture"; pinned.innerHTML = `<img src="${dataUrl}" alt="已钉住截图"><span>右键关闭 · 免费版最多1张</span>`;
    document.body.appendChild(pinned); enableFloatingDrag(pinned);
    pinned.addEventListener("contextmenu", event => { event.preventDefault(); pinnedCaptureData = null; pinned.remove(); });
    showToast("图片已钉住并保持置顶");
  }

  async function recognizeCapturedText(note, dataUrl, anchor, panel) {
    try {
      if (noteWindowId) {
        anchor.disabled = true; anchor.textContent = "识别中…";
        const result = await window.pindoNative.command("ocr-capture", dataUrl);
        if (result?.error) { anchor.disabled = false; anchor.textContent = "识别文字"; showNearTip(anchor, result.error); return; }
        if (result?.text) {
          note=noteById(note.id);if(!note)return;
          note.content = [note.content?.trim(), result.text].filter(Boolean).join("\n\n");
          note.contentHtml = escapeHtml(note.content).replaceAll("\n", "<br>"); note.userEdited = true;
          panel.remove(); render();
        }
        return;
      }
      if (!("TextDetector" in window)) { showNearTip(anchor, "未识别到文字/图像像素过低"); return; }
      const image = new Image(); image.src = dataUrl; await image.decode(); const detector = new window.TextDetector();
      const blocks = await detector.detect(image), text = blocks.map(block => block.rawValue).filter(Boolean).join("\n").trim();
      if (!text) { showNearTip(anchor, "未识别到文字/图像像素过低"); return; }
      note.content = [note.content?.trim(), text].filter(Boolean).join("\n\n"); note.contentHtml = escapeHtml(note.content).replaceAll("\n", "<br>"); note.userEdited = true;
      panel.remove(); render(); showToast("识别文字已追加到随手记");
    } catch { showNearTip(anchor, "未识别到文字/图像像素过低"); }
  }

  function enableFloatingDrag(element) {
    element.addEventListener("pointerdown", event => {
      if (event.button !== 0) return; const rect = element.getBoundingClientRect(), startX = event.clientX, startY = event.clientY;
      element.setPointerCapture(event.pointerId); element.classList.add("is-moving");
      const move = e => { element.style.left = `${clamp(rect.left + e.clientX - startX, 0, innerWidth - element.offsetWidth)}px`; element.style.top = `${clamp(rect.top + e.clientY - startY, 0, innerHeight - element.offsetHeight)}px`; element.style.right = "auto"; };
      const up = () => { element.classList.remove("is-moving"); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", up); };
      element.addEventListener("pointermove", move); element.addEventListener("pointerup", up);
    });
  }

  // Keep renderer geometry local while the native window moves in screen space.
  function nativeGesture(event, handle, element, kind, onBounds, onEnd = () => {}, onMove = () => {}) {
    if (event.button !== 0 || !window.pindoWindow?.gesture("begin", kind)) return;
    if(!event.target.closest(".note-title"))event.preventDefault();
    element.classList.add(kind === "move" ? "is-dragging" : "is-resizing");
    let moved = false;
    let updateFrame = 0;
    const originX = event.screenX, originY = event.screenY;
    const move = e => {
      if (!moved && Math.hypot(e.screenX - originX, e.screenY - originY) < 4) return;
      if(!moved){handle.setPointerCapture(event.pointerId);window.getSelection()?.removeAllRanges();}
      moved = true;
      if (updateFrame) return;
      updateFrame = requestAnimationFrame(() => {
        updateFrame = 0;
        window.pindoWindow.gesture("update", kind);
        onMove();
      });
    };
    const end = e => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("lostpointercapture", end);
      if (updateFrame) { cancelAnimationFrame(updateFrame); updateFrame = 0; }
      const bounds = window.pindoWindow.gesture(moved && e.type === "pointerup" ? "end" : "cancel");
      if (bounds) onBounds(bounds);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      element.classList.remove("is-dragging", "is-resizing");
      onEnd(moved);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("lostpointercapture", end);
  }
  function applyNativeSnapshot(snapshot) {
    if (!snapshot?.note || snapshot.note.id !== noteWindowId) return;
    const existing = noteById(noteWindowId);
    const content = n => JSON.stringify(Object.fromEntries(Object.entries(n || {}).filter(([key]) => !["x","y","w","h","z","locked","mode","pinEnabled"].includes(key))));
    const contextChanged = JSON.stringify(nativeContext) !== JSON.stringify(snapshot.context || {});
    const shellChanged = existing && ["locked","mode","pinEnabled"].some(key => existing[key] !== snapshot.note[key]);
    const sameContent = existing && content(existing) === content(snapshot.note);
    noteWindowVersion = snapshot.version; nativeContext = snapshot.context || {};
    if (nativeContext.settings) { state.settings = nativeContext.settings; applyInterfaceSettings(); }
    if (sameContent) {
      ["x","y","w","h","z","locked","mode","pinEnabled"].forEach(key => existing[key] = snapshot.note[key]);
      if (contextChanged || shellChanged) render(false);
    } else { state.notes = [snapshot.note]; render(false); }
  }
  function refreshNativeNote() { if (noteWindowId) applyNativeSnapshot(window.pindoNote.readNote()); }

  function applyNativeNoteBounds(note, bounds) {
    Object.assign(note, { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height });
  }

  function enableDrag(el, handle, note) {
    handle.addEventListener("pointerdown", event => {
      if (event.target.closest("button,select,[contenteditable='true'],input:not([readonly])")) return;
      const wasAttached = Boolean(attachmentByChild(note.id));
      if (wasAttached) { detachAttachment(note.id); note.locked = false; el.classList.remove("is-attached-child", "is-locked"); }
      if (!wasAttached && note.pinEnabled && note.locked) { showNearTip(el.querySelector(".pushpin-button") || el, "先拔出图钉再移动"); return; }
      if (noteWindowId) {
        nativeGesture(event, handle, el, "move", bounds => applyNativeNoteBounds(note, bounds), () => refreshNativeNote());
        return;
      }
      const movingIds = attachedTreeIds(note.id), movingNotes = movingIds.map(noteById).filter(Boolean);
      event.preventDefault(); handle.setPointerCapture(event.pointerId); el.classList.add("is-dragging"); note.z = ++zCounter; el.style.zIndex = 10000 + note.z;
      movingNotes.forEach(item => { item.z = ++zCounter; noteLayer.querySelector(`[data-id="${item.id}"]`)?.classList.add("is-group-moving"); });
      const startX = event.clientX, startY = event.clientY, startLeft = note.x, startTop = note.y;
      const origins = new Map(movingNotes.map(item => [item.id, { x: item.x, y: item.y }]));
      let pendingSnap = null;
      const move = e => {
        clearSnapFeedback();
        let dx = e.clientX - startX, dy = e.clientY - startY;
        const minX = Math.min(...movingNotes.map(item => origins.get(item.id).x));
        const minY = Math.min(...movingNotes.map(item => origins.get(item.id).y));
        const maxX = Math.max(...movingNotes.map(item => origins.get(item.id).x + item.w));
        const maxY = Math.max(...movingNotes.map(item => origins.get(item.id).y + item.h));
        if (!noteWindowId) {
          dx = clamp(dx, -minX, desktop.clientWidth - maxX);
          dy = clamp(dy, 34 - minY, desktop.clientHeight - maxY);
        }
        const proposedX = startLeft + dx, proposedY = startTop + dy;
        pendingSnap = findVerticalSnap(note, proposedX, proposedY, new Set(movingIds));
        if (pendingSnap) {
          const snappedDx = dx + pendingSnap.x - proposedX, snappedDy = dy + pendingSnap.y - proposedY;
          const fitsDesktop = minX + snappedDx >= 0 && maxX + snappedDx <= desktop.clientWidth && minY + snappedDy >= 34 && maxY + snappedDy <= desktop.clientHeight;
          if (fitsDesktop) { dx = snappedDx; dy = snappedDy; } else pendingSnap = null;
        }
        movingNotes.forEach(item => {
          const origin = origins.get(item.id); item.x = origin.x + dx; item.y = origin.y + dy;
          const itemEl = noteLayer.querySelector(`[data-id="${item.id}"]`);
          if (itemEl) { itemEl.style.left = `${item.x}px`; itemEl.style.top = `${item.y}px`; itemEl.style.zIndex = 10000 + item.z; }
        });
        if (pendingSnap && !noteWindowId) showSnapFeedback(pendingSnap);
        if (noteWindowId) window.pindoNote?.setBounds({ x: note.x, y: note.y, width: note.w, height: note.h });
        const nearDock = !noteWindowId && note.type !== "organizer" && desktop.clientWidth - (note.x + el.offsetWidth) < 42;
        dockTarget.querySelector("span").textContent = "松开后收纳";
        el.classList.toggle("near-dock", nearDock); dockTarget.classList.toggle("active", nearDock);
      };
      const up = () => {
        const shouldDock = el.classList.contains("near-dock");
        el.classList.remove("is-dragging", "near-dock"); dockTarget.classList.remove("active"); clearSnapFeedback();
        movingNotes.forEach(item => {
          const itemEl = noteLayer.querySelector(`[data-id="${item.id}"]`);
          if (itemEl) { itemEl.classList.remove("is-group-moving"); itemEl.style.zIndex = item.id === focusedNoteId ? 6500 : item.mode === "top" ? 5000 + item.z : item.z; }
        });
        handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up);
        if (shouldDock) collapseNote(note, "已吸附并收纳到右侧");
        else if (pendingSnap && attachBelow(pendingSnap.parentId, pendingSnap.childId)) { render(); showToast("便签已上下吸附，下方便签将跟随上方便签"); }
        else { if (wasAttached) render(); else save(); }
      };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
    });
  }

  function findVerticalSnap(note, x, y, movingIds) {
    const threshold = 20, candidates = [];
    state.notes.filter(target => target.mode !== "bookmark" && !movingIds.has(target.id)).forEach(target => {
      const horizontalOverlap = Math.min(x + note.w, target.x + target.w) - Math.max(x, target.x);
      if (horizontalOverlap > 34) {
        if (!attachmentByChild(target.id) && !directChildId(note.id) && !attachedTreeIds(note.id).includes(target.id)) {
          candidates.push({ distance: Math.abs(y + note.h - target.y), x: target.x, y: target.y - note.h, target, parentId: note.id, childId: target.id, seamY: target.y });
        }
        if (!directChildId(target.id) && !attachedTreeIds(note.id).includes(target.id)) {
          candidates.push({ distance: Math.abs(y - target.y - target.h), x: target.x, y: target.y + target.h, target, parentId: target.id, childId: note.id, seamY: target.y + target.h });
        }
      }
    });
    return candidates.filter(item => item.distance <= threshold).sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function showSnapFeedback(snap) {
    noteLayer.querySelector(`[data-id="${snap.target.id}"]`)?.classList.add("snap-target");
    const parent = noteById(snap.parentId), guide = document.createElement("div"); guide.className = "note-snap-guide horizontal";
    const inset = Math.max(24, Math.min(48, (parent?.w || snap.target.w) * .1));
    guide.style.cssText = `left:${(parent?.x ?? snap.x) + inset}px;top:${snap.seamY - 1}px;width:${Math.max(80, (parent?.w || snap.target.w) - inset * 2)}px`;
    noteLayer.appendChild(guide);
  }

  function clearSnapFeedback() {
    noteLayer.querySelectorAll(".note-snap-guide").forEach(item => item.remove());
    noteLayer.querySelectorAll(".note.snap-target").forEach(item => item.classList.remove("snap-target"));
  }

  function enableResize(el, note) {
    const handle = el.querySelector(".resize-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", event => {
      event.stopPropagation();
      if (note.locked) { showNearTip(el.querySelector(".pushpin-button"), "先拔出图钉再缩放"); return; }
      if (noteWindowId) {
        nativeGesture(event, handle, el, "resize", bounds => applyNativeNoteBounds(note, bounds), () => refreshNativeNote());
        return;
      }
      event.preventDefault(); handle.setPointerCapture(event.pointerId); el.classList.add("is-resizing"); note.z = ++zCounter; el.style.zIndex = 10000 + note.z;
      const startX = event.clientX, startY = event.clientY, startW = note.w, startH = note.h;
      const move = e => {
        let nextW = clamp(startW + e.clientX - startX, 280, desktop.clientWidth - note.x);
        const attachedIds = new Set(attachedTreeIds(note.id)), stackCount = attachedIds.size;
        let nextH = clamp(startH + e.clientY - startY, 210, Math.max(210, Math.floor((desktop.clientHeight - note.y) / stackCount)));
        const visibleOthers = state.notes.filter(item => !attachedIds.has(item.id) && item.mode !== "bookmark");
        const widthMatch = visibleOthers.map(item => ({ item, gap: Math.abs(item.w - nextW) })).filter(match => match.gap <= 12).sort((a, b) => a.gap - b.gap)[0];
        clearSizeMatchFeedback();
        if (widthMatch) { nextW = widthMatch.item.w; showSizeMatchFeedback(widthMatch.item, "width", "等宽"); }
        note.w = nextW; note.h = nextH;
        el.style.width = `${note.w}px`; el.style.height = `${note.h}px`;
        if (noteWindowId) window.pindoNote?.setBounds({ x: note.x, y: note.y, width: note.w, height: note.h });
        syncAttachedStack(note.id);
      };
      const up = () => { el.classList.remove("is-resizing"); clearSizeMatchFeedback(); handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); save(); };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
    });
  }

  function showSizeMatchFeedback(target, axis, label) {
    noteLayer.querySelector(`[data-id="${target.id}"]`)?.classList.add(`size-match-${axis}`);
    const existing = [...noteLayer.querySelectorAll(".size-match-badge")].find(item => item.dataset.matchId === target.id);
    if (existing) { existing.textContent = "等宽高"; return; }
    const badge = document.createElement("div"); badge.className = "size-match-badge"; badge.textContent = label;
    badge.dataset.matchId = target.id;
    badge.style.left = `${target.x + target.w / 2 - 22}px`; badge.style.top = `${target.y + target.h / 2 - 13}px`; noteLayer.appendChild(badge);
  }
  function clearSizeMatchFeedback() {
    noteLayer.querySelectorAll(".size-match-badge").forEach(item => item.remove());
    noteLayer.querySelectorAll(".size-match-width,.size-match-height").forEach(item => item.classList.remove("size-match-width", "size-match-height"));
  }

  function moveNoteToRecycleBin(note) {
    state.reminderState.activeItems = state.reminderState.activeItems.filter(active => {
      if (active.noteId !== note.id) return true;
      state.reminderState.handled[active.key] = true; return false;
    });
    const snapshot = structuredClone(note); snapshot.deletedAt = nowText();
    removeAttachmentsFor(note.id);
    state.recycleBin.unshift(snapshot); state.notes = state.notes.filter(item => item.id !== note.id);
    render(); showToast(`“${note.title || "未命名便签"}”已移入回收站`);
  }

  function collapseNote(note, message = "已收纳到桌面边缘") {
    removeAttachmentsFor(note.id);
    note.previousMode = note.mode;
    note.restoreSize = { w: note.w, h: note.h };
    note.mode = "bookmark";
    render(); showToast(message);
  }

  function showNoteMenu(anchor, note) {
    const attached = Boolean(attachmentByChild(note.id)), controlNote = attached ? attachmentRoot(note.id) : note;
    showMiniPopover(anchor, `
      <div class="popover-label">显示层级</div>
      <div class="mode-segmented"><button data-mode="desktop" class="${controlNote.mode === "desktop" ? "selected" : ""}" ${attached ? "disabled" : ""}>贴在桌面</button><button data-mode="top" class="${controlNote.mode === "top" ? "selected" : ""}" ${attached ? "disabled" : ""}>始终置顶</button></div>
      <div class="popover-label">Pin选项</div>
      <div class="mode-segmented pin-segmented"><button data-pin-enabled="true" class="${controlNote.pinEnabled ? "selected" : ""}" ${attached ? "disabled" : ""}>开启</button><button data-pin-enabled="false" class="${!controlNote.pinEnabled ? "selected" : ""}" ${attached ? "disabled" : ""}>关闭</button></div>
      ${attached ? '<div class="attached-menu-hint">显示层级和Pin状态跟随最上方便签</div>' : ''}
      ${note.type !== "quick" ? `<button data-template="default" ${note.userEdited ? "disabled" : ""} title="${note.userEdited ? "需要空白内容才能切换模板" : "选择模板"}">切换模板 <span>›</span></button>` : ""}
      ${note.type === "quick" ? `<button data-paper>${note.ruled ? "切换为空白纸" : "切换为横线纸"}</button>` : ""}
      <button data-note-color>更换便签颜色 <span>›</span></button>
      <button data-duplicate>复制便签 <span>⌘</span></button>
      <button data-reset>恢复默认尺寸</button>
      <button class="danger" data-delete>删除便签</button>`, pop => {
      pop.addEventListener("click", e => {
        const templateButton = e.target.closest("[data-template]");
        if (templateButton) { pop.remove(); showTemplateMenu(anchor, note); return; }
        const modeButton = e.target.closest("[data-mode]");
        if (modeButton && !modeButton.disabled) { note.mode = modeButton.dataset.mode; syncAttachedStack(note.id); pop.remove(); render(); showToast(note.mode === "top" ? "已设为始终置顶" : "已贴在桌面"); return; }
        const pinButton = e.target.closest("[data-pin-enabled]");
        if (pinButton && !pinButton.disabled) { note.pinEnabled = pinButton.dataset.pinEnabled === "true"; if (!note.pinEnabled) note.locked = false; pop.remove(); render(); showToast(note.pinEnabled ? "Pin功能已开启" : "Pin功能已关闭，便签仍可移动和缩放"); return; }
        if (e.target.closest("[data-paper]")) { note.ruled = !note.ruled; pop.remove(); render(); return; }
        if (e.target.closest("[data-note-color]")) { pop.remove(); showPalette(anchor, note); return; }
        if (e.target.closest("[data-duplicate]")) { state.notes.push({...structuredClone(note), id: uid(), z: ++zCounter, x: note.x + 24, y: note.y + 24, title: `${note.title} 副本`}); render(); }
        if (e.target.closest("[data-reset]")) { const metrics = defaultNoteMetrics(note.type); note.w = metrics.w; note.h = metrics.h; syncAttachedStack(note.id); render(); }
        if (e.target.closest("[data-delete]")) { pop.remove(); moveNoteToRecycleBin(note); return; }
        pop.remove();
      });
    });
  }

  function showPalette(anchor, note) {
    showMiniPopover(anchor, `<div class="palette">${COLORS.map(c => `<button style="background:${c}" data-color="${c}" title="${c}"></button>`).join("")}</div>`, pop => {
      pop.addEventListener("click", e => { if (e.target.dataset.color) { note.color = e.target.dataset.color; pop.remove(); render(); } });
    });
  }

  function showNoteIconMenu(anchor, note) {
    showMiniPopover(anchor, `<div class="popover-label">图标</div><div class="note-icon-options">${Object.keys(NOTE_ICONS).map(key => `<button data-note-icon="${key}" title="${key}">${NOTE_ICONS[key]}</button>`).join("")}</div><div class="popover-label">颜色</div><div class="palette icon-palette">${NOTE_ICON_COLORS.map(color => `<button style="background:${color}" data-icon-color="${color}" title="${color}"></button>`).join("")}</div>`, pop => {
      pop.addEventListener("click", e => {
        const button = e.target.closest("button"); if (!button) return;
        if (button.dataset.noteIcon) note.icon = button.dataset.noteIcon;
        if (button.dataset.iconColor) note.iconColor = button.dataset.iconColor;
        pop.remove(); render();
      });
    });
  }

  function showTextPalette(anchor, note) {
    const textColors = ["#2b2c30", "#8d3b32", "#815c16", "#316c48", "#315f92", "#6e4b8e"];
    showMiniPopover(anchor, `<div class="palette">${textColors.map(c => `<button style="background:${c}" data-text-color="${c}" title="${c}"></button>`).join("")}</div>`, pop => {
      pop.addEventListener("click", e => { if (e.target.dataset.textColor) { note.fontColor = e.target.dataset.textColor; pop.remove(); render(); } });
    });
  }

  function showTemplateMenu(anchor, note) {
    if (note.type === "quick") return;
    if (note.userEdited) { showNearTip(anchor, "需要空白内容才能切换模板"); return; }
    const options = note.type === "todo"
      ? '<button data-note-template="basic">普通代办</button><button data-note-template="matrix">紧急重要四象限</button>'
      : '<button data-note-template="blank">空白时间轴</button><button data-note-template="project">项目进度</button><button data-note-template="events">事件记录</button>';
    showMiniPopover(anchor, `<div class="popover-label">选择模板</div>${options}`, pop => {
      pop.addEventListener("click", e => {
        const button = e.target.closest("[data-note-template]"); if (!button) return;
        applyTemplate(note, button.dataset.noteTemplate); pop.remove(); render(); showToast("模板已应用");
      });
    });
  }

  function applyTemplate(note, template) {
    if (note.userEdited || note.type === "quick") return;
    note.template = template;
    if (note.type === "todo") { note.todoLayout = template === "matrix" ? "matrix" : "basic"; note.todos = []; }
    if (note.type === "timeline" && template !== "blank") {
      const labels = template === "project" ? ["项目启动", "中期检查", "最终交付"] : ["事件开始", "关键变化", "当前状态"];
      note.events = labels.map((text, index) => ({ id: uid(), text, time: nowText(), shape: index === 1 ? "ring" : "circle", size: index === 0 ? "large" : "medium", color: NODE_COLORS[index], done: false }));
    }
    if (note.type === "timeline" && template === "blank") note.events = [];
  }

  function calendarGridHtml(selectedValue, viewValue = selectedValue, futureOnly = false) {
    const selected = new Date(`${selectedValue || dateOffset(0)}T12:00:00`);
    const view = new Date(`${viewValue || selectedValue || dateOffset(0)}T12:00:00`);
    const year = view.getFullYear(), month = view.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstWeekday }, () => '<span class="calendar-empty"></span>');
    for (let day = 1; day <= dayCount; day += 1) {
      const value = localDateString(new Date(year, month, day));
      cells.push(`<button class="calendar-day ${value === localDateString(selected) ? "selected" : ""} ${value === dateOffset(0) ? "today" : ""}" ${futureOnly && value < dateOffset(0) ? "disabled" : ""} data-calendar-date="${value}">${day}</button>`);
    }
    const years = Array.from({ length: 21 }, (_, index) => year - 10 + index);
    return `<section class="calendar-panel"><header><button data-calendar-step="-1" aria-label="上个月">‹</button><button class="calendar-title" data-toggle-month-year>${year}年 ${month + 1}月</button><button data-calendar-step="1" aria-label="下个月">›</button></header><div class="month-year-panel" hidden><select data-calendar-year>${years.map(value => `<option value="${value}" ${value === year ? "selected" : ""}>${value}年</option>`).join("")}</select><select data-calendar-month>${Array.from({ length: 12 }, (_, index) => `<option value="${index}" ${index === month ? "selected" : ""}>${index + 1}月</option>`).join("")}</select><button data-apply-month-year>查看</button></div><div class="calendar-week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="calendar-days">${cells.join("")}</div></section>`;
  }

  function timeWheelHtml() {
    const column = (part, label) => `<div class="ios-wheel-column" data-time-part="${part}" tabindex="0" aria-label="${label}"><button data-time-step="-1" data-time-part="${part}" aria-label="向上调整${label}">⌃</button><div class="ios-wheel-values"><span data-wheel-prev>00</span><strong data-wheel-current>00</strong><span data-wheel-next>01</span></div><button data-time-step="1" data-time-part="${part}" aria-label="向下调整${label}">⌄</button></div>`;
    return `<div class="time-wheel" hidden><header><strong>选择时间</strong><button data-close-time aria-label="关闭">×</button></header><div class="ios-time-picker">${column("hour", "小时")}<b>:</b>${column("minute", "分钟")}</div><small class="time-wheel-hint">滚轮或上下箭头调整</small></div>`;
  }

  function showDateTimePicker(anchor, options) {
    let selectedDate = options.date || dateOffset(0), selectedTime = options.time || "18:00", viewDate = selectedDate, selectedPreset = "custom";
    let [selectedHour, selectedMinute] = selectedTime.split(":").map(Number);
    if (!Number.isFinite(selectedHour)) selectedHour = 18;
    if (!Number.isFinite(selectedMinute)) selectedMinute = 0;
    selectedHour = clamp(selectedHour, 0, 24); selectedMinute = clamp(selectedMinute, 0, 59);
    const validTime=(h,m)=>!options.futureOnly||PinDoDates.allowed(selectedDate,h,m);
    const ensureFuture=()=>{if(!validTime(selectedHour,selectedMinute)){const next=PinDoDates.nextMinute();selectedDate=next.date;selectedHour=next.hour;selectedMinute=next.minute;}};
    ensureFuture();viewDate=selectedDate;
    const shortcuts = options.shortcuts ? `<div class="date-shortcuts"><button data-date="${dateOffset(0)}" data-preset="today">今天</button><button data-date="${dateOffset(1)}" data-preset="tomorrow">明天</button><button data-date="${endOfWeekDate()}" data-preset="thisWeek">本周</button><button data-date="${endOfWeekDate(1)}" data-preset="nextWeek">下周</button><button data-date="${dateMonthOffset(1)}" data-preset="nextMonth">下个月</button></div>` : "";
    const colorPicker = options.color ? `<div class="deadline-colors">${Object.entries(DEADLINE_COLORS).map(([key, value]) => `<button class="deadline-color ${key === options.color ? "selected" : ""}" style="--deadline-color:${value}" data-deadline-color="${key}" title="${key}"></button>`).join("")}</div>` : "";
    showMiniPopover(anchor, `<div class="deadline-popover-head"><div><small>计划安排</small><strong>${escapeHtml(options.title || "选择日期与时间")}</strong></div>${colorPicker}</div>${shortcuts}<div class="calendar-slot">${calendarGridHtml(selectedDate, viewDate, options.futureOnly)}</div><div class="datetime-editor"><button class="time-picker-row" data-toggle-time><span class="picker-icon">${icons.clock}</span><span><small>时间</small><strong data-time-preview>${selectedTime}</strong></span><b>›</b></button>${timeWheelHtml()}<button data-save-datetime>确定</button></div>`, pop => {
      pop.classList.add("deadline-picker-popover");
      const renderCalendar = () => { pop.querySelector(".calendar-slot").innerHTML = calendarGridHtml(selectedDate, viewDate, options.futureOnly); };
      const timeLimit = part => part === "hour" ? 25 : 60;
      const formatTimeValue = value => String(value).padStart(2, "0");
      const renderTimeWheels = () => {
        selectedTime = `${formatTimeValue(selectedHour)}:${formatTimeValue(selectedMinute)}`;
        pop.querySelector("[data-time-preview]").textContent = selectedTime;
        pop.querySelectorAll(".ios-wheel-column").forEach(column => {
          const part = column.dataset.timePart, limit = timeLimit(part), value = part === "hour" ? selectedHour : selectedMinute;
          column.querySelector("[data-wheel-prev]").textContent = formatTimeValue((value - 1 + limit) % limit);
          column.querySelector("[data-wheel-current]").textContent = formatTimeValue(value);
          column.querySelector("[data-wheel-next]").textContent = formatTimeValue((value + 1) % limit);
          for(const delta of [-1,1]){const next=(value+delta+limit)%limit,allowed=validTime(part==="hour"?next:selectedHour,part==="minute"?next:selectedMinute);
            column.querySelector(`[data-time-step="${delta}"]`).disabled=!allowed;
            column.querySelector(delta<0?"[data-wheel-prev]":"[data-wheel-next]").classList.toggle("unavailable",!allowed);
          }
          pop.querySelector("[data-save-datetime]").disabled=!validTime(selectedHour,selectedMinute);
        });
      };
      const adjustTime = (part, delta) => {
        const limit = timeLimit(part);
        const h=part==="hour"?(selectedHour+delta+limit)%limit:selectedHour;
        const m=part==="minute"?(selectedMinute+delta+limit)%limit:selectedMinute;
        if(!validTime(h,m))return;
        selectedHour=h;selectedMinute=m;
        renderTimeWheels();
      };
      renderTimeWheels();
      pop.querySelectorAll(".ios-wheel-column").forEach(column => {
        column.addEventListener("wheel", event => { event.preventDefault(); adjustTime(column.dataset.timePart, event.deltaY > 0 ? 1 : -1); }, { passive: false });
        column.addEventListener("keydown", event => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); adjustTime(column.dataset.timePart, event.key === "ArrowDown" ? 1 : -1); }
        });
      });
      pop.addEventListener("click", e => {
        const button = e.target.closest("button"); if (!button) return;
        if (button.dataset.deadlineColor) {
          options.onColor?.(button.dataset.deadlineColor);
          pop.querySelectorAll(".deadline-color").forEach(item => item.classList.toggle("selected", item === button));
          return;
        }
        if (button.dataset.calendarDate) {
          selectedDate = button.dataset.calendarDate; selectedPreset = "custom"; ensureFuture(); renderCalendar(); renderTimeWheels(); return;
        }
        if (button.dataset.calendarStep) { const next = new Date(`${viewDate}T12:00:00`); next.setMonth(next.getMonth() + Number(button.dataset.calendarStep)); viewDate = localDateString(next); renderCalendar(); return; }
        if (button.dataset.toggleMonthYear !== undefined) { const panel = pop.querySelector(".month-year-panel"); panel.hidden = !panel.hidden; return; }
        if (button.dataset.applyMonthYear !== undefined) { const year = Number(pop.querySelector("[data-calendar-year]").value), month = Number(pop.querySelector("[data-calendar-month]").value); viewDate = localDateString(new Date(year, month, 1)); renderCalendar(); return; }
        const date = button.dataset.date;
        if (date) { selectedDate = date; viewDate = date; selectedPreset = button.dataset.preset; ensureFuture(); renderCalendar(); renderTimeWheels(); return; }
        if (button.dataset.toggleTime !== undefined) { const wheel = pop.querySelector(".time-wheel"); wheel.hidden = !wheel.hidden; if (!wheel.hidden) wheel.querySelector(".ios-wheel-column")?.focus(); return; }
        if (button.dataset.closeTime !== undefined) { pop.querySelector(".time-wheel").hidden = true; return; }
        if (button.dataset.timeStep) { adjustTime(button.dataset.timePart, Number(button.dataset.timeStep)); return; }
        if (button.dataset.saveDatetime !== undefined) {
          if(!validTime(selectedHour,selectedMinute)){showNearTip(button,"请选择晚于当前的时间");renderTimeWheels();return;}
          if (selectedHour === 24) {
            const next = new Date(`${selectedDate}T12:00:00`); next.setDate(next.getDate() + 1);
            selectedDate = localDateString(next); selectedHour = 0; selectedTime = `00:${formatTimeValue(selectedMinute)}`;
          }
          options.onSave(selectedDate, selectedTime, selectedPreset); pop.remove();
        }
      });
    });
  }

  function showDateMenu(anchor, note, todo) {
    showDateTimePicker(anchor, { title: "选择截止日期", futureOnly: true, date: todo.due || dateOffset(0), time: todo.dueTime || "18:00", color: todo.deadlineColor || "red", shortcuts: true,
      onColor: color => { todo.deadlineColor = color; anchor.style.setProperty("--deadline-color", DEADLINE_COLORS[color]); save(); },
      onSave: (date, time, preset) => { todo.due = date; todo.dueTime = time; todo.datePreset = preset; render(); }
    });
  }

  function showReminderMenu(anchor, note, todo) {
    if (!todo.text?.trim()) { showNearTip(anchor, "请先输入待办内容"); return; }
    if (!todo.due || !todo.dueTime) { showNearTip(anchor, "请先设置截止时间"); return; }
    showMiniPopover(anchor, `<button data-reminder="same">当天提醒 ${todo.reminder === "same" ? "✓" : ""}</button><button data-reminder="before1">到期前一天 ${todo.reminder === "before1" ? "✓" : ""}</button><button data-reminder="before3">到期前三天 ${todo.reminder === "before3" ? "✓" : ""}</button>${todo.reminder ? '<button class="danger" data-reminder="">关闭提醒</button>' : ""}`, pop => {
      pop.addEventListener("click", e => { const button = e.target.closest("[data-reminder]"); if (!button) return; todo.reminder = button.dataset.reminder; pop.remove(); render(); showToast(todo.reminder ? reminderLabel(todo.reminder) : "提醒已关闭"); });
    });
  }

  function showTagMenu(anchor, note, todo) {
    showMiniPopover(anchor, `
      ${note.todoLayout !== "matrix" ? `<section class="tag-group urgency-group"><div class="popover-label">紧急程度</div>
      <div class="tag-options"><button class="urgency-high ${todo.urgency === "紧急" ? "selected" : ""}" data-urgency="紧急">紧急</button><button class="urgency-normal ${todo.urgency === "一般" ? "selected" : ""}" data-urgency="一般">一般</button><button class="urgency-low ${todo.urgency === "不紧急" ? "selected" : ""}" data-urgency="不紧急">不紧急</button></div></section>
      <section class="tag-group importance-group"><div class="popover-label">重要程度</div>
      <div class="tag-options"><button class="importance-high ${todo.importance === "重要" ? "selected" : ""}" data-importance="重要">重要</button><button class="importance-low ${todo.importance === "不重要" ? "selected" : ""}" data-importance="不重要">不重要</button></div></section>
      <section class="tag-group type-group"><div class="popover-label"><span>类型标签</span>${todo.typeTag ? '<button data-clear-type>取消选择</button>' : ''}</div><div class="tag-options type-options">${TYPE_TAGS.map((type, index) => `<button class="${todo.typeTag === type ? "selected" : ""}" data-type-tag="${type}" style="--option-color:${todo.typeTag === type ? todo.typeTagColor : NOTE_ICON_COLORS[[1,3,0][index]]}">${type}</button>`).join("")}</div><div class="preset-colors type-colors">${NOTE_ICON_COLORS.map(color => `<button class="${todo.typeTagColor === color ? "selected" : ""}" style="--preset-color:${color}" data-type-color="${color}" title="${color}"></button>`).join("")}</div></section>` : ""}
      <section class="tag-group custom-group"><div class="popover-label">自定义标签</div>
      <div class="tag-editor"><input value="${attr(todo.customTag || "")}" placeholder="输入标签"><button data-save-tag>保存</button></div><div class="preset-colors custom-colors">${NOTE_ICON_COLORS.map(color => `<button class="${todo.tagColor === color ? "selected" : ""}" style="--preset-color:${color}" data-custom-color="${color}" title="${color}"></button>`).join("")}</div></section>`, pop => {
      pop.classList.add("tag-picker-popover");
      pop.addEventListener("click", e => {
        const button = e.target.closest("button"); if (!button) return;
        if (button.dataset.urgency) todo.urgency = button.dataset.urgency;
        if (button.dataset.importance) todo.importance = button.dataset.importance;
        if (button.dataset.typeTag) {
          const defaults = { "个人": NOTE_ICON_COLORS[1], "工作": NOTE_ICON_COLORS[3], "纪念日": NOTE_ICON_COLORS[0] };
          if (todo.typeTag !== button.dataset.typeTag) todo.typeTagColor = defaults[button.dataset.typeTag];
          todo.typeTag = button.dataset.typeTag; pop.remove(); render(); showToast(`已添加“${todo.typeTag}”标签`); return;
        }
        if (button.dataset.typeColor) { todo.typeTagColor = button.dataset.typeColor; pop.remove(); render(); showToast("类型标签颜色已更新"); return; }
        if (button.dataset.customColor) { todo.tagColor = button.dataset.customColor; pop.querySelectorAll("[data-custom-color]").forEach(option => option.classList.toggle("selected", option === button)); save(); return; }
        if (button.dataset.clearType !== undefined) { todo.typeTag = ""; pop.remove(); render(); return; }
        if (button.dataset.saveTag !== undefined) todo.customTag = pop.querySelector(".tag-editor input").value.trim();
        if (button.dataset.urgency || button.dataset.importance || button.dataset.saveTag !== undefined) { pop.remove(); render(); }
      });
    });
  }

  function showNodeMenu(anchor, note, item) {
    showMiniPopover(anchor, `<div class="node-complete-row"><button data-done class="node-done-option"><span class="check-preview">✓</span>${item.done ? "取消完成" : "标记完成"}</button></div><div class="popover-label">形状</div><div class="node-options"><button data-shape="circle" title="实心圆"><i class="node-preview circle"></i></button><button data-shape="ring" title="圆环"><i class="node-preview ring"></i></button><button data-shape="square" title="方形"><i class="node-preview square"></i></button></div><div class="popover-label">大小</div><div class="node-options size-options"><button data-size="small" title="小"><i class="size-preview small"></i></button><button data-size="medium" title="中"><i class="size-preview medium"></i></button><button data-size="large" title="大"><i class="size-preview large"></i></button></div><div class="palette">${NODE_COLORS.map(c => `<button style="background:${c}" data-node-color="${c}"></button>`).join("")}</div>`, pop => {
      pop.addEventListener("click", e => {
        const target = e.target.closest("button"); if (!target) return;
        if (target.dataset.done !== undefined) {
          item.done = !item.done;
          if (item.done) playDodoAnimation("celebrate", { priority: 7, interruptible: false });
        }
        if (target.dataset.shape) item.shape = target.dataset.shape;
        if (target.dataset.size) item.size = target.dataset.size;
        if (target.dataset.nodeColor) item.color = target.dataset.nodeColor;
        pop.remove(); render();
      });
    });
  }

  function dismissTransientUI() {
    document.querySelectorAll(".mini-popover,.near-tip").forEach(el=>el.remove());
    textToolbar.hidden=true; activeTextRange=null;
    assistantPanel.hidden=true; closeSettings(); focusedNoteId=null;
    document.querySelectorAll(".note.focused").forEach(el=>el.classList.remove("focused"));
    window.getSelection()?.removeAllRanges();
  }
  window.addEventListener("blur",dismissTransientUI);
  window.pindoNative?.on("window-blur",dismissTransientUI);
  document.addEventListener("pointerdown",event=>{
    if(controlWindow && event.target.closest(".mascot-button,.assistant-panel,.dodo-nudge,.settings-dialog"))window.pindoNative.command("focus-control");
    if(!event.target.closest(".mascot-button,.assistant-panel,.dodo-nudge"))assistantPanel.hidden=true;
    if(!event.target.closest(".note,.text-toolbar,.mini-popover")){textToolbar.hidden=true;activeTextRange=null;}
  });
  function showMiniPopover(anchor, content, binder) {
    document.querySelectorAll(".mini-popover").forEach(el => el.remove());
    const pop = document.createElement("div"); pop.className = "mini-popover"; pop.innerHTML = content; document.body.appendChild(pop);
    binder(pop);
    const rect = anchor.getBoundingClientRect();
    const position=()=>{
      pop.style.maxWidth=`${Math.max(100,innerWidth-20)}px`;pop.style.maxHeight=`${Math.max(100,innerHeight-20)}px`;pop.style.overflowY="auto";pop.style.boxSizing="border-box";
      pop.style.left=`${Math.max(10,Math.min(rect.left,innerWidth-pop.offsetWidth-10))}px`;
      pop.style.top=`${Math.max(10,Math.min(rect.bottom+5,innerHeight-pop.offsetHeight-10))}px`;
    };position();
    const observer=new ResizeObserver(()=>{if(pop.isConnected)position();else observer.disconnect();});observer.observe(pop);
    const cleanup=new MutationObserver(()=>{if(!pop.isConnected){observer.disconnect();cleanup.disconnect();}});cleanup.observe(document.body,{childList:true});
    const outside=e=>{if(!pop.isConnected||(!pop.contains(e.target)&&!anchor.contains(e.target))){pop.remove();document.removeEventListener("pointerdown",outside);}};
    const removed=new MutationObserver(()=>{if(!pop.isConnected){document.removeEventListener("pointerdown",outside);removed.disconnect();}});removed.observe(document.body,{childList:true});
    setTimeout(()=>{if(pop.isConnected)document.addEventListener("pointerdown",outside);},0);
  }

  function createNote(type) {
    const count = state.notes.length;
    const metrics = defaultNoteMetrics(type);
    const base = { id: uid(), type, title: typeLabel(type), icon: "dot", iconColor: NOTE_ICON_COLORS[count % NOTE_ICON_COLORS.length], z: ++zCounter, x: 90 + (count * 44) % 520, y: 65 + (count * 34) % 260, w: metrics.w, h: metrics.h, color: COLORS[count % COLORS.length], mode: "desktop", locked: false, pinEnabled: true, userEdited: false, font: "nunito", fontSize: metrics.fontSize, fontWeight: 400, fontColor: "#2b2c30" };
    if (type === "quick") Object.assign(base, { ruled: false, content: "" });
    if (type === "todo") Object.assign(base, { todos: [], history: [], todoLayout: "basic" });
    if (type === "timeline") Object.assign(base, { events: [] });
    if (type === "organizer") Object.assign(base, { title: "桌面整理", desktopItems: [], organizerItemSize: "medium", organizerView: "grid", color: "#f3f5f8", locked: false, pinEnabled: false });
    const mascotRect = assistantMascot.getBoundingClientRect();
    pendingNoteEntrance = { id: base.id, x: mascotRect.left + mascotRect.width / 2, y: mascotRect.top + mascotRect.height / 2 };
    state.notes.push(base); assistantPanel.hidden = true; render();
  }

  function defaultNoteMetrics(type) {
    const scale = clamp(Math.min(desktop.clientWidth / 1920, desktop.clientHeight / 1080), .84, 1.18);
    const width = type === "todo" ? 520 : type === "timeline" ? 440 : type === "organizer" ? 500 : 430;
    const height = type === "todo" ? 470 : type === "timeline" ? 445 : type === "organizer" ? 360 : 400;
    return { w: Math.round(width * scale), h: Math.round(height * scale), fontSize: Math.round((type === "quick" ? 18 : 17) * clamp(scale, .94, 1.12)) };
  }

  function deadlineChip(todo) {
    const color = DEADLINE_COLORS[todo.deadlineColor || "red"];
    if (!todo.due) return `<button class="deadline-chip empty icon-only" style="--deadline-color:${color}" title="设置截止日期和时间" aria-label="设置截止日期和时间">${icons.calendar}</button>`;
    const bucket = relativeDateBucket(todo.due, todo.datePreset);
    const showTime = bucket === "今天" || bucket === "明天";
    return `<button class="deadline-chip" style="--deadline-color:${color}" title="点击修改截止日期和时间"><span>${escapeHtml(bucket)}</span>${showTime ? `<b>${escapeHtml(todo.dueTime || "18:00")}</b>` : ""}</button>`;
  }
  function relativeDateBucket(date, preset) {
    const today = dateOffset(0), tomorrow = dateOffset(1);
    if (date < today) return "已逾期";
    if (date === today) return "今天";
    if (date === tomorrow) return "明天";
    if (preset === "thisWeek") return "本周";
    if (preset === "nextWeek") return "下周";
    if (preset === "nextMonth") return "下个月";
    const currentWeekEnd = endOfWeekDate(), nextWeekEnd = endOfWeekDate(1);
    if (date <= currentWeekEnd) return "本周";
    if (date <= nextWeekEnd) return "下周";
    const d = new Date(`${date}T00:00:00`), now = new Date();
    const nextMonthIndex = (now.getMonth() + 1) % 12, nextMonthYear = now.getFullYear() + (now.getMonth() === 11 ? 1 : 0);
    if (d.getFullYear() === nextMonthYear && d.getMonth() === nextMonthIndex) return "下个月";
    return date;
  }
  function reminderLabel(value) { return ({ same: "截止当天提醒", before1: "将在截止前一天提醒", before3: "将在截止前三天提醒" })[value] || "设置提醒"; }
  function typeLabel(type) { return ({ quick: "随手记", todo: "待办便签", timeline: "时间轴", organizer: "桌面整理" })[type]; }
  function typeSymbol(type) { return ({ quick: "✎", todo: "✓", timeline: "⋮", organizer: "▦" })[type]; }
  function noteIcon(name) { return NOTE_ICONS[name] || NOTE_ICONS.dot; }
  function shortTitle(value) { const chars = Array.from(value || ""); return chars.length > 7 ? `${chars.slice(0, 7).join("")}…` : chars.join(""); }
  function truncateText(value, limit) { const chars = Array.from(String(value || "").replace(/\s+/g, " ").trim()); return chars.length > limit ? `${chars.slice(0, limit).join("")}...` : chars.join(""); }
  function urgencyKey(value) { return value === "紧急" ? "high" : value === "不紧急" ? "low" : "normal"; }
  function fontClass(font) { return font === "muyao" || font === "hand" ? "font-muyao" : font === "dingtalk" ? "font-dingtalk" : "font-nunito"; }
  function placeCaretAtEnd(element) { const range = document.createRange(), selection = window.getSelection(); range.selectNodeContents(element); range.collapse(false); selection.removeAllRanges(); selection.addRange(range); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
  function attr(value = "") { return escapeHtml(value); }

  function updateTextToolbar() {
    if(!document.hasFocus()){textToolbar.hidden=true;return;}
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (!textToolbar.matches(":hover")) textToolbar.hidden = true;
      return;
    }
    const range = selection.getRangeAt(0);
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const editor = startElement?.closest?.(".quick-editor, .note-title, .todo-text, .timeline-text");
    if (!editor || !editor.contains(range.endContainer)) { textToolbar.hidden = true; return; }
    const noteElement = editor.closest(".note");
    const note = noteById(noteElement?.dataset.id);
    if (!note) return;
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    activeTextRange = range.cloneRange(); activeEditor = editor; activeNote = note;
    textToolbar.hidden = false;
    const width = textToolbar.offsetWidth;
    const left = clamp(rect.left + rect.width / 2 - width / 2, 10, innerWidth - width - 10);
    const preferredTop = rect.top - textToolbar.offsetHeight - 9;
    textToolbar.style.left = `${left}px`;
    textToolbar.style.top = `${clamp(preferredTop > 8 ? preferredTop : rect.bottom + 9, 8, Math.max(8, innerHeight - textToolbar.offsetHeight - 8))}px`;
  }

  function applySelectedStyle(style) {
    if (!activeTextRange || !activeEditor || !activeNote) return;
    const normalizedStyle = { ...style };
    if (normalizedStyle.fontSize) normalizedStyle.lineHeight = activeEditor.classList.contains("note-title") ? "1.25" : "1.65";
    const fragment = activeTextRange.extractContents();
    fragment.querySelectorAll?.("span").forEach(child => {
      Object.keys(normalizedStyle).forEach(property => child.style[property] = "");
      if (normalizedStyle.fontSize) child.style.lineHeight = "";
    });
    const span = document.createElement("span"); Object.assign(span.style, normalizedStyle);
    span.appendChild(fragment); activeTextRange.insertNode(span);
    const selection = window.getSelection(); selection.removeAllRanges();
    const nextRange = document.createRange(); nextRange.selectNodeContents(span); selection.addRange(nextRange);
    activeTextRange = nextRange.cloneRange();
    if (activeEditor.classList.contains("note-title")) { activeNote.title = activeEditor.innerText.trim(); activeNote.titleHtml = activeEditor.innerHTML; }
    else if (activeEditor.matches(".todo-text,.timeline-text")) {
      const item = activeEditor.matches(".todo-text") ? activeNote.todos.find(item => item.id === activeEditor.closest(".todo-row").dataset.todo) : activeNote.events.find(item => item.id === activeEditor.closest(".timeline-row").dataset.eventId);
      if (item) { item.text = activeEditor.innerText; item.textHtml = activeEditor.innerHTML; }
    } else { activeNote.content = activeEditor.innerText; activeNote.contentHtml = activeEditor.innerHTML; }
    save(); updateTextToolbar();
  }

  function persistActiveEditor() {
    if (!activeEditor || !activeNote) return;
    if (activeEditor.classList.contains("note-title")) { activeNote.title = activeEditor.innerText.trim(); activeNote.titleHtml = activeEditor.innerHTML; }
    else if (activeEditor.matches(".todo-text,.timeline-text")) {
      const item = activeEditor.matches(".todo-text") ? activeNote.todos.find(item => item.id === activeEditor.closest(".todo-row").dataset.todo) : activeNote.events.find(item => item.id === activeEditor.closest(".timeline-row").dataset.eventId);
      if (item) { item.text = activeEditor.innerText; item.textHtml = activeEditor.innerHTML; }
    } else { activeNote.content = activeEditor.innerText; activeNote.contentHtml = activeEditor.innerHTML; }
    save(); updateTextToolbar();
  }

  function toggleSelectedFormat(command) {
    if (!activeTextRange || !activeEditor || !activeNote) return;
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(activeTextRange);
    document.execCommand(command, false, null);
    if (selection.rangeCount) activeTextRange = selection.getRangeAt(0).cloneRange();
    persistActiveEditor();
  }

  function showSelectionColorMenu(anchor) {
    showMiniPopover(anchor, `<div class="palette text-palette">${TEXT_COLORS.map(color => `<button style="background:${color}" data-selection-color="${color}" title="${color}"></button>`).join("")}</div>`, pop => {
      pop.addEventListener("pointerdown", e => e.preventDefault());
      pop.addEventListener("click", e => { const color = e.target.dataset.selectionColor; if (!color) return; applySelectedStyle({ color }); pop.remove(); });
    });
  }

  document.addEventListener("selectionchange", () => requestAnimationFrame(updateTextToolbar));
  textToolbar.addEventListener("pointerdown", event => { if (event.target.closest("button")) event.preventDefault(); });
  textToolbar.addEventListener("click", event => {
    const command = event.target.closest("[data-text-command]")?.dataset.textCommand; if (!command) return;
    if (command === "bold") toggleSelectedFormat("bold");
    if (command === "italic") toggleSelectedFormat("italic");
    if (command === "underline") toggleSelectedFormat("underline");
    if (command === "strike") toggleSelectedFormat("strikeThrough");
    if (command === "bullet" && activeEditor?.classList.contains("quick-editor")) {
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(activeTextRange); document.execCommand("insertUnorderedList");
      activeNote.content = activeEditor.innerText; activeNote.contentHtml = activeEditor.innerHTML; save(); updateTextToolbar();
    }
    if (command === "color") showSelectionColorMenu(event.target.closest("button"));
  });
  textToolbar.querySelector('[data-text-command="font"]').addEventListener("change", event => {
    const families = {
      nunito: '"Nunito", "DingTalk", sans-serif',
      dingtalk: '"DingTalk", "Nunito", sans-serif',
      muyao: '"Muyao Softbrush", "DingTalk", cursive'
    };
    const family = families[event.target.value] || families.nunito;
    applySelectedStyle({ fontFamily: family });
  });
  textToolbar.querySelector('[data-text-command="size"]').addEventListener("change", event => applySelectedStyle({ fontSize: `${event.target.value}px` }));

  function todayItems() {
    const today = dateOffset(0), items = [];
    state.notes.filter(note => note.type === "todo").forEach(note => (note.todos || []).forEach(todo => {
      if (todo.due === today || todo.customTag === "今天") items.push({ type: "todo", note, item: todo, text: todo.text || "未命名待办", time: todo.dueTime || "18:00" });
    }));
    state.notes.filter(note => note.type === "timeline").forEach(note => (note.events || []).forEach(item => {
      if (!item.done && item.text?.trim() && datePart(item.time) === today) items.push({ type: "timeline", note, item, text: item.text.trim(), time: toDateTimeLocal(item.time).slice(11, 16) });
    }));
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }

  function renderAssistant() {
    const items = todayItems();
    notificationBadge.hidden = items.length === 0; notificationBadge.textContent = items.length > 99 ? "99+" : items.length;
    todaySummary.textContent = `${items.length} 项`;
    assistantGreeting.textContent = assistantGreetingText(items.length);
    const visibleTodayItems = todayExpanded ? items : items.slice(0, 4);
    assistantTodos.innerHTML = items.length ? `${visibleTodayItems.map(({ type, note, item, text, time }) => `<button data-jump-note="${attr(note.id)}" data-jump-item="${attr(item.id)}" data-jump-type="${type}"><span></span><b>${escapeHtml(text)}</b><time>${escapeHtml(time)}</time></button>`).join("")}${items.length > 4 ? `<button class="today-expand" data-toggle-today><b>${todayExpanded ? "收起" : `展开其余 ${items.length - 4} 项`}</b><time>${todayExpanded ? "⌃" : "⌄"}</time></button>` : ""}` : '<div class="today-empty">今天暂时没有待办</div>';
    recycleSummary.textContent = `${state.recycleBin.length} 个便签`;
    recycleList.innerHTML = state.recycleBin.length
      ? `${state.recycleBin.map(note => `<div class="recycle-row"><span>${noteIcon(note.icon)}</span><strong title="${attr(note.title || "未命名便签")}">${escapeHtml(shortTitle(note.title || "未命名便签"))}</strong><button data-restore-note="${note.id}">恢复</button><button data-purge-note="${note.id}" class="purge-button" title="永久删除">×</button></div>`).join("")}<button class="empty-recycle" data-empty-recycle>清空回收站</button>`
      : '<div class="today-empty">回收站为空</div>';
    document.querySelectorAll("[data-ui-size]").forEach(button => button.classList.toggle("selected", button.dataset.uiSize === state.settings.uiSize));
    const localFontSelect = document.querySelector("#localFontSelect"), englishFontSelect = document.querySelector("#englishFontSelect"), dodoSizeRange = document.querySelector("#dodoSizeRange"), dodoSizeValue = document.querySelector("#dodoSizeValue");
    if (localFontSelect) localFontSelect.value = state.settings.localFont;
    if (englishFontSelect) englishFontSelect.value = state.settings.englishFont;
    if (dodoSizeRange) dodoSizeRange.value = state.settings.dodoScale;
    if (dodoSizeValue) dodoSizeValue.textContent = `${Math.round(state.settings.dodoScale * 100)}%`;
    positionAssistant();
    renderDodoNudge();
  }

  function assistantGreetingText(todoCount) {
    if (todoCount > 5) return "事情有点多，Dodo陪你慢慢来。";
    const hour = new Date().getHours();
    if (hour < 5) return "夜深了，先记下，明天再继续。";
    if (hour < 11) return "早上好，慢慢开始也没关系。";
    if (hour < 14) return "中午好，记得让自己喘口气。";
    if (hour < 18) return "下午好，专注一件事就很棒。";
    if (hour < 23) return "晚上好，今天已经很努力了。";
    return "很晚了，剩下的明天再做也可以。";
  }

  function checkDueReminders() {
    const reminderState = state.reminderState, now = Date.now();
    const activeKeys = new Set(reminderState.activeItems.map(item => item.key));
    const candidates = [];
    for (const note of state.notes) {
      if (note.type === "todo") for (const todo of note.todos || []) {
        if (!todo.reminder || !todo.text?.trim() || !todo.due) continue;
        const key = `todo:${note.id}:${todo.id}:${todo.due}:${todo.dueTime || "18:00"}:${todo.reminder}`;
        const offsetDays = todo.reminder === "before3" ? 3 : todo.reminder === "before1" ? 1 : 0;
        const reminderAt = new Date(`${todo.due}T${todo.dueTime || "18:00"}`).getTime() - offsetDays * 86400000;
        if (!reminderState.handled[key] && !activeKeys.has(key) && now >= reminderAt && now - reminderAt <= 86400000) candidates.push({ key, type: "todo", noteId: note.id, itemId: todo.id, text: todo.text, stage: 1, snoozeUntil: 0 });
      }
      if (note.type === "timeline") for (const item of note.events || []) {
        if (item.done || !item.text?.trim()) continue;
        const key = `timeline:${note.id}:${item.id}:${toDateTimeLocal(item.time)}`, dueAt = new Date(toDateTimeLocal(item.time)).getTime();
        if (!reminderState.handled[key] && !activeKeys.has(key) && now >= dueAt && now - dueAt <= 86400000) candidates.push({ key, type: "timeline", noteId: note.id, itemId: item.id, text: item.text, stage: 1, snoozeUntil: 0 });
      }
    }
    if (candidates.length) {
      reminderState.activeItems.push(...candidates);
      candidates.forEach(queueEmailReminder);
      save();
    }
    renderDodoNudge();
  }

  function renderDodoNudge() {
    const visible = state.reminderState.activeItems.filter(item => !item.snoozeUntil || item.snoozeUntil <= Date.now());
    if (!visible.length) { dodoNudge.hidden = true; lastReminderSignature = ""; return; }
    const reminderSignature = visible.map(item => `${item.key}:${item.stage || 1}`).join("|");
    if (reminderSignature !== lastReminderSignature && !state.assistant.tucked) playDodoAnimation("look_around", { priority: 6 });
    lastReminderSignature = reminderSignature;
    const highestStage = Math.max(...visible.map(item => item.stage || 1));
    assistant.dataset.dodoState = `催办${String(Math.min(highestStage, 4)).padStart(2, "0")}`;
    dodoNudge.innerHTML = `<header class="dodo-nudge-head"><div><small>DODO REMINDER</small><strong>${visible.length === 1 ? "有件事到时间了" : `${visible.length} 件事同时到时间`}</strong></div><b>${visible.length}</b></header><div class="dodo-message-stack">${visible.map((active, index) => {
      const copy = active.type === "todo" ? `今天要完成【${active.text}】` : `现在要进行【${active.text}】`;
      return `<article class="dodo-message-card" data-reminder-key="${attr(active.key)}" style="--stack-index:${index}"><div class="dodo-message-meta"><span class="dodo-message-icon">${active.type === "todo" ? icons.bell : icons.clock}</span><small>${active.type === "todo" ? "PinDo 待办" : "PinDo 时间轴"} · 现在</small></div><div class="dodo-message-copy"><strong>${escapeHtml(copy)}</strong></div><div class="dodo-message-actions"><button data-nudge-done>完成</button><button data-nudge-later>稍后</button><button data-nudge-close>关闭</button></div></article>`;
    }).join("")}</div>`;
    assistantPanel.hidden = true; dodoNudge.hidden = false;
    requestAnimationFrame(positionDodoNudge);
  }

  function positionDodoNudge() {
    if (dodoNudge.hidden) return;
    const mascot = assistantMascot.getBoundingClientRect();
    const width = dodoNudge.offsetWidth, height = dodoNudge.offsetHeight;
    const anchorX = clamp(mascot.left + mascot.width / 2, 18, innerWidth - 18);
    const left = clamp(anchorX - width / 2, 12, innerWidth - width - 12);
    const placeAbove = mascot.top >= height + 22;
    const top = placeAbove ? mascot.top - height - 16 : mascot.bottom + 16;
    dodoNudge.style.left = `${left}px`; dodoNudge.style.top = `${clamp(top, 12, innerHeight - height - 12)}px`;
    dodoNudge.style.setProperty("--nudge-tail-x", `${clamp(anchorX - left, 24, width - 24)}px`);
    dodoNudge.dataset.placement = placeAbove ? "above" : "below";
  }

  function queueEmailReminder(item) {
    if (state.reminderState.emailQueue.some(entry => entry.key === item.key)) return;
    state.reminderState.emailQueue.push({ key: item.key, text: item.text, queuedAt: nowText(), status: "awaiting-account-and-mail-service" });
  }

  function positionAssistant() {
    const model = state.assistant;
    if (controlWindow) {
      assistant.classList.toggle("tucked", Boolean(model.tucked));
      assistant.classList.toggle("tucked-left", Boolean(model.tucked && model.tuckSide === "left"));
      assistant.classList.toggle("tucked-right", Boolean(model.tucked && model.tuckSide !== "left"));
      if (!dodoNudge.hidden) requestAnimationFrame(positionDodoNudge);
      return;
    }
    if (model.x == null) model.x = innerWidth - 150;
    if (model.y == null) model.y = innerHeight - 160;
    const assistantWidth = assistant.offsetWidth || 116, assistantHeight = assistant.offsetHeight || 146;
    model.x = clamp(model.x, 0, innerWidth - Math.max(44, assistantWidth)); model.y = clamp(model.y, 0, innerHeight - Math.max(70, assistantHeight));
    if (model.tucked) model.x = model.tuckSide === "left" ? -assistantWidth * .5 : innerWidth - assistantWidth * .5;
    assistant.style.left = `${model.x}px`; assistant.style.top = `${model.y}px`;
    assistant.classList.toggle("tucked", Boolean(model.tucked));
    assistant.classList.toggle("tucked-left", Boolean(model.tucked && model.tuckSide === "left"));
    assistant.classList.toggle("tucked-right", Boolean(model.tucked && model.tuckSide !== "left"));
    assistant.classList.toggle("panel-below", model.y < 440);
    assistant.classList.toggle("panel-left", model.x < 370);
    if (!dodoNudge.hidden) requestAnimationFrame(positionDodoNudge);
  }

  let assistantWasDragged = false;
  assistantMascot.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (controlWindow) {
      assistantWasDragged = false;
      let pickedUp = false;
      nativeGesture(event, assistantMascot, assistant, "move", () => {}, moved => {
        assistantWasDragged = moved;
        if (moved) playDodoAnimation("landing", { priority: 5, interruptible: false, onComplete: playDodoIdle });
        else playDodoIdle();
      }, () => {
        assistantWasDragged = true;
        if (!pickedUp) { pickedUp = true; clearTimeout(dodoIdleTimer); playDodoAnimation("picked_up", { priority: 5, interruptible: false }); }
      });
      return;
    }
    assistantWasDragged = false; let pickupStarted = false;
    clearTimeout(dodoIdleTimer);
    const startX = event.clientX, startY = event.clientY, startLeft = state.assistant.x, startTop = state.assistant.y;
    assistantMascot.setPointerCapture(event.pointerId); assistant.classList.add("is-moving");
    const move = e => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) assistantWasDragged = true;
      if (!assistantWasDragged) return;
      if (!pickupStarted) { pickupStarted = true; playDodoAnimation("picked_up", { priority: 5, interruptible: false }); }
      state.assistant.tucked = false;
      state.assistant.x = clamp(startLeft + e.clientX - startX, 0, innerWidth - 52);
      state.assistant.y = clamp(startTop + e.clientY - startY, 0, innerHeight - 118);
      positionAssistant();
      const nearLeft = state.assistant.x < 34, nearDock = state.assistant.x > innerWidth - 135;
      dockTarget.querySelector("span").textContent = "松开隐藏 Dodo";
      dockTarget.classList.toggle("active", nearDock); dockTarget.classList.toggle("dodo-target", nearDock);
      leftDockTarget.classList.toggle("active", nearLeft); leftDockTarget.classList.toggle("dodo-target", nearLeft);
    };
    const up = () => {
      assistant.classList.remove("is-moving");
      const nearLeft = state.assistant.x < 34, nearRight = state.assistant.x > innerWidth - 135;
      dockTarget.classList.remove("active", "dodo-target"); leftDockTarget.classList.remove("active", "dodo-target"); dockTarget.querySelector("span").textContent = "松开后收纳";
      assistantMascot.removeEventListener("pointermove", move); assistantMascot.removeEventListener("pointerup", up);
      if (assistantWasDragged && (nearLeft || nearRight)) tuckDodo(nearLeft ? "left" : "right");
      else {
        positionAssistant(); save();
        if (assistantWasDragged) playDodoAnimation("landing", { priority: 5, interruptible: false, onComplete: playDodoIdle });
        else playDodoIdle();
      }
    };
    assistantMascot.addEventListener("pointermove", move); assistantMascot.addEventListener("pointerup", up);
  });
  assistantMascot.addEventListener("click", event => {
    event.stopPropagation(); if (assistantWasDragged) { assistantWasDragged = false; return; }
    settingsModal.hidden = true;
    if (state.assistant.tucked) expandDodo();
    else playDodoAnimation("pet_response", { priority: 4 });
    const opening = assistantPanel.hidden;
    if (opening) todayExpanded = false;
    renderAssistant();
    if (!dodoNudge.hidden) return;
    assistantPanel.hidden = !assistantPanel.hidden;
    if(!assistantPanel.hidden){assistantPanel.scrollTop=0; assistantPanel.querySelectorAll(".assistant-todos,.recycle-list").forEach(el=>el.scrollTop=0);}
  });
  assistantMascot.addEventListener("contextmenu", event => {
    event.preventDefault(); event.stopPropagation(); assistantPanel.hidden = true;
    settingsModal.hidden = false; renderAssistant();
  });
  document.querySelector("#tuckAssistant").addEventListener("click", async () => {
    const side = controlWindow ? await window.pindoNative.command("dodo-nearest") : state.assistant.x < innerWidth / 2 ? "left" : "right";
    tuckDodo(side === "left" ? "left" : "right");
  });
  dodoNudge.addEventListener("click", event => {
    const card = event.target.closest("[data-reminder-key]");
    const active = state.reminderState.activeItems.find(item => item.key === card?.dataset.reminderKey); if (!active) return;
    if (event.target.closest("[data-nudge-done]")) {
      state.reminderState.handled[active.key] = true;
      state.reminderState.activeItems = state.reminderState.activeItems.filter(item => item.key !== active.key);
      const note = noteById(active.noteId);
      if (active.type === "todo" && note) completeTodo(note, active.itemId);
      else if (active.type === "timeline" && note) { const item = (note.events || []).find(entry => entry.id === active.itemId); if (item) { item.done = true; playDodoAnimation("celebrate", { priority: 7, interruptible: false }); } render(); showToast("时间轴节点已完成"); }
      return;
    }
    if (event.target.closest("[data-nudge-later]")) { active.stage = Math.min((active.stage || 1) + 1, 4); active.snoozeUntil = Date.now() + 15 * 60000; save(); renderDodoNudge(); showToast("15分钟后再次提醒"); return; }
    if (event.target.closest("[data-nudge-close]")) { state.reminderState.handled[active.key] = true; state.reminderState.activeItems = state.reminderState.activeItems.filter(item => item.key !== active.key); save(); renderDodoNudge(); }
  });
  document.querySelector(".assistant-create").addEventListener("click", event => { const button = event.target.closest("[data-create]"); if (button) createNote(button.dataset.create); });
  document.querySelector("#recycleEntry").addEventListener("click", () => { recycleList.hidden = !recycleList.hidden; });
  function closeSettings() { settingsModal.hidden = true; }
  document.querySelector("#settingsEntry").addEventListener("click", () => { assistantPanel.hidden = true; settingsModal.hidden = false; renderAssistant(); });
  document.querySelector("#closeSettings").addEventListener("click", closeSettings);
  settingsModal.addEventListener("pointerdown", event => { if (event.target === settingsModal) closeSettings(); });
  document.querySelector("#localFontSelect").addEventListener("change", event => { state.settings.localFont = event.target.value; applyInterfaceSettings(); save(); showToast("中文界面字体已更新"); });
  document.querySelector("#englishFontSelect").addEventListener("change", event => { state.settings.englishFont = event.target.value; applyInterfaceSettings(); save(); showToast("英文字体已更新"); });
  document.querySelector(".ui-size-segments").addEventListener("click", event => {
    const button = event.target.closest("[data-ui-size]"); if (!button) return;
    state.settings.uiSize = button.dataset.uiSize; applyInterfaceSettings();
    document.querySelectorAll("[data-ui-size]").forEach(item => item.classList.toggle("selected", item === button));
    save(); requestAnimationFrame(() => { positionAssistant(); positionDodoNudge(); }); showToast(`界面大小：${button.textContent}`);
  });
  const dodoSizeRange = document.querySelector("#dodoSizeRange");
  dodoSizeRange.addEventListener("input", event => {
    state.settings.dodoScale = clamp(Number(event.target.value), .5, 2); document.querySelector("#dodoSizeValue").textContent = `${Math.round(state.settings.dodoScale * 100)}%`;
    applyInterfaceSettings(); requestAnimationFrame(() => { positionAssistant(); positionDodoNudge(); });
  });
  dodoSizeRange.addEventListener("change", () => { save(); showToast("Dodo大小已保存"); });
  recycleList.addEventListener("click", event => {
    const restore = event.target.closest("[data-restore-note]");
    if (restore) { const index = state.recycleBin.findIndex(note => note.id === restore.dataset.restoreNote); if (index >= 0) { const [note] = state.recycleBin.splice(index, 1); delete note.deletedAt; note.z = ++zCounter; state.notes.push(note); render(); showToast("便签已恢复"); } return; }
    const purge = event.target.closest("[data-purge-note]");
    if (purge && confirm("永久删除这个便签？此操作无法恢复。")) { state.recycleBin = state.recycleBin.filter(note => note.id !== purge.dataset.purgeNote); render(); return; }
    if (event.target.closest("[data-empty-recycle]") && confirm("确定永久删除回收站中的全部便签吗？")) { state.recycleBin = []; render(); showToast("回收站已清空"); }
  });
  assistantTodos.addEventListener("click", event => {
    if (event.target.closest("[data-toggle-today]")) { todayExpanded = !todayExpanded; renderAssistant(); return; }
    const button = event.target.closest("[data-jump-note]"); if (!button) return;
    const note = noteById(button.dataset.jumpNote); if (note?.mode === "bookmark") note.mode = note.previousMode || "desktop";
    focusedNoteId = button.dataset.jumpNote; assistantPanel.hidden = true; render();
    const payload = { noteId: button.dataset.jumpNote, type: button.dataset.jumpType || "todo", itemId: button.dataset.jumpItem };
    let attempts = 0;
    const focusItem = async () => {
      const focused = await window.pindoNative?.command("focus-note-item", payload);
      if (!focused && attempts++ < 12) setTimeout(focusItem, 80);
    };
    setTimeout(focusItem, 40);
  });
  document.querySelector("#profileButton").addEventListener("click", () => showToast("账户资料入口已预留"));
  document.querySelector("#cloudButton").addEventListener("click", () => showToast("云同步与付费能力将在后续版本开放"));
  document.addEventListener("click", event => { if (!assistant.contains(event.target)) { assistantPanel.hidden = true; todayExpanded = false; } });
  desktop.addEventListener("pointerdown", event => {
    if (event.target.closest(".note, .bookmark, .assistant")) return;
    focusedNoteId = null;
    document.querySelectorAll(".note").forEach(element => {
      element.classList.remove("focused"); const note = noteById(element.dataset.id);
      if (note) element.style.zIndex = note.mode === "top" ? 5000 + note.z : note.z;
    });
  });
  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "n") { event.preventDefault(); createNote("quick"); }
    if (event.key === "Escape") { document.querySelectorAll(".mini-popover").forEach(el => el.remove()); closeSettings(); }
  });
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (noteWindowId) return; // CSS follows native bounds; never rewrite screen coordinates here.
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      // The control window has no desktop canvas by design. Never clamp or
      // rewrite note coordinates against its hidden 0×0 canvas.
      if (controlWindow) {
        positionAssistant();
        if (!dodoNudge.hidden) positionDodoNudge();
        return;
      }
      state.notes.filter(note => !attachmentByChild(note.id)).forEach(note => {
        syncAttachedStack(note.id);
        const stack = attachedTreeIds(note.id).map(noteById).filter(Boolean), stackHeight = stack.reduce((sum, item) => sum + item.h, 0);
        note.x = clamp(note.x, 0, Math.max(0, desktop.clientWidth - note.w));
        note.y = clamp(note.y, 34, Math.max(34, desktop.clientHeight - stackHeight));
        syncAttachedStack(note.id);
      });
      positionAssistant(); render();
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (noteWindowId) return;
    if (document.hidden) { cancelAnimationFrame(dodoPlayback.raf); clearTimeout(dodoIdleTimer); }
    else { dodoPlayback.token++; Object.assign(dodoPlayback, { name: "", priority: -1, interruptible: true, raf: 0 }); playDodoIdle(); }
  });

  if (controlWindow) window.pindoNative?.on("dodo-docked", side => {
    if (side === "release") { state.assistant.tucked = false; positionAssistant(); save(); playDodoIdle(); }
    else tuckDodo(side);
  });
  if (noteWindowId) {
    window.pindoNative?.on("note-state", applyNativeSnapshot);
    window.pindoNative?.on("snap", edge => {
      const el = noteLayer.querySelector(".note");
      el?.classList.toggle("native-snap-top", edge === "top");
      el?.classList.toggle("native-snap-bottom", edge === "bottom");
    });
    window.pindoNative?.on("highlight-item", detail => {
      const id = CSS.escape(String(detail?.id || ""));
      const selector = detail?.type === "timeline" ? `[data-event-id="${id}"]` : detail?.type === "todo" ? `[data-todo="${id}"]` : "";
      const row = selector && noteLayer.querySelector(selector); if (!row) return;
      row.scrollIntoView({block:"center",behavior:"smooth"});row.classList.remove("pindo-attention");void row.offsetWidth;row.classList.add("pindo-attention");
      setTimeout(()=>row.classList.remove("pindo-attention"),1500);
    });
  }
  if (!noteWindowId) {
    window.pindoDesktop?.onStateChanged?.((serialized, revision) => {
      if (typeof serialized !== "string" || !Number.isSafeInteger(revision)) return;
      try {
        const incoming = JSON.parse(serialized);
        if (!incoming?.notes) return;
        state = incoming;
        stateRevision = revision;
        render(false);
      } catch { /* Ignore a malformed remote update; the canonical store remains intact. */ }
    });
  }

  if (controlWindow && window.pindoDesktop?.setControlRegions) {
    // Do not use the full transparent control window as Dodo's hit target.
    let pending = 0, lastRegions = "";
    const publish = () => {
      pending = 0;
      const sleepVisual=assistantMascot.querySelector(".dodo-sleep-image"),ghost=assistantMascot.querySelector(".dodo-state-ghost");
      // Settings is a sibling surface, not a replacement for Dodo. Keep the
      // mascot published so opening settings never clips the pet away.
      const elements = settingsModal.hidden
        ? [assistantMascot, assistantPanel, dodoNudge,dodoCanvas,sleepVisual,ghost]
        : [settingsDialog,assistantMascot,dodoCanvas,sleepVisual,ghost];
      const regions = elements.filter(el => el && !el.hidden && el.getClientRects().length).map(el => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, interactive: ![dodoCanvas,sleepVisual,ghost].includes(el) };
      });
      const encoded = JSON.stringify(regions);
      if (encoded !== lastRegions) { lastRegions = encoded; window.pindoDesktop.setControlRegions(regions); }
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(publish); };
    const observer = new MutationObserver(schedule);
    [assistant, assistantPanel, dodoNudge, settingsModal, document.documentElement].forEach(el => observer.observe(el, { attributes: true, attributeFilter: ["hidden", "class", "style"] }));
    const sizeObserver = new ResizeObserver(schedule);
    [assistantMascot, dodoCanvas, assistantPanel, dodoNudge, settingsDialog].forEach(el => sizeObserver.observe(el));
    window.addEventListener("resize", schedule);
    schedule();
  }

  render();
  if (controlWindow && state.assistant.tucked) window.pindoNative.command("dodo-dock", {side:state.assistant.tuckSide,scale:state.settings.dodoScale});
  if (!noteWindowId) { checkDueReminders(); playDodoIdle(); setInterval(checkDueReminders, 30000); setInterval(refreshDodoMood, 1000); }
})();
