import { promises as fs } from "node:fs";
import path from "node:path";
import { safeFile } from "./library-service";
export type LibraryFile = {
  name: string;
  kind: "MP3" | "JSON";
  bytes: number;
  modifiedAt: string;
  url?: string;
};
export async function getLibraryFiles(): Promise<LibraryFile[]> {
  const result: LibraryFile[] = [];
  const [songNames, audioNames] = await Promise.all([
    fs.readdir(path.join(process.cwd(), "content", "songs")).catch(() => []),
    fs.readdir(path.join(process.cwd(), "public", "audio")).catch(() => []),
  ]);
  for (const [directory, extension, kind, names] of [
    ["content/songs", ".json", "JSON", songNames],
    ["public/audio", ".mp3", "MP3", audioNames],
  ] as const) {
    for (const name of names) {
      if (name.startsWith("_") || !name.endsWith(extension)) continue;
      try {
        const filename = await safeFile(process.cwd(), `${directory}/${name}`),
          stat = await fs.lstat(filename);
        if (stat.isFile())
          result.push({
            name,
            kind,
            bytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            ...(kind === "MP3" ? { url: `/audio/${name}` } : {}),
          });
      } catch {
        /* A concurrently removed or invalid file must not break settings. */
      }
    }
  }
  return result.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}
