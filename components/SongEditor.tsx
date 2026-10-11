"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Song, LyricLine } from "@/lib/types";
import { validateSong } from "@/lib/song-schema.mjs";
import { usePlayer } from "@/lib/player";
const headers = { "x-gasabom-local": "1" };
export function SongEditor({
  source,
  audio,
  editing,
  onSaved,
}: {
  source: Song;
  audio?: File;
  editing: boolean;
  onSaved: (song: Song) => void;
}) {
  const router = useRouter(),
    player = usePlayer();
  const [draft, setDraft] = useState(source),
    [revision, setRevision] = useState<string>(),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [attach, setAttach] = useState(false),
    [review, setReview] = useState<Song | null>(null);
  useEffect(() => {
    setDraft(source);
    setReview(null);
    setMessage("");
    setRevision(undefined);
    setAttach(false);
    if (!editing) return;
    const controller = new AbortController();
    fetch(`/api/songs?id=${encodeURIComponent(source.id)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setRevision(data.revision);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage(e.message);
      });
    return () => controller.abort();
  }, [source, editing]);
  useEffect(() => {
    setReview(null);
    setAttach(false);
  }, [audio]);
  const change = (value: Partial<Song>) => {
    setDraft((d) => ({ ...d, ...value }));
    setReview(null);
  };
  const lineChange = (index: number, value: Partial<LyricLine>) =>
    change({
      lines: draft.lines.map((l, i) => (i === index ? { ...l, ...value } : l)),
    });
  const preview = (omitTiming = false) => {
    setMessage("");
    try {
      const candidate = {
        ...draft,
        ...(attach && audio ? { audioSrc: `/audio/${draft.id}.mp3` } : {}),
        lines: omitTiming
          ? draft.lines.map(({ start, end, ...line }) => line)
          : draft.lines,
      };
      if (omitTiming)
        sessionStorage.setItem(
          `gasabom:time-draft:${draft.id}`,
          JSON.stringify(
            draft.lines.map(({ id, start, end }) => ({ id, start, end })),
          ),
        );
      setReview(validateSong(candidate, editing ? source.id : undefined));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "자료를 확인하세요.");
    }
  };
  const save = async () => {
    if (!review) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("song", JSON.stringify(review));
      if (attach && audio) form.set("audio", audio);
      if (editing) {
        if (!revision) throw new Error("편집할 자료를 다시 불러오세요.");
        form.set("revision", revision);
      }
      const response = await fetch("/api/songs", {
        method: editing ? "PUT" : "POST",
        headers,
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (player.song?.id === result.song.id) player.selectSong(result.song);
      if (review.lines.every((l) => l.start !== undefined))
        sessionStorage.removeItem(`gasabom:time-draft:${review.id}`);
      setReview(null);
      setMessage("곡 자료를 저장했습니다.");
      onSaved(result.song);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "곡을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel song-editor">
      <h2>{editing ? "등록된 곡 편집" : "새 곡 등록"}</h2>
      <p className="subtle">
        제목과 가사를 확인하고 저장하세요. 가사 줄의 기존 id는 유지됩니다.
      </p>
      <div className="editor-fields">
        <label>
          곡 id
          <input
            aria-label="곡 id"
            value={draft.id}
            disabled={editing}
            onChange={(e) => change({ id: e.target.value })}
          />
        </label>
        <label>
          제목
          <input
            aria-label="곡 제목"
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
          />
        </label>
        <label>
          가수
          <input
            aria-label="곡 가수"
            value={draft.artist}
            onChange={(e) => change({ artist: e.target.value })}
          />
        </label>
        <label>
          장르
          <input
            value={draft.genre || ""}
            onChange={(e) => change({ genre: e.target.value })}
          />
        </label>
        <label>
          난이도
          <select
            value={draft.difficulty}
            onChange={(e) =>
              change({ difficulty: e.target.value as Song["difficulty"] })
            }
          >
            {["쉬움", "보통", "어려움"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          태그 (쉼표로 구분)
          <input
            value={draft.tags.join(", ")}
            onChange={(e) =>
              change({
                tags: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </div>
      <label>
        곡 설명
        <textarea
          value={draft.description || ""}
          onChange={(e) => change({ description: e.target.value })}
        />
      </label>
      <p>연결 음원: {draft.audioSrc || "가사 전용"}</p>
      {audio && (
        <label className="preference-row">
          <span>선택한 MP3 연결: {audio.name}</span>
          <input
            type="checkbox"
            aria-label="선택한 MP3 연결"
            checked={attach}
            onChange={(e) => {
              setAttach(e.target.checked);
              setReview(null);
            }}
          />
        </label>
      )}
      <button
        className="small-outline"
        onClick={() => change({ audioSrc: "", audioRevision: undefined })}
      >
        음원 연결 해제
      </button>
      <h3>가사·시간 편집</h3>
      <p className="subtle">
        시작·끝은 초 단위입니다. 모든 줄을 작성하거나 모두 비워야 저장할 수
        있습니다.
      </p>
      <div className="editor-lines">
        {draft.lines.map((line, index) => (
          <fieldset key={line.id}>
            <legend>{index + 1}번 가사</legend>
            <div className="line-time-fields">
              <label>
                시작
                <input
                  aria-label={`${index + 1}번 시작 시간`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.start ?? ""}
                  onChange={(e) =>
                    lineChange(index, {
                      start:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                끝
                <input
                  aria-label={`${index + 1}번 끝 시간`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.end ?? ""}
                  onChange={(e) =>
                    lineChange(index, {
                      end:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                구분
                <input
                  value={line.section || ""}
                  onChange={(e) =>
                    lineChange(index, { section: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              일본어 원문
              <textarea
                aria-label={`${index + 1}번 원문`}
                value={line.ja}
                onChange={(e) => lineChange(index, { ja: e.target.value })}
              />
            </label>
            <label>
              한글 발음
              <textarea
                aria-label={`${index + 1}번 발음`}
                value={line.koPronunciation}
                onChange={(e) =>
                  lineChange(index, { koPronunciation: e.target.value })
                }
              />
            </label>
            <label>
              한국어 뜻
              <textarea
                aria-label={`${index + 1}번 뜻`}
                value={line.koTranslation}
                onChange={(e) =>
                  lineChange(index, { koTranslation: e.target.value })
                }
              />
            </label>
            <button
              className="small-outline"
              onClick={() =>
                change({
                  lines: draft.lines.filter((_, i) => i !== index),
                  studyWords: draft.studyWords?.filter(
                    (w) => w.lineId !== line.id,
                  ),
                })
              }
            >
              이 줄 삭제
            </button>
          </fieldset>
        ))}
      </div>
      <div className="editor-actions">
        <button
          className="small-outline"
          onClick={() =>
            change({
              lines: [
                ...draft.lines,
                {
                  id: `line-${crypto.randomUUID()}`,
                  ja: "",
                  koPronunciation: "",
                  koTranslation: "",
                },
              ],
            })
          }
        >
          가사 줄 추가
        </button>
        <button
          className="small-outline"
          onClick={() => {
            try {
              sessionStorage.setItem(
                `gasabom:time-draft:${draft.id}`,
                JSON.stringify(
                  draft.lines.map(({ id, start, end }) => ({ id, start, end })),
                ),
              );
              setMessage("시간 초안을 이 탭에 저장했습니다.");
            } catch {
              setMessage("시간 초안을 저장할 수 없습니다.");
            }
          }}
        >
          시간 초안 저장
        </button>
        <button
          className="small-outline"
          onClick={() => {
            try {
              const saved = JSON.parse(
                sessionStorage.getItem(`gasabom:time-draft:${draft.id}`) ||
                  "null",
              );
              if (!Array.isArray(saved)) throw new Error();
              change({
                lines: draft.lines.map((l) => ({
                  ...l,
                  ...saved.find((s) => s.id === l.id),
                })),
              });
              setMessage("시간 초안을 불러왔습니다.");
            } catch {
              setMessage("불러올 시간 초안이 없습니다.");
            }
          }}
        >
          시간 초안 불러오기
        </button>
        <button
          className="button button-outline"
          disabled={busy}
          onClick={() => preview(true)}
        >
          시간 정보 없이 저장 검토
        </button>
        <button
          className="button button-primary"
          disabled={busy || (editing && !revision)}
          onClick={() => preview()}
        >
          변경 확인
        </button>
      </div>
      {review && (
        <div className="review-box" role="status">
          <h3>저장할 자료 확인</h3>
          <p>
            {review.title} · {review.artist} · {review.lines.length}줄
          </p>
          <p>
            {editing ? "기존 곡 자료를 교체합니다." : "새 곡을 등록합니다."}{" "}
            {attach && audio
              ? `연결 음원: ${audio.name}`
              : review.audioSrc || "음원 없이 가사만 저장합니다."}
          </p>
          <p>가사: content/songs/{review.id}.json</p>
          {editing && (
            <p>삭제한 가사 줄의 학습 체크는 화면 진행률에서 제외됩니다.</p>
          )}
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "저장 중…" : "확인하고 저장"}
          </button>
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => setReview(null)}
          >
            돌아가기
          </button>
        </div>
      )}
      {message && (
        <p className="inline-notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
