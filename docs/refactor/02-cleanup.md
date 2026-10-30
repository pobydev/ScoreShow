# 과제 2 보고서: 동작을 바꾸지 않고 코드 정리

## 결론

- `Presenter.tsx`(627줄), `PreviewPanel.tsx`(527줄), `StudentList.tsx`(281줄), `App.tsx`(190줄)를 작은 부품과 훅으로 나눴습니다. 네 파일은 이제 145, 108, 133, 75줄입니다.
- 참조가 없는 파일 5개를 별도 커밋으로 지웠습니다. 삭제 범위는 코디네이터에게 확인받았습니다.
- 정리 전후를 같은 데이터로 108단계 재현해 비교한 결과, 화면과 DOM, 포커스, 스크롤, 콘솔 출력에 차이가 없습니다.
- 파싱과 계산 코드는 건드리지 않았습니다. 워커 번들의 해시(`parseExcel.worker-BxUFBgTF.js`)가 전후로 같습니다.
- 정리하다 발견한 이상 동작은 고치지 않고 아래에 적었습니다. 가장 시급한 것은 **C-01**(점수를 고칠 때 입력이 영역 이름칸으로 새어 점수가 틀어짐)입니다. 이 버그는 정리 전에도 있었습니다.
- 하드코딩된 색 목록은 과제 3용으로 정리했습니다.

## 완료 증거

| 항목 | 결과 |
|------|------|
| `pnpm test` | 10개 파일, 268건 통과 |
| `pnpm build` | 통과 |
| `pnpm lint` | 통과 (경고 0) |
| 정리 전후 PNG 43장 | 41장은 바이트까지 동일, 2장은 렌더러 잡음(아래 설명). 실질 차이 없음 |
| 정리 전후 108단계 비교 | 108단계 모두 동일 (허용한 속성 차이 2종 제외) |
| 개발용 React 빌드로 같은 재현 | 서비스 워커 차단 경고 외에 콘솔 경고와 오류 없음 |

캡처는 `docs/refactor/shots/before/`, `docs/refactor/shots/after/`에 있습니다. 파일 이름이 같으면 같은 상태입니다.

### 비교 방법

`shots/capture.mjs`가 빌드 결과를 실제 Chrome으로 열어 파일 선택, 업로드, 검색, 미리보기, 편집, 발표, 삭제까지 정해진 순서로 조작합니다. 단계마다 다음을 기록합니다.

- 화면 PNG (주요 43개 상태)
- 전체 DOM: 속성, 입력값, hover 상태 포함
- 포커스가 있는 요소, 스크롤 위치, 전체화면 여부
- 콘솔 경고와 오류, 뜬 대화상자

`shots/compare.mjs`가 두 결과를 비교합니다.

```sh
# playwright-core와 pngjs를 저장소 밖에 설치하고 그 폴더를 PW_DIR로 지정합니다.
PW_DIR=<폴더> node docs/refactor/shots/capture.mjs dist <결과 폴더>
PW_DIR=<폴더> node docs/refactor/shots/compare.mjs docs/refactor/shots/before <결과 폴더>
```

DOM 스냅샷(`trace.json`)은 크고 다시 만들 수 있어 커밋하지 않았습니다. 저장소에 의존성도 추가하지 않았습니다.

### 비교 도구를 믿을 수 있는지 확인한 것

- **실패를 잡아내는가**: 패딩 하나를 0.05rem 바꾼 빌드는 PNG 38장이 달라졌고, 글자 한 곳을 바꾼 빌드는 124건이 달라졌습니다.
- **같은 빌드끼리 같은가**: 렌더링 옵션을 고정한 뒤에도 일부 실행에서 PNG 몇 장에 색 채널 차이 1, 수십 픽셀 미만의 잡음이 나옵니다. 정리 전 빌드끼리 비교해도 `02-upload-message.png`에서 같은 12픽셀이 나왔습니다. `06-presenter-5-evals.png`의 16픽셀은 정리 후 빌드에서만 봤지만, 같은 빌드의 앞선 두 번은 정리 전과 바이트까지 같았으므로 코드 차이가 아닙니다.
- 그래서 채널 차이 1 이하는 잡음으로 따로 세고, 그보다 크면 실패로 처리합니다. 모양을 바꾸는 변경은 DOM이나 CSS 비교에서도 드러납니다.

### 허용하거나 의도한 차이

모양과 동작이 같다고 판단한 차이는 다음이 전부입니다.

| 차이 | 내용 |
|------|------|
| `type="button"` | 원래 일부 복사본에만 있던 목록 접기, 펼치기 버튼에 모두 붙였습니다. 폼 안에 있지 않아 동작이 같습니다. 비교에서 허용했습니다 |
| `aria-label="발표 모드 시작"` | 학생 선택이 없을 때의 버튼에도 붙였습니다. 버튼 글자와 같아 스크린리더 이름이 그대로입니다. 비교에서 허용했습니다 |
| CSS 규칙 1개 제거 | 쓰이지 않던 글씨 크기 값(`areaName`, `score`)을 지워 `.md\:text-xl`이 사라졌습니다. 다른 규칙은 내용과 순서가 그대로입니다 |
| `setBlackout(false)` 제거 | 화이트아웃 종료 버튼에서만 부르던 호출입니다. `setPresenterMode(false)`가 이미 같은 일을 합니다(`tests/store/store.test.ts`로 고정) |
| 문서 두 줄 | 지운 `storage.ts`를 가리키던 `README.md`와 `ScoreShow.md`의 줄을 `storage-secure.ts`로 고쳤습니다 |

## 바뀐 구조

| 전 | 후 |
|----|----|
| `Presenter.tsx` 627줄 | `Presenter.tsx` 145줄 + `presenter/`: `usePresenterKeyboard`, `useFullscreen`, `PresenterSidebar`, `PresenterActionButton`, `StudentScores` |
| `PreviewPanel.tsx` 527줄 | `PreviewPanel.tsx` 108줄 + `preview/`: `useEditMode`, `EvaluationEditor`, `EvaluationSummary`, `electronInputProps`, `ActionButtons`, `EditModeConfirmDialog`, `EmptyStates` |
| `StudentList.tsx` 281줄 | `StudentList.tsx` 133줄 + `studentList/`: `StudentRow`, `BlackoutMarker`, `filterStudents`, `useScrollSelectedIntoView` |
| `App.tsx` 190줄 | `App.tsx` 75줄 + `app/`: `AppHeader`, `DataSafetyNotice`, `StatusMessage`, `useAppEnvironment` |
| 같은 SVG와 점수 표기 반복 | `icons.tsx`, `scoreText.ts` |

`FilePicker.tsx`(181줄)는 크지 않고 나눌 이유가 없어 그대로 두었습니다.

## 지운 파일과 남긴 후보

지우기 직전에 저장소 전체(문서, `package.json`, `electron/`, 동적 import 포함)를 다시 검색해 참조가 없음을 확인했습니다.

| 지운 파일 | 근거 |
|-----------|------|
| `FilePicker.bak.txt` | 참조 없음 |
| `src/components/FilePicker.bak.tsx` | 참조 없음 |
| `public/vite.svg` | 참조 없음. PWA 사전 캐시가 14개에서 13개로 줄었습니다 |
| `src/assets/ScoreShow_Template.xlsx` | 참조 없음. `public/`의 파일과 바이트까지 같은 사본입니다 |
| `src/core/storage.ts` | 불러오는 곳 없음. `storage-secure.ts`가 대신합니다. 고정 키를 쓰던 코드라 함께 사라졌습니다 |

코디네이터 지시에 따라 지우지 않은 후보입니다. 모두 참조가 없습니다.

- `logo_only.ico`, `logo_only.svg`: 로고 원본이라 과제 3에서 쓸 수 있습니다.
- `COMMUNITY_POST.md`: 문서입니다.
- 질문 이후에 찾은 것: 저장소 최상위의 `logo.svg`, `public/logo.svg`. 앱은 `src/assets/logo.svg`를 씁니다.

## 과제 3을 위한 하드코딩 색 목록

줄 번호는 이 보고서를 쓴 시점 기준입니다. 경로는 모두 저장소 기준입니다.

### 직접 쓴 색 값

| 위치 | 값 | 쓰임 |
|------|-----|------|
| `src/components/app/DataSafetyNotice.tsx:49-51` | `#fef3c7`, `#f59e0b`, `#92400e` | 나이스 안내 경고 상자의 배경, 테두리, 글자 |
| `index.html:8` | `#ffffff` | 브라우저 테마 색 |
| `vite.config.ts:40` | `#ffffff` | PWA 테마 색 |
| `src/assets/logo.svg`, `public/logo.svg`, 최상위 `logo.svg` | `#22c55e`, `#5ab250`, `#58b24f`, `#5fb350`, `#77c85b`, `#7ecb62`, `#3a753d`, `#346f38`, `#224927`, `#4b4c4c`, `#eee` | 로고 |

### Tailwind 색 유틸리티

| 위치 | 클래스 | 쓰임 |
|------|--------|------|
| `src/App.tsx:46` | `text-ocean-700` | 로딩 문구 |
| `src/components/app/AppHeader.tsx:21` | `text-ocean-700` | 앱 설명 |
| `src/components/app/AppHeader.tsx:25` | `text-ocean-500` | 버전 |
| `src/components/app/DataSafetyNotice.tsx:7` | `bg-ocean-50`, `border-ocean-200` | 안내 상자 |
| `src/components/app/DataSafetyNotice.tsx:9, 29` | `text-ocean-900` | 안내 제목 |
| `src/components/app/DataSafetyNotice.tsx:12, 24, 32, 38, 56` | `text-ocean-700` | 안내 본문 |
| `src/components/app/StatusMessage.tsx:10` | `bg-green-50`, `border-green-200`, `text-green-700` | 성공 메시지 |
| `src/components/app/StatusMessage.tsx:11` | `bg-red-50`, `border-red-200`, `text-red-700` | 오류 메시지 |
| `src/components/preview/ActionButtons.tsx:24` | `from-white/0`, `via-white/20`, `to-white/0` | 발표 버튼의 빛 효과 |
| `src/components/preview/ActionButtons.tsx:41` | `bg-white`, `border-red-200`, `text-red-600`, `hover:bg-red-50`, `hover:border-red-300` | 데이터 삭제 버튼 |
| `src/components/preview/EditModeConfirmDialog.tsx:13` | `bg-black/50` | 대화상자 뒷배경 |
| `src/components/preview/EditModeConfirmDialog.tsx:26` | `hover:bg-black/5`, `dark:hover:bg-white/10` | 취소 버튼 |
| `src/components/preview/EditModeConfirmDialog.tsx:33` | `text-white` | 해제하기 버튼 (`--primary-foreground`가 있는데 쓰지 않음) |

### 색 정의

| 위치 | 내용 |
|------|------|
| `src/index.css:6` `:root` | 쓰고 있는 CSS 변수. 색은 oklch(`:8-39`), 그림자 색은 hsl(`:49`) |
| `src/index.css:62` `.dark` | 정의만 있습니다. `dark` 클래스를 붙이는 코드가 없어 지금은 적용되지 않습니다 |
| `src/index.css:191, 196, 202` | 스크롤바 색. `--primary`에서 계산합니다 |
| `tailwind.config.js:8-20` | `ocean` 팔레트. 위 유틸리티가 씁니다 |
| `tailwind.config.js:22-42` | `sky`, `gray` 팔레트. 지금 화면 코드에서 쓰는 곳이 없습니다 |

### 값이 코드에 없어 놓치기 쉬운 색

- **Tailwind 기본 테두리색**: 색을 지정하지 않은 `border`, `border-b`, `divide-y`는 기본 회색을 씁니다. `src/components/StudentList.tsx:39`가 그렇습니다. `:75`의 `ul`에 준 `borderColor`는 줄마다 그어지는 구분선에 영향을 주지 않습니다. 구분선은 각 `li`의 테두리이기 때문입니다.
- **기본 글자색**: 색을 지정하지 않은 글자는 브라우저 기본 검정입니다. `StudentList.tsx:40`, `PreviewPanel.tsx:64, 72`, `preview/EvaluationSummary.tsx:11`이 그렇습니다. `--foreground`와 색이 다릅니다.
- **파일 선택 버튼**: `FilePicker.tsx:154`의 `file:` 클래스에 색이 없어 브라우저 기본 회색입니다.

### 그 밖에 알아 둘 점

- 글꼴: `--font-sans`(DM Sans)는 선언만 있고 쓰이지 않습니다. 실제로는 `src/index.css:169`의 시스템 글꼴을 씁니다. CDN 글꼴은 쓰면 안 되므로 글꼴을 바꾸려면 파일을 앱에 넣어야 합니다.
- `src/index.css:116`의 `@theme inline`은 Tailwind 4 문법인데 저장소는 Tailwind 3입니다.
- 나머지 색은 이미 `var(--...)`를 씁니다. 다만 hover 색을 `onMouseEnter`에서 직접 넣는 코드(`PresenterActionButton`, `PresenterSidebar`, `StudentRow`, `ActionButtons`)가 있어, 색 변수 이름을 바꿀 때 함께 봐야 합니다.

### 구조를 바꿀 때 주의할 점

`Presenter.tsx`의 세 화면은 일부러 한 함수 안에서 같은 자식 순서를 유지합니다. 화이트아웃과 점수 화면을 서로 다른 컴포넌트로 나누면 전환할 때 학생 목록이 새로 만들어져 스크롤 위치를 잃습니다. 화면 비교의 `06-blackout-scroll-kept` 단계가 이를 확인합니다.

## 발견한 이상 동작 (고치지 않음)

과제 범위가 동작 유지이므로 그대로 두었습니다. 앞의 네 건은 비교 기록에 지금 동작 그대로 남아 있습니다.

| ID | 동작 | 위치 |
|----|------|------|
| C-01 | **편집 중 입력이 잘못된 칸으로 들어가 점수가 틀어집니다. 가장 시급합니다.** 입력마다 학생 객체가 새로 만들어져 50ms 뒤 포커스가 첫 영역 이름칸으로 옮겨 갑니다. 점수칸에 `12`를 키 간격 150ms로 입력하면 **점수는 1로 저장되고 영역 이름은 "영역1"에서 "영역12"로 바뀝니다.** 경고는 없습니다. 정리 전후 빌드에서 똑같이 재현했습니다. 비교 단계 `05-edit-score-typed` | `preview/useEditMode.ts:16-25` |
| C-02 | **성공 메시지가 빨간색입니다.** "✅"로 시작해야 초록색인데 `FilePicker`의 메시지는 "Loaded 30 students successfully."입니다. `02-upload-message.png` | `app/StatusMessage.tsx:9`, `FilePicker.tsx:73` |
| C-03 | **평가가 없는 학생에서는 발표 화면의 목록이 사라집니다.** 키보드로만 넘어갈 수 있습니다. `06-presenter-no-data.png` | `Presenter.tsx`의 두 번째 화면 |
| C-04 | **발표 중 목록에 다른 학생의 이름이 계속 보입니다.** 점수는 보이지 않지만 이름과 평가 수가 학생에게 보입니다. 비밀 보호 목적과 어긋나는지 과제 3에서 판단이 필요합니다. `06-blackout-next.png` | `presenter/PresenterSidebar.tsx` |
| C-05 | **화면 문구가 섞여 있습니다.** `FilePicker`는 "Spreadsheet:", "Download Template"처럼 영어인데 문서와 안내는 "표준 서식 다운로드", "표준 엑셀서식"이라고 부릅니다. | `FilePicker.tsx:146, 167`, `README.md:44` |

## 다루지 못한 범위

- **Electron 실행**: 이 작업 공간에는 Electron 실행 파일이 받아져 있지 않습니다. 버전 표시는 `electronAPI`를 흉내 내 확인했지만, Electron에서 입력칸 포커스를 잡으려고 넣은 코드(`electronInputProps`)는 Chrome에서만 돌려 봤습니다. 코드는 그대로 옮겼습니다. 실제 Electron에서 한 번 확인하기를 권합니다.
- **템플릿 받기 버튼**: 외부 요청을 하므로 누르지 않았습니다. `FilePicker.tsx`는 수정하지 않았습니다.
- **스쳐 가는 상태**: 업로드 중 회전 표시는 너무 짧아 찍지 않았습니다. `App.tsx`의 해당 코드는 그대로입니다.
- **다른 브라우저와 화면 크기**: Chrome만 썼고 폭은 1440, 1000, 800, 700에서 일부 상태를 확인했습니다. 평가 카드의 hover 그림자처럼 CSS만으로 동작하는 hover는 모두 찍지는 않았습니다.
- **나이스 실제 파일**: 과제 1과 같이 지어낸 데이터만 썼습니다.
