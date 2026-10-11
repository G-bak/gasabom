import type { Song } from "./types";
export const SONG_ID: RegExp;
export function mediaPath(value: unknown, kind: "audio" | "covers"): boolean;
export function validateSong(
  value: unknown,
  expectedId?: string,
  aliases?: boolean,
): Song;
export function parseTxt(contents: string): Song;
