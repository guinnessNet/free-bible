# 무료 성경 앱 (Free Bible App)

누구나 무료로 쉽게 성경을 볼 수 있는 모바일 최적화 웹 앱입니다.
React + Vite 기반의 PWA(Progressive Web App)로 제작되어, 앱스토어 설치 없이 브라우저에서 바로 사용할 수 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 다중 번역본 | 여러 번역본을 자유롭게 전환하며 읽기 |
| 모바일 최적화 | 상단에 현재 위치(책/장) 표시, 하단에 툴바 배치 |
| 스와이프 이동 | 좌우 스와이프로 이전/다음 장 이동 |
| TTS 읽기 | 모바일 기본 TTS를 활용한 본문 낭독 |
| 북마크 | 특정 구절 저장 및 목록 확인 |
| 형광펜 | 구절별 색상 하이라이트 |
| 메모 | 구절에 개인 메모 첨부 |
| 오프라인 지원 | PWA 캐싱으로 인터넷 없이도 사용 가능 |

---

## 기술 스택

- **Framework**: React 18 + Vite
- **언어**: TypeScript
- **스타일**: Tailwind CSS
- **상태관리**: Zustand
- **로컬 저장소**: Dexie.js (IndexedDB 래퍼)
- **스와이프**: react-swipeable
- **TTS**: Web Speech API (`window.speechSynthesis`)
- **PWA**: vite-plugin-pwa

---

## 프로젝트 구조

```
bible-app/
├── public/
│   ├── bibles/                  # 성경 데이터 (번역본별 JSON)
│   │   ├── KRV/                 # 개역한글
│   │   │   ├── metadata.json
│   │   │   ├── GEN.json
│   │   │   ├── EXO.json
│   │   │   └── ...
│   │   ├── NIV/                 # New International Version
│   │   │   ├── metadata.json
│   │   │   └── ...
│   │   └── translations.json    # 사용 가능한 번역본 목록
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Header/              # 상단: 책/장/번역본 표시
│   │   ├── BibleReader/         # 본문 표시 + 스와이프
│   │   ├── BottomToolbar/       # 하단: TTS, 북마크, 형광펜, 메모
│   │   ├── Selectors/           # 책/장/번역본 선택 모달
│   │   └── Notes/               # 메모 에디터
│   ├── hooks/
│   │   ├── useBible.ts          # 성경 데이터 로드
│   │   ├── useTTS.ts            # TTS 제어
│   │   ├── useBookmarks.ts      # 북마크 CRUD
│   │   ├── useHighlights.ts     # 형광펜 CRUD
│   │   └── useNotes.ts          # 메모 CRUD
│   ├── services/
│   │   ├── bibleLoader.ts       # JSON 파일 fetch 및 캐싱
│   │   └── db.ts                # Dexie IndexedDB 스키마
│   ├── store/
│   │   └── bibleStore.ts        # Zustand 전역 상태
│   └── types/
│       └── bible.ts             # TypeScript 타입 정의
├── CLAUDE.md
└── README.md
```

---

## 성경 데이터 형식

### `public/bibles/translations.json`

```json
[
  {
    "id": "KRV",
    "name": "개역한글",
    "language": "ko",
    "direction": "ltr"
  },
  {
    "id": "NIV",
    "name": "New International Version",
    "language": "en",
    "direction": "ltr"
  }
]
```

### `public/bibles/{TRANSLATION_ID}/metadata.json`

```json
{
  "translationId": "KRV",
  "books": [
    { "id": "GEN", "name": "창세기", "testament": "old", "chapters": 50 },
    { "id": "EXO", "name": "출애굽기", "testament": "old", "chapters": 40 }
  ]
}
```

### `public/bibles/{TRANSLATION_ID}/{BOOK_ID}.json`

```json
{
  "bookId": "GEN",
  "bookName": "창세기",
  "chapters": [
    {
      "chapter": 1,
      "verses": [
        { "verse": 1, "text": "태초에 하나님이 천지를 창조하시니라" },
        { "verse": 2, "text": "땅이 혼돈하고 공허하며..." }
      ]
    }
  ]
}
```

---

## 번역본 추가 방법

새 번역본을 추가할 때는 **코드 수정 없이** 아래 두 가지 방법 중 하나를 사용합니다.

### 방법 1 — 변환 스크립트 사용 (권장)

원본 텍스트 파일이 있을 경우 `scripts/convert_bible.py`로 자동 변환합니다.

```bash
# 지원 형식 A: 한글 단일 파일 (창1:1 텍스트 패턴, UTF-8)
python scripts/convert_bible.py \
  --format flat_ko \
  --input data/새번역.txt \
  --id NEW --name "새번역" --lang ko

# 지원 형식 B: 권별 분리 파일 (EUC-KR 인코딩, 쉬운성경 동일 구조)
python scripts/convert_bible.py \
  --format easy_ko \
  --input data/새번역-폴더/ \
  --id NEW --name "새번역" --lang ko

# 지원 형식 C: 영어 NIV 형식 ([BookName N] 헤더 + N.텍스트 절)
python scripts/convert_bible.py \
  --format niv \
  --input data/NEW-EN.txt \
  --id NEW --name "New Translation" --lang en
```

스크립트 실행 후 `public/bibles/NEW/` 폴더와 `translations.json` 항목이 **자동 생성**됩니다.

### 방법 2 — 수동 추가

1. `public/bibles/{ID}/` 폴더 생성
2. `metadata.json` 작성 (아래 형식 참조)
3. 66권 각각의 `{BOOK_ID}.json` 파일 작성 (아래 형식 참조)
4. `public/bibles/translations.json`에 항목 추가

```json
// translations.json에 추가할 항목
{ "id": "NEW", "name": "번역본 이름", "language": "ko", "direction": "ltr" }
```

### 지원 Book ID 목록

| 구분 | Book ID 목록 |
|------|-------------|
| 구약(39권) | GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL |
| 신약(27권) | MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

---

## 라이선스

이 앱은 오픈소스이며 누구나 자유롭게 사용할 수 있습니다.
단, 사용되는 성경 번역본의 저작권은 각 출판사/기관에 귀속됩니다.
저작권이 없는 공개 도메인 번역본(예: KJV, 개역한글 일부)을 우선 사용합니다.
