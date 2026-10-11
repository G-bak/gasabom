"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode, type FormEvent } from "react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { usePracticeState } from "@/lib/storage";
import { usePlayer } from "@/lib/player";
import { PlayerDock } from "./PlayerDock";
import type { Song } from "@/lib/types";
import type { SongIssue } from "@/lib/songs";
import { SETTINGS_VISIBLE } from "@/lib/features";
export function AppShell({
  children,
  songs,
  issues,
}: {
  children: ReactNode;
  songs: Song[];
  issues: SongIssue[];
}) {
  const pathname = usePathname(),
    router = useRouter();
  const { state, saveError } = usePracticeState();
  const player = usePlayer();
  const [query, setQuery] = useState(""),
    [menuOpen, setMenuOpen] = useState(false);
  const recent =
    Object.entries(state.recent)
      .filter(([id]) => songs.some((s) => s.id === id))
      .sort((a, b) => b[1].localeCompare(a[1]))[0]?.[0] || songs[0]?.id;
  const links = [
    { label: "홈", href: "/" },
    { label: "보관함", href: "/library" },
    { label: "연습실", href: recent ? `/songs/${recent}` : "/library" },
    ...(SETTINGS_VISIBLE ? [{ label: "설정", href: "/settings" }] : []),
  ];
  function search(e: FormEvent) {
    e.preventDefault();
    router.push(`/library?q=${encodeURIComponent(query.trim())}`);
    setMenuOpen(false);
  }
  return (
    <div className={`site-shell ${player.song ? "has-player" : ""}`}>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav
            className={menuOpen ? "site-nav is-open" : "site-nav"}
            aria-label="메인 메뉴"
          >
            {links.map((l, i) => {
              const active =
                i === 2 ? pathname.startsWith("/songs/") : pathname === l.href;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <form className="header-search" onSubmit={search}>
            <input
              type="search"
              aria-label="전체 곡 검색"
              placeholder="곡명·가수·태그 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="검색" type="submit">
              <Icon name="search" size={19} />
            </button>
          </form>
          {SETTINGS_VISIBLE && (
            <Link
              className="profile-link"
              href="/settings?tab=preferences"
              aria-label={
                state.options.personalName
                  ? `${state.options.personalName} 개인 설정`
                  : "개인 설정"
              }
            >
              <Icon name="user" size={21} />
            </Link>
          )}
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "x" : "menu"} />
          </button>
        </div>
      </header>
      {saveError && (
        <div className="storage-warning" role="status">
          브라우저 저장이 제한되어 있습니다. 연습 기록을 보관하려면 학습 기록을
          내보내세요.{" "}
          {SETTINGS_VISIBLE && (
            <Link href="/settings?tab=backup">백업 열기</Link>
          )}
        </div>
      )}
      {issues.length > 0 && (
        <div className="storage-warning" role="status">
          읽을 수 없는 곡 자료 {issues.length}개가 있습니다. 유효한 곡은 계속
          사용할 수 있습니다.{" "}
          {SETTINGS_VISIBLE && <Link href="/settings">오류 확인</Link>}
        </div>
      )}
      {children}
      <PlayerDock />
      <footer className="site-footer">
        <div className="footer-inner">
          <Brand dark />
          {SETTINGS_VISIBLE && (
            <nav aria-label="하단 메뉴">
              <Link href="/settings?tab=backup">학습 기록 내보내기</Link>
            </nav>
          )}
          <p>
            가사봄 · J-POP 가사 연습
            <small>© {new Date().getFullYear()} GASABOM</small>
          </p>
        </div>
      </footer>
    </div>
  );
}
