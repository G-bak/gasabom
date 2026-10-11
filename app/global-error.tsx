"use client";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ko">
      <body>
        <main style={{ padding: 24, fontFamily: "sans-serif" }}>
          <h1>가사봄을 불러오지 못했습니다</h1>
          <p>프로젝트 폴더와 파일 권한을 확인한 뒤 다시 시도하세요.</p>
          <button onClick={retry}>다시 시도</button>
        </main>
      </body>
    </html>
  );
}
