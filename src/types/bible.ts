export interface Translation {
  id: string;
  name: string;
  language: string;
  direction: 'ltr' | 'rtl';
}

export interface BookMeta {
  id: string;
  name: string;
  nameEn: string;
  testament: 'old' | 'new';
  chapters: number;
}

export interface TranslationMeta {
  translationId: string;
  books: BookMeta[];
}

export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface BookData {
  bookId: string;
  bookName: string;
  chapters: Chapter[];
}
