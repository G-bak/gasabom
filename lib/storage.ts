"use client";

import type { PlaybackMode } from "@/lib/types";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "gasabom:practice:v2";
const SESSION_KEY = "gasabom:session:v1";
export type {
  StudyNote,
  StudyWord,
  Playlist,
  PracticeState,
} from "./practice-data";
import {
  DEFAULT_STATE,
  normalisePractice,
  type PracticeState,
  type StudyWord,
  type Playlist,
} from "./practice-data";
type SessionState = {
  version: 1;
  volume: number;
  playbackMode: PlaybackMode;
  playlists: Playlist[];
};
function readPlaylists(value: unknown): Playlist[] {
  return normalisePractice({ playlists: value }).playlists;
}
function loadState(): PracticeState {
  let saved: string | null = null;
  try {
    saved =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem("gasabom:practice:v1");
    if (!saved) return DEFAULT_STATE;
    const value = JSON.parse(saved);
    try {
      return normalisePractice(value, true);
    } catch {
      if (!window.localStorage.getItem("gasabom:practice:recovery"))
        window.localStorage.setItem("gasabom:practice:recovery", saved);
      return normalisePractice(value);
    }
  } catch {
    try {
      if (saved && !window.localStorage.getItem("gasabom:practice:recovery"))
        window.localStorage.setItem("gasabom:practice:recovery", saved);
    } catch {}
    return DEFAULT_STATE;
  }
}
function loadSession(legacy: PracticeState): SessionState {
  const fallback: SessionState = {
    version: 1,
    volume: 1,
    playbackMode: legacy.options.playbackMode,
    playlists: legacy.playlists,
  };
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<SessionState>;
    if (!saved || saved.version !== 1) return fallback;
    return {
      version: 1,
      volume:
        typeof saved.volume === "number" &&
        Number.isFinite(saved.volume) &&
        saved.volume >= 0 &&
        saved.volume <= 1
          ? saved.volume
          : 1,
      playbackMode: saved.playbackMode === "line" ? "line" : "song",
      playlists: readPlaylists(saved.playlists),
    };
  } catch {
    return fallback;
  }
}

function useStore() {
  const [state, setState] = useState<PracticeState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(1);
  useEffect(() => {
    const legacy = loadState();
    const session = loadSession(legacy);
    setState({
      ...legacy,
      playlists: session.playlists,
      options: { ...legacy.options, playbackMode: session.playbackMode },
    });
    setPlayerVolume(session.volume);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let sessionSaved = false,
      persistentSaved = false;
    try {
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          version: 1,
          volume: playerVolume,
          playbackMode: state.options.playbackMode,
          playlists: state.playlists,
        } satisfies SessionState),
      );
      sessionSaved = true;
    } catch {}
    try {
      const { playlists, ...persistentState } = state;
      const { playbackMode, ...persistentOptions } = state.options;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...persistentState,
          options: persistentOptions,
          ...(!sessionSaved ? { playlists, options: state.options } : {}),
        }),
      );
      persistentSaved = true;
    } catch {}
    setSaveError(!sessionSaved || !persistentSaved);
  }, [state, ready, playerVolume]);

  const toggleFavorite = useCallback((songId: string) => {
    setState((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(songId)
        ? prev.favorites.filter((id) => id !== songId)
        : [...prev.favorites, songId],
    }));
  }, []);

  const toggleLearned = useCallback((songId: string, lineId: string) => {
    setState((prev) => {
      const current = Array.isArray(prev.learned[songId])
        ? prev.learned[songId]
        : [];
      const next = current.includes(lineId)
        ? current.filter((id) => id !== lineId)
        : [...current, lineId];
      return { ...prev, learned: { ...prev.learned, [songId]: next } };
    });
  }, []);

  const setOption = useCallback(
    <K extends keyof PracticeState["options"]>(
      key: K,
      value: PracticeState["options"][K],
    ) => {
      setState((prev) => ({
        ...prev,
        options: { ...prev.options, [key]: value },
      }));
    },
    [],
  );

  const addNote = useCallback(
    (songId: string, text: string, lineId?: string) => {
      if (text.trim())
        setState((p) => ({
          ...p,
          notes: [
            {
              id: crypto.randomUUID(),
              songId,
              ...(lineId ? { lineId } : {}),
              text: text.trim().slice(0, 500),
              createdAt: new Date().toISOString(),
            },
            ...p.notes,
          ],
        }));
    },
    [],
  );
  const removeNote = useCallback(
    (id: string) =>
      setState((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) })),
    [],
  );
  const addWord = useCallback(
    (word: Omit<StudyWord, "id" | "starred"> & { starred?: boolean }) => {
      if (word.ja.trim() && word.meaning.trim())
        setState((p) => {
          if (
            p.words.some(
              (entry) =>
                entry.songId === word.songId &&
                entry.ja === word.ja &&
                entry.lineId === word.lineId,
            )
          )
            return p;
          return {
            ...p,
            words: [
              {
                ...word,
                id: crypto.randomUUID(),
                starred: word.starred ?? false,
              },
              ...p.words,
            ],
          };
        });
    },
    [],
  );
  const removeWord = useCallback(
    (id: string) =>
      setState((p) => ({ ...p, words: p.words.filter((w) => w.id !== id) })),
    [],
  );
  const toggleWordStar = useCallback(
    (id: string) =>
      setState((p) => ({
        ...p,
        words: p.words.map((w) =>
          w.id === id ? { ...w, starred: !w.starred } : w,
        ),
      })),
    [],
  );
  const markPlayed = useCallback(
    (songId: string, countPlay = true) =>
      setState((p) => ({
        ...p,
        recent: { ...p.recent, [songId]: new Date().toISOString() },
        playCounts: countPlay
          ? { ...p.playCounts, [songId]: (p.playCounts[songId] || 0) + 1 }
          : p.playCounts,
      })),
    [],
  );
  const addListening = useCallback(
    (seconds: number) =>
      setState((p) => ({
        ...p,
        listeningSeconds: p.listeningSeconds + Math.max(0, seconds),
      })),
    [],
  );

  const updateNote = useCallback(
    (id: string, text: string, lineId?: string) => {
      if (text.trim())
        setState((p) => ({
          ...p,
          notes: p.notes.map((n) =>
            n.id === id ? { ...n, text: text.trim().slice(0, 500), lineId } : n,
          ),
        }));
    },
    [],
  );
  const updateWord = useCallback(
    (id: string, word: Omit<StudyWord, "id" | "starred">) => {
      if (word.ja.trim() && word.meaning.trim())
        setState((p) => ({
          ...p,
          words: p.words.map((w) => (w.id === id ? { ...w, ...word } : w)),
        }));
    },
    [],
  );
  return {
    state,
    updateNote,
    updateWord,
    ready,
    saveError,
    playerVolume,
    setPlayerVolume,
    toggleFavorite,
    toggleLearned,
    setOption,
    addNote,
    removeNote,
    addWord,
    removeWord,
    toggleWordStar,
    markPlayed,
    addListening,
  };
}
type Store = ReturnType<typeof useStore>;
const PracticeContext = createContext<Store | null>(null);
export function PracticeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return createElement(PracticeContext.Provider, { value: store }, children);
}
export function usePracticeState() {
  const store = useContext(PracticeContext);
  if (!store) throw new Error("PracticeProvider is required");
  return store;
}
