import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { validateSong, SONG_ID } from "./song-schema.mjs";
import type { Song } from "./types";
import { safeDataFile } from "./data-files";
export type SongIssue = { file: string; message: string };
export async function getCatalogue(root = process.cwd()) {
  const directory = path.join(root, "content", "songs");
  const issues: SongIssue[] = [];
  let names: string[];
  try {
    names = await fs.readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      issues.push({
        file: "content/songs",
        message: "곡 폴더를 읽을 수 없습니다. 폴더 권한을 확인하세요.",
      });
    return { songs: [] as Song[], issues };
  }
  const results = await Promise.all(
    names
      .filter((n) => n.endsWith(".json") && !n.startsWith("_"))
      .map(async (file) => {
        try {
          if (!SONG_ID.test(file.slice(0, -5)))
            throw new Error("파일명은 영문 소문자·숫자·하이픈으로 작성하세요.");
          const filename = await safeDataFile(root, `content/songs/${file}`);
          const stat = await fs.lstat(filename);
          if (!stat.isFile() || stat.size > 10 * 1024 * 1024)
            throw new Error("일반 JSON 파일(최대 10MB)만 사용할 수 있습니다.");
          const song = validateSong(
            JSON.parse(await fs.readFile(filename, "utf8")),
            file.slice(0, -5),
          );
          let audioRevision = song.audioRevision;
          if (song.audioSrc) {
            try {
              const audio = await fs.readFile(
                await safeDataFile(root, `public${song.audioSrc}`),
              );
              audioRevision = createHash("sha256")
                .update(audio)
                .digest("hex")
                .slice(0, 16);
            } catch {
              throw new Error(
                "연결된 MP3를 읽을 수 없습니다. 빌드 전에 음원을 확인하세요.",
              );
            }
          }
          return {
            ...song,
            ...(audioRevision ? { audioRevision } : {}),
            addedAt: song.addedAt || stat.birthtime.toISOString(),
          };
        } catch (error) {
          issues.push({
            file,
            message:
              error instanceof Error
                ? error.message
                : "자료를 읽을 수 없습니다.",
          });
          return null;
        }
      }),
  );
  return {
    songs: results
      .filter((s): s is Song & { addedAt: string } => s !== null)
      .sort((a, b) => a.title.localeCompare(b.title, "ko")),
    issues: issues.sort((a, b) => a.file.localeCompare(b.file)),
  };
}
export async function getAllSongs(): Promise<Song[]> {
  return (await getCatalogue()).songs;
}
export async function getSongById(id: string): Promise<Song | null> {
  if (!SONG_ID.test(id)) return null;
  return (await getCatalogue()).songs.find((song) => song.id === id) || null;
}
