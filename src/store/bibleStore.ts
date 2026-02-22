import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Translation, TranslationMeta, Chapter } from '../types/bible';
import { loadTranslations, loadTranslationMeta, loadBook } from '../services/bibleLoader';

interface BibleStore {
  // 읽기 위치
  translationId: string;
  bookId: string;
  chapterIndex: number; // 0-based

  // 로드된 데이터
  translations: Translation[];
  currentMeta: TranslationMeta | null;
  currentChapter: Chapter | null;
  isLoading: boolean;

  // UI 상태
  selectedVerses: number[];
  activeToolMode: 'none' | 'highlight' | 'note';

  // 설정
  darkMode: boolean;
  favoriteTranslations: string[]; // 비어있으면 전체 표시
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  ttsRate: number;

  // 액션
  init: () => Promise<void>;
  setLocation: (translationId: string, bookId: string, chapterIndex: number) => Promise<void>;
  goNextChapter: () => Promise<void>;
  goPrevChapter: () => Promise<void>;
  toggleVerseSelection: (verse: number) => void;
  clearSelection: () => void;
  setToolMode: (mode: 'none' | 'highlight' | 'note') => void;
  toggleDarkMode: () => void;
  setFavoriteTranslations: (ids: string[]) => void;
  setFontSize: (size: 'sm' | 'base' | 'lg' | 'xl') => void;
  setTtsRate: (rate: number) => void;
}

export const useBibleStore = create<BibleStore>()(
  persist(
    (set, get) => ({
      translationId: 'KRV',
      bookId: 'GEN',
      chapterIndex: 0,
      translations: [],
      currentMeta: null,
      currentChapter: null,
      isLoading: false,
      selectedVerses: [],
      activeToolMode: 'none',
      darkMode: false,
      favoriteTranslations: [],
      fontSize: 'base',
      ttsRate: 1.0,

      init: async () => {
        const { translationId, bookId, chapterIndex } = get();
        set({ isLoading: true });
        try {
          const [translations, meta] = await Promise.all([
            loadTranslations(),
            loadTranslationMeta(translationId),
          ]);
          const bookData = await loadBook(translationId, bookId);
          set({
            translations,
            currentMeta: meta,
            currentChapter: bookData.chapters[chapterIndex] ?? null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      setLocation: async (translationId, bookId, chapterIndex) => {
        set({ isLoading: true, selectedVerses: [], activeToolMode: 'none' });
        try {
          const [meta, bookData] = await Promise.all([
            loadTranslationMeta(translationId),
            loadBook(translationId, bookId),
          ]);
          set({
            translationId,
            bookId,
            chapterIndex,
            currentMeta: meta,
            currentChapter: bookData.chapters[chapterIndex] ?? null,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      goNextChapter: async () => {
        const { translationId, bookId, chapterIndex, currentMeta } = get();
        if (!currentMeta) return;

        const bookMeta = currentMeta.books.find((b) => b.id === bookId);
        if (!bookMeta) return;

        if (chapterIndex + 1 < bookMeta.chapters) {
          await get().setLocation(translationId, bookId, chapterIndex + 1);
          return;
        }

        // 다음 권으로
        const bookIdx = currentMeta.books.findIndex((b) => b.id === bookId);
        if (bookIdx + 1 < currentMeta.books.length) {
          const nextBook = currentMeta.books[bookIdx + 1];
          await get().setLocation(translationId, nextBook.id, 0);
        }
      },

      goPrevChapter: async () => {
        const { translationId, bookId, chapterIndex, currentMeta } = get();
        if (!currentMeta) return;

        if (chapterIndex > 0) {
          await get().setLocation(translationId, bookId, chapterIndex - 1);
          return;
        }

        // 이전 권 마지막 장으로
        const bookIdx = currentMeta.books.findIndex((b) => b.id === bookId);
        if (bookIdx > 0) {
          const prevBook = currentMeta.books[bookIdx - 1];
          await get().setLocation(translationId, prevBook.id, prevBook.chapters - 1);
        }
      },

      toggleVerseSelection: (verse) => {
        const { selectedVerses } = get();
        set({
          selectedVerses: selectedVerses.includes(verse)
            ? selectedVerses.filter((v) => v !== verse)
            : [...selectedVerses, verse],
        });
      },

      clearSelection: () => set({ selectedVerses: [], activeToolMode: 'none' }),
      setToolMode: (mode) => set({ activeToolMode: mode }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setFavoriteTranslations: (ids) => set({ favoriteTranslations: ids }),
      setFontSize: (size) => set({ fontSize: size }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
    }),
    {
      name: 'bible-settings',
      partialize: (s) => ({
        translationId: s.translationId,
        bookId: s.bookId,
        chapterIndex: s.chapterIndex,
        darkMode: s.darkMode,
        favoriteTranslations: s.favoriteTranslations,
        fontSize: s.fontSize,
        ttsRate: s.ttsRate,
      }),
    }
  )
);
