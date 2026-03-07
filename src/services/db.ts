import Dexie, { type Table } from 'dexie';

export interface Bookmark {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  createdAt: Date;
}

export interface Highlight {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  color: 'yellow' | 'green' | 'pink' | 'blue';
}

export interface Note {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  updatedAt: Date;
}

export interface ReadingRecord {
  id?: number;
  translationId: string;
  bookId: string;
  chapter: number;
  readAt: Date;
}

class BibleDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;

  readingRecords!: Table<ReadingRecord>;

  constructor() {
    super('BibleDB');

    // v1 유지 (마이그레이션 경로)
    this.version(1).stores({
      bookmarks:  '++id, translationId, bookId, chapter, verse',
      highlights: '++id, translationId, bookId, chapter, verse',
      notes:      '++id, translationId, bookId, chapter, verse',
    });

    // v2: 복합 인덱스 추가 + 읽기 기록 테이블
    this.version(2).stores({
      bookmarks:      '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      highlights:     '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      notes:          '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      readingRecords: '++id, [translationId+bookId+chapter], translationId',
    });

    // v3: bookmarks에 createdAt 인덱스 추가
    this.version(3).stores({
      bookmarks:      '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse], createdAt',
      highlights:     '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      notes:          '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      readingRecords: '++id, [translationId+bookId+chapter], translationId',
    });
  }
}

export const db = new BibleDB();
