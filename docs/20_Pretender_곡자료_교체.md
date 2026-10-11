> **이력 문서 안내 (2026-10-12):** 이 문서의 구현 상태는 작성 당시 기록입니다. 현재 화면·기능·검증 상태는 [22번 운영 기록](22_현재상태_운영과검증.md)과 [현재 README](../README.md)를 우선합니다.

# 20. Pretender 곡 자료 교체

2026-10-10 사용자 요청에 따라 기존 곡을 제거하고 제공된 로컬 MP3를 등록했다.

## 현재 자료

- 활성 곡은 **Official髭男dism — Pretender** 한 곡이다. id는 `official-hige-dandism-pretender`다.
- 원본 `Downloads/Official髭男dism - Pretender.mp3`를 `public/audio/official-hige-dandism-pretender.mp3`로 복사했다. 다운로드 폴더의 원본은 변경하지 않았다.
- 원본과 복사본의 SHA-256은 `382f654ff77470129fb2683b99ab524e861c52f64187ada1424f1e34adeb26d8`로 같다.
- 파일 크기 9,798,630바이트, MP3 프레임 기준 길이 329.616초, 48,000Hz, 스테레오, 평균 비트레이트 약 238kbps다. 브라우저의 디코딩 길이는 329.578667초이며 화면에는 5:29로 표시된다.
- 파일에는 가사와 앨범아트 태그가 없었다. 제목·아티스트는 제공 파일 이름을 기준으로 등록했다. 발매일·앨범·공식 크레딧은 파일에 없어 추정하여 넣지 않았다.
- `content/songs/official-hige-dandism-pretender.json`: 일본어 원문·한글 발음·한국어 뜻·타임코드를 가진 74개 연습 구간, 가사 줄에 연결한 표현 39개, 음원 분석 정보와 자료 상태.
- `content/txt/pretender.txt`: 원문/발음/뜻 세 줄 및 시간 정보를 담은 편집용 복사본. 표현 목록과 기존 line.id는 JSON이 기준이다. 동일 id의 곡을 TXT 가져오기로 덮어쓰지 않는다.
- 현재 브라우저 `127.0.0.1:3000`의 v2 학습 기록에 표현 39개와 연습 노트 3개를 저장했다. 다른 브라우저로 노트·단어 기록을 옮길 때는 [준비된 기록 백업](evidence/pretender-20261010/prepared-learning-records.json)을 사용한다. 현재 앱의 복원 UI는 아직 미구현이다. 표현 자료 자체는 곡 JSON에도 있으므로 다른 브라우저에서도 표시된다.
- `public/covers/pretender-v2.svg`는 새로 작성한 곡 표시용 일러스트이며 공식 앨범아트가 아니다. 기본 커버는 `default.svg`로 바꿨다. 홈의 ‘예시곡 연습’ 문구를 ‘등록곡 연습’으로 바꿨다.

## 분석과 정확도 상태

사용자가 요청한 일회성 준비 작업으로 제공 MP3를 로컬에서 전사했다. 원곡의 large-v3/large-v2 결과와 보컬 분리본 결과를 대조하고, 반주 구간에 잘못 생성된 문장을 제거했다. 한국어 발음·뜻·표현은 이 전사 자료를 바탕으로 직접 정리했다. 원음 파일의 재생 시간축을 유지하고 일부 구간은 단어별 시간과 보컬 신호를 바탕으로 나눴다.

**공식 가사 대조와 전체 청음 검수는 완료하지 않았다.** 이 자료는 초안이다. 노래의 늘여 부르는 발음·받침·일부 단어와 시간 경계에 오차가 남을 수 있다. 특히 `line-011`, `line-026`, `line-054`, `line-056`, `line-061`, `line-070`, `line-071`, `line-073`은 우선 대조 대상으로 표시했다. 노래 설명과 노트에도 이 상태를 명시했다. 향후 수정 시 song.id와 line.id를 유지한다.

분석용 모델과 도구는 앱 밖의 임시 도구 폴더를 사용했다. MP3를 외부 서버로 전송하지 않았고 웹앱에 음성인식·자동 번역·자동 음역 기능, API 키, 새 npm 의존성을 추가하지 않았다. 모델 파일을 내려받을 때만 네트워크를 사용했다. 도구의 공식 사용법은 [faster-whisper](https://github.com/SYSTRAN/faster-whisper)와 [Demucs](https://github.com/facebookresearch/demucs)를 참고했다.

## 제거와 보존

- 기존 `yoru-no-tegami`, `haru-no-memo`, `ame-no-gogo` 곡 JSON 3개를 삭제했다.
- 연결된 합성 MP3 2개와 곡 커버 WebP 3개를 삭제했다.
- 현재 브라우저의 v1/v2 기록에서 위 곡의 즐겨찾기·외운 줄·북마크·노트·단어·최근 기록·재생 횟수·플레이리스트 참조를 정리했다. 표시 옵션은 유지했다.
- 재생 검수로 발생한 학습 기록은 정리했다. 최종 재생 횟수·최근 기록·청취 시간·외운 줄에는 검수용 값을 남기지 않았다. 준비한 단어와 노트는 유지했다.
- 등록 템플릿과 일반 TXT 작성 예시는 곡 등록 대상이 아니므로 보존했다. 과거 디자인 원본과 문서·검수 기록도 보존한다.
- 삭제 전 파일과 수정 전 소스는 [before.zip](evidence/pretender-20261010/before.zip), 기존 브라우저 기록은 [browser-records-before.json](evidence/pretender-20261010/browser-records-before.json)에 보관했다. 보관함과 자료 목록에는 이 백업이 표시되지 않는다.

## 확인한 결과

- `npm run validate:data`: 1곡, 오류 0건, 경고 0건.
- `npm run typecheck`, `npm run build`: 통과.
- 브라우저에서 Pretender MP3 메타데이터 로드·재생, 0.75배속, 21번 줄 반복 복귀, 표현 연결 구간 재생, Space 재생/일시정지와 오른쪽 화살표 5초 이동을 확인했다.
- 직접 설정한 40~42초 A–B 반복의 복귀와 모바일 노트·단어장 전환을 확인했다. 제거한 3곡과 기존 MP3 2개의 요청은 404, 새 MP3의 Range 요청은 206이다. [확인 수치](evidence/pretender-20261010/checks.json)를 보관했다.
- 암기 모드에서 가린 항목 148개 중 선택한 줄의 2개가 공개되는 것을 확인했다.
- 1440px 연습실과 390px 연습실·보관함에 가로 넘침과 깨진 이미지가 없었다. 보관함의 곡은 Pretender 한 곡이다. 새로고침 뒤에도 노트 3개·단어 39개를 확인했다.
- 개발 브라우저에서 ColorZilla가 추가하는 `cz-shortcut-listen` 속성으로 인한 hydration 경고가 관찰됐다. 이 변경의 음원·커버 요청 오류는 발견되지 않았다. 콘솔 전체 오류 0건으로 보고하지 않는다.

확인한 재생·반복 기능의 동작은 가사 내용과 모든 시간 경계의 정확도 검수 완료를 의미하지 않는다.

[PC 연습실](evidence/pretender-20261010/practice-desktop.png) · [모바일 연습실](evidence/pretender-20261010/practice-mobile.png) · [모바일 보관함](evidence/pretender-20261010/library-mobile.png) · [음원 분석](evidence/pretender-20261010/audio-analysis.json).
