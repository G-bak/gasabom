"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageBanner } from "@/components/PageBanner";
import { SongCard } from "@/components/SongCard";
import { CoverArt } from "@/components/CoverArt";
import { Icon } from "@/components/Icon";
import { usePracticeState } from "@/lib/storage";
import type { Song } from "@/lib/types";
import { publicAssetUrl } from "@/lib/site-paths";
type Filter = "all" | "favorites" | "recent" | "learned";
export function LibraryScreen({ songs }: { songs: Song[] }) {
  const params = useSearchParams();
  const { state, setOption } = usePracticeState();
  const view = state.options.libraryView;
  const searchQuery = params.get("q") || "";
  const [query, setQuery] = useState(params.get("q") || ""),
    [filter, setFilter] = useState<Filter>("all"),
    [genre, setGenre] = useState("전체"),
    [sort, setSort] = useState("title");
  useEffect(() => setQuery(searchQuery), [searchQuery]);
  const completed = (song: Song) =>
    song.lines.length > 0 &&
    song.lines.every((l) => state.learned[song.id]?.includes(l.id));
  const filtered = useMemo(
    () =>
      songs
        .filter((song) => {
          if (filter === "favorites" && !state.favorites.includes(song.id))
            return false;
          if (filter === "recent" && !state.recent[song.id]) return false;
          if (filter === "learned" && !completed(song)) return false;
          if (genre !== "전체" && (song.genre || "J-POP") !== genre)
            return false;
          return [song.title, song.titleJa || "", song.artist, ...song.tags]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase().trim());
        })
        .sort((a, b) =>
          sort === "added"
            ? (b.addedAt || "").localeCompare(a.addedAt || "")
            : sort === "artist"
              ? a.artist.localeCompare(b.artist, "ko")
              : sort === "recent"
                ? (state.recent[b.id] || "").localeCompare(
                    state.recent[a.id] || "",
                  )
                : a.title.localeCompare(b.title, "ko"),
        ),
    [songs, state, query, filter, genre, sort],
  );
  const recent = songs
    .filter((s) => state.recent[s.id])
    .sort((a, b) => state.recent[b.id].localeCompare(state.recent[a.id]))
    .slice(0, 3);
  const artists = Object.entries(
    songs.reduce<Record<string, number>>((a, s) => {
      a[s.artist] = (a[s.artist] || 0) + (state.playCounts[s.id] || 0);
      return a;
    }, {}),
  )
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const filters = [
    {
      id: "all" as const,
      label: "전체 곡",
      icon: "music" as const,
      count: songs.length,
    },
    {
      id: "favorites" as const,
      label: "즐겨찾기",
      icon: "heart" as const,
      count: songs.filter((s) => state.favorites.includes(s.id)).length,
    },
    {
      id: "recent" as const,
      label: "최근 연습",
      icon: "clock" as const,
      count: songs.filter((song) => state.recent[song.id]).length,
    },
    {
      id: "learned" as const,
      label: "학습 완료",
      icon: "check-circle" as const,
      count: songs.filter(completed).length,
    },
  ];
  return (
    <main>
      <PageBanner scene="library" eyebrow="곡 목록" title="내 노래 보관함">
        연습할 곡을 선택하세요. 즐겨찾기와 검색으로 곡을 찾을 수 있습니다.
      </PageBanner>
      <div className="container library-layout">
        <aside className="library-sidebar">
          <h2>보관함</h2>
          <nav aria-label="보관함 분류">
            {filters.map((x) => (
              <button
                key={x.id}
                type="button"
                className={filter === x.id ? "active" : ""}
                onClick={() => {
                  setFilter(x.id);
                }}
                aria-pressed={filter === x.id}
              >
                <Icon name={x.icon} size={19} />
                <span>{x.label}</span>
                <small>{x.count}</small>
              </button>
            ))}
          </nav>
        </aside>
        <section className="library-main" aria-label="내 노래 목록">
          <div className="library-search-row">
            <label className="song-search">
              <Icon name="search" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="곡명, 가수, 태그로 검색해보세요…"
                aria-label="노래 검색"
              />
            </label>
          </div>
          <div className="genre-chips" aria-label="장르 필터">
            {["전체", ...new Set(songs.map((s) => s.genre || "J-POP"))].map(
              (g) => (
                <button
                  type="button"
                  key={g}
                  className={genre === g ? "selected" : ""}
                  aria-pressed={genre === g}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ),
            )}
          </div>
          {recent.length > 0 && (
            <section className="recent-section">
              <h3>
                <Icon name="clock" size={18} />
                최근 연습한 곡
              </h3>
              <div className="recent-grid">
                {recent.map((s) => (
                  <Link
                    className="recent-card"
                    href={`/songs/${s.id}`}
                    key={s.id}
                  >
                    <CoverArt song={s} size="small" displayTitle={false} />
                    <div>
                      <strong>{s.title}</strong>
                      <small>{s.artist}</small>
                    </div>
                    <Icon name="play" size={17} />
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className="collection-heading">
            <h2>
              <Icon name="music" size={21} />
              {filters.find((f) => f.id === filter)?.label}
              <span>{filtered.length}</span>
            </h2>
            <div>
              <select
                aria-label="곡 정렬"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="title">제목순</option>
                <option value="artist">가수순</option>
                <option value="recent">최근 연습순</option>
                <option value="added">최신 추가순</option>
              </select>
              <button
                className={`icon-button ${view === "grid" ? "active" : ""}`}
                aria-label="카드 보기"
                aria-pressed={view === "grid"}
                onClick={() => setOption("libraryView", "grid")}
              >
                <Icon name="grid" size={19} />
              </button>
              <button
                className={`icon-button ${view === "list" ? "active" : ""}`}
                aria-label="목록 보기"
                aria-pressed={view === "list"}
                onClick={() => setOption("libraryView", "list")}
              >
                <Icon name="list" size={19} />
              </button>
            </div>
          </div>
          {filtered.length ? (
            <div className={`song-grid ${view === "list" ? "song-list" : ""}`}>
              {filtered.map((s) => (
                <SongCard song={s} key={s.id} />
              ))}
            </div>
          ) : (
            <div className="empty-results">
              <Icon name="music" size={36} />
              <h3>
                {songs.length
                  ? "조건에 맞는 노래가 없어요"
                  : "아직 등록한 곡이 없어요"}
              </h3>
              <p>검색어나 필터를 변경하세요.</p>
              <button
                className="button button-outline"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setGenre("전체");
                }}
              >
                조건 초기화
              </button>
            </div>
          )}
        </section>
        <aside className="library-insights">
          <section className="panel">
            <h3>
              <Icon name="music" size={18} />
              연습 현황
            </h3>
            <div className="insight-stats">
              <div>
                <Icon name="music" />
                <strong>{songs.length}</strong>
                <small>보관함 곡</small>
              </div>
              <div>
                <Icon name="clock" />
                <strong>
                  {state.listeningSeconds < 60
                    ? `${Math.floor(state.listeningSeconds)}초`
                    : `${Math.floor(state.listeningSeconds / 60)}분`}
                </strong>
                <small>총 연습 시간</small>
              </div>
              <div>
                <Icon name="heart" />
                <strong>{filters[1].count}</strong>
                <small>즐겨찾기 곡</small>
              </div>
            </div>
          </section>
          <section className="panel">
            <h3>
              <Icon name="star" size={18} />
              자주 듣는 아티스트
            </h3>
            <ol className="artist-list">
              {artists.map(([artist, count], i) => (
                <li key={artist}>
                  <span>{i + 1}</span>
                  <div className="artist-avatar">
                    <img
                      src={publicAssetUrl(
                        songs.find((song) => song.artist === artist)
                          ?.coverSrc || "/brand/app-icon.png"
                      )}
                      alt=""
                    />
                  </div>
                  <strong>{artist}</strong>
                  <small>{count}회 재생</small>
                </li>
              ))}
            </ol>
            {!artists.length && (
              <p className="empty-small">
                재생한 곡이 없습니다. 곡을 재생하면 아티스트가 표시됩니다.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
