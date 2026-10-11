"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Song } from "@/lib/types";
import { inspectLearning, type PracticeState } from "@/lib/practice-data";
import { usePracticeState } from "@/lib/storage";
import { usePlayer } from "@/lib/player";
const headers = { "x-gasabom-local": "1" };
type Plan = {
  songs: { id: string; title: string }[];
  files: string[];
  conflicts: string[];
  versions: Record<string, string | null>;
  digest: string;
};
export function BackupTools({ songs }: { songs: Song[] }) {
  const { restoreLearning } = usePracticeState(),
    player = usePlayer(),
    router = useRouter();
  const [learning, setLearning] = useState<{
      state: PracticeState;
      omitted: number;
    } | null>(null),
    [archive, setArchive] = useState<File | null>(null),
    [plan, setPlan] = useState<Plan | null>(null);
  const [policy, setPolicy] = useState<"merge" | "replace">("merge"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/backup", { headers });
      if (!r.ok) throw new Error((await r.json()).error);
      const blob = await r.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `가사봄_곡자료_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("곡 자료 ZIP을 다운로드했습니다.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const selectArchive = async (file: File) => {
    setPlan(null);
    setArchive(null);
    setMessage("");
    setBusy(true);
    try {
      if (file.size > 250 * 1024 * 1024)
        throw new Error("ZIP은 최대 250MB입니다.");
      const form = new FormData();
      form.set("archive", file);
      const r = await fetch("/api/backup", {
          method: "POST",
          headers,
          body: form,
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setArchive(file);
      setPlan(data);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!archive || !plan) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("archive", archive);
      form.set("action", "restore");
      form.set("policy", policy);
      form.set("versions", JSON.stringify(plan.versions));
      const r = await fetch("/api/backup", {
          method: "POST",
          headers,
          body: form,
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      player.pause();
      setPlan(null);
      setArchive(null);
      router.refresh();
      setMessage(`${data.restored.length}곡의 자료를 복원했습니다.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="backup-tools">
      <section className="panel">
        <h2>학습 기록 복원</h2>
        <p>
          내보낸 학습 기록 JSON을 확인한 뒤 병합하거나 교체합니다. 곡 자료를
          먼저 복원하세요.
        </p>
        <label className="file-picker">
          학습 기록 JSON 선택
          <input
            type="file"
            accept=".json"
            aria-label="학습 기록 복원 파일"
            onChange={async (e) => {
              setLearning(null);
              setMessage("");
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 10 * 1024 * 1024)
                  throw new Error("학습 기록은 최대 10MB입니다.");
                setLearning(inspectLearning(JSON.parse(await f.text()), songs));
              } catch (error) {
                setMessage((error as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
        {learning && (
          <div className="review-box">
            <h3>복원할 학습 기록</h3>
            <p>
              즐겨찾기 {learning.state.favorites.length}개 · 노트{" "}
              {learning.state.notes.length}개 · 단어{" "}
              {learning.state.words.length}개 · 플레이리스트{" "}
              {learning.state.playlists.length}개
            </p>
            {learning.omitted > 0 && (
              <p>
                현재 보관함에 없는 곡·가사 참조 {learning.omitted}개는 복원에서
                제외됩니다.
              </p>
            )}
            <p>
              병합은 기존 설정과 같은 id의 항목을 유지합니다. 재생 횟수와 청취
              시간은 큰 값을 사용해 중복 집계를 막습니다. 교체는 현재 학습
              기록을 바꿉니다.
            </p>
            <button
              className="button button-outline"
              onClick={() => {
                restoreLearning(learning.state, "merge");
                setLearning(null);
                setMessage("학습 기록을 병합했습니다.");
              }}
            >
              확인하고 병합
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                restoreLearning(learning.state, "replace");
                setLearning(null);
                setMessage("학습 기록을 교체했습니다.");
              }}
            >
              확인하고 교체
            </button>
          </div>
        )}
        <button
          className="small-outline"
          onClick={() => {
            try {
              const raw = localStorage.getItem("gasabom:practice:recovery");
              if (!raw) {
                setMessage("보관된 손상 기록이 없습니다.");
                return;
              }
              const url = URL.createObjectURL(
                  new Blob([raw], { type: "application/json" }),
                ),
                a = document.createElement("a");
              a.href = url;
              a.download = "가사봄_복구용_원본기록.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
              setMessage("복구용 원본 기록을 읽을 수 없습니다.");
            }
          }}
        >
          복구용 원본 기록 다운로드
        </button>
      </section>
      <section className="panel">
        <h2>곡 자료 백업·복원</h2>
        <p>
          곡 JSON과 연결된 MP3·커버만 ZIP으로 보관합니다. 최대 250MB이며, 소스
          코드와 브라우저 기록은 포함되지 않습니다.
        </p>
        <button
          className="button button-primary"
          disabled={busy || !songs.length}
          onClick={() => void download()}
        >
          곡 자료 ZIP 다운로드
        </button>
        <label className="file-picker">
          곡 자료 ZIP 선택
          <input
            aria-label="곡 자료 복원 파일"
            type="file"
            accept=".zip"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void selectArchive(file);
              e.target.value = "";
            }}
          />
        </label>
        {plan && (
          <div className="review-box">
            <h3>복원할 곡 자료</h3>
            <ul>
              {plan.songs.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
            <p>
              {plan.files.length}개 파일 · 변경되는 기존 파일{" "}
              {plan.conflicts.length}개
            </p>
            {plan.conflicts.length > 0 && (
              <ul>
                {plan.conflicts.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
            <label>
              복원 방식
              <select
                aria-label="곡 자료 복원 방식"
                value={policy}
                onChange={(e) => setPolicy(e.target.value as typeof policy)}
              >
                <option value="merge">
                  추가·동일 자료 병합 (충돌 시 중단)
                </option>
                <option value="replace">백업과 겹치는 자료 교체</option>
              </select>
            </label>
            <p>교체는 위 목록의 파일만 바꾸며, 백업에 없는 곡은 유지합니다.</p>
            <button
              className="button button-primary"
              disabled={
                busy || (policy === "merge" && plan.conflicts.length > 0)
              }
              onClick={() => void restore()}
            >
              확인하고 곡 자료 복원
            </button>
          </div>
        )}
      </section>
      {message && (
        <p className="inline-notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
