"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CoverArt } from "./CoverArt";
import { SceneBackground } from "./SceneBackground";
import { PracticeTools } from "./PracticeTools";
import { Icon } from "./Icon";
import { usePlayer } from "@/lib/player";
import { usePracticeState } from "@/lib/storage";
import { isFullyTimed, type Song } from "@/lib/types";
export function SongPractice({ song }: { song: Song }) {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { state, toggleFavorite, toggleLearned } = usePracticeState();
  const {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    audioError,
    loopActive,
    loopMessage,
    selectSong,
    seek,
    toggle,
    repeatLine,
    toggleLineLoop,
  } = usePlayer();
  const [manualIndex, setManualIndex] = useState(0),
    [scrollPadding, setScrollPadding] = useState(0);
  useEffect(() => selectSong(song), [song, selectSong]);
  const hasAudio = !!song.audioSrc,
    synced = isFullyTimed(song),
    canRepeat = hasAudio && synced;
  const isFavorite = state.favorites.includes(song.id),
    learnedIds = state.learned[song.id] || [],
    learnedCount = song.lines.filter((l) => learnedIds.includes(l.id)).length;
  const activeIndex = useMemo(() => {
    if (!synced || !hasAudio || !duration)
      return Math.min(manualIndex, Math.max(0, song.lines.length - 1));
    let index = 0;
    for (let i = 0; i < song.lines.length; i++) {
      const line = song.lines[i];
      if (currentTime >= line.start!) index = i;
      if (currentTime >= line.start! && currentTime < line.end!) return i;
    }
    return index;
  }, [currentTime, duration, hasAudio, manualIndex, song.lines, synced]);
  const selectLine = useCallback(
    (index: number) => {
      const line = song.lines[index];
      if (!line) return;
      setManualIndex(index);
      if (synced && hasAudio && duration && line.start !== undefined) {
        if (loopActive) repeatLine(index, !audioRef.current?.paused);
        else seek(line.start);
      }
    },
    [
      song.lines,
      synced,
      hasAudio,
      duration,
      loopActive,
      repeatLine,
      seek,
      audioRef,
    ],
  );
  useEffect(() => {
    if (!state.options.autoScroll) {
      setScrollPadding(0);
      return;
    }
    const last = rowRefs.current[song.lines.length - 1];
    if (!last) return;
    let frame = 0;
    const measureSpace = () => {
      if (!last.getClientRects().length) return;
      const rect = last.getBoundingClientRect();
      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const playerHeight =
        document.querySelector(".player-dock")?.getBoundingClientRect()
          .height ?? 0;
      const lastCenteredScroll =
        window.scrollY +
        rect.top +
        rect.height / 2 -
        (headerHeight + window.innerHeight - playerHeight) / 2;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollPadding((current) => {
        const needed = Math.max(
          0,
          Math.ceil(lastCenteredScroll - maxScroll + current),
        );
        return Math.abs(needed - current) > 1 ? needed : current;
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureSpace);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(last);
    const header = document.querySelector("header");
    const dock = document.querySelector(".player-dock");
    if (header) observer.observe(header);
    if (dock) observer.observe(dock);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [
    song.lines.length,
    state.options.autoScroll,

    state.options.fontSize,
    state.options.showJapanese,
    state.options.showPronunciation,
    state.options.showTranslation,
  ]);

  useEffect(() => {
    if (!state.options.autoScroll || !rowRefs.current[activeIndex]) return;
    const target = rowRefs.current[activeIndex];
    if (!target || !target.getClientRects().length) return;
    const rect = target.getBoundingClientRect();
    const headerHeight =
      document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const playerHeight =
      document.querySelector(".player-dock")?.getBoundingClientRect().height ??
      0;
    const visibleHeight = window.innerHeight - headerHeight - playerHeight;
    window.scrollTo({
      top:
        window.scrollY +
        rect.top -
        headerHeight -
        (visibleHeight - rect.height) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [
    activeIndex,
    state.options.autoScroll,
    isPlaying,
    scrollPadding,

    state.options.fontSize,
    state.options.showJapanese,
    state.options.showPronunciation,
    state.options.showTranslation,
  ]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        seek(currentTime + (event.code === "ArrowLeft" ? -5 : 5));
      } else if (event.key.toLowerCase() === "r" && canRepeat) {
        event.preventDefault();
        toggleLineLoop();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [toggle, seek, currentTime, canRepeat, toggleLineLoop]);
  const columns = [
    state.options.showJapanese,
    state.options.showPronunciation,
    state.options.showTranslation,
  ].filter(Boolean).length;
  return (
    <main
      className="song-page"
      style={
        {
          "--lyric-cols": columns,
          "--lyric-gap-total": `${(columns - 1) * 18}px`,
          "--lyric-font-size": `${state.options.fontSize}px`,
        } as CSSProperties
      }
    >
      <section className="practice-hero">
        <SceneBackground scene="practice" priority />
        <div className="container">
          <div className="song-intro">
            <CoverArt song={song} size="large" />
            <div className="song-intro-copy">
              <span className="pill">{song.genre || "J-POP"}</span>
              <h1>{song.title}</h1>
              {song.titleJa && (
                <p className="song-japanese-title" lang="ja">
                  {song.titleJa}
                </p>
              )}
              <strong className="song-artist">{song.artist}</strong>
              {song.description && (
                <p className="song-intro-description">{song.description}</p>
              )}
              <div className="song-intro-tags">
                {song.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
                <span>{song.difficulty}</span>
                <span>{song.lines.length}줄 가사</span>
              </div>
            </div>
            <button
              className={`favorite-hero ${isFavorite ? "is-favorite" : ""}`}
              aria-label="이 곡 즐겨찾기"
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite(song.id)}
            >
              <Icon name="heart" size={24} />
            </button>
          </div>
        </div>
      </section>

      <div className="container practice-container">
        {!hasAudio && (
          <p className="inline-notice">
            음원이 없는 곡은 가사를 직접 선택해 읽을 수 있습니다.
          </p>
        )}
        {audioError && (
          <p className="inline-notice notice-error" role="alert">
            {audioError}
          </p>
        )}
        <div className="practice-workspace">
          <section className="lyrics-panel" aria-label="가사 연습">
            <div className="lyrics-card-backgrounds" aria-hidden="true">
              {Array.from({ length: columns }, (_, i) => (
                <div key={i} />
              ))}
            </div>
            <div className="lyrics-columns-header">
              {state.options.showJapanese && (
                <div>
                  <span className="number-badge">01</span>
                  <div>
                    <strong>일본어 원문</strong>
                    <p>원문 가사를 확인하세요.</p>
                  </div>
                </div>
              )}
              {state.options.showPronunciation && (
                <div>
                  <span className="number-badge">02</span>
                  <div>
                    <strong>한글 발음</strong>
                    <p>한글 발음을 보며 따라 부르세요.</p>
                  </div>
                </div>
              )}
              {state.options.showTranslation && (
                <div>
                  <span className="number-badge badge-2">03</span>
                  <div>
                    <strong>한국어 뜻</strong>
                    <p>가사의 뜻을 확인하세요.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="lyrics-scroll">
              {song.lines.map((line, index) => {
                const active = index === activeIndex,
                  mastered = learnedIds.includes(line.id);
                return (
                  <div
                    className="lyric-wrapper"
                    key={line.id}
                    ref={(element) => {
                      rowRefs.current[index] = element;
                    }}
                  >
                    <div
                      className={`lyric-row ${active ? "is-active" : ""} ${mastered ? "is-mastered" : ""}`}
                    >
                      <div className="lyric-rail">
                        <span className="lyric-num">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          className={`line-check ${mastered ? "checked" : ""}`}
                          aria-label={`${index + 1}번 가사 ${mastered ? "학습 체크 취소" : "외웠다고 체크"}`}
                          aria-pressed={mastered}
                          onClick={() => toggleLearned(song.id, line.id)}
                        >
                          <Icon name="check" size={13} />
                        </button>
                      </div>
                      <button
                        className="lyric-content"
                        onClick={() => selectLine(index)}
                        aria-label={`${index + 1}번 가사 ${synced ? "구간으로 이동" : "선택"}`}
                      >
                        {state.options.showJapanese && (
                          <span
                            className="lyric-original"
                            lang="ja"
                            data-line-number={String(index + 1).padStart(
                              3,
                              "0",
                            )}
                          >
                            {line.ja}
                          </span>
                        )}
                        {state.options.showPronunciation && (
                          <span
                            className="lyric-pronunciation"
                            lang="ko"
                            data-line-number={String(index + 1).padStart(
                              3,
                              "0",
                            )}
                          >
                            {line.koPronunciation}
                          </span>
                        )}
                        {state.options.showTranslation && (
                          <span
                            className="lyric-translation"
                            lang="ko"
                            data-line-number={String(index + 1).padStart(
                              3,
                              "0",
                            )}
                          >
                            {line.koTranslation}
                          </span>
                        )}
                      </button>
                      <button
                        className="line-repeat"
                        aria-label={`${index + 1}번 줄 반복 재생`}
                        title={`${index + 1}번 줄 반복 재생`}
                        disabled={!canRepeat || !duration}
                        onClick={() => repeatLine(index)}
                      >
                        <Icon name="repeat" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div aria-hidden="true" style={{ height: scrollPadding }} />
            <div className="lyrics-foot">
              <span>
                <Icon name="check-circle" size={16} />
                {learnedCount} / {song.lines.length}줄 학습 체크
              </span>
              {loopMessage && <span role="status">{loopMessage}</span>}
            </div>
          </section>
          <PracticeTools
            song={song}
            lineId={song.lines[activeIndex]?.id}
            canPlay={canRepeat && duration > 0}
            onPlayWord={(word) => {
              const index = song.lines.findIndex((l) => l.id === word.lineId);
              if (index >= 0) repeatLine(index);
            }}
          />
        </div>
        <p className="song-bottom-note">
          <Icon name="info" size={16} />
          {synced
            ? "가사를 누르면 해당 시간으로 이동합니다. 반복 아이콘으로 한 줄을 반복할 수 있습니다."
            : "시간 정보가 없는 곡은 가사를 직접 선택해 읽으세요."}
        </p>
      </div>
    </main>
  );
}
