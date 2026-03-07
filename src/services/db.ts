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
  createdAt: Date;
  text: string;
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

    // v4: 북마크 제거, highlights에 createdAt/text/bookId 인덱스 추가
    this.version(4).stores({
      bookmarks:      null, // 테이블 삭제
      highlights:     '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse], createdAt, bookId',
      notes:          '++id, [translationId+bookId+chapter], [translationId+bookId+chapter+verse]',
      readingRecords: '++id, [translationId+bookId+chapter], translationId',
    }).upgrade(async (tx) => {
      // 기존 북마크를 노란색 형광펜으로 마이그레이션
      const bookmarks = await tx.table('bookmarks').toArray();
      const highlights = tx.table('highlights');
      for (const bm of bookmarks) {
        const exists = await highlights
          .where('[translationId+bookId+chapter+verse]')
          .equals([bm.translationId, bm.bookId, bm.chapter, bm.verse])
          .first();
        if (!exists) {
          await highlights.add({
            translationId: bm.translationId,
            bookId: bm.bookId,
            chapter: bm.chapter,
            verse: bm.verse,
            color: 'yellow',
            createdAt: bm.createdAt ?? new Date(0),
            text: '',
          });
        }
      }
      // 기존 형광펜에 createdAt/text 기본값 채우기
      await highlights.toCollection().modify((hl: Highlight) => {
        if (!hl.createdAt) hl.createdAt = new Date(0);
        if (!hl.text) hl.text = '';
      });
    });
  }
}

export const db = new BibleDB();
