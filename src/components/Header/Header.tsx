import { useState } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import BookSelector from '../Selectors/BookSelector';
import TranslationSelector from '../Selectors/TranslationSelector';
import SettingsPanel from '../Settings/SettingsPanel';
import BookmarkList from '../BookmarkList/BookmarkList';

export default function Header() {
  const { translationId, bookId, chapterIndex, currentMeta, translations } = useBibleStore();
  const [showBook, setShowBook] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const bookMeta = currentMeta?.books.find((b) => b.id === bookId);
  const translationName = translations.find((t) => t.id === translationId)?.name ?? translationId;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-blue-950 dark:bg-gray-950 text-white flex items-center px-3 gap-2 shadow-md">
        {/* 책/장 */}
        <button
          onClick={() => setShowBook(true)}
          className="flex-1 text-left font-semibold text-base truncate"
        >
          {bookMeta?.name ?? '—'} {chapterIndex + 1}장
        </button>

        {/* 번역본 */}
        <button
          onClick={() => setShowTranslation(true)}
          className="text-xs bg-blue-800 dark:bg-gray-700 px-2.5 py-1 rounded-full shrink-0 max-w-28 truncate"
        >
          {translationName}
        </button>

        {/* 설정 */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white shrink-0"
          aria-label="설정"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {showBook       && <BookSelector        onClose={() => setShowBook(false)} />}
      {showTranslation && <TranslationSelector onClose={() => setShowTranslation(false)} />}
      {showSettings   && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onOpenSaved={() => setShowSaved(true)}
        />
      )}
      {showSaved      && <BookmarkList onClose={() => setShowSaved(false)} />}
    </>
  );
}
