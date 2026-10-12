import { readdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { songBuildSnapshot } from "./song-files.mjs";
// Next 16.4 emits nested segment files but requests flattened names during navigation.
// Materialize those aliases so ordinary static hosts need no rewrite/backend.
export async function prepareExport(root = process.cwd()) {
  const out = path.join(root, "out"),
    files = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name === "_next") continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(".txt")) files.push(file);
    }
  }
  await walk(out);
  let aliases = 0;
  for (const source of files) {
    const parts = path.relative(out, source).split(path.sep),
      index = parts.findIndex((part) => part.startsWith("__next."));
    if (index < 0 || index === parts.length - 1) continue;
    const destination = path.join(
      out,
      ...parts.slice(0, index),
      parts.slice(index).join("."),
    );
    await copyFile(source, destination);
    aliases++;
  }
  await writeFile(
    path.join(out, "build-info.json"),
    JSON.stringify(
      {
        format: "gasabom-static-build",
        version: 1,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        songs: await songBuildSnapshot(root),
      },
      null,
      2,
    ) + "\n",
  );
  return aliases;
}
