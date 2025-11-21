# ScoreShow 배포 가이드

GitHub Releases를 통한 배포 방법 안내

## 📋 배포 전 체크리스트

- [ ] 최신 버전으로 빌드 완료
- [ ] 릴리스 노트 작성 완료
- [ ] 사용 가이드 작성 완료
- [ ] README 업데이트 완료

## 🚀 GitHub Releases 설정 방법

### 1. GitHub 저장소 생성 (아직 없다면)

1. GitHub에 로그인합니다.
2. 우측 상단의 **"+"** 버튼 → **"New repository"** 클릭
3. 저장소 정보 입력:
   - **Repository name**: `ScoreShow` (또는 원하는 이름)
   - **Description**: "교사용 수행평가 점수 발표 도구"
   - **Visibility**: Public (공개) 또는 Private (비공개) 선택
   - **Initialize this repository with**: README 체크 해제 (이미 있으므로)
4. **"Create repository"** 클릭

### 2. 로컬 저장소를 GitHub에 연결

```bash
# Git이 설치되어 있다고 가정
cd C:\Cursorworkspace\ScoreShow

# Git 초기화 (아직 안 했다면)
git init

# .gitignore 파일 생성 (선택사항)
# node_modules, dist, release 등은 제외하는 것이 좋습니다

# 원격 저장소 추가
git remote add origin https://github.com/pobydev/ScoreShow.git

# 파일 추가 및 커밋
git add .
git commit -m "Initial commit: ScoreShow v1.1.0"

# GitHub에 푸시
git branch -M main
git push -u origin main
```

### 3. Release 생성

1. GitHub 저장소 페이지로 이동
2. 우측 메뉴에서 **"Releases"** 클릭
3. **"Create a new release"** 또는 **"Draft a new release"** 클릭

### 4. 릴리스 정보 입력

#### Tag version
- `v1.1.0` 입력 (또는 원하는 버전)

#### Release title
- `ScoreShow v1.1.0` 또는 `ScoreShow v1.1.0 - 새 릴리스`

#### Description
RELEASE_NOTES.md의 내용을 복사하여 붙여넣기

또는 직접 작성:

```markdown
## 🎉 첫 릴리스

교사용 수행평가 점수 발표 도구를 공개합니다.

### 주요 기능
- 엑셀 파일 자동 인식 및 컬럼 매핑
- 발표 모드 (화이트아웃 기능)
- 100% 오프라인 동작 (개인정보 보호)
- 나이스(neis) 엑셀 파일 완벽 지원

### 다운로드
Windows 버전을 다운로드하여 설치하세요.

### 사용 방법
자세한 내용은 [사용 가이드](./USER_GUIDE.md)를 참고하세요.
```

### 5. 파일 업로드

1. **"Attach binaries"** 또는 드래그 앤 드롭 영역 클릭
2. `release/ScoreShow Setup 1.1.0.exe` 파일 선택
3. 파일이 업로드될 때까지 대기

### 6. 릴리스 발행

1. **"Publish release"** 버튼 클릭
2. 릴리스가 생성되고 다운로드 링크가 공유됩니다.

## 🔗 릴리스 링크 공유

릴리스가 생성되면 다음과 같은 링크가 생성됩니다:

```
https://github.com/pobydev/ScoreShow/releases/tag/v1.1.0
```

또는 최신 릴리스:

```
https://github.com/pobydev/ScoreShow/releases/latest
```

## 📝 커뮤니티 공유용 템플릿

### 카페/커뮤니티 게시글

**제목:**
```
[공유] 수행평가 점수 발표 도구 - ScoreShow (무료, 오프라인)
```

**본문:**
```
안녕하세요. 수행평가 점수를 알려주는 과정이 번거로워서 
작은 프로그램을 만들어봤습니다. 공유하고 싶어 올립니다.

📌 ScoreShow
교사용 수행평가 점수 발표 도구 (오프라인 전용)

✨ 주요 기능
- 나이스 엑셀 파일 자동 인식
- 발표 모드로 학생을 한 명씩 개별적으로 표시
- 화이트아웃 기능으로 자연스러운 전환
- 100% 오프라인 (개인정보 완벽 보호)

🔒 보안
- 모든 데이터는 로컬에만 저장
- 서버로 데이터 전송 없음
- 사용 후 데이터 즉시 삭제 가능

📥 다운로드
GitHub Releases에서 다운로드하세요:
[링크 삽입]

📖 사용 방법
자세한 사용 가이드는 GitHub 저장소에 있습니다.
[링크 삽입]

💡 사용 팁
- 나이스에서 엑셀 파일을 xls 형식으로 다운로드하세요
- 발표 모드에서 화살표 키로 학생을 이동할 수 있습니다
- F 키로 전체화면 모드 전환 가능

문제가 있거나 개선 사항이 있으면 GitHub Issues에 알려주세요.
감사합니다!
```

## 🔄 업데이트 배포

새 버전을 배포할 때:

1. `package.json`의 버전 번호 업데이트
2. 새로 빌드: `pnpm run electron:pack`
3. `RELEASE_NOTES.md` 업데이트
4. GitHub Releases에 새 릴리스 생성
5. 새 버전 태그로 릴리스 생성

## 📌 추가 팁

### 자동 업데이트 설정 (선택사항)

Electron Builder의 자동 업데이트 기능을 사용하려면:

1. GitHub Releases를 업데이트 서버로 사용
2. `electron-updater` 패키지 추가
3. 업데이트 체크 로직 구현

자세한 내용은 [electron-builder 문서](https://www.electron.build/)를 참고하세요.

### 코드 서명 (선택사항)

Windows에서 코드 서명을 사용하면 사용자 경험이 향상됩니다:

1. 코드 서명 인증서 구매
2. `package.json`에 서명 설정 추가
3. 빌드 시 자동 서명

---

**배포 완료를 축하합니다! 🎉**

