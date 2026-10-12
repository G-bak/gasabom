import { access, readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  readSongFiles,
  songBuildSnapshot,
  checkActiveAudio,
} from "./song-files.mjs";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function verifyExport(root = process.cwd()) {
  const out = path.join(root, "out"),
    songs = await readSongFiles(root);
  if (songs.length > 1) throw new Error("한 번에 한 곡만 내보낼 수 있습니다.");
  await checkActiveAudio(root);
  const info = JSON.parse(
    await readFile(path.join(out, "build-info.json"), "utf8"),
  );
  if (
    info.format !== "gasabom-static-build" ||
    info.version !== 1 ||
    JSON.stringify(info.songs) !== JSON.stringify(await songBuildSnapshot(root))
  )
    throw new Error(
      "현재 곡 자료와 정적 출력이 다릅니다. npm run build를 다시 실행하세요.",
    );
  for (const file of ["index.html", "library/index.html", "404.html"])
    await access(path.join(out, file));
  for (const retired of ["api", "settings"]) {
    try {
      await access(path.join(out, retired));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    throw new Error(`정적 출력에 제거한 ${retired} 경로가 남아 있습니다.`);
  }
  const generated = (
    await readdir(path.join(out, "songs"), { withFileTypes: true }).catch(
      (error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      },
    )
  )
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  if (
    generated.length !== songs.length ||
    generated.some((id) => !songs.some((s) => s.id === id))
  )
    throw new Error("정적 출력의 곡 목록이 현재 곡 자료와 다릅니다.");
  for (const song of songs) {
    await access(path.join(out, "songs", song.id, "index.html"));
    for (const src of [song.audioSrc, song.coverSrc].filter(Boolean)) {
      const source = path.join(root, "public", src),
        target = path.join(out, src);
      if (
        !(await stat(target)).isFile() ||
        hash(await readFile(source)) !== hash(await readFile(target))
      )
        throw new Error(`정적 자료가 원본과 다릅니다: ${src}`);
    }
  }
  return { songs: songs.map((s) => s.title), pages: generated.length };
}
