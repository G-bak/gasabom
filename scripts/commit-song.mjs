import { execFileSync } from "node:child_process";
import { readSongFiles, songCommitMessage } from "./song-files.mjs";
import { verifyExport } from "./verify-export.mjs";
try {
  const songs = await readSongFiles();
  if (songs.length !== 1)
    throw new Error(
      "곡 이름으로 커밋하려면 활성 곡 JSON을 한 개만 준비하세요.",
    );
  const args = process.argv.slice(2),
    preview = args[0] === "--preview";
  const message = songCommitMessage(
    songs[0],
    args.filter((a) => a !== "--preview").join(" "),
  );
  console.log(`커밋 메시지: ${message}`);
  if (!preview) {
    await verifyExport();
    execFileSync("git", ["commit", "-m", message], { stdio: "inherit" });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
