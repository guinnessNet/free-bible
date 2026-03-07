import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Highlight } from '../../services/db';
import { useBibleStore } from '../../store/bibleStore';

interface Props { onClose: () => void; }

type ColorFilter = 'all' | Highlight['color'];
type ScopeFilter = 'book' | 'all';

const COLOR_TABS: { key: ColorFilter; label: string; dot?: string }[] = [
  { key: 'all',    label: '전체' },
  { key: 'yellow', label: '노랑', dot: 'bg-yellow-400' },
  { key: 'green',  label: '초록', dot: 'bg-green-400' },
  { key: 'pink',   label: '분홍', dot: 'bg-pink-400' },
  { key: 'blue',   label: '파랑', dot: 'bg-blue-400' },
];

const HL_BG: Record<string, string> = {
  yellow: 'bg-yellow-100 dark:bg-yellow-500/20',
  green:  'bg-green-100 dark:bg-green-500/20',
  pink:   'bg-pink-100 dark:bg-pink-500/20',
  blue:   'bg-blue-100 dark:bg-blue-500/20',
};

export default function HighlightList({ onClose }: Props) {
  const { setLocation, currentMeta, translationId, bookId } = useBibleStore();
  const [scope, setScope] = useState<ScopeFilter>('book');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  const highlights = useLiveQuery(() => db.highlights.toArray(), []);

  const bookName = (bId: string) =>
    currentMeta?.books.find((b) => b.id === bId)?.name ?? bId;

  const filtered = (highlights ?? [])
    .filter((h) => scope === 'all' || h.bookId === bookId)
    .filter((h) => colorFilter === 'all' || h.color === colorFilter)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

  // 책별 그룹핑 (전체 보기일 때)
  const grouped = scope === 'all'
    ? filtered.reduce<Record<string, typeof filtered>>((acc, h) => {
        const key = h.bookId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(h);
        return acc;
      }, {})
    : null;

  const goTo = async (bkId: string, chapter: number) => {
    await setLocation(translationId, bkId, chapter - 1);
    onClose();
  };

  const renderItem = (hl: (typeof filtered)[0]) => (
    <div
      key={hl.id}
      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${HL_BG[hl.color] ?? ''}`}
    >
      <button className="flex-1 text-left min-w-0" onClick={() => goTo(hl.bookId, hl.chapter)}>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {bookName(hl.bookId)} {hl.chapter}:{hl.verse}
        </span>
        {hl.text && (
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {hl.text}
          </span>
        )}
        <span className="block text-[10px] text-gray-400 mt-0.5">
          {hl.createdAt && new Date(hl.createdAt).getTime() > 0
            ? new Date(hl.createdAt).toLocaleDateString('ko-KR')
            : ''}
        </span>
      </button>
      <button
        onClick={() => hl.id != null && db.highlights.delete(hl.id)}
        className="text-gray-300 hover:text-red-400 px-1 text-lg leading-none shrink-0 mt-1"
      >&times;</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="font-semibold dark:text-white">
            형광펜 ({filtered.length})
          </span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-xl">&times;</button>
        </div>

        {/* 범위 필터 */}
        <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
          {([['book', '현재 책'], ['all', '전체 성경']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={[
                'flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors',
                scope === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 색상 필터 */}
        <div className="flex gap-1.5 px-4 pb-3 shrink-0">
          {COLOR_TABS.map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => setColorFilter(key)}
              className={[
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                colorFilter === key
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              {dot && <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />}
              {label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">
              {scope === 'book' ? '이 책에 저장된 형광펜이 없습니다' : '저장된 형광펜이 없습니다'}
            </p>
          ) : grouped ? (
            // 전체 보기: 책별 그룹핑
            Object.entries(grouped).map(([bId, items]) => (
              <div key={bId}>
                <div className="sticky top-0 px-4 py-1.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {bookName(bId)}
                  </span>
                </div>
                {items.map(renderItem)}
              </div>
            ))
          ) : (
            filtered.map(renderItem)
          )}
        </div>
      </div>
    </div>
  );
}
