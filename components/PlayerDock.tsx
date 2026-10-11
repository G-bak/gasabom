"use client";
import Link from "next/link";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";
import { usePlayer } from "@/lib/player";
import { isFullyTimed } from "@/lib/types";
import { SETTINGS_VISIBLE } from "@/lib/features";
const stamp = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
export function PlayerDock() {
  const p = usePlayer(),
    song = p.song;
  if (!song) return null;
  const progress = p.duration ? (p.currentTime / p.duration) * 100 : 0,
    canRepeat =
      !!song.audioSrc && isFullyTimed(song) && p.duration > 0 && !p.isPreview;
  const now = (
    <>
      <CoverArt song={song} size="small" displayTitle={false} />
      <div>
        <strong>{song.title}</strong>
        <span>{song.artist}</span>
      </div>
    </>
  );
  return (
    <div className="player-dock" aria-label="음원 재생기">
      <div className="player-layout">
        {p.isPreview ? (
          <div className="player-now">{now}</div>
        ) : (
          <Link className="player-now" href={`/songs/${song.id}`}>
            {now}
          </Link>
        )}
        <div className="player-main-controls">
          <div className="transport-buttons">
            <button
              aria-label="이전 가사 줄"
              title="이전 가사 줄"
              disabled={!canRepeat}
              onClick={() => p.skipLine(-1)}
            >
              <Icon name="skip-back" size={21} />
            </button>
            <button
              aria-label="5초 뒤로"
              title="5초 뒤로"
              disabled={!p.duration}
              onClick={() => p.seek(p.currentTime - 5)}
            >
              <Icon name="rewind" size={20} />
            </button>
            <button
              className="play-button"
              disabled={!song.audioSrc}
              aria-label={p.isPlaying ? "일시정지" : "재생"}
              title={p.isPlaying ? "일시정지" : "재생 · 현재 곡 반복"}
              onClick={p.toggle}
            >
              <Icon name={p.isPlaying ? "pause" : "play"} size={22} />
            </button>
            <button
              aria-label="5초 앞으로"
              title="5초 앞으로"
              disabled={!p.duration}
              onClick={() => p.seek(p.currentTime + 5)}
            >
              <Icon name="fast-forward" size={20} />
            </button>
            <button
              aria-label="다음 가사 줄"
              title="다음 가사 줄"
              disabled={!canRepeat}
              onClick={() => p.skipLine(1)}
            >
              <Icon name="skip-forward" size={21} />
            </button>
          </div>
          <div className="player-timeline">
            <span>{stamp(p.currentTime)}</span>
            <input
              aria-label="음원 재생 위치"
              type="range"
              min={0}
              max={p.duration || 1}
              step={0.1}
              value={Math.min(p.currentTime, p.duration || 1)}
              disabled={!p.duration}
              onChange={(e) => p.seek(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right,#4487ef ${progress}%,#dce8fb ${progress}%)`,
              }}
            />
            <span>{stamp(p.duration)}</span>
          </div>
        </div>
        <div className="player-extra-controls">
          <button
            className={`line-loop-toggle ${p.loopActive ? "active" : ""}`}
            aria-label={
              p.loopActive ? "현재 가사 줄 반복 해제" : "현재 가사 줄 반복"
            }
            title={
              p.loopActive
                ? "현재 가사 줄 반복 해제 · 현재 곡 반복으로 돌아가기"
                : "현재 가사 줄 반복"
            }
            aria-pressed={p.loopActive}
            disabled={!canRepeat}
            onClick={p.toggleLineLoop}
          >
            <Icon name="repeat" size={21} />
            <span aria-hidden="true">1</span>
          </button>
          <label className="volume-control">
            <Icon name={p.volume === 0 ? "volume-off" : "volume"} size={20} />
            <input
              aria-label="음량 조절"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.volume}
              onChange={(e) => p.setVolume(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
      {p.audioError && (
        <div className="player-error" role="alert">
          {p.audioError} <button onClick={p.retry}>다시 재생</button>
          {SETTINGS_VISIBLE && <Link href="/settings">자료 관리</Link>}
        </div>
      )}
    </div>
  );
}
