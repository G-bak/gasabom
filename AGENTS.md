# AGENTS.md — 가사봄 정적 한 곡 연습

## 최신 기준 (2026-10-12)

README.md, [정적 사이트·곡 교체·커밋 규칙](docs/24_정적사이트_곡교체_커밋규칙.md), TEST_RESULTS.md를 먼저 읽는다. 이전 docs/00~23의 설정·API·동적 서버·개인 자료 Git 제외 결정은 24번으로 대체됐다. 과거 기능/검증 문서는 이력으로만 읽는다.

현재 사용자는 한 곡을 준비해 연습하고, 다음 곡으로 교체해 다시 빌드/업로드한다. React·Next.js App Router·TypeScript를 유지하되 output:export의 정적 사이트로 유지한다. 설정 페이지, 자료 등록/수정/삭제 API, ZIP 백업 API, 음원 제공 API와 Next 실행 서버를 다시 도입하지 않는다. DB·계정·결제·광고·클라우드·언어 API·크롤링·자동 번역/음역을 도입하지 않는다.

## Git·커밋

- 사용자가 현재 한 곡의 MP3·JSON/TXT도 비공개 G-bak/gasabom에 포함하도록 승인했다. 이 자료를 다시 ignore 처리하지 않는다. 브라우저 개인 기록·검수 백업·디자인 원본과 생성된 out은 제외한다.
- 모든 작업 커밋 메시지는 현재 곡 이름을 포함한다. 기본 형식은 곡 이름: 변경 내용이다. 현재 예는 Pretender: 정적 사이트 전환 및 곡 자료 포함이다.
- npm run commit:message는 현재 JSON의 제목으로 메시지를 확인한다. npm run commit:song은 활성 곡/최신 정적 출력을 검사하고 스테이징한 변경만 커밋한다. git push는 별도 단계다. 사용자 업로드 권한은 대화의 지시를 따른다.

## 자료·기록 보존

현재 곡은 Official Hige Dandism — Pretender 한 곡이며 74줄·표현 39개·318.53초다. 원문·발음·뜻·타임코드는 전사 초안이다. sourceAnalysis.reviewStatus=draft와 이미 보정된 시간은 유지하고, 공식 대조·전체 청음 없이 검수 완료로 표시하지 않는다. 음원에서 앞 7.57초·뒤 3.478667초를 이미 정리했으므로 다시 보정하지 않는다. 다운로드 원본과 로컬 백업을 삭제하지 않는다.

content/songs에는 템플릿과 활성 JSON 한 개만 둔다. 새 곡은 별도 song.id, 같은 곡 수정은 기존 song.id/line.id를 유지한다. 삭제한 예제곡을 복구하거나 데모를 자동 등록하지 않는다. 가사 문자열을 추론·변형하지 않는다. 모든 줄의 시간은 겹치지 않는 초 단위 시작/끝으로 작성하거나 모두 생략한다. audioSrc는 /audio/ 로컬 MP3 또는 빈 문자열이다. 음원/시간이 없어도 수동 가사 보기와 학습 기록은 동작해야 한다.

학습/보기는 gasabom:practice:v2 localStorage, 음량·재생 방식과 이전 플레이리스트 기록은 gasabom:session:v1 sessionStorage다. 이전 v1과 제거한 기능의 기록도 보존한다. 기본 음량 100%, 현재 곡 반복, 속도 1배다. 브라우저 저장은 클라이언트에서만 사용한다. 사용자의 기존 접속 주소 기록을 검수용 기록으로 덮어쓰지 않는다.

## 빌드와 소스

- lib/songs.ts, lib/data-files.ts: 빌드에서만 로컬 자료를 읽고 검사한다. 실행 중 서버 파일 읽기/쓰기로 확장하지 않는다.
- lib/song-schema.mjs: 빌드·TXT·CLI 공통 검증. 잘못된 자료는 빌드 전에 고친다.
- lib/player.tsx, components/PlayerDock.tsx: 브라우저 오디오 하나, 페이지 이동 중 재생 유지, 기본 곡 반복과 한 줄 반복.
- lib/practice-data.ts, lib/storage.ts, components/PracticeTools.tsx: 브라우저 학습 기록·노트·수동 단어장. 실제 기록으로 통계를 계산한다.
- scripts/prepare-export.mjs: 정적 페이지 이동 조각 이름 호환 처리와 build-info 원본 해시 기록. scripts/verify-export.mjs는 현재 자료와 정적 결과의 일치/설정·API 제거를 검사한다.
- npm run build로 out을 생성한다. 곡을 바꾸면 다시 빌드한다. npm start는 out만 제공하는 정적 파일 서버이며 127.0.0.1에 바인딩한다. 다른 정적 호스트에도 out을 전달할 수 있다. npm run dev는 개발 도구로만 사용한다.

## 화면 불변 조건

화면은 홈·보관함·연습실이다. 설정/가이드 페이지·진입 링크, practice-toolbar, 암기·북마크·셔플·A–B·배속·집중·패널 토글·플레이리스트 UI를 다시 추가하지 않는다. 하단 재생기는 아이콘 버튼과 위치/음량 슬라이더이며 셀렉트가 없다. 노트·단어는 항상 표시하고 모바일에서는 가사 아래에 둔다.

파란색·분홍색 브랜드·자체 커버·로컬 Pretendard를 유지한다. 외부 이미지/폰트 CDN을 추가하지 않는다. PC container는 calc(100% - 240px), max-width:none, margin:0 auto이며 좁은 화면은 기존 반응형 여백을 유지한다. 고정 px 최대 너비·가사/노트 최대 높이를 추가하지 않는다. 원문·발음·뜻은 같은 line.id의 한 행으로 맞춘다. 한글 발음 기본 24px과 현재 줄/마지막 줄의 중앙 이동을 유지한다. section-label·lyrics-panel-tools·재생기 상단 진행 선/테두리를 다시 추가하지 않는다.

## 검증

npm test, npm run build, npm run typecheck, npm run verify:export를 실행한다. out만 제공해 실제 재생·줄 반복·페이지 이동·학습 기록·검색과 모바일을 확인하고 /settings·/api가 404인지 검사한다. 테스트는 별도 포트/임시 폴더에서 하며 원본 자료를 시험 입력으로 덮어쓰지 않는다. 기능/운영 변경은 README·24번 기록·테스트 결과에 반영한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
