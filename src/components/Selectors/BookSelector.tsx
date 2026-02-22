import { useState } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import type { BookMeta } from '../../types/bible';

interface Props { onClose: () => void; }

export default function BookSelector({ onClose }: Props) {
  const { translationId, bookId, chapterIndex, currentMeta, setLocation } = useBibleStore();

  const currentBook = currentMeta?.books.find((b) => b.id === bookId);
  const initialTestament = currentBook?.testament ?? 'old';

  const [testament, setTestament] = useState<'old' | 'new'>(initialTestament);
  const [selectedBook, setSelectedBook] = useState<BookMeta | null>(currentBook ?? null);

  const oldBooks = currentMeta?.books.filter((b) => b.testament === 'old') ?? [];
  const newBooks = currentMeta?.books.filter((b) => b.testament === 'new') ?? [];
  const filteredBooks = testament === 'old' ? oldBooks : newBooks;

  const chapters = selectedBook
    ? Array.from({ length: selectedBook.chapters }, (_, i) => i)
    : [];

  const handleChapterClick = async (idx: number) => {
    if (!selectedBook) return;
    await setLocation(translationId, selectedBook.id, idx);
    onClose();
  };

  const handleTestamentChange = (t: 'old' | 'new') => {
    setTestament(t);
    setSelectedBook(null);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="font-semibold dark:text-white">책 / 장 선택</span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-xl leading-none">✕</button>
        </div>

        {/* 구약 / 신약 토글 */}
        <div className="flex px-4 py-2 gap-2 shrink-0 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleTestamentChange('old')}
            className={[
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
              testament === 'old'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
            ].join(' ')}
          >
            구약 ({oldBooks.length})
          </button>
          <button
            onClick={() => handleTestamentChange('new')}
            className={[
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
              testament === 'new'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
            ].join(' ')}
          >
            신약 ({newBooks.length})
          </button>
        </div>

        {/* 책 목록(좌) + 장 선택(우) */}
        <div className="flex overflow-hidden" style={{ minHeight: 0, flex: 1 }}>
          {/* 좌: 책 목록 */}
          <div className="w-2/5 overflow-y-auto border-r border-gray-200 dark:border-gray-700 px-1 py-1">
            {filteredBooks.map((b) => {
              const isActive = selectedBook?.id === b.id;
              const isCurrent = b.id === bookId;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBook(b)}
                  className={[
                    'w-full text-left px-2 py-2.5 text-sm rounded leading-snug',
                    isActive
                      ? 'bg-blue-700 text-white font-semibold'
                      : isCurrent
                      ? 'text-blue-600 font-medium dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300',
                  ].join(' ')}
                >
                  {b.name}
                </button>
              );
            })}
          </div>

          {/* 우: 장 번호 그리드 */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {selectedBook ? (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium px-1">
                  {selectedBook.name}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {chapters.map((idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChapterClick(idx)}
                      className={[
                        'py-2.5 rounded-lg text-sm font-medium',
                        selectedBook.id === bookId && idx === chapterIndex
                          ? 'bg-blue-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                      ].join(' ')}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
                책을 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
