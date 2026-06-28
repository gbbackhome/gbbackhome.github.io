# gbbackhome.github.io

데이터/마케팅 전략가 **전경배**의 자동갱신 포트폴리오.
토스 스타일 미니멀 + 파랑 + 3D 이모지. 호스팅은 GitHub Pages (무료).

비공개 Google 시트의 **E열(JSON)** 을 매일 읽어 `data.json` 으로 동기화하고,
변경이 있을 때만 커밋합니다. 데이터가 비면 "준비중" 빈 상태가 표시됩니다.

---

## ⚡ 5분 퀵스타트

사이트만 먼저 띄우는 최소 절차 (시트 연동은 아래 "셋업"에서):

- [ ] **1. repo 생성** — 이름 `gbbackhome.github.io` (public)
- [ ] **2. push** — 이 폴더 전체를 repo에 올리기
      ```bash
      git init && git add -A && git commit -m "init"
      git branch -M main
      git remote add origin https://github.com/gbbackhome/gbbackhome.github.io.git
      git push -u origin main
      ```
- [ ] **3. Actions 쓰기 권한** — Settings → Actions → General →
      Workflow permissions → **Read and write permissions** 선택 → Save
      *(워크플로우가 `data.json` 을 커밋하려면 필요)*
- [ ] **4. Pages 활성화** — Settings → Pages → Deploy from a branch →
      `main` / `(root)` → Save → 잠시 후 `https://gbbackhome.github.io` 공개
- [ ] **5. (선택) 3D 이모지 받기**
      ```bash
      node scripts/download-emoji.mjs
      git add assets/emoji && git commit -m "add emoji" && git push
      ```
      *생략해도 사이트는 유니코드 이모지로 정상 동작*

> 시트 자동 동기화까지 켜려면 아래 **셋업 1~3** 의 서비스계정 + Secret 등록을 진행하세요.

---

## 구조

```
index.html / style.css / app.js   프론트엔드 (바닐라, 외부 CSS프레임워크 없음)
data.json                         Case Study 데이터 (자동 갱신)
fetch-data.js                     시트 → data.json 동기화 (서비스계정)
scripts/download-emoji.mjs        3D 이모지 PNG 로컬 다운로드
assets/emoji/                     Fluent Emoji 3D PNG (MIT)
.github/workflows/update.yml      매일 + 수동 실행
```

## 사용 라이브러리 (전부 무료/오픈소스)

- Pretendard (OFL) · Lenis (MIT) · GSAP + ScrollTrigger (무료 표준 버전, jsDelivr CDN)
- Microsoft Fluent Emoji 3D (MIT) — 핫링크 없이 `assets/emoji/` 에 로컬 저장

---

## 셋업

### 0. 이모지 받기 (선택, 권장)

```bash
node scripts/download-emoji.mjs
```

PNG가 없어도 사이트는 유니코드 이모지로 정상 동작합니다.

### 1. Google Cloud 서비스계정 생성

1. Google Cloud Console → 프로젝트 생성/선택
2. **Google Sheets API** 사용 설정 (APIs & Services → Enable)
3. **서비스계정** 생성 → 키 추가 → **JSON** 키 다운로드
4. 시트를 열고, 서비스계정 이메일(`...@...iam.gserviceaccount.com`)을
   **Viewer(보기 권한)** 로 공유 → 시트는 계속 비공개로 유지

### 2. 시트 형식

| 열 | 용도 |
|----|------|
| **A** | 자유 메모/사용여부 (스크립트가 읽되 저장 안 함) |
| B, C, D | **읽지 않음** (보안) |
| **E** | 아래 스키마의 **JSON 문자열** |

E열 한 셀 예시:

```json
{"cat":"그로스","title":"온보딩 A/B 테스트","s":"2단계 이탈 높음","t":"원인 검증 필요","a":"카피·단계 2변형 실험","r":"+75%","tags":["A/B 테스트","CRO","SQL"]}
```

- `r`(