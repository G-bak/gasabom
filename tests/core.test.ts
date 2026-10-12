import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateSong, parseTxt } from "../lib/song-schema.mjs";
import { getCatalogue } from "../lib/songs";
import { safeDataFile } from "../lib/data-files";
import { normalisePractice, DEFAULT_STATE } from "../lib/practice-data";
import { songCommitMessage } from "../scripts/song-files.mjs";
import { verifyExport } from "../scripts/verify-export.mjs";
import { prepareExport } from "../scripts/prepare-export.mjs";
import { publicAssetUrl } from "../lib/site-paths";

test("루트와 Pages 하위 경로에서 음원·이미지 URL 생성", () => {
  for (const src of ["/audio/song.mp3?v=abc", "/covers/song.svg", "/icons/favicon.svg?v=2"])
    for (const basePath of ["", "/gasabom"])
      assert.equal(publicAssetUrl(src, basePath), `${basePath}${src}`);
  for (const src of ["", "data:image/png;base64,AA", "https://example.com/a.svg", "//example.com/a.svg"])
    assert.equal(publicAssetUrl(src, "/gasabom"), src);
});
const sample = (id = "test-song") => ({
  id,
  title: "테스트 곡",
  artist: "테스트",
  difficulty: "보통" as const,
  coverTheme: "blue" as const,
  tags: [],
  audioSrc: "",
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
test("현재 곡 반복 기본값과 이전 모드 이관", () => {
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
test("가사 문자열·빈 배열·중복 줄 id·부분/겹침 시간·외부 음원 거부", () => {
  for (const value of [
    { ...sample(), lines: [] },
    { ...sample(), audioSrc: "https://example.com/a.mp3" },
    { ...sample(), audioSrc: "/audio/../a.mp3" },
    { ...sample(), lines: [{ ...sample().lines[0], koPronunciation: 5 }] },
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
test("별칭 충돌과 TXT의 잘못된 시간 블록 거부", () => {
  const line = { ...sample().lines[0], koPron: "다른 값" };
  assert.throws(() =>
    validateSong({ ...sample(), lines: [line] }, undefined, true),
  );
  const header = "@id: test-song\n@title: 테스트\n@artist: 테스트\n";
  assert.equal(
    parseTxt(header + "[00:01.20 - 00:02.30]\nsample\n테스트\n검증").lines[0]
      .start,
    1.2,
  );
  for (const text of [
    "[00:99 - 01:00]\nsample\n테스트\n검증",
    "[00:00 - 00:02]\n[00:02 - 00:03]\nsample\n테스트\n검증",
  ])
    assert.throws(() => parseTxt(header + text));
});
test("빌드용 곡 읽기에서 손상된 자료만 격리", async (t) => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, "content/songs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "content/songs/test-song.json"),
    JSON.stringify(sample()),
  );
  await fs.writeFile(path.join(root, "content/songs/broken-song.json"), "{");
  const result = await getCatalogue(root);
  assert.equal(result.songs.length, 1);
  assert.equal(result.issues.length, 1);
});
test("음원 교체 후 빌드 캐시 값이 바뀌어도 원본 JSON은 보존", async (t) => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, "content/songs"), { recursive: true });
  await fs.mkdir(path.join(root, "public/audio"), { recursive: true });
  const source = JSON.stringify({ ...sample(), audioSrc: "/audio/test.mp3" });
  await fs.writeFile(path.join(root, "content/songs/test-song.json"), source);
  await fs.writeFile(path.join(root, "public/audio/test.mp3"), "first");
  const before = (await getCatalogue(root)).songs[0].audioRevision;
  await fs.writeFile(path.join(root, "public/audio/test.mp3"), "second");
  const after = (await getCatalogue(root)).songs[0].audioRevision;
  assert.notEqual(before, after);
  assert.equal(
    await fs.readFile(path.join(root, "content/songs/test-song.json"), "utf8"),
    source,
  );
  await assert.rejects(
    () => safeDataFile(root, "public/audio/../private.mp3"),
    /경로/,
  );
});
test("손상된 브라우저 필드를 복구하고 이전 학습 기록 유지", () => {
  const state = normalisePractice({
    version: 1,
    favorites: ["test-song"],
    learned: { "test-song": ["line-001"] },
    bookmarks: { "test-song": "wrong" },
    words: [{ id: "bad", ja: 5 }],
  });
  assert.deepEqual(state.favorites, ["test-song"]);
  assert.deepEqual(state.learned["test-song"], ["line-001"]);
  assert.deepEqual(state.bookmarks, {});
  assert.deepEqual(state.words, []);
  assert.throws(() => normalisePractice({ version: 99 }));
});
test("커밋 메시지에 현재 곡 제목 포함·줄바꿈 정리", () => {
  assert.equal(
    songCommitMessage({ ...sample(), title: "Pretender" }, "정적 사이트 전환"),
    "Pretender: 정적 사이트 전환",
  );
  assert.equal(
    songCommitMessage({ ...sample(), title: "곡\n이름" }, "자료\n교체"),
    "곡 이름: 자료 교체",
  );
});
test("정적 페이지 이동에 필요한 중첩 조각 파일 이름 생성", async (t) => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, "out/songs/test-song/__next.songs/$d$slug"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "out/songs/test-song/__next.songs/$d$slug/__PAGE__.txt"),
    "segment-data",
  );
  assert.equal(await prepareExport(root), 1);
  assert.equal(
    await fs.readFile(
      path.join(root, "out/songs/test-song/__next.songs.$d$slug.__PAGE__.txt"),
      "utf8",
    ),
    "segment-data",
  );
});
test("정적 출력의 곡/음원 확인과 제거한 API 경로 거부", async (t) => {
  const root = await workspace(t);
  for (const dir of [
    "content/songs",
    "public/audio",
    "out/library",
    "out/songs/test-song",
    "out/audio",
  ])
    await fs.mkdir(path.join(root, dir), { recursive: true });
  await fs.writeFile(
    path.join(root, "content/songs/test-song.json"),
    JSON.stringify({ ...sample(), audioSrc: "/audio/test.mp3" }),
  );
  for (const file of [
    "out/index.html",
    "out/library/index.html",
    "out/404.html",
    "out/songs/test-song/index.html",
  ])
    await fs.writeFile(path.join(root, file), "html");
  await fs.writeFile(path.join(root, "public/audio/test.mp3"), "audio");
  await fs.writeFile(path.join(root, "out/audio/test.mp3"), "audio");
  await prepareExport(root);
  assert.equal((await verifyExport(root)).pages, 1);
  await fs.writeFile(path.join(root, "public/audio/old.mp3"), "old audio");
  await assert.rejects(() => verifyExport(root), /연결되지 않은 MP3/);
  await fs.unlink(path.join(root, "public/audio/old.mp3"));
  const sourceFile = path.join(root, "content/songs/test-song.json"),
    original = await fs.readFile(sourceFile, "utf8");
  await fs.writeFile(
    sourceFile,
    JSON.stringify({
      ...sample(),
      title: "수정한 곡",
      audioSrc: "/audio/test.mp3",
    }),
  );
  await assert.rejects(() => verifyExport(root), /현재 곡 자료/);
  await fs.writeFile(sourceFile, original);
  await fs.mkdir(path.join(root, "out/api"));
  await assert.rejects(() => verifyExport(root), /api/);
});
