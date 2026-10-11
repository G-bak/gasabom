import type { PlaybackMode, Song } from "./types";
export type StudyNote = {
  id: string;
  songId: string;
  lineId?: string;
  text: string;
  createdAt: string;
};
export type StudyWord = {
  id: string;
  songId: string;
  ja: string;
  reading: string;
  koPronunciation?: string;
  meaning: string;
  lineId?: string;
  starred: boolean;
};
export type Playlist = { id: string; name: string; songIds: string[] };
export type PracticeState = {
  version: 2;
  favorites: string[];
  learned: Record<string, string[]>;
  bookmarks: Record<string, string[]>;
  notes: StudyNote[];
  words: StudyWord[];
  playlists: Playlist[];
  recent: Record<string, string>;
  playCounts: Record<string, number>;
  listeningSeconds: number;
  options: {
    showJapanese: boolean;
    showPronunciation: boolean;
    showTranslation: boolean;
    autoScroll: boolean;
    fontSize: number;
    playbackMode: PlaybackMode;
    libraryView: "grid" | "list";
    defaultSpeed: number;
    personalName: string;
  };
};
export const DEFAULT_STATE: PracticeState = {
  version: 2,
  favorites: [],
  learned: {},
  bookmarks: {},
  notes: [],
  words: [],
  playlists: [],
  recent: {},
  playCounts: {},
  listeningSeconds: 0,
  options: {
    showJapanese: true,
    showPronunciation: true,
    showTranslation: true,
    autoScroll: true,
    fontSize: 24,
    playbackMode: "song",
    libraryView: "grid",
    defaultSpeed: 1,
    personalName: "",
  },
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const ids = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter(str))] : [];
export function normalisePractice(
  value: unknown,
  strict = false,
): PracticeState {
  if (!obj(value)) throw new Error("학습 기록은 JSON 객체여야 합니다.");
  if (value.version !== undefined && value.version !== 1 && value.version !== 2)
    throw new Error("지원하지 않는 학습 기록 버전입니다.");
  const issues: string[] = [];
  const list = <T>(key: string, valid: (entry: unknown) => entry is T): T[] => {
    const raw = value[key];
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) {
      issues.push(key);
      return [];
    }
    const result = raw.filter(valid);
    if (
      result.length !== raw.length ||
      new Set(result.map((x) => (x as { id: string }).id)).size !==
        result.length
    )
      issues.push(key);
    return [
      ...new Map(result.map((x) => [(x as { id: string }).id, x])).values(),
    ];
  };
  const mapped = (key: string): Record<string, string[]> => {
    if (value[key] === undefined) return {};
    if (!obj(value[key])) {
      issues.push(key);
      return {};
    }
    return Object.fromEntries(
      Object.entries(value[key])
        .filter(([id, v]) => {
          const ok = str(id) && Array.isArray(v) && v.every(str);
          if (!ok) issues.push(key);
          return ok;
        })
        .map(([id, v]) => [id, ids(v)]),
    );
  };
  const options = { ...DEFAULT_STATE.options };
  if (value.options !== undefined && !obj(value.options))
    issues.push("options");
  if (obj(value.options)) {
    for (const key of [
      "showJapanese",
      "showPronunciation",
      "showTranslation",
      "autoScroll",
    ] as const) {
      if (value.options[key] !== undefined) {
        if (typeof value.options[key] === "boolean")
          options[key] = value.options[key] as boolean;
        else issues.push(key);
      }
    }
    const font = value.options.fontSize;
    if (font !== undefined) {
      if (typeof font === "number" && Number.isFinite(font))
        options.fontSize = font < 20 ? 24 : Math.min(32, font);
      else issues.push("fontSize");
    }
    const mode = value.options.playbackMode;
    if (mode !== undefined) {
      if (["once", "song", "auto", "line"].includes(String(mode)))
        options.playbackMode = mode === "line" ? "line" : "song";
      else issues.push("playbackMode");
    }
    if (value.options.libraryView !== undefined) {
      if (["grid", "list"].includes(String(value.options.libraryView)))
        options.libraryView = value.options.libraryView as "grid" | "list";
      else issues.push("libraryView");
    }
    if (value.options.defaultSpeed !== undefined) {
      if (
        typeof value.options.defaultSpeed === "number" &&
        [0.75, 0.85, 1, 1.15, 1.25].includes(value.options.defaultSpeed)
      )
        options.defaultSpeed = value.options.defaultSpeed;
      else issues.push("defaultSpeed");
    }
    if (value.options.personalName !== undefined) {
      if (typeof value.options.personalName === "string")
        options.personalName = value.options.personalName.slice(0, 40);
      else issues.push("personalName");
    }
  }
  if (
    !options.showJapanese &&
    !options.showPronunciation &&
    !options.showTranslation
  )
    options.showPronunciation = true;
  if (
    value.favorites !== undefined &&
    (!Array.isArray(value.favorites) || !value.favorites.every(str))
  )
    issues.push("favorites");
  const notes = list(
    "notes",
    (v): v is StudyNote =>
      obj(v) &&
      str(v.id) &&
      str(v.songId) &&
      str(v.text) &&
      v.text.length <= 500 &&
      typeof v.createdAt === "string" &&
      Number.isFinite(Date.parse(v.createdAt)) &&
      (v.lineId === undefined || str(v.lineId)),
  );
  const words = list(
    "words",
    (v): v is StudyWord =>
      obj(v) &&
      str(v.id) &&
      str(v.songId) &&
      str(v.ja) &&
      typeof v.reading === "string" &&
      str(v.meaning) &&
      typeof v.starred === "boolean" &&
      (v.lineId === undefined || str(v.lineId)) &&
      (v.koPronunciation === undefined ||
        typeof v.koPronunciation === "string"),
  );
  const playlists = list(
    "playlists",
    (v): v is Playlist =>
      obj(v) &&
      str(v.id) &&
      str(v.name) &&
      v.name.length <= 40 &&
      Array.isArray(v.songIds) &&
      v.songIds.every(str) &&
      new Set(v.songIds).size === v.songIds.length,
  );
  const record = <T>(
    key: string,
    valid: (v: unknown) => v is T,
  ): Record<string, T> => {
    if (value[key] === undefined) return {};
    if (!obj(value[key])) {
      issues.push(key);
      return {};
    }
    return Object.fromEntries(
      Object.entries(value[key]).filter(([id, v]) => {
        const ok = str(id) && valid(v);
        if (!ok) issues.push(key);
        return ok;
      }),
    ) as Record<string, T>;
  };
  const recent = record(
    "recent",
    (v): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)),
  );
  const playCounts = record(
    "playCounts",
    (v): v is number =>
      typeof v === "number" && Number.isSafeInteger(v) && v >= 0,
  );
  const seconds = value.listeningSeconds;
  if (
    seconds !== undefined &&
    (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0)
  )
    issues.push("listeningSeconds");
  const state: PracticeState = {
    version: 2,
    favorites: ids(value.favorites),
    learned: mapped("learned"),
    bookmarks: mapped("bookmarks"),
    notes,
    words,
    playlists,
    recent,
    playCounts,
    listeningSeconds:
      typeof seconds === "number" && Number.isFinite(seconds)
        ? Math.max(0, seconds)
        : 0,
    options,
  };
  if (strict && issues.length)
    throw new Error(
      `학습 기록 필드를 확인하세요: ${[...new Set(issues)].join(", ")}`,
    );
  return state;
}
export function inspectLearning(value: unknown, songs: Song[]) {
  if (
    !obj(value) ||
    value.format !== "gasabom-learning-backup" ||
    value.version !== 2
  )
    throw new Error("버전 2 가사봄 학습 기록 JSON을 선택하세요.");
  if (!obj(value.state) || value.state.version !== 2)
    throw new Error("학습 기록 내부 버전도 2여야 합니다.");
  const state = normalisePractice(value.state, true);
  let omitted = 0;
  const known = (id: string) => songs.some((s) => s.id === id);
  const knownLine = (id: string, line: string) =>
    songs.find((s) => s.id === id)?.lines.some((l) => l.id === line) ?? false;
  const keep = (ok: boolean) => {
    if (!ok) omitted++;
    return ok;
  };
  state.favorites = state.favorites.filter((id) => keep(known(id)));
  for (const key of ["learned", "bookmarks"] as const)
    state[key] = Object.fromEntries(
      Object.entries(state[key])
        .filter(([id]) => keep(known(id)))
        .map(([id, lines]) => [
          id,
          lines.filter((line) => keep(knownLine(id, line))),
        ]),
    );
  state.notes = state.notes.filter((n) =>
    keep(known(n.songId) && (!n.lineId || knownLine(n.songId, n.lineId))),
  );
  state.words = state.words.filter((w) =>
    keep(known(w.songId) && (!w.lineId || knownLine(w.songId, w.lineId))),
  );
  state.playlists = state.playlists.map((p) => ({
    ...p,
    songIds: p.songIds.filter((id) => keep(known(id))),
  }));
  for (const key of ["recent", "playCounts"] as const)
    state[key] = Object.fromEntries(
      Object.entries(state[key]).filter(([id]) => keep(known(id))),
    ) as never;
  return { state, omitted };
}
export function mergeLearning(
  current: PracticeState,
  incoming: PracticeState,
): PracticeState {
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const rows = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...b, ...a].map((row) => [row.id, row])).values(),
  ];
  const mapped = (a: Record<string, string[]>, b: Record<string, string[]>) =>
    Object.fromEntries(
      [...new Set([...Object.keys(a), ...Object.keys(b)])].map((id) => [
        id,
        union(a[id] || [], b[id] || []),
      ]),
    );
  return {
    ...current,
    favorites: union(current.favorites, incoming.favorites),
    learned: mapped(current.learned, incoming.learned),
    bookmarks: mapped(current.bookmarks, incoming.bookmarks),
    notes: rows(current.notes, incoming.notes),
    words: rows(current.words, incoming.words),
    playlists: rows(current.playlists, incoming.playlists),
    recent: Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(current.recent),
          ...Object.keys(incoming.recent),
        ]),
      ].map((id) => [
        id,
        [current.recent[id] || "", incoming.recent[id] || ""].sort().at(-1)!,
      ]),
    ),
    playCounts: Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(current.playCounts),
          ...Object.keys(incoming.playCounts),
        ]),
      ].map((id) => [
        id,
        Math.max(current.playCounts[id] || 0, incoming.playCounts[id] || 0),
      ]),
    ),
    listeningSeconds: Math.max(
      current.listeningSeconds,
      incoming.listeningSeconds,
    ),
  };
}
