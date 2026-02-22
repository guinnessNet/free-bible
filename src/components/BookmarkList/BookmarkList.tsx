import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../services/db';
import { useBibleStore } from '../../store/bibleStore';

interface Props { onClose: () => void; }

const HL_DOT: Record<string, string> = {
  yellow: 'bg-yellow-400',
  green:  'bg-green-400',
  pink:   'bg-pink-400',
  blue:   'bg-blue-400',
};

export default function BookmarkList({ onClose }: Props) {
  const [tab, setTab] = useState<'bookmark' | 'highlight'>('bookmark');
  const { setLocation, currentMeta, translationId } = useBibleStore();

  const bookmarks = useLiveQuery(() => db.bookmarks.orderBy('createdAt').reverse().toArray(), []);
  const highlights = useLiveQuery(() => db.highlights.toArray(), []);

  const bookName = (bookId: string) =>
    currentMeta?.books.find((b) => b.id === bookId)?.name ?? bookId;

  const goTo = async (bkId: string, chapter: number) => {
    await setLocation(translationId, bkId, chapter - 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="font-semibold dark:text-white">저장된 항목</span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-xl">✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['bookmark', 'highlight'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'flex-1 py-2.5 text-sm font-medium',
                tab === t
                  ? 'border-b-2 border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              {t === 'bookmark'
                ? `🔖 북마크 (${bookmarks?.length ?? 0})`
                : `🖊 형광펜 (${highlights?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'bookmark' ? (
            !bookmarks?.length ? (
              <p className="text-center text-gray-400 py-10 text-sm">저장된 북마크가 없습니다</p>
            ) : (
              bookmarks.map((bm) => (
                <div key={bm.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <button className="flex-1 text-left" onClick={() => goTo(bm.bookId, bm.chapter)}>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {bookName(bm.bookId)} {bm.chapter}:{bm.verse}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {new Date(bm.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </button>
                  <button
                    onClick={() => bm.id != null && db.bookmarks.delete(bm.id)}
                    className="text-gray-300 hover:text-red-400 px-2 text-lg leading-none"
                  >×</button>
                </div>
              ))
            )
          ) : (
            !highlights?.length ? (
              <p className="text-center text-gray-400 py-10 text-sm">저장된 형광펜이 없습니다</p>
            ) : (
              highlights.map((hl) => (
                <div key={hl.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className={`w-3 h-3 rounded-full mr-3 shrink-0 ${HL_DOT[hl.color] ?? 'bg-gray-300'}`} />
                  <button className="flex-1 text-left" onClick={() => goTo(hl.bookId, hl.chapter)}>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {bookName(hl.bookId)} {hl.chapter}:{hl.verse}
                    </span>
                    <span className="block text-xs text-gray-400">{hl.color}</span>
                  </button>
                  <button
                    onClick={() => hl.id != null && db.highlights.delete(hl.id)}
                    className="text-gray-300 hover:text-red-400 px-2 text-lg leading-none"
                  >×</button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
