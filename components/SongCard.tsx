"use client";
import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { usePracticeState } from "@/lib/storage";
import type { Song } from "@/lib/types";
import { usePlayer } from "@/lib/player";
export function SongCard({
  song,
  compact = false,
}: {
  song: Song;
  compact?: boolean;
}) {
  const { state, toggleFavorite } = usePracticeState();
  const player = usePlayer();
  const learned = song.lines.filter((l) =>
      state.learned[song.id]?.includes(l.id),
    ).length,
    percent = song.lines.length
      ? Math.round((learned / song.lines.length) * 100)
      : 0,
    favorite = state.favorites.includes(song.id);
  return (
    <article className={`song-card ${compact ? "song-card-compact" : ""}`}>
      <div className="song-card-image">
        <Link
          href={`/songs/${song.id}`}
          aria-label={`${song.title} 연습실 열기`}
        >
          <CoverArt song={song} />
        </Link>
        <button
          type="button"
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          aria-label={`${song.title} 즐겨찾기 ${favorite ? "해제" : "추가"}`}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(song.id)}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>
      <div className="song-card-body">
        <Link className="song-card-title" href={`/songs/${song.id}`}>
          {song.title}
        </Link>
        <p className="song-card-artist">{song.artist}</p>
        {!compact && (
          <>
            <div className="song-card-tags">
              <span>{song.genre || "J-POP"}</span>
              <span>{song.difficulty}</span>
              {!song.audioSrc && <span className="tag-muted">가사 전용</span>}
            </div>
            <div className="card-progress">
              <button
                type="button"
                disabled={!song.audioSrc}
                onClick={() => player.playSong(song)}
                aria-label={`${song.title} 연습 시작`}
                className="card-play"
              >
                <Icon name="play" size={13} />
              </button>
              <div className="progress-track">
                <span style={{ width: `${percent}%` }} />
              </div>
              <strong>{percent}%</strong>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
