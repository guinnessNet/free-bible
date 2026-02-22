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

class BibleDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  highlights!: Table<Highlight>;
  notes!: Table<Note>;

  constructor() {
    super('BibleDB');
    this.version(1).stores({
      bookmarks: '++id, translationId, bookId, chapter, verse',
      highlights: '++id, translationId, bookId, chapter, verse',
      notes: '++id, translationId, bookId, chapter, verse',
    });
  }
}

export const db = new BibleDB();
