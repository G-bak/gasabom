"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePracticeState } from "./storage";
import { isFullyTimed, type Song } from "./types";
function usePlayerStore(songs: Song[]) {
  const {
    state,
    setOption,
    playerVolume: volume,
    setPlayerVolume: setVolume,
    markPlayed,
    addListening,
  } = usePracticeState();
  const audioRef = useRef<HTMLAudioElement>(null),
    songRef = useRef<Song | null>(null);
  const [song, setSong] = useState<Song | null>(null),
    [currentTime, setCurrentTime] = useState(0),
    [duration, setDuration] = useState(0),
    [isPlaying, setIsPlaying] = useState(false),
    [audioError, setAudioError] = useState("");
  const [loop, setLoop] = useState<{ start: number; end: number } | null>(null),
    [loopMessage, setLoopMessage] = useState("");
  const loopRef = useRef(loop),
    counted = useRef(false),
    playRequest = useRef(0);
  loopRef.current = loop;
  const clearLoop = useCallback(() => {
    loopRef.current = null;
    setLoop(null);
    setLoopMessage("");
    setOption("playbackMode", "song");
  }, [setOption]);
  const selectSong = useCallback(
    (next: Song) => {
      const a = audioRef.current;
      if (
        songRef.current?.id === next.id &&
        songRef.current.audioSrc === next.audioSrc &&
        songRef.current.audioRevision === next.audioRevision
      ) {
        songRef.current = next;
        setSong(next);
        return;
      }
      playRequest.current++;
      a?.pause();
      counted.current = false;
      clearLoop();
      songRef.current = next;
      setSong(next);
      setCurrentTime(0);
      setDuration(0);
      setAudioError("");
      setIsPlaying(false);
      if (a) {
        if (next.audioSrc)
          a.src =
            next.audioSrc +
            (next.audioRevision
              ? `?v=${encodeURIComponent(next.audioRevision)}`
              : "");
        else a.removeAttribute("src");
        a.load();
      }
    },
    [clearLoop],
  );
  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (
      !a ||
      !songRef.current?.audioSrc ||
      !Number.isFinite(seconds) ||
      !Number.isFinite(a.duration)
    )
      return;
    const target = Math.min(a.duration, Math.max(0, seconds));
    a.currentTime = target;
    setCurrentTime(target);
  }, []);
  const playAudio = useCallback(async () => {
    const a = audioRef.current;
    if (!a || !songRef.current?.audioSrc) return;
    const request = ++playRequest.current;
    try {
      await a.play();
      if (request === playRequest.current) {
        setAudioError("");
        setIsPlaying(true);
      }
    } catch (error) {
      if (
        request === playRequest.current &&
        (error as Error).name !== "AbortError"
      ) {
        setIsPlaying(false);
        setAudioError(
          "음원을 재생할 수 없습니다. 파일을 확인하거나 다시 재생하세요.",
        );
      }
    }
  }, []);
  const pause = useCallback(() => {
    playRequest.current++;
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);
  const repeatLine = useCallback(
    (index: number, startPlayback = true) => {
      const a = audioRef.current,
        line = songRef.current?.lines[index];
      if (
        !a ||
        !line ||
        !isFullyTimed(songRef.current!) ||
        !Number.isFinite(a.duration) ||
        line.start === undefined ||
        line.end === undefined
      )
        return;
      if (line.start >= a.duration || line.end > a.duration + 0.05) {
        setLoopMessage(
          "가사 시간이 음원 길이를 넘습니다. 시간 정보를 확인하세요.",
        );
        return;
      }
      const next = { start: line.start, end: line.end };
      loopRef.current = next;
      setLoop(next);
      setOption("playbackMode", "line");
      setLoopMessage(`${index + 1}번째 가사 줄을 반복합니다.`);
      seek(next.start);
      if (startPlayback) void playAudio();
    },
    [setOption, seek, playAudio],
  );
  const currentIndex = useCallback(() => {
    const lines = songRef.current?.lines || [],
      time = audioRef.current?.currentTime || 0;
    let index = 0;
    for (let i = 0; i < lines.length; i++)
      if (lines[i].start !== undefined && time >= lines[i].start!) index = i;
    return index;
  }, []);
  const toggleLineLoop = useCallback(() => {
    if (loopRef.current) clearLoop();
    else repeatLine(currentIndex());
  }, [clearLoop, repeatLine, currentIndex]);
  const skipLine = useCallback(
    (delta: number) => {
      const lines = songRef.current?.lines || [];
      if (!lines.length || !songRef.current || !isFullyTimed(songRef.current))
        return;
      const index = Math.max(
        0,
        Math.min(lines.length - 1, currentIndex() + delta),
      );
      if (loopRef.current) repeatLine(index, !audioRef.current?.paused);
      else seek(lines[index].start!);
    },
    [currentIndex, repeatLine, seek],
  );
  const toggle = useCallback(() => {
    if (audioRef.current?.paused) {
      if (
        state.options.playbackMode === "line" &&
        !loopRef.current &&
        songRef.current &&
        isFullyTimed(songRef.current)
      )
        repeatLine(currentIndex());
      else void playAudio();
    } else pause();
  }, [state.options.playbackMode, repeatLine, currentIndex, playAudio, pause]);
  const playSong = useCallback(
    (next: Song) => {
      selectSong(next);
      void playAudio();
    },
    [selectSong, playAudio],
  );
  const removeSong = useCallback(
    (id: string) => {
      if (songRef.current?.id === id) {
        pause();
        audioRef.current?.removeAttribute("src");
        audioRef.current?.load();
        songRef.current = null;
        setSong(null);
        setCurrentTime(0);
        setDuration(0);
        clearLoop();
      }
    },
    [pause, clearLoop],
  );
  const retry = useCallback(() => {
    audioRef.current?.load();
    void playAudio();
  }, [playAudio]);
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );
  useEffect(() => {
    const current = songRef.current;
    if (current && !songs.some((s) => s.id === current.id))
      removeSong(current.id);
  }, [songs, removeSong]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const a = audioRef.current,
        l = loopRef.current;
      if (a && !a.paused) {
        if (l && a.currentTime >= l.end) a.currentTime = l.start;
        if (now - last >= 90) {
          setCurrentTime(a.currentTime);
          last = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);
  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now(),
      position = audioRef.current?.currentTime || 0,
      elapsed = 0;
    const timer = setInterval(() => {
      const now = performance.now(),
        a = audioRef.current;
      if (
        a &&
        !a.paused &&
        !a.ended &&
        !a.seeking &&
        a.readyState >= 3 &&
        a.currentTime !== position
      )
        elapsed += Math.min(1, (now - last) / 1000);
      last = now;
      position = a?.currentTime || 0;
      if (elapsed >= 1) {
        addListening(elapsed);
        elapsed = 0;
      }
    }, 250);
    return () => {
      clearInterval(timer);
      if (elapsed > 0) addListening(elapsed);
    };
  }, [isPlaying, addListening]);
  const onEnded = () => {
    const a = audioRef.current;
    if (!a) return;
    const l = loopRef.current;
    if (l) {
      a.currentTime = l.start;
      void playAudio();
      return;
    }
    counted.current = false;
    a.currentTime = 0;
    void playAudio();
  };
  return {
    audioRef,
    song,
    currentTime,
    duration,
    isPlaying,
    audioError,
    volume,
    setVolume,
    loopActive: loop !== null,
    loopMessage,
    selectSong,
    playSong,
    seek,
    playAudio,
    pause,
    toggle,
    clearLoop,
    retry,
    repeatLine,
    toggleLineLoop,
    skipLine,
    onEnded,
    onPlay: () => {
      setIsPlaying(true);
      if (songRef.current) markPlayed(songRef.current.id, !counted.current);
      counted.current = true;
    },
    syncMetadata: () => {
      const a = audioRef.current;
      if (a) {
        setDuration(Number.isFinite(a.duration) ? a.duration : 0);
        a.volume = volume;
        a.playbackRate = 1;
        a.preservesPitch = true;
      }
    },
    syncTime: () => {
      const a = audioRef.current,
        l = loopRef.current;
      if (a) {
        if (l && a.currentTime >= l.end) a.currentTime = l.start;
        setCurrentTime(a.currentTime);
      }
    },
    onError: () => {
      if (songRef.current?.audioSrc) {
        setAudioError(
          "음원 파일을 읽을 수 없습니다. 파일 경로를 확인한 뒤 다시 재생하세요.",
        );
        setIsPlaying(false);
      }
    },
    onPause: () => setIsPlaying(false),
  };
}
type Player = ReturnType<typeof usePlayerStore>;
const Context = createContext<Player | null>(null);
export function PlayerProvider({
  songs,
  children,
}: {
  songs: Song[];
  children: ReactNode;
}) {
  const p = usePlayerStore(songs);
  return (
    <Context.Provider value={p}>
      <audio
        ref={p.audioRef}
        preload="metadata"
        aria-label="가사봄 공통 음원"
        onLoadedMetadata={p.syncMetadata}
        onDurationChange={p.syncMetadata}
        onTimeUpdate={p.syncTime}
        onPlay={p.onPlay}
        onPause={p.onPause}
        onEnded={p.onEnded}
        onError={p.onError}
      />
      {children}
    </Context.Provider>
  );
}
export function usePlayer() {
  const p = useContext(Context);
  if (!p) throw new Error("PlayerProvider is required");
  return p;
}
