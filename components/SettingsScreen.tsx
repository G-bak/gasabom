"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageBanner } from "@/components/PageBanner";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { usePracticeState } from "@/lib/storage";
import type { LibraryFile } from "@/lib/library-files";
import type { Song } from "@/lib/types";
import type { SongIssue } from "@/lib/songs";
import { validateSong, parseTxt } from "@/lib/song-schema.mjs";
import { SongEditor } from "./SongEditor";
import { BackupTools } from "./BackupTools";
import { usePlayer } from "@/lib/player";
type Tab = "data" | "library" | "backup" | "preferences";
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function previewSong(value: unknown): Song {
  const x = value as Partial<Song>;
  return validateSong(
    {
      ...x,
      id: x?.id ?? `song-${Date.now()}`,
      tags: x?.tags ?? [],
      difficulty: x?.difficulty ?? "보통",
      coverTheme: x?.coverTheme ?? "blue",
      audioSrc: x?.audioSrc ?? "",
      lines: Array.isArray(x?.lines)
        ? x.lines.map((line, index) =>
            line && typeof line === "object"
              ? {
                  ...line,
                  id: line.id ?? `line-${String(index + 1).padStart(3, "0")}`,
                }
              : line,
          )
        : x?.lines,
    },
    undefined,
    true,
  );
}
export function SettingsScreen({
  songs,
  files,
  issues,
}: {
  songs: Song[];
  files: LibraryFile[];
  issues: SongIssue[];
}) {
  const params = useSearchParams(),
    router = useRouter(),
    { state, setOption, forgetSong } = usePracticeState();
  const player = usePlayer();
  const [editorSource, setEditorSource] = useState<Song | null>(null),
    [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState<{ song: Song; revision: string } | null>(
      null,
    ),
    [deleteBusy, setDeleteBusy] = useState(false);
  const key = params.get("tab");
  const [tab, setTab] = useState<Tab>("data"),
    [selected, setSelected] = useState<File[]>([]),
    [preview, setPreview] = useState<Song | null>(songs[0] || null),
    [audioUrl, setAudioUrl] = useState(""),
    [message, setMessage] = useState(""),
    [fileFilter, setFileFilter] = useState("전체"),
    [fieldTab, setFieldTab] = useState("json");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewAudioUrl =
    audioUrl ||
    (files.some((file) => file.kind === "MP3" && file.url === preview?.audioSrc)
      ? preview?.audioSrc || ""
      : "");
  useEffect(() => {
    setTab(
      ["library", "backup", "preferences"].includes(key || "")
        ? (key as Tab)
        : "data",
    );
  }, [key]);
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );
  async function select(file: File) {
    setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "json", "txt"].includes(ext || "")) {
      setMessage("MP3, JSON, TXT 파일을 선택해 주세요.");
      return;
    }
    if (file.size > (ext === "mp3" ? 100 : 10) * 1024 * 1024) {
      setMessage(
        ext === "mp3"
          ? "MP3는 100MB까지 선택할 수 있어요."
          : "가사 파일은 10MB까지 선택할 수 있어요.",
      );
      return;
    }
    try {
      if (ext === "mp3") setAudioUrl(URL.createObjectURL(file));
      else {
        const song = previewSong(
          ext === "txt"
            ? parseTxt(await file.text())
            : JSON.parse(await file.text()),
        );
        setPreview(song);
        setEditorSource(song);
        setEditing(false);
      }
      setSelected((p) => [...p.filter((x) => x.name !== file.name), file]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "파일을 확인할 수 없어요.");
    }
  }
  const tabs = [
    {
      id: "data" as const,
      label: "곡 등록 / 데이터 관리",
      icon: "file" as const,
    },
    { id: "library" as const, label: "보관함 관리", icon: "grid" as const },
    {
      id: "backup" as const,
      label: "백업 / 내보내기",
      icon: "upload" as const,
    },
    { id: "preferences" as const, label: "설정", icon: "settings" as const },
  ];
  const combined = [
    ...files.map((f) => ({ ...f, selected: false })),
    ...selected.map((f) => ({
      name: f.name,
      kind: (f.name.toLowerCase().endsWith(".mp3")
        ? "MP3"
        : f.name.toLowerCase().endsWith(".txt")
          ? "TXT"
          : "JSON") as "MP3" | "JSON" | "TXT",
      bytes: f.size,
      modifiedAt: new Date(f.lastModified).toISOString(),
      selected: true,
      url: undefined,
    })),
  ].filter((f) => fileFilter === "전체" || f.kind === fileFilter);
  const sample = {
    id: "my-song",
    title: "내 연습곡",
    artist: "가수 이름",
    difficulty: "보통",
    coverTheme: "blue",
    tags: [],
    audioSrc: "",
    lines: [
      {
        id: "line-01",
        start: 12.34,
        end: 15.67,
        ja: "일본어 원문",
        koPronunciation: "한글 발음",
        koTranslation: "한국어 뜻",
      },
    ],
  };
  return (
    <main>
      <PageBanner
        scene="settings"
        eyebrow="파일 관리"
        title="곡 등록 / 데이터 관리"
      >
        음원과 가사 파일을 선택해 미리 확인하고, 학습 기록과 보기 설정을
        관리하세요.
      </PageBanner>
      <div className="settings-tabs">
        <div className="container" role="tablist" aria-label="설정 메뉴">
          {tabs.map((t) => (
            <button
              role="tab"
              aria-selected={tab === t.id}
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                router.replace(`/settings?tab=${t.id}`, { scroll: false });
              }}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="container settings-content" role="tabpanel">
        {issues.length > 0 && (
          <section className="panel" role="alert">
            <h2>확인이 필요한 곡 자료</h2>
            <ul>
              {issues.map((issue) => (
                <li key={issue.file}>
                  <strong>{issue.file}</strong>
                  <p className="preserve-lines">{issue.message}</p>
                </li>
              ))}
            </ul>
            <p>
              오류가 있는 자료만 보관함에서 제외됩니다. 원본 JSON을 수정한 뒤
              새로고침하세요.
            </p>
          </section>
        )}

        {tab === "data" && (
          <div className="settings-layout">
            <div className="settings-main">
              <div className="upload-grid">
                {[
                  {
                    type: "mp3",
                    title: "MP3 파일 선택",
                    description: "선택한 음원을 미리 재생합니다.",
                    max: "최대 100MB",
                    icon: "music" as const,
                  },
                  {
                    type: "json",
                    title: "가사 JSON 확인",
                    description: "원문·발음·뜻과 파일 형식을 확인합니다.",
                    max: "최대 10MB",
                    icon: "file" as const,
                  },
                  {
                    type: "txt",
                    title: "TXT → JSON 변환",
                    description: "세 줄 형식의 TXT를 JSON으로 변환합니다.",
                    max: "최대 10MB",
                    icon: "repeat" as const,
                  },
                ].map((x, i) => (
                  <section className="panel upload-card" key={x.type}>
                    <div className="upload-heading">
                      <span className={`number-badge badge-${i}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon name={x.icon} size={24} />
                      <h2>{x.title}</h2>
                    </div>
                    <p className="subtle">{x.description}</p>
                    <label
                      className="dropzone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f) void select(f);
                      }}
                    >
                      <Icon name="upload" size={30} />
                      <span>
                        파일을 여기로 드래그하거나
                        <br />
                        클릭하여 선택하세요.
                      </span>
                      <input
                        type="file"
                        accept={`.${x.type}`}
                        aria-label={x.title}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void select(f);
                        }}
                      />
                    </label>
                    <small className="subtle">
                      지원 형식: .{x.type} · {x.max}
                    </small>
                    {x.type === "txt" && (
                      <button
                        className="button button-primary"
                        disabled={
                          !preview ||
                          selected.every(
                            (f) => !f.name.toLowerCase().endsWith(".txt"),
                          )
                        }
                        onClick={() =>
                          download(preview, `${preview?.id || "my-song"}.json`)
                        }
                      >
                        변환한 JSON 다운로드
                        <Icon name="chevron-right" size={15} />
                      </button>
                    )}
                  </section>
                ))}
              </div>
              {message && (
                <p className="inline-notice notice-error" role="alert">
                  {message}
                </p>
              )}

              <button
                className="button button-outline"
                onClick={() => {
                  setEditing(false);
                  setEditorSource({
                    id: "",
                    title: "",
                    artist: "",
                    difficulty: "보통",
                    coverTheme: "blue",
                    audioSrc: "",
                    tags: [],
                    lines: [
                      {
                        id: "line-001",
                        ja: "",
                        koPronunciation: "",
                        koTranslation: "",
                      },
                    ],
                  });
                }}
              >
                직접 새 곡 작성
              </button>
              {editorSource && (
                <SongEditor
                  source={editorSource}
                  editing={editing}
                  audio={[...selected]
                    .reverse()
                    .find((f) => /\.mp3$/i.test(f.name))}
                  onSaved={(song) => {
                    setPreview(song);
                    setEditorSource(song);
                    setEditing(true);
                    setSelected([]);
                    setAudioUrl("");
                    setMessage("곡 자료를 저장했습니다.");
                  }}
                />
              )}
              <div className="settings-lower">
                <section className="panel file-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <Icon name="music" size={21} />내 파일 목록
                      </h2>
                      <p className="subtle">
                        기존 자료와 선택한 파일 목록입니다.
                      </p>
                    </div>
                    <button
                      className="small-outline"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Icon name="plus" size={15} />
                      파일 선택
                    </button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".mp3,.json,.txt"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void select(f);
                      }}
                    />
                  </div>
                  <div className="file-tabs">
                    {["전체", "MP3", "JSON", "TXT"].map((x) => (
                      <button
                        key={x}
                        aria-pressed={fileFilter === x}
                        className={fileFilter === x ? "active" : ""}
                        onClick={() => setFileFilter(x)}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                  <div className="table-scroll">
                    <table className="files-table">
                      <thead>
                        <tr>
                          <th>파일명</th>
                          <th>형식</th>
                          <th>크기</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combined.map((f, i) => (
                          <tr key={`${f.name}-${i}`}>
                            <td>
                              <Icon
                                name={f.kind === "MP3" ? "music" : "file"}
                                size={16}
                              />
                              {f.url ? (
                                <a href={f.url} download>
                                  {f.name}
                                </a>
                              ) : (
                                f.name
                              )}
                            </td>
                            <td>
                              <span
                                className={`file-type type-${f.kind.toLowerCase()}`}
                              >
                                {f.kind}
                              </span>
                            </td>
                            <td>
                              {f.bytes < 1024 * 1024
                                ? `${Math.round(f.bytes / 1024)}KB`
                                : `${(f.bytes / 1024 / 1024).toFixed(1)}MB`}
                            </td>
                            <td>
                              <span
                                className={
                                  f.selected
                                    ? "status-selected"
                                    : "status-saved"
                                }
                              >
                                <Icon name="check-circle" size={13} />
                                {f.selected ? "선택됨" : "보관 중"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="panel preview-panel">
                  <h2>
                    <Icon name="eye" size={22} />
                    미리보기
                  </h2>
                  <p className="subtle">선택한 가사의 화면 표시 예시입니다.</p>
                  {preview ? (
                    <>
                      <div className="preview-song">
                        <CoverArt
                          song={preview}
                          size="small"
                          displayTitle={false}
                        />
                        <div>
                          <strong>{preview.title}</strong>
                          <small>{preview.artist}</small>
                        </div>
                      </div>
                      <div className="preview-lyrics">
                        <p lang="ja">{preview.lines[0]?.ja}</p>
                        <strong>{preview.lines[0]?.koPronunciation}</strong>
                        <small>{preview.lines[0]?.koTranslation}</small>
                      </div>
                      {previewAudioUrl && (
                        <button
                          className="button button-outline"
                          onClick={() =>
                            player.previewAudio(
                              [...selected]
                                .reverse()
                                .find((f) => /\.mp3$/i.test(f.name)) ||
                                preview.audioSrc,
                              preview.title,
                            )
                          }
                        >
                          음원 미리듣기
                        </button>
                      )}
                      {!previewAudioUrl && preview.audioSrc && (
                        <p className="subtle" role="status">
                          연결된 음원이 보관함에 없어요. MP3를 선택하면 미리
                          들을 수 있어요.
                        </p>
                      )}
                      <button
                        className="button button-outline"
                        onClick={() => download(preview, `${preview.id}.json`)}
                      >
                        <Icon name="download" size={16} />
                        가사 JSON 다운로드
                      </button>
                    </>
                  ) : (
                    <p className="empty-small">가사 파일을 선택해 주세요.</p>
                  )}
                </section>
              </div>
              <div className="management-tips">
                <section className="panel">
                  <h3>
                    <Icon name="check-circle" />
                    데이터 검증 체크리스트
                  </h3>
                  <ul className="checklist">
                    <li>원문·한글 발음·뜻을 함께 준비했나요?</li>
                    <li>음원과 가사의 곡이 일치하나요?</li>
                    <li>시간 정보는 모든 줄에 있거나 모두 생략했나요?</li>
                    <li>파일명과 곡 id가 같은가요?</li>
                  </ul>
                </section>
                <section className="panel">
                  <h3>
                    <Icon name="file" />
                    자료 저장 위치
                  </h3>
                  <p>
                    곡 JSON: <code>content/songs</code>
                    <br />
                    음원 파일: <code>public/audio</code>
                  </p>
                </section>
              </div>
            </div>
            <aside className="panel schema-panel">
              <div className="panel-heading">
                <h2>
                  <Icon name="info" size={22} />
                  데이터 형식 안내
                </h2>
                <button
                  className="small-outline"
                  onClick={() => download(sample, "가사봄_가사_예제.json")}
                >
                  예제 다운로드
                </button>
              </div>
              <p className="subtle">
                가사 JSON은 원문·발음·뜻을 함께 담습니다.
              </p>
              <div className="file-tabs">
                <button
                  className={fieldTab === "json" ? "active" : ""}
                  onClick={() => setFieldTab("json")}
                >
                  JSON 구조 예시
                </button>
                <button
                  className={fieldTab === "fields" ? "active" : ""}
                  onClick={() => setFieldTab("fields")}
                >
                  필드 설명
                </button>
              </div>
              {fieldTab === "json" ? (
                <pre>
                  <code>{JSON.stringify(sample, null, 2)}</code>
                </pre>
              ) : (
                <dl className="field-list">
                  {[
                    ["title", "곡 제목"],
                    ["artist", "가수 이름"],
                    ["audioSrc", "로컬 MP3 경로"],
                    ["ja", "일본어 원문"],
                    ["koPronunciation", "한글 발음"],
                    ["koTranslation", "한국어 뜻"],
                    ["start / end", "가사 시작·끝 (초)"],
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </aside>
          </div>
        )}
        {tab === "library" && (
          <section className="panel manage-library">
            <h2>
              내 보관함의 노래{" "}
              <span className="count-pill">{songs.length}</span>
            </h2>
            <div className="manage-song-list">
              {songs.map((s) => (
                <div key={s.id}>
                  <CoverArt song={s} size="small" displayTitle={false} />
                  <div>
                    <strong>{s.title}</strong>
                    <small>
                      {s.artist} · {s.lines.length}줄
                    </small>
                  </div>
                  <Link
                    className="button button-outline"
                    href={`/songs/${s.id}`}
                  >
                    연습실 열기
                  </Link>
                  <button
                    className="button button-outline"
                    aria-label={`${s.title} 편집`}
                    onClick={() => {
                      setPreview(s);
                      setEditorSource(s);
                      setEditing(true);
                      setTab("data");
                      router.replace("/settings?tab=data", { scroll: false });
                    }}
                  >
                    편집
                  </button>
                  <button
                    className="small-outline"
                    aria-label={`${s.title} 삭제 검토`}
                    onClick={async () => {
                      setMessage("");
                      try {
                        const response = await fetch(
                            `/api/songs?id=${encodeURIComponent(s.id)}`,
                          ),
                          data = await response.json();
                        if (!response.ok) throw new Error(data.error);
                        setDeleting({ song: s, revision: data.revision });
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    삭제
                  </button>

                  <button
                    className="icon-button"
                    aria-label={`${s.title} 가사 다운로드`}
                    onClick={() => download(s, `${s.id}.json`)}
                  >
                    <Icon name="download" />
                  </button>
                </div>
              ))}
            </div>

            {deleting && (
              <div className="review-box" role="alert">
                <h3>{deleting.song.title} 삭제 확인</h3>
                <p>
                  곡 JSON과 이 곡의 학습 기록을 삭제합니다. 연결된 MP3와 커버는
                  보존됩니다.
                </p>
                <p>
                  노트{" "}
                  {
                    state.notes.filter((n) => n.songId === deleting.song.id)
                      .length
                  }
                  개 · 단어{" "}
                  {
                    state.words.filter((w) => w.songId === deleting.song.id)
                      .length
                  }
                  개 · 연결 플레이리스트{" "}
                  {
                    state.playlists.filter((l) =>
                      l.songIds.includes(deleting.song.id),
                    ).length
                  }
                  개
                </p>
                <button
                  className="button button-primary"
                  disabled={deleteBusy}
                  onClick={async () => {
                    setDeleteBusy(true);
                    try {
                      const response = await fetch("/api/songs", {
                          method: "DELETE",
                          headers: {
                            "x-gasabom-local": "1",
                            "content-type": "application/json",
                          },
                          body: JSON.stringify({
                            id: deleting.song.id,
                            revision: deleting.revision,
                          }),
                        }),
                        data = await response.json();
                      if (!response.ok) throw new Error(data.error);
                      forgetSong(deleting.song.id);
                      player.removeSong(deleting.song.id);
                      if (editorSource?.id === deleting.song.id)
                        setEditorSource(null);
                      setDeleting(null);
                      router.refresh();
                      setMessage(
                        "곡을 삭제했습니다. 연결 음원과 커버는 보존했습니다.",
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setDeleteBusy(false);
                    }
                  }}
                >
                  확인하고 삭제
                </button>
                <button
                  className="button button-outline"
                  disabled={deleteBusy}
                  onClick={() => setDeleting(null)}
                >
                  취소
                </button>
              </div>
            )}
            {message && <p role="status">{message}</p>}
            <Link href="/library" className="button button-primary">
              보관함 열기
              <Icon name="chevron-right" size={16} />
            </Link>
          </section>
        )}
        {tab === "backup" && (
          <>
            <section className="panel backup-panel">
              <span className="eyebrow">학습 기록</span>
              <h2>학습 기록 내보내기</h2>
              <p>
                즐겨찾기, 외운 가사, 노트, 단어장, 플레이리스트와 보기 설정을
                JSON 파일로 저장합니다.
              </p>
              <div className="backup-summary">
                <span>
                  <strong>{state.favorites.length}</strong>즐겨찾기
                </span>
                <span>
                  <strong>{state.notes.length}</strong>노트
                </span>
                <span>
                  <strong>{state.words.length}</strong>단어
                </span>
                <span>
                  <strong>{state.playlists.length}</strong>플레이리스트
                </span>
              </div>
              <button
                className="button button-primary"
                onClick={() =>
                  download(
                    {
                      format: "gasabom-learning-backup",
                      version: 2,
                      exportedAt: new Date().toISOString(),
                      state,
                    },
                    `가사봄_학습기록_${new Date().toISOString().slice(0, 10)}.json`,
                  )
                }
              >
                <Icon name="download" size={18} />
                학습 기록 내보내기
              </button>
              <p className="subtle">
                MP3와 가사 원본은 학습 기록 JSON에 포함되지 않아요. 곡 자료도
                함께 별도로 보관해 주세요.
              </p>
            </section>
            <BackupTools songs={songs} />
          </>
        )}
        {tab === "preferences" && (
          <section className="panel preferences-panel">
            <h2>가사 표시 설정</h2>
            <p className="subtle">
              표시 언어, 글자 크기, 자동 스크롤을 설정하세요.
            </p>
            {[
              { key: "showJapanese" as const, label: "일본어 원문 보기" },
              { key: "showPronunciation" as const, label: "한글 발음 보기" },
              { key: "showTranslation" as const, label: "한국어 뜻 보기" },
              { key: "autoScroll" as const, label: "현재 가사 자동 스크롤" },
            ].map((x) => (
              <label className="preference-row" key={x.key}>
                <span>{x.label}</span>
                <input
                  type="checkbox"
                  checked={state.options[x.key]}
                  onChange={(e) => {
                    if (
                      x.key !== "autoScroll" &&
                      !e.target.checked &&
                      [
                        "showJapanese",
                        "showPronunciation",
                        "showTranslation",
                      ].filter((k) => state.options[k as "showJapanese"])
                        .length === 1
                    )
                      return;
                    setOption(x.key, e.target.checked);
                  }}
                />
              </label>
            ))}
            <label className="preference-row">
              <span>
                한글 발음 글자 크기 <strong>{state.options.fontSize}px</strong>
              </span>
              <input
                type="range"
                min={20}
                max={32}
                value={state.options.fontSize}
                onChange={(e) => setOption("fontSize", Number(e.target.value))}
                aria-label="한글 발음 글자 크기"
              />
            </label>

            <label className="preference-row">
              <span>보관함 기본 보기</span>
              <select
                aria-label="보관함 기본 보기"
                value={state.options.libraryView}
                onChange={(e) =>
                  setOption("libraryView", e.target.value as "grid" | "list")
                }
              >
                <option value="grid">카드</option>
                <option value="list">목록</option>
              </select>
            </label>
            <label className="preference-row">
              <span>개인 표시 이름</span>
              <input
                aria-label="개인 표시 이름"
                maxLength={40}
                value={state.options.personalName}
                onChange={(e) => setOption("personalName", e.target.value)}
              />
            </label>
            <Link className="button button-primary" href="/library">
              연습하러 가기
              <Icon name="chevron-right" size={17} />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
