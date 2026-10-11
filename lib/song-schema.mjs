// Browser, server and CLI share this contract; learning text is preserved.
export const SONG_ID = /^[a-z0-9][a-z0-9-]{1,60}$/;
const themes = ["violet", "mint", "peach", "blue", "midnight"];
const levels = ["쉬움", "보통", "어려움"];
const text = (v) => typeof v === "string" && v.trim().length > 0;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function mediaPath(value, kind) {
  return (
    typeof value === "string" &&
    new RegExp(`^/${kind}/[a-zA-Z0-9._/-]+$`).test(value) &&
    !value.includes("..") &&
    !value.includes("//") &&
    (kind !== "audio" || /\.mp3$/i.test(value))
  );
}
export function validateSong(value, expectedId, aliases = false) {
  const errors = [];
  const check = (ok, message) => {
    if (!ok) errors.push(message);
  };
  if (!object(value)) throw new Error("곡 자료는 JSON 객체여야 합니다.");
  const song = { ...value };
  check(
    typeof song.id === "string" && SONG_ID.test(song.id),
    "곡 id는 2~61자의 영문 소문자·숫자·하이픈이어야 합니다.",
  );
  check(
    !expectedId || song.id === expectedId,
    "곡 id와 JSON 파일명이 다릅니다.",
  );
  check(
    text(song.title) && text(song.artist),
    "곡 제목과 가수는 비어 있지 않은 문자열이어야 합니다.",
  );
  check(
    levels.includes(song.difficulty),
    "난이도는 쉬움·보통·어려움 중 하나여야 합니다.",
  );
  check(themes.includes(song.coverTheme), "커버 테마를 확인하세요.");
  check(
    Array.isArray(song.tags) && song.tags.every(text),
    "태그는 비어 있지 않은 문자열의 배열이어야 합니다.",
  );
  check(
    song.audioSrc === "" || mediaPath(song.audioSrc, "audio"),
    "음원은 /audio/ 안의 MP3 경로 또는 빈 문자열이어야 합니다.",
  );
  check(
    song.coverSrc === undefined || mediaPath(song.coverSrc, "covers"),
    "커버는 /covers/ 안의 로컬 경로여야 합니다.",
  );
  for (const key of [
    "titleJa",
    "description",
    "genre",
    "audioRevision",
    "addedAt",
  ]) {
    check(
      song[key] === undefined || typeof song[key] === "string",
      `${key}는 문자열이어야 합니다.`,
    );
  }
  check(
    Array.isArray(song.lines) &&
      song.lines.length > 0 &&
      song.lines.length <= 10000,
    "가사는 1~10000줄이어야 합니다.",
  );
  const ids = new Set();
  let timed = 0,
    previousEnd = 0;
  song.lines = Array.isArray(song.lines)
    ? song.lines.map((raw, index) => {
        if (!object(raw)) {
          errors.push(`${index + 1}번 가사는 객체여야 합니다.`);
          return raw;
        }
        const line = { ...raw };
        for (const [field, alias] of [
          ["koPronunciation", "koPron"],
          ["koTranslation", "koMeaning"],
        ]) {
          if (aliases && line[alias] !== undefined) {
            check(
              line[field] === undefined || line[field] === line[alias],
              `${index + 1}번 가사의 ${field}/${alias} 값이 다릅니다.`,
            );
            if (line[field] === undefined) line[field] = line[alias];
            delete line[alias];
          }
        }
        check(
          text(line.id) && !ids.has(line.id),
          `${index + 1}번 가사 id가 비었거나 중복됩니다.`,
        );
        ids.add(line.id);
        check(
          [line.ja, line.koPronunciation, line.koTranslation].every(text),
          `${index + 1}번 가사의 원문·발음·뜻은 비어 있지 않은 문자열이어야 합니다.`,
        );
        check(
          line.section === undefined || typeof line.section === "string",
          `${index + 1}번 섹션은 문자열이어야 합니다.`,
        );
        if (line.start !== undefined || line.end !== undefined) {
          timed++;
          check(
            Number.isFinite(line.start) &&
              Number.isFinite(line.end) &&
              line.start >= previousEnd &&
              line.end > line.start,
            `${index + 1}번 시간은 겹치지 않는 시작·끝 초 단위 숫자여야 합니다.`,
          );
          if (Number.isFinite(line.end)) previousEnd = line.end;
        }
        return line;
      })
    : [];
  check(
    timed === 0 || timed === song.lines.length,
    "시간 정보는 모든 줄에 작성하거나 모두 생략하세요.",
  );
  if (song.studyWords !== undefined) {
    const wordIds = new Set();
    check(Array.isArray(song.studyWords), "표현 자료는 배열이어야 합니다.");
    if (Array.isArray(song.studyWords))
      for (const word of song.studyWords) {
        check(
          object(word) &&
            text(word.id) &&
            !wordIds.has(word.id) &&
            text(word.ja) &&
            typeof word.reading === "string" &&
            text(word.meaning) &&
            ids.has(word.lineId) &&
            (word.koPronunciation === undefined ||
              typeof word.koPronunciation === "string"),
          "표현 자료와 연결된 가사 id를 확인하세요.",
        );
        if (object(word)) wordIds.add(word.id);
      }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return song;
}
export function parseTxt(contents) {
  const meta = {},
    lyrics = [];
  let section = "",
    timing,
    block = [],
    started = false;
  const flush = () => {
    if (!block.length) return;
    if (block.length !== 3)
      throw new Error(
        `${lyrics.length + 1}번째 가사는 원문·발음·뜻의 3줄이어야 합니다.`,
      );
    lyrics.push({
      id: `line-${String(lyrics.length + 1).padStart(3, "0")}`,
      ...(section ? { section } : {}),
      ...(timing ? { start: timing[0], end: timing[1] } : {}),
      ja: block[0],
      koPronunciation: block[1],
      koTranslation: block[2],
    });
    block = [];
    timing = undefined;
  };
  const clock = (s) => {
    const [m, n] = s.split(":");
    return Number(m) * 60 + Number(n);
  };
  for (const raw of contents.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("#")) continue;
    if (line.startsWith("@")) {
      if (started) throw new Error("@ 곡 정보는 첫 가사보다 위에 작성하세요.");
      const header = line.match(/^@([^:]+):\s*(.*)$/);
      if (!header) throw new Error("@ 곡 정보 형식을 확인하세요.");
      meta[header[1]] = header[2];
      continue;
    }
    const match = line.match(
      /^\[(\d+:[0-5]\d(?:\.\d{1,3})?)\s*-\s*(\d+:[0-5]\d(?:\.\d{1,3})?)\]$/,
    );
    if (match) {
      if (timing && !block.length)
        throw new Error("시간 정보 뒤에 가사 3줄이 필요합니다.");
      flush();
      timing = [clock(match[1]), clock(match[2])];
      started = true;
      continue;
    }
    if (/^\[[^\]]+\]$/.test(line)) {
      if (line.includes(":"))
        throw new Error("시간 형식은 [01:23.50 - 01:26.00]으로 작성하세요.");
      if (timing && !block.length)
        throw new Error("시간 정보 뒤에 가사 3줄이 필요합니다.");
      flush();
      section = line.slice(1, -1);
      started = true;
      continue;
    }
    started = true;
    block.push(line);
    if (block.length > 3) throw new Error("각 가사 블록은 빈 줄로 구분하세요.");
  }
  flush();
  if (timing) throw new Error("시간 정보 뒤에 가사 3줄이 필요합니다.");
  return validateSong({
    ...meta,
    id: meta.id,
    title: meta.title,
    artist: meta.artist,
    difficulty: meta.difficulty || "보통",
    coverTheme: meta.coverTheme || "blue",
    genre: meta.genre || "J-POP",
    audioSrc: meta.audioSrc || "",
    tags: (meta.tags || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    lines: lyrics,
  });
}
