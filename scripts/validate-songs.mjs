import { readdir, readFile, access, lstat } from "node:fs/promises";
import path from "node:path";
import { validateSong } from "../lib/song-schema.mjs";
let count = 0,
  errors = 0,
  warnings = 0;
const directory = path.join(process.cwd(), "content", "songs");
for (const file of await readdir(directory)) {
  if (!file.endsWith(".json") || file.startsWith("_")) continue;
  try {
    const filename = path.join(directory, file);
    const stat = await lstat(filename);
    if (!stat.isFile() || stat.size > 10 * 1024 * 1024)
      throw new Error("일반 JSON 파일(최대 10MB)만 사용할 수 있습니다.");
    const song = validateSong(
      JSON.parse(await readFile(filename, "utf8")),
      file.slice(0, -5),
    );
    count++;
    for (const src of [song.audioSrc, song.coverSrc].filter(Boolean)) {
      try {
        await access(path.join(process.cwd(), "public", src));
      } catch {
        warnings++;
        console.warn(` ! ${file}: 연결 파일이 없습니다: ${src}`);
      }
    }
    console.log(` ✓ ${file} (${song.lines.length}줄)`);
  } catch (error) {
    errors++;
    console.error(` ✗ ${file}: ${error.message}`);
  }
}
console.log(`검증 결과: ${count}곡, 오류 ${errors}건, 경고 ${warnings}건`);
if (errors) process.exitCode = 1;
