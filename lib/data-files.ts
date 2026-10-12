// Build/CLI only. The exported site never reads the filesystem at runtime.
import { promises as fs } from "node:fs";
import path from "node:path";
export async function safeDataFile(root: string, relative: string) {
  if (
    !/^(content\/songs\/|public\/(audio|covers)\/)[a-zA-Z0-9._/-]+$/.test(
      relative,
    ) ||
    relative.includes("..") ||
    relative.includes("//")
  )
    throw new Error("허용된 곡 자료 경로가 아닙니다.");
  const base = await fs.realpath(root);
  let current = base;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink())
      throw new Error("연결된 자료 폴더/파일은 사용할 수 없습니다.");
    const resolved = await fs.realpath(current);
    if (!resolved.startsWith(base + path.sep))
      throw new Error("프로젝트 밖의 자료를 사용할 수 없습니다.");
  }
  if (!(await fs.lstat(current)).isFile())
    throw new Error("일반 자료 파일만 사용할 수 있습니다.");
  return current;
}
