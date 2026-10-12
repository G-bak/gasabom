import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validateSong } from "../lib/song-schema.mjs";
import { createHash } from "node:crypto";
export async function readSongFiles(root = process.cwd()) {
  const folder = path.join(root, "content", "songs");
  const names = await readdir(folder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const songs = [];
  for (const name of names
    .filter((n) => n.endsWith(".json") && !n.startsWith("_"))
    .sort())
    songs.push(
      validateSong(
        JSON.parse(await readFile(path.join(folder, name), "utf8")),
        name.slice(0, -5),
      ),
    );
  return songs;
}
export function songCommitMessage(song, description = "곡 자료 교체") {
  return `${song.title.replace(/\s+/g, " ").trim()}: ${description.replace(/\s+/g, " ").trim() || "곡 자료 교체"}`;
}
export async function songBuildSnapshot(root = process.cwd()) {
  const songs = await readSongFiles(root);
  const fingerprint = async (file) =>
    createHash("sha256")
      .update(await readFile(path.join(root, file)))
      .digest("hex");
  return Promise.all(
    songs.map(async (song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      lyricsSha256: await fingerprint(`content/songs/${song.id}.json`),
      audioSrc: song.audioSrc,
      audioSha256: song.audioSrc
        ? await fingerprint(`public${song.audioSrc}`)
        : null,
      coverSrc: song.coverSrc || null,
      coverSha256: song.coverSrc
        ? await fingerprint(`public${song.coverSrc}`)
        : null,
    })),
  );
}
export async function checkActiveAudio(root = process.cwd()) {
  const songs = await readSongFiles(root),
    expected = new Set(songs.map((s) => s.audioSrc).filter(Boolean)),
    actual = [];
  async function walk(folder, prefix) {
    for (const entry of await readdir(folder, { withFileTypes: true }).catch(
      (error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      },
    )) {
      if (entry.isSymbolicLink())
        throw new Error("연결된 음원 폴더/파일은 사용할 수 없습니다.");
      if (entry.isDirectory())
        await walk(path.join(folder, entry.name), `${prefix}/${entry.name}`);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
        actual.push(`${prefix}/${entry.name}`);
    }
  }
  await walk(path.join(root, "public/audio"), "/audio");
  const extra = actual.filter((src) => !expected.has(src));
  if (extra.length)
    throw new Error(
      `현재 곡과 연결되지 않은 MP3를 백업 폴더로 옮기세요: ${extra.join(", ")}`,
    );
}
