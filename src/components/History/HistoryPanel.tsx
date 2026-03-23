import { useBibleStore } from '../../store/bibleStore';

interface Props {
  onClose: () => void;
}

export default function HistoryPanel({ onClose }: Props) {
  const { navigationHistory, setLocation, removeHistoryEntry } = useBibleStore();

  const handleSelect = async (entry: typeof navigationHistory[number]) => {
    await setLocation(entry.translationId, entry.bookId, entry.chapterIndex);
    onClose();
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50" onClick={onClose}>
      <div
        className="mt-14 w-full max-w-sm mx-3 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            최근 본 페이지
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="max-h-80 overflow-y-auto">
          {navigationHistory.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              아직 방문 기록이 없습니다
            </p>
          ) : (
            <ul>
              {navigationHistory.map((entry, idx) => (
                <li
                  key={`${entry.translationId}-${entry.bookId}-${entry.chapterIndex}-${entry.visitedAt}`}
                  className="flex items-center border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <button
                    className="flex-1 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    onClick={() => handleSelect(entry)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.bookName} {entry.chapterIndex + 1}장
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {entry.translationName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatTime(entry.visitedAt)}
                    </p>
                  </button>
                  <button
                    className="px-3 py-3 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                    onClick={() => removeHistoryEntry(idx)}
                    aria-label="삭제"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
