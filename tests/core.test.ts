import test from "node:test";

test("기본 현재 곡 반복과 이전 재생 방식 이관", () => {
  assert.equal(DEFAULT_STATE.options.playbackMode, "song");
  for (const mode of ["once", "auto", "song"])
    assert.equal(
      normalisePractice({ options: { playbackMode: mode } }).options
        .playbackMode,
      "song",
    );
  assert.equal(
    normalisePractice({ options: { playbackMode: "line" } }).options
      .playbackMode,
    "line",
  );
});
import { serveMedia } from "../lib/media-response";

test("실시간 음원 제공·구간/접미 요청·HEAD·범위 오류·조건부 캐시", async (t) => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, "public/audio"), { recursive: true });
  await fs.writeFile(
    path.join(root, "public/audio/new.mp3"),
    Buffer.from("0123456789"),
  );
  const request = (headers: Record<string, string> = {}, method = "GET") =>
    new Request("http://127.0.0.1/audio/new.mp3", { headers, method });
  const full = await serveMedia(request(), "audio", ["new.mp3"], root);
  assert.equal(await full.text(), "0123456789");
  const part = await serveMedia(
    request({ range: "bytes=2-4" }),
    "audio",
    ["new.mp3"],
    root,
  );
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(await part.text(), "234");
  const suffix = await serveMedia(
    request({ range: "bytes=-2" }),
    "audio",
    ["new.mp3"],
    root,
  );
  assert.equal(await suffix.text(), "89");
  assert.equal(
    (
      await serveMedia(
        request({ range: "bytes=99-100" }),
        "audio",
        ["new.mp3"],
        root,
      )
    ).status,
    416,
  );
  const head = await serveMedia(
    request({}, "HEAD"),
    "audio",
    ["new.mp3"],
    root,
  );
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("content-length"), "10");
  assert.equal(
    (
      await serveMedia(
        request({ "if-none-match": full.headers.get("etag")! }),
        "audio",
        ["new.mp3"],
        root,
      )
    ).status,
    304,
  );
  assert.equal(
    (await serveMedia(request(), "audio", ["..", "private.mp3"], root)).status,
    400,
  );
});
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";
import { validateSong, parseTxt } from "../lib/song-schema.mjs";
import { getCatalogue } from "../lib/songs";
import {
  ensureLocalRequest,
  saveSong,
  getStoredSong,
  deleteSong,
  transaction,
  exportLibrary,
  inspectArchive,
  restoreArchive,
  limitedBody,
  revision,
} from "../lib/library-service";
import {
  DEFAULT_STATE,
  normalisePractice,
  inspectLearning,
  mergeLearning,
} from "../lib/practice-data";
const sample = (id = "test-song") => ({
  id,
  title: "테스트 곡",
  artist: "테스트",
  audioSrc: "",
  coverTheme: "blue" as const,
  difficulty: "보통" as const,
  tags: [],
  lines: [
    {
      id: "line-001",
      ja: "sample",
      koPronunciation: "테스트",
      koTranslation: "검증 자료",
    },
  ],
});
async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gasabom-test-"));
  t.after(async () => {
    const checked = path.resolve(root);
    assert.ok(
      checked.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
        path.basename(checked).startsWith("gasabom-test-"),
    );
    await fs.rm(checked, { recursive: true, force: true });
  });
  return root;
}
test("가사 문자열·빈 줄·중복 id·부분/겹침 시간·외부 경로 거부", () => {
  assert.equal(validateSong(sample()).lines[0].koPronunciation, "테스트");
  for (const value of [
    { ...sample(), lines: [] },
    { ...sample(), audioSrc: "https://example.com/file.mp3" },
    { ...sample(), audioSrc: "/audio/../other.mp3" },
    { ...sample(), lines: [{ ...sample().lines[0], koPronunciation: 42 }] },
    { ...sample(), lines: [sample().lines[0], sample().lines[0]] },
    {
      ...sample(),
      lines: [
        { ...sample().lines[0], start: 0, end: 2 },
        { ...sample().lines[0], id: "line-002" },
      ],
    },
    {
      ...sample(),
      lines: [
        { ...sample().lines[0], start: 0, end: 3 },
        { ...sample().lines[0], id: "line-002", start: 2, end: 4 },
      ],
    },
  ])
    assert.throws(() => validateSong(value));
});
test("가져오기 별칭 대응과 충돌 거부", () => {
  const line = {
    id: "line-001",
    ja: "sample",
    koPron: "테스트",
    koMeaning: "검증",
  };
  assert.equal(
    validateSong({ ...sample(), lines: [line] }, undefined, true).lines[0]
      .koTranslation,
    "검증",
  );
  assert.throws(() =>
    validateSong(
      { ...sample(), lines: [{ ...line, koPronunciation: "다른 값" }] },
      undefined,
      true,
    ),
  );
});
test("TXT도 같은 검증을 적용하고 잘못된 시간·빈 시간 블록 거부", () => {
  const header = "@id: test-song\n@title: 테스트\n@artist: 테스트\n";
  assert.equal(
    parseTxt(header + "[00:01.20 - 00:02.30]\nsample\n테스트\n검증").lines[0]
      .start,
    1.2,
  );
  for (const text of [
    "[00:99 - 01:00]\nsample\n테스트\n검증",
    "[00:00 - 00:02]\n[00:02 - 00:03]\nsample\n테스트\n검증",
    "[00:00 - 00:02]\nsample\n테스트\n검증\n\n[00:01 - 00:03]\nsample\n테스트\n검증",
  ])
    assert.throws(() => parseTxt(header + text));
});
test("손상된 곡 JSON은 격리하고 정상 곡은 계속 표시", async (t) => {
  const root = await workspace(t);
  await saveSong(root, sample(), null);
  await fs.writeFile(path.join(root, "content/songs/broken-song.json"), "{");
  const result = await getCatalogue(root);
  assert.equal(result.songs.length, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].file, "broken-song.json");
});
test("중복 등록과 오래된 편집 버전 거부·id 보존", async (t) => {
  const root = await workspace(t);
  const created = await saveSong(root, sample(), null);
  await assert.rejects(() => saveSong(root, sample(), null), /같은 id/);
  const updated = await saveSong(
    root,
    { ...created.song, title: "수정" },
    null,
    created.revision,
  );
  assert.equal(updated.song.lines[0].id, created.song.lines[0].id);
  await assert.rejects(
    () => saveSong(root, sample(), null, created.revision),
    /변경/,
  );
  assert.equal((await getStoredSong(root, "test-song")).song.title, "수정");
});
test("실제 MP3 형식 검사·음원 없는 가사 저장", async (t) => {
  const root = await workspace(t);
  await assert.rejects(
    () => saveSong(root, sample(), Buffer.from("not audio")),
    /MP3 파일/,
  );
  await saveSong(root, sample(), null);
  assert.equal((await getStoredSong(root, "test-song")).song.audioSrc, "");
});
test("잘못된 두 번째 파일이 있어도 첫 원본은 보존", async (t) => {
  const root = await workspace(t);
  await saveSong(root, sample(), null);
  const before = await fs.readFile(
    path.join(root, "content/songs/test-song.json"),
  );
  await assert.rejects(
    () =>
      transaction(root, [
        { name: "content/songs/test-song.json", data: Buffer.from("changed") },
        { name: "../outside.json", data: Buffer.from("bad") },
      ]),
    /허용/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(root, "content/songs/test-song.json")),
    before,
  );
  assert.deepEqual(
    (await fs.readdir(path.join(root, "content/songs"))).sort(),
    ["test-song.json"],
  );
});
test("곡 삭제는 공유 MP3를 보존", async (t) => {
  const root = await workspace(t);
  const audio = Buffer.alloc(834);
  audio.set([255, 251, 144, 0]);
  audio.set([255, 251, 144, 0], 417);
  const created = await saveSong(root, sample(), audio);
  await saveSong(
    root,
    { ...sample("other-song"), audioSrc: created.song.audioSrc },
    null,
  );
  await deleteSong(root, "test-song", created.revision);
  assert.deepEqual(
    await fs.readFile(path.join(root, "public/audio/test-song.mp3")),
    audio,
  );
  assert.equal((await getCatalogue(root)).songs.length, 1);
});
test("loopback·동일 출처·전용 헤더 확인", () => {
  const local = "http://127.0.0.1:3000/api/songs";
  ensureLocalRequest(
    new Request(local, {
      headers: { "x-gasabom-local": "1", origin: "http://127.0.0.1:3000" },
    }),
  );
  ensureLocalRequest(
    new Request("http://localhost:3000/api/songs", {
      headers: {
        host: "127.0.0.1:3000",
        "x-gasabom-local": "1",
        origin: "http://127.0.0.1:3000",
      },
    }),
  );
  for (const request of [
    new Request("http://192.168.0.2/api/songs", {
      headers: { "x-gasabom-local": "1" },
    }),
    new Request(local),
    new Request(local, {
      headers: { "x-gasabom-local": "1", origin: "https://example.com" },
    }),
  ])
    assert.throws(() => ensureLocalRequest(request));
});
test("Content-Length가 없어도 실제 요청 크기를 제한", async () => {
  const request = new Request("http://localhost/api/songs", {
    method: "POST",
    body: "0123456789",
  });
  await assert.rejects(() => limitedBody(request, 5), /용량/);
});
test("ZIP 왕복·내용 해시 확인·변경 이후 복원 거부", async (t) => {
  const root = await workspace(t);
  const created = await saveSong(root, sample(), null);
  const zip = await exportLibrary(root, [created.song]);
  const plan = await inspectArchive(root, zip);
  assert.equal(plan.conflicts.length, 0);
  await saveSong(root, { ...sample(), title: "변경" }, null, created.revision);
  await assert.rejects(
    () => restoreArchive(root, zip, "replace", plan.versions),
    /변경/,
  );
  const fresh = await inspectArchive(root, zip);
  await assert.rejects(
    () => restoreArchive(root, zip, "merge", fresh.versions),
    /다른 자료/,
  );
  await restoreArchive(root, zip, "replace", fresh.versions);
  assert.equal(
    (await getStoredSong(root, "test-song")).song.title,
    "테스트 곡",
  );
  const entries = unzipSync(zip);
  entries["content/songs/test-song.json"] = Buffer.from(
    JSON.stringify({ ...sample(), title: "변조" }),
  );
  await assert.rejects(() => inspectArchive(root, zipSync(entries)), /손상/);
});
test("ZIP 경로 탈출·알 수 없는 파일·다른 버전 거부", async (t) => {
  const root = await workspace(t);
  for (const name of [
    "../outside.json",
    "app/layout.tsx",
    "public/audio/../outside.mp3",
  ]) {
    await assert.rejects(
      () => inspectArchive(root, zipSync({ [name]: Buffer.from("x") })),
      /경로/,
    );
  }
  const body = Buffer.from(JSON.stringify(sample())),
    files = { "content/songs/test-song.json": body };
  await assert.rejects(
    () =>
      inspectArchive(
        root,
        zipSync({
          ...files,
          "gasabom-manifest.json": Buffer.from(
            JSON.stringify({
              format: "gasabom-library-backup",
              version: 99,
              files: Object.keys(files),
              hashes: { "content/songs/test-song.json": revision(body) },
            }),
          ),
        }),
      ),
    /버전/,
  );
});
test("손상된 저장 필드로 UI가 실패하지 않고 엄격한 복원에서는 거부", () => {
  const damaged = {
    bookmarks: { "test-song": "wrong" },
    words: [{ id: "bad", ja: 5 }],
    notes: [{ id: 1 }],
    options: { fontSize: NaN },
  };
  assert.deepEqual(normalisePractice(damaged).bookmarks, {});
  assert.equal(normalisePractice(damaged).words.length, 0);
  assert.throws(() => normalisePractice(damaged, true));
});
test("학습 기록 복원은 없는 곡·줄을 안내하며 제외하고 중복 집계하지 않음", () => {
  const incoming = {
    ...DEFAULT_STATE,
    favorites: ["test-song", "missing-song"],
    learned: { "test-song": ["line-001", "missing-line"] },
    listeningSeconds: 10,
  };
  const plan = inspectLearning(
    { format: "gasabom-learning-backup", version: 2, state: incoming },
    [sample()],
  );
  assert.equal(plan.omitted, 2);
  assert.deepEqual(plan.state.favorites, ["test-song"]);
  assert.deepEqual(plan.state.learned["test-song"], ["line-001"]);
  assert.equal(
    mergeLearning({ ...DEFAULT_STATE, listeningSeconds: 20 }, plan.state)
      .listeningSeconds,
    20,
  );
  assert.throws(() =>
    inspectLearning(
      { format: "gasabom-learning-backup", version: 3, state: incoming },
      [],
    ),
  );
});
