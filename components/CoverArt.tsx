"use client";
import { useEffect, useState } from "react";
import type { Song } from "@/lib/types";

type Props = {
  song: Song;
  size?: "small" | "card" | "large";
  displayTitle?: boolean;
};
const defaultCovers = {
  violet: "/covers/default.svg",
  midnight: "/covers/default.svg",
  blue: "/covers/default.svg",
  mint: "/covers/default.svg",
  peach: "/covers/default.svg",
};

export function CoverArt({ song, size = "card", displayTitle = true }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [song.coverSrc, song.id]);
  return (
    <div
      className={`cover-art theme-${song.coverTheme || "violet"} cover-${size}`}
    >
      {song.coverSrc && !failed && (
        <img
          className="cover-custom-img"
          src={song.coverSrc}
          alt={`${song.title} 곡 커버`}
          onError={() => setFailed(true)}
        />
      )}
      {(!song.coverSrc || failed) && (
        <img
          className="cover-custom-img"
          src={defaultCovers[song.coverTheme || "blue"]}
          alt={`${song.title} 기본 아트워크`}
          loading="lazy"
        />
      )}
      {(!song.coverSrc || failed) && (
        <>
          {displayTitle && (
            <span className="cover-art-title">
              {song.titleJa || song.title}
            </span>
          )}
        </>
      )}
    </div>
  );
}
