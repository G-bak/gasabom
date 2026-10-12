import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSongFiles, songCommitMessage } from "./song-files.mjs";
import { verifyExport } from "./verify-export.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const basePath = "/gasabom";
const git = (args, cwd = root) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const npm = (script, deployPath) => {
  if (!process.env.npm_execpath)
    throw new Error("npm run deploy:pages로 실행하세요.");
  execFileSync(process.execPath, [process.env.npm_execpath, "run", script], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: deployPath },
  });
};

let temporary;
let rebuildLocal = false;
try {
  if (git(["status", "--porcelain"]))
    throw new Error("변경 사항을 먼저 현재 곡 이름으로 커밋하고 main에 업로드하세요.");
  if (git(["branch", "--show-current"]) !== "main")
    throw new Error("main 브랜치에서 배포하세요.");
  const remote = git(["remote", "get-url", "origin"]);
  if (!/^(https:\/\/github\.com\/G-bak\/gasabom(?:\.git)?|git@github\.com:G-bak\/gasabom\.git)$/i.test(remote))
    throw new Error("origin이 G-bak/gasabom 저장소인지 확인하세요.");
  const source = git(["rev-parse", "HEAD"]);
  if (git(["ls-remote", "origin", "refs/heads/main"]).split(/\s/)[0] !== source)
    throw new Error("현재 main 커밋을 git push한 뒤 배포하세요.");
  const songs = await readSongFiles(root);
  if (songs.length !== 1) throw new Error("배포할 곡을 한 개만 준비하세요.");

  rebuildLocal = true;
  npm("build", basePath);
  await verifyExport(root, { basePath });
  npm("typecheck", basePath);
  temporary = await mkdtemp(path.join(os.tmpdir(), "gasabom-pages-"));
  if (git(["ls-remote", "origin", "refs/heads/gh-pages"])) {
    execFileSync("git", ["clone", "--depth", "1", "--branch", "gh-pages", "--single-branch", remote, temporary], { stdio: "inherit" });
  } else {
    git(["init", "-b", "gh-pages"], temporary);
    git(["remote", "add", "origin", remote], temporary);
  }
  for (const entry of await readdir(temporary)) {
    if (entry === ".git") continue;
    const target = path.resolve(temporary, entry);
    if (!target.startsWith(path.resolve(temporary) + path.sep))
      throw new Error("배포 임시 폴더 범위를 벗어났습니다.");
    await rm(target, { recursive: true, force: true });
  }
  await cp(path.join(root, "out"), temporary, { recursive: true });
  await writeFile(path.join(temporary, ".nojekyll"), "");
  for (const field of ["user.name", "user.email"])
    git(["config", field, git(["config", field])], temporary);
  git(["add", "--all"], temporary);
  if (git(["diff", "--cached", "--name-only"], temporary)) {
    git(["commit", "-m", songCommitMessage(songs[0], `GitHub Pages 배포 (${source.slice(0, 7)})`)], temporary);
    execFileSync("git", ["push", "origin", "HEAD:refs/heads/gh-pages"], { cwd: temporary, stdio: "inherit" });
  }
  console.log("Pages 정적 파일 업로드 완료: https://g-bak.github.io/gasabom/");
  console.log("실제 게시 상태는 GitHub Pages/Actions에서 확인하세요.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (temporary) {
    const checked = path.resolve(temporary);
    if (checked.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(checked).startsWith("gasabom-pages-"))
      await rm(checked, { recursive: true, force: true });
  }
  if (rebuildLocal) {
    console.log("로컬 미리보기용 기본 경로로 다시 빌드합니다.");
    try { npm("build", process.env.NEXT_PUBLIC_BASE_PATH || ""); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
