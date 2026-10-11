"use client";
import Link from "next/link";
import { SceneBackground } from "@/components/SceneBackground";
import { SongCard } from "@/components/SongCard";
import { Icon } from "@/components/Icon";
import type { Song } from "@/lib/types";
export function LandingScreen({ songs }: { songs: Song[] }) {
  const first = songs.find((s) => s.audioSrc) || songs[0],
    line = first?.lines[0];
  return (
    <main className="landing-page">
      <section className="home-hero">
        <SceneBackground scene="home" priority />
        <div className="container hero-content">
          <span className="eyebrow">J-POP 가사 연습</span>
          <h1>
            한글 발음으로
            <br />
            <span>J-POP 가사를 연습하세요</span>
          </h1>
          <p>
            일본어 원문, 한글 발음, 한국어 뜻을 한 화면에서 확인하세요.
            <br />
            음원을 듣고 어려운 구간을 반복해서 연습할 수 있습니다.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href={"/library"}>
              <Icon name="play" size={17} />
              {first ? "연습할 곡 선택" : "곡 추가"}
              <Icon name="chevron-right" size={17} />
            </Link>
            <Link
              className="button button-outline"
              href={first ? `/songs/${first.id}` : "/library"}
            >
              <Icon name="headphones" size={17} />
              {first ? "등록곡 연습" : "파일 관리"}
            </Link>
          </div>
          <div className="hero-assurances">
            <span>
              <Icon name="check-circle" size={15} />
              회원가입 없이 바로 사용
            </span>
            <span>
              <Icon name="check-circle" size={15} />내 PC에 자료 보관
            </span>
            <span>
              <Icon name="check-circle" size={15} />
              현재 곡·한 줄 반복
            </span>
          </div>
        </div>
      </section>
      <section className="home-section container learning-section">
        <div className="section-intro">
          <span className="eyebrow">가사 보기</span>
          <h2>원문·발음·뜻을 함께 확인</h2>
          <p>준비한 가사와 음원으로 읽기, 발음, 암기 연습을 할 수 있습니다.</p>
        </div>
        <div className="learning-cards">
          {[
            {
              title: "일본어 원문",
              description: "일본어 가사를 줄별로 확인합니다.",
              sample: line?.ja || "곡을 추가하면 원문이 표시됩니다.",
              icon: "file" as const,
            },
            {
              title: "한글 발음",
              description: "한글로 적힌 발음을 보며 따라 부릅니다.",
              sample: line?.koPronunciation || "준비한 한글 발음이 표시됩니다.",
              icon: "headphones" as const,
            },
            {
              title: "한국어 뜻",
              description: "각 가사의 뜻을 한국어로 확인합니다.",
              sample: line?.koTranslation || "준비한 한국어 뜻이 표시됩니다.",
              icon: "book" as const,
            },
          ].map((x, i) => (
            <article className="learning-card" key={x.title}>
              <div className="learning-card-top">
                <span className={`number-badge badge-${i}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon name={x.icon} size={27} />
              </div>
              <h3>{x.title}</h3>
              <p>{x.description}</p>
              <div className="sample-line">{x.sample}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="home-section feature-section">
        <div className="container feature-inner">
          <div className="section-intro">
            <span className="eyebrow">연습 기능</span>
            <h2>음원과 가사 반복 연습</h2>
          </div>
          <div className="feature-cards">
            {[
              {
                icon: "repeat" as const,
                title: "한 줄 반복",
                text: "선택한 가사 한 줄을 반복 재생합니다.",
              },
              {
                icon: "clock" as const,
                title: "현재 곡 반복",
                text: "곡이 끝나면 같은 곡을 처음부터 재생합니다.",
              },
              {
                icon: "eye-off" as const,
                title: "현재 가사 표시",
                text: "재생 시간에 맞춰 현재 가사를 가운데로 이동합니다.",
              },
              {
                icon: "headphones" as const,
                title: "학습 체크",
                text: "외운 가사 줄을 체크해 기록합니다.",
              },
            ].map((x, i) => (
              <div className="feature-card" key={x.title}>
                <span className={`feature-icon badge-${i % 3}`}>
                  <Icon name={x.icon} size={24} />
                </span>
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="home-section container home-collection">
        <div className="section-intro">
          <span className="eyebrow">보관함</span>
          <h2>연습할 곡 선택</h2>
          <p>곡을 선택하면 가사와 음원을 확인할 수 있습니다.</p>
          <Link className="button button-outline" href="/library">
            전체 곡 보기
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <div className="home-song-grid">
          {songs.length ? (
            songs
              .slice(0, 6)
              .map((s) => <SongCard key={s.id} song={s} compact />)
          ) : (
            <div className="empty-results">
              <Icon name="music" size={32} />
              <h3>등록된 곡이 없습니다</h3>
              <p>로컬 곡 자료를 준비하면 보관함에 표시됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
