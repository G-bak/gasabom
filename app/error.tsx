"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="container loading-page">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>화면을 새로고침하거나 정적 사이트 파일을 다시 확인하세요.</p>
      <button className="button button-primary" onClick={retry}>
        다시 시도
      </button>{" "}
    </main>
  );
}
