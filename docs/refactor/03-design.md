# 과제 3 보고서: gnilab 공통 디자인 적용

## 결론

- Ocean Breeze 테마(초록 primary, DM Sans)를 걷어 내고 `brand/DESIGN.md`의 CSS 변수로 바꿨습니다. `tailwind.config.js`의 색은 모두 이 변수를 가리킵니다.
- Freesentation 글꼴을 앱에 넣었습니다. 인터넷을 끊은 상태에서도 글꼴이 실제로 불러와지는 것을 확인했습니다.
- 앱, 설치 프로그램, 파비콘, PWA 아이콘을 `brand/아이콘/scoreshow`의 파일로 바꿨습니다.
- 계산, 파싱, 저장, 단축키, 기능은 바꾸지 않았습니다. 108단계 재현에서 내용과 동작이 모두 같고, 워커 번들 해시도 그대로입니다.
- 앱 코드에 남은 색 값은 `src/index.css`의 변수 정의와 브라우저 테마 색 3곳뿐입니다. 옛 초록은 텍스트 파일에 하나도 남지 않았습니다.

## 완료 증거

| 항목 | 결과 |
|------|------|
| `pnpm test` | 10개 파일, 268건 통과 |
| `pnpm build` | 통과 |
| `pnpm lint` | 통과 (경고 0) |
| 화면 캡처 | `docs/refactor/shots/design/`에 43장 (파일 선택, 학생 목록, 미리보기, 편집, 발표, 화이트아웃, 전체화면, 좁은 화면) |
| 내용과 동작 비교 | `compare-content.mjs`로 108/108단계 동일. 글자, 구조, 입력값, 포커스, 전체화면, 콘솔, 대화상자를 비교 |
| 파싱 코드 | `parseExcel.worker-BxUFBgTF.js` 해시가 과제 2와 같음 |
| 인터넷 차단 | 서비스 워커가 글꼴 3개와 아이콘을 받아 두고, 네트워크를 끈 새로고침에서도 앱, 글꼴, 아이콘이 모두 뜸 |
| 포장한 Electron 앱 | `file://`에서 글꼴 3개 로드, 헤더 아이콘, 업로드, 발표, 화이트아웃 마커 동작 확인. `.exe`에 새 아이콘이 들어간 것도 추출해 확인 |
| 복사한 파일 | 글꼴과 아이콘이 원본과 바이트까지 같음 (`cmp`) |

비교 재현 방법입니다. 캡처 도구의 필요 사항은 `docs/refactor/02-cleanup.md`에 있습니다.

```sh
PW_DIR=<폴더> node docs/refactor/shots/capture.mjs dist docs/refactor/shots/design
node docs/refactor/shots/compare-content.mjs docs/refactor/shots/after docs/refactor/shots/design
```

Electron 확인은 실제 사용자 데이터를 건드리지 않도록 별도 프로필(`--user-data-dir`)로 실행했습니다. 설치 파일은 만들지 않았고, 확인용으로 만든 풀린 폴더는 지웠습니다. 설치 프로그램 화면 자체의 아이콘은 설치 파일을 만들어 봐야 볼 수 있어 확인하지 못했습니다. `win.icon`을 쓰도록 설정했을 뿐입니다.

## 바꾼 것

### 색과 모양

- `src/index.css`에 DESIGN.md의 변수 18개와 그림자 3개를 그대로 넣었습니다.
- `tailwind.config.js`는 기본 팔레트를 **통째로 바꿔 끼웠습니다.** `bg-red-50` 같은 기본 색 클래스는 이제 CSS가 만들어지지 않습니다. 모서리(입력칸 8, 버튼 10, 카드 12, 창 14)와 그림자도 같은 방식입니다. 그래서 앞으로 옛 값을 실수로 쓰기 어렵습니다.
- 화면 파일의 인라인 색과 `onMouseEnter`로 색을 넣던 코드를 Tailwind 클래스로 옮겼습니다. 남은 인라인 스타일은 점수 막대 너비, 마커 줄 높이, Electron용 입력칸 속성뿐이고 색은 없습니다.
- 발표 시작 버튼의 빛 효과는 그라데이션이라 지웠습니다.
- 글자는 8단계(`text-micro`~`text-display`)만 씁니다. 기본 크기(`text-xl` 등)는 발표 화면에만 남았습니다.
- 선택된 학생 줄은 색 외에 왼쪽 막대와 굵은 글자로도 구분합니다. 색만으로 구분하지 않는다는 원칙 때문입니다.

### 발표 화면

- 학생 정보와 점수의 글자 크기는 평가 수별 단계까지 이전과 같습니다. 코드에서 크기 클래스를 비교해 확인했습니다. 교사가 보는 좌측 목록과 단축키 안내만 8단계에 맞췄습니다(단축키 안내 14px에서 13px).
- 바탕은 연회색, 카드는 흰색, 이름은 남색, 점수는 강조 글자색(`--accent-ink`, 흰 카드에서 7.6:1)입니다.
- 화이트아웃 안내 글자는 흐리게 처리하던 투명도를 없애고 `--soft`(5.5:1)로 바꿔 더 잘 읽힙니다.
- 화이트아웃 전환, 마커, 단축키, 목록 접기, 전체화면은 그대로입니다.

### 글꼴과 아이콘

| 파일 | 원본 | 쓰는 곳 |
|------|------|----------|
| `public/fonts/Freesentation-{4Regular,6SemiBold,7Bold}.ttf`, `README.txt` | `어울림-PC/public/fonts` | 앱 전체 |
| `public/favicon.ico` | `scoreshow.ico` | 파비콘 |
| `public/icons/scoreshow.ico` | 같음 | Windows 앱과 설치 프로그램 (`package.json` `win.icon`) |
| `public/icons/scoreshow-512.png` | 같음 | macOS, Linux (`mac.icon`, `linux.icon`) |
| `public/icons/scoreshow-256.png` | 같음 | Electron 창 아이콘 (`electron/main.cjs`) |
| `public/pwa-512x512.png` | `scoreshow-512.png` | PWA |
| `public/pwa-192x192.png` | `scoreshow-512.png`를 **줄여서 만듦** | PWA |
| `src/assets/scoreshow-128.png` | 같음 | 화면 헤더 |

- gnilab 글자 로고는 넣지 않았습니다. 헤더는 앱 아이콘과 앱 이름 "ScoreShow" 글자입니다.
- 글꼴 `README.txt`에는 넣지 않은 학교안심체 설명도 함께 있습니다. 지시대로 수정 없이 복사했습니다.

### 요청 범위 밖까지 고친 곳

디자인을 제대로 적용하려면 필요해서 고쳤습니다.

| 곳 | 이유 |
|----|------|
| `vite.config.ts` | 글꼴을 PWA 사전 캐시에 넣어야 오프라인에서 보입니다. 글꼴 파일이 기본 한도(2MB)보다 커서 한도를 3MB로 올렸습니다. 사전 캐시가 약 650KB에서 약 9.2MB로 늘었습니다 |
| `electron/main.cjs` | 창 아이콘 경로가 설치본에는 없는 `public/`을 가리키던 것을, 설치본에서는 `dist/`를 보게 고쳤습니다 |
| `README.md`, `USER_GUIDE.md`, `ScoreShow.md` | "녹색 마커"가 사실과 달라져 "하늘색 마커"로 한 단어씩 고쳤습니다 |

### 판단이 들어간 부분

- **192px PWA 아이콘**: 브랜드 폴더에 없는 크기인데 Chrome의 PWA 설치에 필요합니다. 512px을 Chrome으로 줄여 만들었습니다. 이전 `pwa-*.png`는 122바이트짜리 빈 자리표시 파일이었습니다.
- **`--overlay`**: 대화상자 뒷배경 색입니다. DESIGN.md에 없어 `sky-theme.css`의 값(`rgba(30,42,74,.36)`)을 썼습니다. 변수가 하나 더 있는 셈이라 DESIGN.md에 올릴지 사용자가 정하면 됩니다.
- **파일 선택 버튼**: 학생이 없을 때만 채운 버튼으로, 학생이 있으면 테두리 버튼으로 보입니다. 할 일이 먼저 눈에 들어오게 하려는 것이고 기능은 같습니다.
- **나이스 안내 경고 상자**: 노란 상자였지만 `--celebrate`는 축하 전용이라 쓰지 않고 흰 상자에 굵은 글자와 💡로 바꿨습니다.

## 남은 색과 옛 초록 검색 결과

검색 대상은 `node_modules`, `dist`, `.git`, `docs/refactor`를 뺀 저장소 전체입니다. 글꼴과 PNG 같은 이진 파일은 제외했습니다.

### 앱 코드의 색 값 (hex, rgb, hsl, oklch)

`src` 전체, `index.html`, `vite.config.ts`, `tailwind.config.js`, `electron/`을 검색했습니다.

| 위치 | 내용 | 판단 |
|------|------|------|
| `src/index.css:28-45` | DESIGN.md 변수 18개의 값 | 정의 자리이므로 정상 |
| `src/index.css:46` | `--overlay` | 위에 적은 추가 변수 |
| `src/index.css:47-49` | `--shadow-card`, `--shadow-lift`, `--shadow-float` | DESIGN.md 값 |
| `index.html:8` | `theme-color` `#f3f6fa` | HTML이라 변수를 못 씀. `--canvas`와 같은 값 |
| `vite.config.ts:42-43` | PWA `theme_color`, `background_color` `#f3f6fa` | 같은 이유 |

이 밖에는 없습니다. 화면 파일(`src/components`, `src/App.tsx`)의 색 값은 0건입니다.

### 다른 검색

| 검색 | 결과 |
|------|------|
| Tailwind 기본 색 클래스 (`red-`, `green-`, `sky-`, `gray-` 등 23종), `bg-gradient`, `linear-gradient` 등 | 0건 |
| 옛 변수 (`var(--primary)`, `--foreground`, `--sidebar*` 등) | 0건 |
| `Ocean`, `Breeze`, `DM Sans`, `Lora`, `IBM Plex`, `tweakcn`, `green`, `녹색`, `초록` | 0건 |
| 옛 초록 hex (`#22c55e`, `#16a34a`, 옛 로고의 색 등 18종) | 0건 |
| 발표 화면 밖의 기본 글자 크기 (`text-sm` 등) | 0건 |
| 사라진 모서리, 그림자 클래스 (`rounded-lg`, `shadow-md` 등) | 0건 |
| 코드에 썼는데 CSS가 만들어지지 않은 클래스 | 없음 (650개 검사. `animate-fade-in`은 발표 화면의 `<style>`에 정의) |
| `--faint`를 글자에 쓴 곳 | 없음 (자리표시 글자와 스크롤바뿐) |

`pobydev`는 저장소 주소에 남아 있습니다. GitHub 계정 이름이라 그림이나 디자인과 무관하고 바꾸면 링크가 깨지므로 그대로 두었습니다.

### 지운 옛 로고

코디네이터 지시에 따라, 지우기 직전에 참조가 없음을 다시 확인하고 지웠습니다.

- 새 아이콘으로 참조가 끊긴 것: `src/assets/logo.svg`, `logo.ico`, `public/logo.ico`, `public/logo.svg`
- 사용자 승인으로 지운 것: `logo_only.ico`, `logo_only.svg`, 최상위 `logo.svg`
- `COMMUNITY_POST.md`는 남겼습니다.

## 대비

흰 글자와 본문은 모두 기준(4.5:1)을 넘습니다. 한 곳만 살짝 못 미칩니다.

| 조합 | 대비 | 쓰는 곳 |
|------|------|----------|
| `--ink` / 바탕, 카드 | 13.0, 14.1 | 본문 |
| `--soft` / 카드, 바탕, 안내 상자 | 5.9, 5.5, 5.6 | 보조 글자 |
| 흰 글자 / `--accent` | 5.9 | 주요 버튼 |
| `--accent-ink` / 카드, 안내 상자 | 7.6, 7.1 | 점수, 강조 |
| **`--danger` / 카드** | **4.4** | 데이터 삭제 버튼, 오류 메시지 |

`--danger`는 DESIGN.md에 정해진 값이라 그대로 썼습니다. 어두운 값으로 바꿀지는 패밀리 전체의 문제라 사용자가 정할 일입니다.

## 눈에 띄지만 고치지 않은 것

- **C-02 성공 메시지가 빨간색입니다.** 업로드에 성공하면 빨간 테두리와 글자로 "Loaded 30 students successfully."가 나옵니다. 흰 바탕에 빨간 테두리라 이전보다 눈에 더 띕니다(`02-upload-message.png`). 기능 쪽 문제라 과제 4에서 고칩니다.
- **C-05 영어 문구**: "Spreadsheet:", "Download Template"가 그대로라 화면에서 한국어와 섞여 보입니다. 과제 4 대상입니다.
- **C-04 발표 중 다른 학생 이름**: 사용자가 그대로 두기로 정했으므로 바꾸지 않았습니다.
- **안내 상자가 큽니다.** 900px 높이 화면에서 위쪽 약 45%를 차지해 학생 목록이 6줄만 보입니다. 이전에도 같았고, 내용과 구조를 줄이는 일은 이번 범위가 아니라 그대로 두었습니다.
- **좁은 화면(폭 1024px 미만)** 에서는 목록과 미리보기가 위아래로 쌓여 목록이 2줄만 보입니다. 이전에도 같았습니다.

## 다루지 못한 범위

- 실제 Windows 설치 과정과 설치 프로그램 화면의 아이콘, 작업 표시줄의 창 아이콘, macOS와 Linux 빌드.
- 실제 PWA 설치 동작. 매니페스트와 아이콘 파일, 사전 캐시까지만 확인했습니다.
- 다른 학교 컴퓨터의 환경. 글꼴이 앱에 들어 있어 영향은 작을 것으로 봅니다. Chrome 외 브라우저는 보지 않았습니다.
- 교실 프로젝터로 실제 거리에서 읽히는지. 글자 크기를 유지했다는 것만 확인했습니다.
