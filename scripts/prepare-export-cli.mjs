import { prepareExport } from "./prepare-export.mjs";
prepareExport()
  .then((count) => console.log(`정적 페이지 이동 파일 준비: ${count}개`))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
