"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { usePracticeState, type StudyWord } from "@/lib/storage";
import type { Song } from "@/lib/types";
export function PracticeTools({
  song,
  lineId,
  canPlay,
  onPlayWord,
}: {
  song: Song;
  lineId?: string;
  canPlay: boolean;
  onPlayWord: (word: StudyWord) => void;
}) {
  const {
    state,
    addNote,
    updateNote,
    removeNote,
    addWord,
    updateWord,
    removeWord,
    toggleWordStar,
  } = usePracticeState();
  const [note, setNote] = useState(""),
    [notesTab, setNotesTab] = useState<"write" | "saved">("write"),
    [showForm, setShowForm] = useState(false),
    [ja, setJa] = useState(""),
    [reading, setReading] = useState(""),
    [meaning, setMeaning] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null),
    [noteLine, setNoteLine] = useState<string | undefined>(),
    [attachNote, setAttachNote] = useState(false);
  const [editingWord, setEditingWord] = useState<string | null>(null),
    [wordLine, setWordLine] = useState<string | undefined>(),
    [wordQuery, setWordQuery] = useState(""),
    [onlyStars, setOnlyStars] = useState(false);
  const notes = state.notes.filter((n) => n.songId === song.id);
  const savedWords = state.words.filter((w) => w.songId === song.id);
  const suggestions = song.studyWords || [];
  const allWords = [
    ...suggestions.map((word) => {
      const saved = savedWords.find(
        (entry) => entry.ja === word.ja && entry.lineId === word.lineId,
      );
      return saved
        ? { ...saved, suggested: false }
        : {
            ...word,
            id: `suggested-${song.id}-${word.id}`,
            songId: song.id,
            starred: false,
            suggested: true,
          };
    }),
    ...savedWords
      .filter(
        (word) =>
          !suggestions.some(
            (entry) => entry.ja === word.ja && entry.lineId === word.lineId,
          ),
      )
      .map((word) => ({ ...word, suggested: false })),
  ];
  const words = allWords.filter(
    (w) =>
      (!onlyStars || w.starred) &&
      [w.ja, w.reading, w.meaning, w.koPronunciation || ""]
        .join(" ")
        .toLowerCase()
        .includes(wordQuery.trim().toLowerCase()),
  );
  const saveSuggestion = (word: (typeof words)[number], starred = false) =>
    addWord({
      songId: song.id,
      ja: word.ja,
      reading: word.reading,
      koPronunciation: word.koPronunciation,
      meaning: word.meaning,
      lineId: word.lineId,
      starred,
    });
  return (
    <aside className="practice-tools">
      <section className="panel note-panel">
        <h3>
          <Icon name="book" size={20} />내 노트
          <span className="count-pill">{notes.length}</span>
        </h3>
        <p className="subtle">가사 뜻이나 연습할 부분을 메모하세요.</p>
        <div className="note-tabs" role="tablist" aria-label="노트 메뉴">
          <button
            role="tab"
            aria-selected={notesTab === "write"}
            onClick={() => setNotesTab("write")}
          >
            노트 작성
          </button>
          <button
            role="tab"
            aria-selected={notesTab === "saved"}
            onClick={() => setNotesTab("saved")}
          >
            저장한 노트 ({notes.length})
          </button>
        </div>
        {notesTab === "write" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingNote)
                updateNote(
                  editingNote,
                  note,
                  attachNote ? noteLine : undefined,
                );
              else addNote(song.id, note, attachNote ? lineId : undefined);
              setEditingNote(null);
              setNote("");
              setNotesTab("saved");
            }}
          >
            <textarea
              aria-label="내 노트 내용"
              placeholder="메모를 입력하세요 (최대 500자)"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <label className="preference-row">
              <span>현재 가사 줄에 연결</span>
              <input
                type="checkbox"
                checked={attachNote}
                onChange={(e) => {
                  setAttachNote(e.target.checked);
                  setNoteLine(lineId);
                }}
              />
            </label>
            <div className="form-footer">
              <small>{note.length}/500</small>
              <button className="button button-primary" disabled={!note.trim()}>
                {editingNote ? "노트 수정 저장" : "저장하기"}
              </button>
              {editingNote && (
                <button
                  type="button"
                  className="small-outline"
                  onClick={() => {
                    setEditingNote(null);
                    setNote("");
                  }}
                >
                  편집 취소
                </button>
              )}
            </div>
          </form>
        )}
        {notesTab === "saved" &&
          (notes.length ? (
            <div className="saved-notes">
              {notes.map((n) => (
                <article key={n.id}>
                  <p>{n.text}</p>
                  {n.lineId && (
                    <small>
                      {song.lines.findIndex((l) => l.id === n.lineId) >= 0
                        ? `${song.lines.findIndex((l) => l.id === n.lineId) + 1}번 가사 연결`
                        : "연결된 가사 줄이 삭제되었습니다."}
                    </small>
                  )}
                  <div>
                    <small>
                      {new Date(n.createdAt).toLocaleDateString("ko-KR")}
                    </small>
                    <button
                      className="small-outline"
                      type="button"
                      onClick={() => {
                        setEditingNote(n.id);
                        setNote(n.text);
                        setAttachNote(!!n.lineId);
                        setNoteLine(n.lineId);
                        setNotesTab("write");
                      }}
                    >
                      노트 편집
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="노트 삭제"
                      onClick={() => removeNote(n.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-small">저장된 메모가 없습니다.</p>
          ))}
      </section>
      <section className="panel word-panel">
        <div className="panel-heading">
          <h3>
            <Icon name="sparkles" size={20} />
            어려운 표현 / 단어
          </h3>
          <button
            className="small-outline"
            onClick={() => {
              setEditingWord(null);
              setJa("");
              setReading("");
              setMeaning("");
              setShowForm(!showForm);
            }}
            aria-expanded={showForm}
          >
            <Icon name="plus" size={14} />
            직접 추가
          </button>
        </div>
        {showForm && (
          <form
            className="word-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (editingWord)
                updateWord(editingWord, {
                  songId: song.id,
                  ja,
                  reading,
                  meaning,
                  lineId: wordLine,
                });
              else addWord({ songId: song.id, ja, reading, meaning, lineId });
              setEditingWord(null);
              setJa("");
              setReading("");
              setMeaning("");
              setShowForm(false);
            }}
          >
            <label>
              일본어
              <input
                aria-label="단어 일본어"
                value={ja}
                onChange={(e) => setJa(e.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              읽는 법
              <input
                aria-label="단어 읽는 법"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                maxLength={120}
              />
            </label>
            <label>
              한국어 뜻
              <input
                aria-label="단어 한국어 뜻"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                maxLength={180}
              />
            </label>
            <small className="subtle">
              재생할 수 있는 현재 가사 구간과 연결합니다.
            </small>
            <button
              className="button button-primary"
              disabled={
                !ja.trim() ||
                !meaning.trim() ||
                savedWords.some(
                  (w) =>
                    w.id !== editingWord &&
                    w.ja === ja &&
                    w.lineId === (editingWord ? wordLine : lineId),
                )
              }
            >
              {editingWord ? "단어 수정 저장" : "단어 저장"}
            </button>
            {editingWord && (
              <button
                type="button"
                className="small-outline"
                onClick={() => {
                  setEditingWord(null);
                  setJa("");
                  setReading("");
                  setMeaning("");
                  setShowForm(false);
                }}
              >
                편집 취소
              </button>
            )}
          </form>
        )}
        <label className="word-search">
          표현 검색
          <input
            type="search"
            aria-label="표현 검색"
            value={wordQuery}
            onChange={(e) => setWordQuery(e.target.value)}
          />
        </label>
        <label className="preference-row">
          <span>별표한 표현만 보기</span>
          <input
            type="checkbox"
            checked={onlyStars}
            onChange={(e) => setOnlyStars(e.target.checked)}
          />
        </label>
        {words.length ? (
          <ul className="word-list">
            {words.map((w) => (
              <li key={w.id}>
                <div>
                  <strong lang="ja">
                    {w.ja}
                    {w.reading && <small> ({w.reading})</small>}
                  </strong>
                  {w.koPronunciation && (
                    <small className="word-reading">{w.koPronunciation}</small>
                  )}
                  <span>{w.meaning}</span>
                </div>
                <button
                  className="icon-button"
                  aria-label={`${w.ja} 연결 구간 재생`}
                  disabled={
                    !canPlay || !song.lines.some((l) => l.id === w.lineId)
                  }
                  title={
                    !canPlay
                      ? "음원과 시간 정보가 필요합니다"
                      : "연결된 가사 구간 재생"
                  }
                  onClick={() => onPlayWord(w)}
                >
                  <Icon name="volume" size={17} />
                </button>
                {!w.suggested && (
                  <button
                    className="small-outline"
                    aria-label={`${w.ja} 단어 편집`}
                    onClick={() => {
                      setEditingWord(w.id);
                      setJa(w.ja);
                      setReading(w.reading);
                      setMeaning(w.meaning);
                      setWordLine(w.lineId);
                      setShowForm(true);
                    }}
                  >
                    편집
                  </button>
                )}
                <button
                  className={`icon-button ${w.starred ? "starred" : ""}`}
                  aria-label={`${w.ja} 별표`}
                  aria-pressed={w.starred}
                  onClick={() =>
                    w.suggested ? saveSuggestion(w, true) : toggleWordStar(w.id)
                  }
                >
                  <Icon name="star" size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${w.ja} ${w.suggested ? "단어장에 추가" : "단어 삭제"}`}
                  onClick={() =>
                    w.suggested ? saveSuggestion(w) : removeWord(w.id)
                  }
                >
                  <Icon name={w.suggested ? "plus" : "trash"} size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-small">
            표시할 표현이 없습니다. 검색 조건을 바꾸거나 단어를 직접 추가하세요.
          </p>
        )}
        {suggestions.length > 0 && (
          <button
            className="button button-outline add-all-words"
            disabled={words.every((word) => !word.suggested)}
            onClick={() =>
              words
                .filter((word) => word.suggested)
                .forEach((word) => saveSuggestion(word))
            }
          >
            <Icon name="plus" size={16} />
            표시된 표현을 단어장에 추가
          </button>
        )}
      </section>
    </aside>
  );
}
