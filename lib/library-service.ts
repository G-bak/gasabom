import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { unzipSync, zipSync } from "fflate";
import { SONG_ID, validateSong, mediaPath } from "./song-schema.mjs";
import type { Song } from "./types";

export class LibraryError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const JSON_LIMIT = 10 * 1024 * 1024;
export const AUDIO_LIMIT = 100 * 1024 * 1024;
export const BACKUP_LIMIT = 250 * 1024 * 1024;
export const revision = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const allowed =
  /^(content\/songs\/[a-z0-9][a-z0-9-]{1,60}\.json|public\/audio\/[a-zA-Z0-9._/-]+\.mp3|public\/covers\/[a-zA-Z0-9._/-]+\.(?:svg|png|webp|jpe?g|avif))$/;
let tail: Promise<unknown> = Promise.resolve();
export function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = tail.then(fn, fn);
  tail = result.catch(() => undefined);
  return result;
}
export function ensureLocalRequest(request: Request, write = true) {
  const url = new URL(request.url);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw new LibraryError("localhost에서만 자료를 관리할 수 있습니다.", 403);
  // Next may construct request.url with localhost while the browser used 127.0.0.1.
  // Validate the original Host itself; never trust forwarded host headers.
  let host: URL;
  try {
    host = new URL(
      `${url.protocol}//${request.headers.get("host") || url.host}`,
    );
  } catch {
    throw new LibraryError("요청 주소를 확인하세요.", 403);
  }
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(host.hostname) ||
    host.port !== url.port
  )
    throw new LibraryError("localhost 주소로 접속하세요.", 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== host.origin)
    throw new LibraryError("다른 출처의 요청은 허용하지 않습니다.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new LibraryError("다른 사이트의 요청은 허용하지 않습니다.", 403);
  if (write && request.headers.get("x-gasabom-local") !== "1")
    throw new LibraryError("자료 관리 요청 헤더가 필요합니다.", 403);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > BACKUP_LIMIT + JSON_LIMIT)
    throw new LibraryError("요청 용량이 너무 큽니다.", 413);
}
export function apiError(error: unknown) {
  const known = error instanceof LibraryError;
  if (!known) console.error("가사봄 자료 처리 실패", error);
  return Response.json(
    {
      error: known
        ? error.message
        : "자료 처리를 완료하지 못했습니다. 파일과 폴더 권한을 확인하세요.",
    },
    { status: known ? error.status : 500 },
  );
}
export async function limitedBody(request: Request, limit: number) {
  if (!request.body) throw new LibraryError("요청 자료가 없습니다.");
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new LibraryError("요청 용량이 제한을 초과했습니다.", 413);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function limitedForm(request: Request, limit: number) {
  const bytes = await limitedBody(request, limit);
  try {
    return await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new LibraryError("파일 선택 요청의 형식을 확인하세요.");
  }
}
export async function safeFile(root: string, relative: string, create = false) {
  if (
    !allowed.test(relative) ||
    relative.includes("..") ||
    relative.includes("//") ||
    relative.includes("\\")
  )
    throw new LibraryError("허용된 자료 폴더 안의 파일만 사용할 수 있습니다.");
  const canonicalRoot = await fs.realpath(root);
  const parts = relative.split("/");
  let current = canonicalRoot;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    if (create)
      await fs.mkdir(current, { recursive: false }).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new LibraryError("연결된 폴더에는 자료를 저장하지 않습니다.");
    const resolved = await fs.realpath(current);
    if (!resolved.startsWith(canonicalRoot + path.sep))
      throw new LibraryError("자료 경로가 프로젝트 밖을 가리킵니다.");
  }
  const target = path.join(current, parts.at(-1)!);
  try {
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new LibraryError("일반 자료 파일만 사용할 수 있습니다.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return target;
}
export async function readData(root: string, relative: string) {
  try {
    return await fs.readFile(await safeFile(root, relative));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
type Change = { name: string; data: Uint8Array | null };
// Stage all files, retain originals until every replacement succeeds, then clean up.
export async function transaction(root: string, changes: Change[]) {
  const staged: {
    target: string;
    temp: string;
    backup: string;
    old: boolean;
    installed: boolean;
  }[] = [];
  try {
    for (const change of changes) {
      const target = await safeFile(root, change.name, true);
      if (staged.some((x) => x.target === target))
        throw new LibraryError("같은 파일을 두 번 변경할 수 없습니다.");
      const key = randomUUID();
      const item = {
        target,
        temp: target + `.${key}.tmp`,
        backup: target + `.${key}.bak`,
        old: false,
        installed: false,
      };
      staged.push(item);
      if (change.data !== null)
        await fs.writeFile(item.temp, change.data, { flag: "wx" });
    }
    for (let i = 0; i < staged.length; i++) {
      const item = staged[i];
      try {
        await fs.rename(item.target, item.backup);
        item.old = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (changes[i].data !== null) {
        await fs.rename(item.temp, item.target);
        item.installed = true;
      }
    }
  } catch (error) {
    for (const item of [...staged].reverse()) {
      if (item.installed) await fs.unlink(item.target);
      if (item.old) await fs.rename(item.backup, item.target);
    }
    throw error;
  } finally {
    for (const item of staged) {
      await fs.unlink(item.temp).catch(() => undefined);
      // A failed rollback must retain its backup, never silently delete it.
    }
  }
  for (const item of staged)
    if (item.old) await fs.unlink(item.backup).catch(() => undefined);
}
const songPath = (id: string) => {
  if (!SONG_ID.test(id)) throw new LibraryError("곡 id를 확인하세요.");
  return `content/songs/${id}.json`;
};
function validMp3(data: Uint8Array) {
  let offset = 0;
  if (data[0] === 73 && data[1] === 68 && data[2] === 51) {
    if (
      data.length < 10 ||
      ![2, 3, 4].includes(data[3]) ||
      [data[6], data[7], data[8], data[9]].some((n) => n > 127)
    )
      return false;
    offset =
      10 +
      (data[6] << 21) +
      (data[7] << 14) +
      (data[8] << 7) +
      data[9] +
      (data[3] === 4 && data[5] & 16 ? 10 : 0);
  }
  const header = (at: number) => {
    if (
      at + 4 > data.length ||
      data[at] !== 255 ||
      (data[at + 1] & 224) !== 224
    )
      return 0;
    const version = (data[at + 1] >> 3) & 3,
      layer = (data[at + 1] >> 1) & 3,
      rate = (data[at + 2] >> 4) & 15,
      freq = (data[at + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || rate === 0 || rate === 15 || freq === 3)
      return 0;
    const bitrate = (
      version === 3
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    )[rate];
    const sample =
      [44100, 48000, 32000][freq] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    return (
      Math.floor(((version === 3 ? 144000 : 72000) * bitrate) / sample) +
      ((data[at + 2] >> 1) & 1)
    );
  };
  for (let at = offset; at < Math.min(offset + 4096, data.length); at++) {
    const length = header(at);
    if (length && at + length < data.length && header(at + length)) return true;
  }
  return false;
}
function checkedSong(value: unknown, id?: string) {
  try {
    return validateSong(value, id, true);
  } catch (error) {
    throw new LibraryError((error as Error).message);
  }
}
export async function getStoredSong(root: string, id: string) {
  const bytes = await readData(root, songPath(id));
  if (!bytes) throw new LibraryError("곡 자료를 찾을 수 없습니다.", 404);
  if (bytes.length > JSON_LIMIT)
    throw new LibraryError("가사 JSON은 최대 10MB입니다.", 413);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new LibraryError("곡 JSON이 손상되었습니다. 원본 파일을 확인하세요.");
  }
  return { song: checkedSong(value, id), revision: revision(bytes) };
}
export async function saveSong(
  root: string,
  value: unknown,
  audio: Uint8Array | null,
  expectedRevision?: string,
) {
  let song = checkedSong(value);
  const destination = songPath(song.id);
  const previous = await readData(root, destination);
  if (expectedRevision === undefined && previous)
    throw new LibraryError(
      "같은 id의 곡이 있습니다. 보관함 관리에서 편집하세요.",
      409,
    );
  if (
    expectedRevision !== undefined &&
    (!previous || revision(previous) !== expectedRevision)
  )
    throw new LibraryError(
      "다른 작업에서 자료가 변경되었습니다. 다시 불러온 뒤 편집하세요.",
      409,
    );
  if (audio) {
    if (!audio.length || audio.length > AUDIO_LIMIT)
      throw new LibraryError(
        "MP3는 0바이트보다 크고 100MB 이하여야 합니다.",
        413,
      );
    if (!validMp3(audio))
      throw new LibraryError("MP3 파일의 내용과 형식을 확인하세요.");
    song = {
      ...song,
      audioSrc: `/audio/${song.id}.mp3`,
      audioRevision: revision(audio).slice(0, 16),
    };
  }
  const changes: Change[] = [];
  if (audio) changes.push({ name: `public/audio/${song.id}.mp3`, data: audio });
  if (
    song.audioSrc &&
    !audio &&
    !(await readData(root, `public${song.audioSrc}`))
  )
    throw new LibraryError(
      "연결할 MP3가 없습니다. 음원을 선택하거나 가사 전용으로 저장하세요.",
    );
  if (song.coverSrc && !(await readData(root, `public${song.coverSrc}`)))
    throw new LibraryError("연결된 커버 파일이 없습니다.");
  if (previous) {
    let old;
    try {
      old = JSON.parse(previous.toString("utf8"));
    } catch {
      throw new LibraryError(
        "기존 JSON이 손상되었습니다. 원본을 먼저 확인하세요.",
      );
    }
    song = {
      ...song,
      addedAt: old.addedAt || song.addedAt || new Date().toISOString(),
    };
  } else song = { ...song, addedAt: song.addedAt || new Date().toISOString() };
  const bytes = Buffer.from(JSON.stringify(song, null, 2) + "\n");
  if (bytes.length > JSON_LIMIT)
    throw new LibraryError("가사 JSON은 최대 10MB입니다.", 413);
  changes.push({ name: destination, data: bytes });
  await transaction(root, changes);
  return { song, revision: revision(bytes) };
}
export async function deleteSong(
  root: string,
  id: string,
  expectedRevision: string,
) {
  const stored = await getStoredSong(root, id);
  if (stored.revision !== expectedRevision)
    throw new LibraryError(
      "곡이 변경되었습니다. 다시 확인한 뒤 삭제하세요.",
      409,
    );
  // Keep media files: another song can share them, and deletion must be recoverable.
  await transaction(root, [{ name: songPath(id), data: null }]);
  return {
    id,
    retainedMedia: [stored.song.audioSrc, stored.song.coverSrc].filter(Boolean),
  };
}
export async function exportLibrary(root: string, songs: Song[]) {
  if (!songs.length) throw new LibraryError("백업할 곡이 없습니다.");
  const entries: Record<string, Uint8Array> = {};
  for (const song of songs) {
    for (const name of [
      songPath(song.id),
      ...(song.audioSrc ? [`public${song.audioSrc}`] : []),
      ...(song.coverSrc ? [`public${song.coverSrc}`] : []),
    ]) {
      if (entries[name]) continue;
      const bytes = await readData(root, name);
      if (!bytes)
        throw new LibraryError(
          `${name} 파일이 없습니다. 백업 전에 자료를 확인하세요.`,
        );
      entries[name] = bytes;
    }
  }
  if (Object.values(entries).reduce((n, b) => n + b.length, 0) > BACKUP_LIMIT)
    throw new LibraryError("곡 자료 백업은 최대 250MB입니다.", 413);
  entries["gasabom-manifest.json"] = Buffer.from(
    JSON.stringify({
      format: "gasabom-library-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      files: Object.keys(entries).sort(),
      hashes: Object.fromEntries(
        Object.entries(entries).map(([name, data]) => [name, revision(data)]),
      ),
    }),
  );
  return zipSync(entries, { level: 0 });
}
export async function inspectArchive(root: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > BACKUP_LIMIT)
    throw new LibraryError("백업 ZIP은 최대 250MB입니다.", 413);
  let total = 0;
  const names = new Set<string>();
  const portableNames = new Set<string>();
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (info) => {
        if (portableNames.has(info.name.toLowerCase()) || names.size >= 1000)
          throw new LibraryError(
            "ZIP에 중복 파일이 있거나 파일 수가 너무 많습니다.",
          );
        names.add(info.name);
        portableNames.add(info.name.toLowerCase());
        if (
          info.name !== "gasabom-manifest.json" &&
          (!allowed.test(info.name) ||
            info.name.includes("..") ||
            info.name.includes("//"))
        )
          throw new LibraryError("백업에 허용되지 않은 경로가 있습니다.");
        total += info.originalSize;
        const limit = info.name.endsWith(".mp3") ? AUDIO_LIMIT : JSON_LIMIT;
        if (
          total > BACKUP_LIMIT ||
          info.originalSize > limit ||
          ![0, 8].includes(info.compression)
        )
          throw new LibraryError("백업 용량 또는 압축 형식을 확인하세요.");
        return true;
      },
    });
  } catch (error) {
    if (error instanceof LibraryError) throw error;
    throw new LibraryError("ZIP 파일을 읽을 수 없습니다.");
  }
  let manifest;
  try {
    manifest = JSON.parse(
      Buffer.from(entries["gasabom-manifest.json"] || []).toString("utf8"),
    );
  } catch {
    throw new LibraryError("가사봄 곡 자료 백업 ZIP을 선택하세요.");
  }
  if (
    manifest.format !== "gasabom-library-backup" ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== names.size - 1 ||
    new Set(manifest.files).size !== manifest.files.length ||
    !manifest.files.every(
      (name: unknown) =>
        typeof name === "string" &&
        name !== "gasabom-manifest.json" &&
        names.has(name),
    )
  )
    throw new LibraryError("백업 버전 또는 자료 목록이 올바르지 않습니다.");
  delete entries["gasabom-manifest.json"];
  if (
    !manifest.hashes ||
    Object.keys(manifest.hashes).length !== Object.keys(entries).length ||
    Object.entries(entries).some(
      ([name, data]) => manifest.hashes[name] !== revision(data),
    )
  )
    throw new LibraryError(
      "백업 파일의 내용이 손상되었거나 자료 목록과 다릅니다.",
    );
  const songEntries = Object.entries(entries).filter(([name]) =>
    name.startsWith("content/songs/"),
  );
  if (!songEntries.length) throw new LibraryError("복원할 곡 자료가 없습니다.");
  const referenced = new Set(songEntries.map(([name]) => name));
  const songs: Song[] = [];
  for (const [name, data] of songEntries) {
    let value;
    try {
      value = JSON.parse(Buffer.from(data).toString("utf8"));
    } catch {
      throw new LibraryError(`${name}의 JSON 형식을 확인하세요.`);
    }
    const song = checkedSong(value, path.basename(name, ".json"));
    songs.push(song);
    for (const src of [song.audioSrc, song.coverSrc].filter(Boolean)) {
      const media = `public${src}`;
      referenced.add(media);
      if (!entries[media])
        throw new LibraryError(
          `${song.title}: 백업에 연결 자료 ${src}가 없습니다.`,
        );
    }
  }
  if (Object.keys(entries).some((name) => !referenced.has(name)))
    throw new LibraryError("곡과 연결되지 않은 파일이 백업에 있습니다.");
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith(".mp3") && !validMp3(data))
      throw new LibraryError("백업 MP3의 내용과 형식을 확인하세요.");
    if (name.endsWith(".svg")) {
      const svg = Buffer.from(data).toString("utf8");
      if (
        /<(?:script|foreignObject|iframe)|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?!#)|@import|url\(\s*["']?(?:https?:|data:|\/\/)|<!ENTITY/i.test(
          svg,
        )
      )
        throw new LibraryError(
          "스크립트나 외부 연결을 포함한 SVG는 복원할 수 없습니다.",
        );
    }
  }
  const conflicts: string[] = [];
  const versions: Record<string, string | null> = {};
  for (const [name, data] of Object.entries(entries)) {
    const old = await readData(root, name);
    versions[name] = old ? revision(old) : null;
    if (old && revision(old) !== revision(data)) conflicts.push(name);
  }
  return { entries, songs, conflicts, versions, digest: revision(bytes) };
}
export async function restoreArchive(
  root: string,
  bytes: Uint8Array,
  policy: string,
  expected: Record<string, string | null>,
) {
  if (!["merge", "replace"].includes(policy))
    throw new LibraryError("복원 방식을 선택하세요.");
  const plan = await inspectArchive(root, bytes);
  if (
    !expected ||
    Object.keys(expected).length !== Object.keys(plan.versions).length ||
    Object.entries(plan.versions).some(
      ([name, hash]) => expected[name] !== hash,
    )
  )
    throw new LibraryError(
      "자료가 변경되었습니다. 백업을 다시 확인하세요.",
      409,
    );
  if (policy === "merge" && plan.conflicts.length)
    throw new LibraryError(
      "같은 이름의 다른 자료가 있습니다. 교체를 선택하거나 충돌 없는 백업을 사용하세요.",
      409,
    );
  await transaction(
    root,
    Object.entries(plan.entries)
      .filter(([name, data]) => plan.versions[name] !== revision(data))
      .map(([name, data]) => ({ name, data })),
  );
  return { restored: plan.songs.map((song) => song.id) };
}
