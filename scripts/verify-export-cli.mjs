import { verifyExport } from "./verify-export.mjs";
verifyExport()
  .then((result) =>
    console.log(
      `정적 출력 확인: ${result.songs.join(", ") || "등록곡 없음"} · 곡 페이지 ${result.pages}개 · 설정/API 없음`,
    ),
  )
  .catch((error) => {
    console.error(`정적 출력 오류: ${error.message}`);
    process.exitCode = 1;
  });
