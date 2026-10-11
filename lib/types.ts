export type CoverTheme = "violet" | "mint" | "peach" | "blue" | "midnight";
export type Difficulty = "쉬움" | "보통" | "어려움";
export type PlaybackMode = "song" | "line";

export type LyricLine = {
  id: string;
  ja: string;
  koPronunciation: string;
  koTranslation: string;
  section?: string;
  start?: number;
  end?: number;
};

export type Song = {
  id: string;
  title: string;
  titleJa?: string;
  artist: string;
  description?: string;
  genre?: string;
  difficulty: Difficulty;
  coverTheme: CoverTheme;
  coverSrc?: string;
  audioSrc: string;
  audioRevision?: string;
  addedAt?: string;
  tags: string[];
  lines: LyricLine[];
  studyWords?: {
    id: string;
    ja: string;
    reading: string;
    koPronunciation?: string;
    meaning: string;
    lineId: string;
  }[];
};

export const SECTION_LABELS: Record<string, string> = {
  intro: "인트로",
  verse: "벌스",
  prechorus: "프리코러스",
  chorus: "후렴",
  bridge: "브리지",
  outro: "아웃트로",
};

export function isFullyTimed(song: Song) {
  return (
    song.lines.length > 0 &&
    song.lines.every(
      (line) =>
        Number.isFinite(line.start) &&
        Number.isFinite(line.end) &&
        (line.start as number) >= 0 &&
        (line.end as number) > (line.start as number),
    )
  );
}
