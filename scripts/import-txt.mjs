import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseTxt } from "../lib/song-schema.mjs";
try {
  if (!process.argv[2])
    throw new Error("사용법: npm run import:txt -- content/txt/곡.txt");
  const song = parseTxt(await readFile(path.resolve(process.argv[2]), "utf8"));
  const directory = path.join(process.cwd(), "content", "songs");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${song.id}.json`),
    JSON.stringify(song, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(
    `변환 완료: ${song.id}.json (${song.lines.length}줄). 원문·발음·뜻은 입력 자료 그대로입니다.`,
  );
} catch (error) {
  console.error(`변환 실패: ${error.message}`);
  process.exitCode = 1;
}
