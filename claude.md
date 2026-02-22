# CLAUDE.md — AI 개발 가이드

이 문서는 Claude(AI 어시스턴트)가 이 프로젝트를 이해하고 올바르게 기여하기 위한 참조 문서입니다.

---

## 프로젝트 개요

**목적**: 모바일 우선의 무료 성경 웹 앱. 누구나 쉽게 여러 번역본의 성경을 읽을 수 있도록 한다.

**핵심 원칙**:
1. 성경 데이터는 JSON 파일로 `public/bibles/` 에 정적으로 제공 (DB 서버 없음)
2. 번역본 추가 = 폴더 + JSON 파일 추가만으로 완료 (코드 수정 불필요)
3. 모바일 퍼스트 UI — 상단 헤더 최소화, 하단 툴바 고정
4. 오프라인 지원을 위한 PWA

---

## 기술 스택 (확정)

| 역할 | 라이브러리 |
|------|-----------|
| 빌드/번들 | Vite |
| UI 프레임워크 | React 18 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 전역 상태 | Zustand |
| 로컬 DB | Dexie.js (IndexedDB) |
| 스와이프 제스처 | react-swipeable |
| TTS | Web Speech API (`window.speechSynthesis`) |
| PWA | vite-plugin-pwa |

> 위 스택 외 다른 라이브러리를 추가할 때는 반드시 이유를 명시하고 최소한으로 추가할 것.

---

## 핵심 아키텍처 결정사항

### 1. 성경 데이터 로딩 전략

- 앱 시작 시 `translations.json`과 선택된 번역본의 `metadata.json`만 로드
- 개별 권(Book)의 JSON은 **사용자가 해당 권을 선택할 때 lazy load**
- 로드된 Book 데이터는 메모리에 캐싱 (`bibleLoader.ts` 내부 Map)
- 네트워크 캐싱은 vite-plugin-pwa의 Service Worker가 담당

### 2. 상태 관리 구조 (Zustand)

```typescript
// store/bibleStore.ts
interface BibleStore {
  // 현재 읽기 위치
  translationId: string;
  bookId: string;
  chapterIndex: number; // 0-based

  // 로드된 데이터
  translations: Translation[];
  currentBookMeta: BookMeta | null;
  currentChapterData: Chapter | null;

  // UI 상태
  selectedVerses: number[]; // 선택된 절 번호 목록 (형광펜/메모용)
  isTTSPlaying: boolean;

  // 액션
  setLocation: (translationId: string, bookId: string, chapterIndex: number) => void;
  goNextChapter: () => void;
  goPrevChapter: () => void;
}
```

### 3. IndexedDB 스키마 (Dexie)

```typescript
// services/db.ts
class BibleDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;
}

interface Bookmark {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  createdAt: Date;
}

interface Highlight {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  color: 'yellow' | 'green' | 'pink' | 'blue';
}

interface Note {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  updatedAt: Date;
}
```

### 4. 컴포넌트 레이아웃 구조

```
<App>
  ├── <Header>                  ← position: fixed top, z-50
  │     ├── <TranslationBadge>  ← 현재 번역본 (탭 시 번역본 선택 모달)
  │     ├── <BookChapterTitle>  ← "창세기 1장" (탭 시 책/장 선택 모달)
  │     └── <MenuIcon>
  │
  ├── <BibleReader>             ← 상하단 헤더/툴바 높이만큼 padding
  │     └── <SwipeContainer>   ← react-swipeable 래퍼
  │           └── <VerseList>  ← 절 목록, 절 탭 시 선택/해제
  │
  └── <BottomToolbar>           ← position: fixed bottom, z-50
        ├── <PrevChapterBtn>
        ├── <TTSButton>
        ├── <BookmarkButton>
        ├── <HighlightButton>   ← 선택된 절에 형광펜 적용
        ├── <NoteButton>        ← 선택된 절에 메모 작성
        └── <NextChapterBtn>
```

### 5. TTS 구현 원칙

- `window.speechSynthesis` 사용 (별도 라이브러리 없음)
- 현재 장의 모든 절 텍스트를 이어서 읽음
- 읽는 중인 절을 하이라이트로 표시
- 일시정지/재개/정지 지원
- TTS 언어는 번역본의 `language` 필드에서 자동 설정

### 6. 스와이프 구현 원칙

- `react-swipeable`의 `useSwipeable` 훅 사용
- 스와이프 임계값: delta 50px 이상
- 왼쪽 스와이프 → 다음 장, 오른쪽 스와이프 → 이전 장
- 장 이동 시 스크롤 위치를 상단으로 리셋

---

## 성경 데이터 파일 형식 (변경 금지)

이 형식은 앱 전반에 걸쳐 의존되므로 임의로 변경하지 말 것.

### `public/bibles/translations.json`
```json
[
  {
    "id": "KRV",
    "name": "개역한글",
    "language": "ko",
    "direction": "ltr"
  }
]
```

### `public/bibles/{ID}/metadata.json`
```json
{
  "translationId": "KRV",
  "books": [
    {
      "id": "GEN",
      "name": "창세기",
      "nameEn": "Genesis",
      "testament": "old",
      "chapters": 50
    }
  ]
}
```

### `public/bibles/{ID}/{BOOK_ID}.json`
```json
{
  "bookId": "GEN",
  "bookName": "창세기",
  "chapters": [
    {
      "chapter": 1,
      "verses": [
        { "verse": 1, "text": "태초에 하나님이 천지를 창조하시니라" }
      ]
    }
  ]
}
```

### Book ID 목록 (66권 표준)

구약(39권):
`GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL`

신약(27권):
`MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV`

---

## 개발 규칙

1. **TypeScript strict 모드** — `any` 사용 금지
2. **컴포넌트 크기** — 하나의 컴포넌트는 하나의 책임만 가진다
3. **스타일** — Tailwind 유틸리티 클래스만 사용, 별도 CSS 파일 지양
4. **데이터 fetch** — `bibleLoader.ts`를 통해서만 수행, 컴포넌트에서 직접 fetch 금지
5. **DB 접근** — `services/db.ts`를 통해서만 수행
6. **훅 네이밍** — `use{기능명}.ts` 형태 유지
7. **성경 데이터 수정** — `public/bibles/` 내 JSON 파일 형식은 변경하지 말 것

---

## 새 번역본 추가 절차

1. `public/bibles/{NEW_ID}/` 폴더 생성
2. `metadata.json` 작성 (위 형식 참조)
3. 66권 각각의 `{BOOK_ID}.json` 파일 작성
4. `public/bibles/translations.json`에 번역본 정보 추가
5. 코드 수정 없이 앱 재빌드만으로 반영됨

---

## 향후 확장 고려사항 (현재 미구현)

- 구절 공유 기능 (Web Share API)
- 병렬 번역 보기 (두 번역본 동시 표시)
- 검색 기능 (전문 검색)
- 읽기 계획 (독서 플랜 트래킹)
- 다크 모드
- 글자 크기 조절