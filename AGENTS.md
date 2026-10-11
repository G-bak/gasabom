# AGENTS.md — 가사봄

## 현재 기준 (2026-10-12)

먼저 README.md, [최신 화면 결정](docs/23_재생기_단순화_설정숨김.md), [자료 처리 기록](docs/22_현재상태_운영과검증.md), TEST_RESULTS.md를 읽는다. docs/11은 이전 전체 설계이며 최신 사용자 결정은 23번을 우선한다. 이전 구현/미완료 상태는 현재 상태로 해석하지 않는다. 디자인 원본과 과거 검수 파일은 로컬에만 있을 수 있다.

최신 사용자 지시: practice-toolbar를 렌더링하지 않고 하단 플레이어 하나만 사용한다. 기본은 현재 곡 반복, 추가 모드는 현재 가사 줄 반복만 남긴다. 조작은 아이콘이며 재생 방식 셀렉트가 없다. 암기·북마크·셔플·A–B·배속·집중·측면 패널 토글과 플레이리스트 UI는 다시 추가하지 않는다. 속도는 1배다. 노트·단어는 항상 표시한다. 설정은 SETTINGS_VISIBLE=false로 모든 진입 링크를 숨기고 코드·API·직접 주소 접근은 보존한다.

사용자는 일본어를 읽는 데 익숙하지 않은 한국어 사용자이며, 로컬 MP3와 원문·한글 발음·뜻으로 연습하는 개인용 사이트를 원한다. React + Next.js App Router + TypeScript를 유지한다. DB·회원·인증·결제·광고·클라우드, 자동 번역/음역·언어 API·음원/가사 크롤링 기능은 도입하지 않는다. 실행은 127.0.0.1에 바인딩한다.

## 현재 자료와 불변 조건

- 이 PC의 활성 곡은 Official Hige Dandism — Pretender 1곡이다. 삭제한 예제곡을 복구하거나 새 데모를 자동 등록하지 않는다. 테스트는 임시 폴더/임시 곡으로 수행한 뒤 정리한다.
- 가사 74줄·표현 39개는 사용자 제공 MP3의 전사 초안이다. sourceAnalysis.reviewStatus=draft를 유지하며 공식 대조·전체 청음 검수 없이 완료라고 표시하지 않는다.
- 편집 MP3는 318.53초, 앞 7.57초·뒤 3.478667초를 정리했다. 현재 JSON/TXT 타임코드는 이미 보정되어 있으므로 다시 차감하지 않는다. 원본 다운로드는 보존한다.
- song.id는 JSON 파일명과 같고, 각 line.id는 곡 안에서 고유하다. 기존 id를 불필요하게 바꾸지 않는다. 원문·발음·뜻을 문구 정리나 자동 추론 대상으로 취급하지 않는다.
- audioSrc는 빈 문자열 또는 /audio/ 안의 MP3다. 음원이 없거나 타임코드가 없으면 수동 가사 연습이 정상 동작해야 한다. 시간은 모든 줄에 있거나 모두 없으며 겹치지 않는 초 단위 숫자다.
- 개인 MP3·곡 JSON/TXT·검수 기록과 디자인 원본은 Git에서 제외한다. 코드·문서·자체 웹 에셋·템플릿은 비공개 G-bak/gasabom 저장소에 보관한다. 로컬 개인 자료를 지우지 않는다.

## 구조와 저장

- lib/song-schema.mjs: 브라우저·서버·CLI 공통 검증/수동 TXT 파서. 변경할 때 모든 진입점에 동일 규칙을 적용한다.
- lib/songs.ts: 서버에서 로컬 곡 읽기·오류 격리. 한 곡의 오류로 전체 화면을 실패시키지 않는다.
- lib/library-service.ts 및 app/api/songs, app/api/backup: loopback·동일 출처·전용 헤더·실제 용량·허용 경로·일반 파일 검사, 버전 충돌, 임시 저장/복구, ZIP 검증.
- 파일 쓰기는 content/songs, public/audio, public/covers로 한정한다. 소스·design·임의 PC 파일을 자료 관리 API로 쓰지 않는다. 경로 탈출과 연결 폴더/파일을 거부한다.
- lib/player.tsx와 components/PlayerDock.tsx: 앱 전체 오디오 하나. 연습실·보관함·숨긴 설정의 미리듣기는 같은 오디오를 제어한다. 페이지 이동 시 시간·음량·줄 반복을 유지한다. 새로고침만으로 자동 재생하지 않는다. 기본 현재 곡 반복, 속도 1배를 유지한다.
- lib/practice-data.ts, lib/storage.ts: 학습 상태·엄격한 백업 검증·v1 이관·손상 기록 복구. 학습/보기는 gasabom:practice:v2 localStorage, 음량·재생 방식과 기존 플레이리스트 기록은 gasabom:session:v1 sessionStorage. 기본 음량 100%, 현재 곡 반복. 이전 once/auto는 song으로 이관하며 v1 기록을 삭제하지 않는다.
- lib/media-response.ts와 로컬 media API: 서버 시작 후 추가한 음원/커버도 즉시 읽고 Range·HEAD·조건부 캐시를 처리한다.
- components/SettingsScreen, SongEditor, BackupTools: 곡 등록·편집·삭제·수동 시간 초안과 두 종류의 백업/복원. 저장/삭제/교체의 실제 대상과 영향을 사용자가 확인할 수 있어야 한다.
- 노트·수동 단어장의 편집/연결·검색은 실제 저장 상태를 사용한다. 제거한 북마크·플레이리스트의 이전 기록은 보존한다. 통계에 가짜 수치를 넣지 않는다. 시크·일시정지·미리듣기를 청취 기록으로 집계하지 않는다.

## 화면과 디자인

표시하는 경로는 /, /library, /songs/[slug]다. /settings는 코드와 직접 주소 접근만 유지하며 진입 링크를 표시하지 않는다. /guide 및 연습실 돌아가기 링크는 제거한 상태를 유지한다.

현재 브랜드는 public/brand의 파란색·분홍색 로고와 도시/창가 배경이다. 공식 앨범아트 대신 자체 커버를 사용한다. Pretendard를 next/font/local로 사용하고 외부 폰트/이미지 CDN을 추가하지 않는다. UI 문구는 동작을 구체적으로 설명하는 한국어로 작성한다.

PC .container는 calc(100% - 240px), max-width:none, margin:0 auto를 유지한다. 좁은 화면은 기존 반응형 여백을 유지한다. 고정 px 최대 너비·가사/노트 최대 높이를 추가하지 않는다. 가사 3열은 같은 line.id의 한 행으로 정렬하고 모바일에서도 발음을 충분히 크게 표시한다. 한글 발음 기본 24px, 설정 20~32px다.

현재 가사는 매 줄과 마지막 줄 모두 가시 영역 중앙으로 이동한다. 자동 스크롤 끄기와 동작 줄이기 옵션을 유지한다. section-label·lyrics-panel-tools DOM과 하단 재생기의 상단 진행 선/상단 테두리는 다시 추가하지 않는다.

## 변경·검증

수정 후 npm test, npm run validate:data, npm run typecheck, npm run build를 실행한다. 실제 브라우저에서 재생·반복·수동 가사·키보드·모바일과 변경한 관리 흐름을 확인한다. 사용자 곡/학습 기록을 시험 데이터로 덮어쓰지 않는다. 임시 검사 포트를 사용하고 테스트 곡을 정리한다. 기능 변경은 README·현재 운영 문서·테스트 결과에 반영한다. 과거 작업 이력은 현재 설명과 구분하여 보존한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
