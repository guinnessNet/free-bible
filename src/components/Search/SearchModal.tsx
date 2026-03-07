import { useState, useRef, useCallback } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import { loadBook } from '../../services/bibleLoader';

interface SearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

type Scope = 'all' | 'ot' | 'nt' | 'current';

interface Props { onClose: () => void; }

export default function SearchModal({ onClose }: Props) {
  const { translationId, bookId, currentMeta, setLocation } = useBibleStore();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  const getBookIds = useCallback((): string[] => {
    if (!currentMeta) return [];
    switch (scope) {
      case 'ot': return currentMeta.books.filter((b) => b.testament === 'old').map((b) => b.id);
      case 'nt': return currentMeta.books.filter((b) => b.testament === 'new').map((b) => b.id);
      case 'current': return [bookId];
      default: return currentMeta.books.map((b) => b.id);
    }
  }, [currentMeta, scope, bookId]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || !currentMeta) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setResults([]);
    const bookIds = getBookIds();
    const found: SearchResult[] = [];
    const lowerQuery = trimmed.toLowerCase();

    for (let i = 0; i < bookIds.length; i++) {
      if (controller.signal.aborted) break;
      setProgress({ current: i + 1, total: bookIds.length });

      try {
        const bookData = await loadBook(translationId, bookIds[i]);
        for (const ch of bookData.chapters) {
          for (const v of ch.verses) {
            if (v.text.toLowerCase().includes(lowerQuery)) {
              found.push({
                bookId: bookData.bookId,
                bookName: bookData.bookName,
                chapter: ch.chapter,
                verse: v.verse,
                text: v.text,
              });
              if (found.length >= 200) break;
            }
          }
          if (found.length >= 200) break;
        }
        if (found.length >= 200) break;
      } catch {
        // 해당 권 로드 실패 시 건너뜀
      }
    }

    if (!controller.signal.aborted) {
      setResults(found);
      setSearching(false);
    }
  }, [query, translationId, currentMeta, getBookIds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const goTo = async (bkId: string, chapter: number) => {
    await setLocation(translationId, bkId, chapter - 1);
    onClose();
  };

  const highlightText = (text: string) => {
    const lower = text.toLowerCase();
    const q = query.trim().toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return text;

    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + q.length + 40);
    const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');

    const sIdx = snippet.toLowerCase().indexOf(q);
    if (sIdx === -1) return snippet;

    return (
      <>
        {snippet.slice(0, sIdx)}
        <mark className="bg-yellow-200 dark:bg-yellow-600/40 rounded px-0.5">
          {snippet.slice(sIdx, sIdx + q.length)}
        </mark>
        {snippet.slice(sIdx + q.length)}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="검색어를 입력하세요..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 shrink-0"
            >
              검색
            </button>
            <button
              onClick={onClose}
              className="px-2 text-gray-500 dark:text-gray-400 text-xl shrink-0"
            >
              ✕
            </button>
          </div>

          {/* 검색 범위 */}
          <div className="flex gap-1.5 mt-2">
            {([
              ['all', '전체'],
              ['ot', '구약'],
              ['nt', '신약'],
              ['current', '현재 권'],
            ] as [Scope, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  scope === key
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 진행률 */}
        {searching && (
          <div className="px-4 py-1.5 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
              <span>{progress.current}/{progress.total}권</span>
            </div>
          </div>
        )}

        {/* 결과 목록 */}
        <div className="overflow-y-auto flex-1 pb-6">
          {!searching && results.length > 0 && (
            <p className="px-4 py-2 text-xs text-gray-400 shrink-0">
              {results.length >= 200 ? '200개 이상' : `${results.length}개`} 결과
            </p>
          )}

          {!searching && results.length === 0 && query.trim() && (
            <p className="text-center text-gray-400 py-10 text-sm">
              검색 결과가 없습니다
            </p>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.bookId}-${r.chapter}-${r.verse}-${i}`}
              onClick={() => goTo(r.bookId, r.chapter)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {r.bookName} {r.chapter}:{r.verse}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                {highlightText(r.text)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
