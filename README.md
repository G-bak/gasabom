# 가사봄 (GASABOM)

일본어 원문·한글 발음·한국어 뜻을 함께 보며 **한 곡씩** 연습하는 정적 사이트입니다. React·Next.js App Router·TypeScript로 빌드하며, 완성된 `out/` 폴더는 HTML·CSS·브라우저 JS와 음원/이미지만으로 실행됩니다. **설정 페이지와 애플리케이션 백엔드/API는 제거했습니다.**

사이트 주소: **https://g-bak.github.io/gasabom/**. 코드·현재 곡 자료는 공개 저장소 G-bak/gasabom, 검증한 정적 배포 파일은 gh-pages 브랜치에 보관합니다.

## 빌드·실행

Node.js 20.9 이상이 필요합니다. 최초 npm 설치에는 인터넷 연결이 필요합니다.

```powershell
npm ci
npm run build
npm start
```

**http://127.0.0.1:3000**에서 확인합니다. npm start는 out 폴더만 제공하는 정적 파일 서버입니다. Next.js 실행 서버나 DB·로그인·클라우드·외부 언어/음원 API가 필요하지 않습니다. 다른 정적 웹 서버에도 out 폴더를 그대로 올릴 수 있습니다. file://로 HTML을 직접 여는 방식은 사용하지 않습니다.

개발할 때는 `npm run dev`를 사용할 수 있습니다. 곡을 추가/수정한 결과를 실제 정적 사이트에 반영하려면 다시 빌드하세요.

## 연습 기능

홈 `/`, 보관함 `/library/`, 연습실 `/songs/<song-id>/`를 제공합니다. 하단 오디오 하나가 페이지 이동 중 재생 위치를 유지합니다. 기본은 현재 곡 반복이며, 추가 모드는 현재 가사 줄 반복만 있습니다. 이동·재생·줄 반복은 아이콘, 진행 위치·음량은 슬라이더입니다. 속도는 1배입니다.

원문·발음·뜻, 현재 줄 중앙 이동, 학습 체크, 즐겨찾기, 노트·단어 작성/편집/검색과 보관함 필터를 유지합니다. 노트·단어 패널은 항상 표시하며 모바일에서는 가사 아래로 이어집니다. 상단 플레이어·암기 모드·북마크·셔플·A–B·배속·패널 토글·플레이리스트 UI는 없습니다.

단축키: `Space` 재생/정지, `←`·`→` 5초 이동, `R` 한 줄 반복 켜기/끄기. 브라우저 학습/보기 기록은 `gasabom:practice:v2` localStorage, 음량·재생 방식은 `gasabom:session:v1` sessionStorage입니다. 이전 기록을 삭제하지 않습니다. 같은 호스트·포트를 유지하면 같은 기록을 사용합니다.

## 곡 교체

현재 자료는 **Official Hige Dandism — Pretender** 한 곡, 가사 74줄·표현 39개·318.53초입니다. 가사·발음·뜻·시간은 전사 초안이며 공식 대조·전체 청음 검수는 남아 있습니다. 이미 보정한 타임코드를 다시 차감하지 않습니다.

이전 곡은 별도 폴더에 백업하고 다음 자료로 교체합니다.

- 가사: `content/songs/<song-id>.json` — 활성 JSON은 한 개만 둡니다. `_TEMPLATE.json`은 등록곡이 아닙니다.
- 음원: `public/audio/<파일명>.mp3` — JSON의 `audioSrc`와 연결합니다.
- 커버: `public/covers/` — 없으면 자체 기본 커버를 사용합니다.
- 편집용 TXT: `content/txt/` — 원문·발음·뜻의 수동 3줄 형식입니다.

같은 곡을 수정할 때 기존 id를 유지하고, 다른 곡이면 다른 song.id를 사용합니다. 시간은 모든 줄에 있거나 모두 없어야 하며 겹치지 않는 초 단위 숫자입니다. 음원이 없으면 audioSrc를 빈 문자열로 두고 수동 가사 연습을 할 수 있습니다. 자동 번역·음역·전사는 수행하지 않습니다.

```powershell
npm run import:txt -- content/txt/내곡.txt
npm run build
```

빌드는 자료 검증, 정적 페이지 생성, 페이지 이동 파일 준비, 출력 검사를 함께 수행합니다. 음원을 바꾸면 빌드 결과의 캐시 값도 갱신합니다. `npm run verify:export`로 현재 자료와 출력이 같은지 다시 확인할 수 있습니다.

## Git 업로드와 곡 이름

**G-bak/gasabom 공개 저장소**에 코드와 현재 한 곡의 MP3·가사 JSON/TXT를 함께 보관합니다. main에서는 out을 생성 결과라 제외하며, 브라우저 개인 기록·디자인 원본·검수 백업도 제외합니다.

커밋 메시지는 항상 **`곡 이름: 변경 내용`** 형식입니다. 현재 곡 제목을 자동으로 넣으려면 다음 순서를 사용합니다.

```powershell
npm test
npm run build
npm run typecheck
git add .
npm run commit:message -- "곡 자료 교체"
npm run commit:song -- "곡 자료 교체"
git push
```

commit:message는 메시지 확인, commit:song은 활성 곡과 최신 빌드를 확인한 뒤 스테이징한 변경을 커밋합니다. Git 업로드와 사이트 배포는 별도입니다. main에 올린 뒤 다음 명령으로 다시 배포합니다.

```powershell
npm run deploy:pages
```

deploy:pages는 작업 폴더가 깨끗하고 현재 main이 원격에 업로드됐는지 확인합니다. `/gasabom` 경로로 다시 빌드하고 출력/타입을 검사한 후 전체 정적 파일과 `.nojekyll`을 gh-pages에 올립니다. 배포 커밋에도 현재 곡 제목이 들어갑니다. GitHub Pages 설정은 **Deploy from a branch → gh-pages → /(root)**입니다. 게시 완료는 저장소 Actions에서 확인하며 업로드 후 수 분 걸릴 수 있습니다.

배포 후에는 로컬 미리보기용 기본 경로로 다시 빌드하므로 `npm start` 주소는 그대로입니다. 곡 교체 때도 가사/MP3를 교체하고 검사 → 곡 이름 커밋 → git push → deploy:pages 순서를 사용합니다. main만 push하면 사이트는 갱신되지 않습니다.

자세한 기준은 [정적 사이트·곡 교체 기록](docs/24_정적사이트_곡교체_커밋규칙.md), [검증 결과](TEST_RESULTS.md), [문서 안내](docs/README.md)를 확인하세요.

## 사이트 접근 범위

2026-10-12 사용자가 요금제와 공개 범위를 확인한 뒤 **저장소 공개 전환과 무료 Pages 배포**를 요청했습니다. 앞선 본인만 접속 조건은 이 결정으로 대체됐습니다. 저장소 코드·커밋 이력·현재 MP3·가사 및 Pages 사이트를 누구나 볼 수 있습니다. 개인 학습 기록은 각 방문자의 브라우저에만 저장됩니다.

검색 제외 설정은 유지하지만 접근 제한은 아닙니다. 사이트 전체와 MP3·가사까지 비공개로 해야 한다면 로그인 등 접근 제한을 지원하는 호스팅이 필요합니다. [GitHub Pages 공개 범위 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
