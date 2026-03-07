# 설계 문서: 기능 추가 + IndexedDB 버그 수정

---

## Part 0. IndexedDB 데이터 미저장 버그 분석 및 해결

### 현상
북마크, 형광펜, 메모 등 사용자 기록이 전혀 남아있지 않음.

### 원인 분석

**핵심 원인: Dexie 복합 인덱스 누락**

현재 `db.ts`의 인덱스 정의:
```typescript
bookmarks: '++id, translationId, bookId, chapter, verse'
```
이것은 **개별 인덱스 5개**를 생성하는 것이지, 복합(compound) 인덱스가 아님.

그런데 훅에서는 복합 조건의 `where()`를 사용:
```typescript
// useBookmarks.ts - 3필드 복합 조건
db.bookmarks.where({ translationId, bookId, chapter }).toArray()

// toggle 함수 - 4필드 복합 조건
db.bookmarks.where({ translationId, bookId, chapter, verse }).first()
```

Dexie 4.x에서 `.where({ field1, field2, ... })` 사용 시:
- 복합 인덱스가 없으면 **첫 번째 매칭 인덱스 하나만 사용하고 나머지는 메모리 필터링**
- 이 자체로는 동작하지만, **반환 타입이나 에러 핸들링에서 예상치 못한 동작** 발생 가능
- 특히 `toggle()` 함수에서 `existing` 조회가 정확하지 않으면 **중복 추가 또는 삭제 실패** 발생

**보조 원인들:**
1. `useLiveQuery`의 의존성 배열에 함수 클로저가 올바르게 캡처되지 않을 수 있음
2. Dexie 4.0.8에서 복합 where 절의 reactivity 문제 (liveQuery가 변경을 감지 못함)
3. Service Worker의 캐시가 오래된 코드를 서빙하여 새 코드가 적용되지 않는 경우

### 해결 방안

#### Step 1: 복합 인덱스 추가 (DB 버전 업그레이드)

```typescript
// services/db.ts
class BibleDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;

  constructor() {
    super('BibleDB');

    // v1 -> v2: 복합 인덱스 추가
    this.version(2).stores({
      bookmarks:  '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      highlights: '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      notes:      '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
    });

    // 기존 v1 유지 (마이그레이션 경로)
    this.version(1).stores({
      bookmarks:  '++id, translationId, bookId, chapter, verse',
      highlights: '++id, translationId, bookId, chapter, verse',
      notes:      '++id, translationId, bookId, chapter, verse',
    });
  }
}
```

#### Step 2: 훅 쿼리 방식 안정화

```typescript
// useBookmarks.ts - 복합 인덱스 활용
const bookmarks = useLiveQuery(
  () => db.bookmarks
    .where('[translationId+bookId+chapter]')
    .equals([translationId, bookId, chapter])
    .toArray(),
  [translationId, bookId, chapter]
);
```

동일하게 `useHighlights`, `useNotes`도 수정.

#### Step 3: 디버깅 확인 포인트
- 브라우저 DevTools > Application > IndexedDB > BibleDB 에서 직접 데이터 확인
- Console에서 `await db.bookmarks.count()` 실행하여 저장 여부 검증
- Service Worker 캐시 강제 초기화 후 테스트

---

## Part 1. 성경 검색 기능

### 요구사항
- 키워드로 성경 전체 또는 현재 번역본 내 검색
- 검색 결과에서 해당 구절로 바로 이동
- 모바일 UX에 적합한 인터페이스

### 설계

#### 1.1 검색 전략: 클라이언트 사이드 전문 검색

서버가 없으므로 **클라이언트에서 JSON 파일을 직접 검색**해야 함.

**방식**: 검색 시 필요한 Book JSON을 순차 로드하면서 검색
- 이미 캐시된 Book은 메모리에서 즉시 검색
- 미캐시 Book은 fetch 후 검색
- 검색 진행률 표시 (예: "39/66권 검색 중...")

**최적화**:
- 검색 범위 옵션: "전체", "구약만", "신약만", "현재 권"
- 결과가 일정 수(예: 100개) 넘으면 조기 종료 옵션
- 디바운스 300ms 적용

#### 1.2 컴포넌트 구조

```
<SearchModal>                    -- fixed overlay, z-60
  <SearchInput>                  -- 상단 고정 검색바
    ├── 텍스트 입력 (autofocus)
    ├── 검색 범위 선택 (드롭다운)
    └── 닫기 버튼
  <SearchProgress>               -- 검색 중 진행률 바 (선택적)
  <SearchResults>                -- 스크롤 가능한 결과 목록
    └── <SearchResultItem>       -- 각 결과 항목
          ├── "창세기 1:1"       -- 위치
          ├── "...천지를 **창조**하시니라..."  -- 키워드 하이라이트된 텍스트
          └── onClick → setLocation()
```

#### 1.3 상태 관리

Zustand store에 추가하지 않음 (검색은 모달 내 로컬 상태로 충분).

```typescript
// SearchModal 내부 상태
const [query, setQuery] = useState('');
const [scope, setScope] = useState<'all' | 'ot' | 'nt' | 'current'>('all');
const [results, setResults] = useState<SearchResult[]>([]);
const [searching, setSearching] = useState(false);
const [progress, setProgress] = useState({ current: 0, total: 0 });
```

```typescript
interface SearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;      // 원문
  matchIndex: number; // 하이라이트용 매칭 시작 위치
}
```

#### 1.4 검색 로직 (bibleLoader.ts에 추가)

```typescript
export async function searchBible(
  translationId: string,
  bookIds: string[],
  query: string,
  onProgress: (current: number, total: number) => void,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (let i = 0; i < bookIds.length; i++) {
    if (signal.aborted) break;
    onProgress(i + 1, bookIds.length);

    const bookData = await loadBook(translationId, bookIds[i]);
    for (const chapter of bookData.chapters) {
      for (const verse of chapter.verses) {
        const idx = verse.text.toLowerCase().indexOf(lowerQuery);
        if (idx !== -1) {
          results.push({
            bookId: bookData.bookId,
            bookName: bookData.bookName,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
            matchIndex: idx,
          });
        }
      }
    }
    if (results.length >= 200) break; // 상한
  }
  return results;
}
```

#### 1.5 UI 진입점

Header에 검색 아이콘 추가:
```
<Header>
  ├── <TranslationBadge>
  ├── <BookChapterTitle>
  ├── <SearchIcon>        ← 새로 추가 (돋보기 아이콘)
  └── <MenuIcon>
```

#### 1.6 파일 구조

```
src/components/Search/
  └── SearchModal.tsx      -- 검색 모달 (입력 + 결과 + 진행률 모두 포함)
src/services/bibleLoader.ts -- searchBible() 함수 추가
```

---

## Part 2. 구절 공유 기능

### 요구사항
- 선택한 구절을 텍스트로 복사 또는 SNS 공유
- Web Share API 지원 브라우저에서는 네이티브 공유 시트 사용
- 미지원 브라우저에서는 클립보드 복사 폴백

### 설계

#### 2.1 공유 텍스트 형식

```
태초에 하나님이 천지를 창조하시니라
- 창세기 1:1 (개역한글)
```

복수 구절 선택 시:
```
태초에 하나님이 천지를 창조하시니라
땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라
- 창세기 1:1-2 (개역한글)
```

#### 2.2 구현 위치

BottomToolbar에 공유 버튼 추가 (메모 버튼 옆):

```typescript
const handleShare = async () => {
  if (!hasSelection) return;

  const verses = currentChapter.verses
    .filter(v => selectedVerses.includes(v.verse))
    .sort((a, b) => a.verse - b.verse);

  const text = verses.map(v => v.text).join('\n');
  const verseRange = verses.length === 1
    ? `${verses[0].verse}`
    : `${verses[0].verse}-${verses[verses.length - 1].verse}`;
  const ref = `- ${bookName} ${chapter}:${verseRange} (${translationName})`;
  const shareText = `${text}\n${ref}`;

  if (navigator.share) {
    await navigator.share({ text: shareText });
  } else {
    await navigator.clipboard.writeText(shareText);
    // 토스트: "클립보드에 복사되었습니다"
  }
  clearSelection();
};
```

#### 2.3 토스트 알림

클립보드 복사 시 피드백을 위한 간단한 토스트:
- 화면 하단에 2초간 표시 후 자동 사라짐
- 별도 라이브러리 없이 상태 + setTimeout으로 구현
- `App.tsx`에 토스트 컴포넌트 추가, Zustand에 `showToast(message)` 액션 추가

#### 2.4 파일 구조

```
src/components/Toast/Toast.tsx     -- 토스트 알림 컴포넌트
src/store/bibleStore.ts            -- toastMessage 상태 + showToast 액션 추가
src/components/BottomToolbar/      -- 공유 버튼 추가
```

---

## Part 3. 읽기 기록 / 통독 진행률

### 요구사항
- 읽은 장 자동 기록 (일정 시간 이상 머무르면 "읽음" 처리)
- BookSelector에서 읽은 장을 시각적으로 표시
- 전체 통독 진행률 확인 가능

### 설계

#### 3.1 "읽음" 판정 기준

- 해당 장에 **5초 이상** 머문 경우 자동으로 "읽음" 기록
- 수동 토글도 가능 (장 그리드에서 길게 누르기)
- 번역본별로 독립적인 읽기 기록

#### 3.2 IndexedDB 스키마 추가

```typescript
// services/db.ts
export interface ReadingRecord {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;     // 1-based
  readAt: Date;        // 최초 읽은 시점
}

// BibleDB 클래스에 추가
readingRecords!: Table<ReadingRecord>;

// version(3) 또는 version(2)에 포함
this.version(3).stores({
  // ... 기존 테이블들 ...
  readingRecords: '++id, [translationId+bookId+chapter], translationId',
});
```

#### 3.3 자동 기록 훅

```typescript
// hooks/useReadingRecord.ts
export function useReadingRecord(translationId: string, bookId: string, chapter: number) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const existing = await db.readingRecords
        .where('[translationId+bookId+chapter]')
        .equals([translationId, bookId, chapter])
        .first();
      if (!existing) {
        await db.readingRecords.add({
          translationId, bookId, chapter, readAt: new Date()
        });
      }
    }, 5000); // 5초 후 기록

    return () => clearTimeout(timer);
  }, [translationId, bookId, chapter]);
}
```

`BibleReader.tsx`에서 이 훅을 호출.

#### 3.4 읽기 현황 조회 훅

```typescript
// hooks/useReadingProgress.ts
export function useReadingProgress(translationId: string) {
  const records = useLiveQuery(
    () => db.readingRecords
      .where('translationId')
      .equals(translationId)
      .toArray(),
    [translationId]
  );

  // Set<"GEN-1"> 형태로 빠른 조회
  const readChapters = new Set(
    records?.map(r => `${r.bookId}-${r.chapter}`) ?? []
  );

  const isRead = (bookId: string, chapter: number) =>
    readChapters.has(`${bookId}-${chapter}`);

  const totalRead = readChapters.size;

  return { isRead, totalRead, readChapters };
}
```

#### 3.5 UI 반영

**BookSelector 장 그리드에서:**
```
읽은 장: 숫자에 체크마크 또는 배경색 변경 (연한 초록)
안 읽은 장: 기본 스타일 유지
```

**설정 패널에 통독 현황 섹션 추가:**
```
통독 현황
━━━━━━━━━━━━━━━ 35%
412 / 1,189장 완료

[초기화 버튼]
```

#### 3.6 파일 구조

```
src/hooks/useReadingRecord.ts     -- 자동 읽기 기록 훅
src/hooks/useReadingProgress.ts   -- 읽기 진행률 조회 훅
src/services/db.ts                -- ReadingRecord 테이블 추가
src/components/Selectors/BookSelector.tsx -- 읽은 장 표시 UI 수정
src/components/Settings/SettingsPanel.tsx -- 통독 현황 섹션 추가
```

---

## 구현 우선순위 및 순서

| 순서 | 항목 | 이유 |
|------|------|------|
| **0** | IndexedDB 버그 수정 | 모든 기록 기능의 전제조건. 이것 없이 다른 기능이 무의미 |
| **1** | 구절 공유 기능 | 구현량 최소, 사용자 가치 즉각적 |
| **2** | 성경 검색 기능 | 가장 큰 기능 공백 해소 |
| **3** | 읽기 기록/통독 진행률 | IndexedDB 수정 후에 추가하는 것이 안전 |

---

## 기술적 제약사항

1. **새 라이브러리 추가 없음** - 모든 기능을 기존 스택으로 구현
2. **성경 JSON 형식 변경 없음** - 기존 데이터 구조 그대로 사용
3. **서버 없음** - 검색, 공유 모두 클라이언트 사이드
4. **DB 마이그레이션** - Dexie의 version() 체계를 활용하여 기존 사용자 데이터 보존
