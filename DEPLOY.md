# ScoreShow 배포 가이드

GitHub Releases를 통한 배포 방법 안내

## 📋 배포 전 체크리스트

- [ ] 최신 버전으로 빌드 완료
- [ ] 릴리스 노트 작성 완료
- [ ] 사용 가이드 작성 완료
- [ ] README 업데이트 완료

## 🚀 GitHub Releases 배포 방법

저장소는 `pobydev/ScoreShow`입니다. 설치된 앱이 이 저장소(`package.json`의 `build.publish`)에서 새 버전을 찾으므로 계정과 저장소 이름을 바꾸지 않습니다.

### 1. Release 생성

1. GitHub 저장소 페이지로 이동
2. 우측 메뉴에서 **"Releases"** 클릭
3. **"Create a new release"** 또는 **"Draft a new release"** 클릭

### 2. 릴리스 정보 입력

#### Tag version
- `v1.2.0`처럼 `package.json`의 버전 앞에 `v`를 붙여 입력

#### Release title
- `ScoreShow v1.2.0` 또는 `ScoreShow v1.2.0 - 새 릴리스`

#### Description
RELEASE_NOTES.md에서 이번 버전 구역만 복사하여 붙여넣기 (옛 버전 구역은 넣지 않습니다)

또는 직접 작성:

```markdown
## ScoreShow v<버전>

학생이 한 명씩 모니터로 자기 점수를 확인하는 교사용 프로그램입니다.

### 주요 기능
- 나이스 엑셀 파일(.xlsx, .xls)을 읽어 이름을 정해 저장
- 학생을 한 명씩 보여 주고, 학생 사이에는 점수가 보이지 않는 대기 화면
- 전체 점수표에서 점수 수정
- 학생 정보는 이 컴퓨터 밖으로 나가지 않습니다. 인터넷은 새 버전 확인에만 씁니다.

### 다운로드
Windows용 `ScoreShow-Setup-<버전>.exe`를 내려받아 설치합니다.

### 사용 방법
자세한 내용은 [사용 가이드](https://github.com/pobydev/ScoreShow/blob/main/USER_GUIDE.md)를 참고해 주세요.
```

### 3. 파일 업로드

**릴리스마다 아래 세 파일을 모두 올립니다.** `<버전>`은 `package.json`의 버전입니다.

| 파일 | 하는 일 |
| --- | --- |
| `release/ScoreShow-Setup-<버전>.exe` | 설치 파일 |
| `release/ScoreShow-Setup-<버전>.exe.blockmap` | 새 버전을 받을 때 바뀐 부분을 찾는 목록 |
| `release/latest.yml` | 설치된 앱이 새 버전을 찾을 때 읽는 파일 |

`latest.yml`이 빠지면 설치된 앱이 새 버전을 찾지 못합니다. 확인 실패는 화면에 나오지 않으므로 아무도 알아채지 못합니다.

1. **"Attach binaries"** 또는 드래그 앤 드롭 영역 클릭
2. 세 파일을 모두 선택. `latest.yml`이 파일 이름을 가리키므로 이름을 바꾸지 않습니다.
3. 파일이 업로드될 때까지 대기

### 4. 릴리스 발행

1. **"Publish release"** 버튼 클릭
2. 릴리스가 생성되고 다운로드 링크가 공유됩니다.
3. `https://github.com/pobydev/ScoreShow/releases/latest/download/latest.yml`을 열어 `version`이 새 버전인지 확인합니다.

## 🔗 릴리스 링크 공유

릴리스가 생성되면 다음과 같은 링크가 생성됩니다:

```
https://github.com/pobydev/ScoreShow/releases/tag/v1.2.0
```

또는 최신 릴리스:

```
https://github.com/pobydev/ScoreShow/releases/latest
```

## 📝 커뮤니티 공유용 템플릿

### 카페/커뮤니티 게시글

**제목:**
```
[공유] 수행평가 점수 확인 도구 - ScoreShow (무료)
```

**본문:**
```
안녕하세요. 수행평가 점수를 학생에게 한 명씩 확인시키는 과정이 번거로워서
작은 프로그램을 만들어 봤습니다. 공유하고 싶어 올립니다.

📌 ScoreShow
학생이 한 명씩 모니터로 자기 점수를 확인하는 교사용 프로그램입니다.

✨ 주요 기능
- 나이스 엑셀 파일을 읽어 이름을 정해 저장합니다. 다음에는 파일을 다시 넣지 않고 목록에서 고릅니다.
- 학생을 한 명씩 큰 글씨로 보여 줍니다.
- 학생 사이에는 점수가 보이지 않는 대기 화면이 나옵니다.
- 전체 점수표에서 점수를 고칠 수 있고, 고친 내용은 자동으로 저장됩니다.

🔒 학생 정보
- 학생 정보는 이 컴퓨터 밖으로 나가지 않습니다. 인터넷은 새 버전 확인에만 씁니다.
- 앱을 켜면 저장 목록만 보이고, 목록을 열어도 대기 화면에서 시작합니다.
- 비밀번호는 없습니다. 확인이 끝나면 저장된 점수를 지워 주세요.

📥 다운로드
Windows용입니다. GitHub Releases에서 내려받을 수 있습니다.
https://github.com/pobydev/ScoreShow/releases/latest

📖 사용 방법
https://github.com/pobydev/ScoreShow/blob/main/USER_GUIDE.md

💡 사용 팁
- 시작하기 전에 TV와 프로젝터를 끄거나 연결을 해제해 주세요.
- 나이스에서 엑셀 파일을 xls 형식으로 받아 주세요.
- 화살표 키로 대기 화면과 학생을 오갑니다. Esc를 누르면 바로 대기 화면으로 갑니다.
- F 키로 전체화면을 켜고 끕니다.

문제가 있거나 개선 사항이 있으면 GitHub Issues에 알려 주세요.
감사합니다!
```

## 🔄 업데이트 배포

새 버전을 배포할 때:

1. `package.json`의 버전 번호 업데이트
2. 새로 빌드: `pnpm run electron:pack`. `release/`에 설치 파일, `.blockmap`, `latest.yml`이 만들어집니다.
3. `RELEASE_NOTES.md` 맨 위에 이번 버전 구역 추가
4. 새 버전 태그(`v<버전>`)로 GitHub Releases에 릴리스 생성. 설명에는 이번 버전 구역만 붙여넣기
5. 세 파일 `ScoreShow-Setup-<버전>.exe`, `ScoreShow-Setup-<버전>.exe.blockmap`, `latest.yml`을 모두 업로드
6. 발행한 뒤 `releases/latest/download/latest.yml`의 `version`이 새 버전인지 확인

**경고:** 코드를 올릴 때는 `git push origin <브랜치>`처럼 브랜치 이름을 적습니다. `git push --all`이나 `git push --mirror`는 쓰지 않습니다. 로컬 ref에 옛 작성자 정보가 남아 있습니다.

## 📌 추가 팁

### 새 버전 확인

Windows 설치본은 `electron-updater`로 GitHub Releases의 `latest.yml`을 읽습니다. 코드는 `electron/updater.cjs`, 저장소 설정은 `package.json`의 `build.publish`에 있습니다. 1.1.x를 쓰는 분은 새 버전 확인 기능이 없어 한 번은 직접 받아야 합니다.

### 코드 서명 (선택사항)

Windows에서 코드 서명을 사용하면 사용자 경험이 향상됩니다:

1. 코드 서명 인증서 구매
2. `package.json`에 서명 설정 추가
3. 빌드 시 자동 서명

---

**배포 완료를 축하합니다! 🎉**

