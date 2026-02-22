import { useState } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useHighlights, type HighlightColor } from '../../hooks/useHighlights';
import NoteEditor from '../Notes/NoteEditor';

interface TTS {
  isPlaying: boolean;
  toggle: () => void;
  stop: () => void;
}

interface Props { tts: TTS; }

const COLORS: { key: HighlightColor; cls: string }[] = [
  { key: 'yellow', cls: 'bg-yellow-300' },
  { key: 'green',  cls: 'bg-green-300' },
  { key: 'pink',   cls: 'bg-pink-300' },
  { key: 'blue',   cls: 'bg-blue-300' },
];

export default function BottomToolbar({ tts }: Props) {
  const {
    translationId, bookId, chapterIndex,
    selectedVerses, clearSelection,
    goNextChapter, goPrevChapter,
  } = useBibleStore();
  const chapter = chapterIndex + 1;

  const { toggle: toggleBookmark } = useBookmarks(translationId, bookId, chapter);
  const { apply: applyHighlight } = useHighlights(translationId, bookId, chapter);

  const [showColors, setShowColors] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const hasSelection = selectedVerses.length > 0;

  const handleBookmark = async () => {
    if (!hasSelection) return;
    for (const v of selectedVerses) await toggleBookmark(v);
    clearSelection();
  };

  const handleHighlight = (color: HighlightColor) => async () => {
    if (!hasSelection) return;
    await applyHighlight(selectedVerses, color);
    setShowColors(false);
    clearSelection();
  };

  return (
    <>
      {/* 형광펜 색상 팝업 */}
      {showColors && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center gap-3 pb-2">
          {COLORS.map(({ key, cls }) => (
            <button
              key={key}
              onClick={handleHighlight(key)}
              className={`w-10 h-10 rounded-full shadow-lg border-2 border-white ${cls}`}
            />
          ))}
          <button
            onClick={() => setShowColors(false)}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shadow-lg"
          >
            ✕
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-2">
        {/* 이전 장 */}
        <button
          onClick={() => { tts.stop(); goPrevChapter(); }}
          className="flex-1 flex flex-col items-center py-1 text-gray-500 dark:text-gray-400"
        >
          <span className="text-xl">◀</span>
          <span className="text-[10px]">이전장</span>
        </button>

        {/* TTS */}
        <button
          onClick={tts.toggle}
          className="flex-1 flex flex-col items-center py-1 text-gray-500 dark:text-gray-400"
        >
          <span className="text-xl">{tts.isPlaying ? '⏸' : '▶'}</span>
          <span className="text-[10px]">듣기</span>
        </button>

        {/* 북마크 */}
        <button
          onClick={handleBookmark}
          disabled={!hasSelection}
          className={`flex-1 flex flex-col items-center py-1 ${hasSelection ? 'text-blue-600' : 'text-gray-300'}`}
        >
          <span className="text-xl">🔖</span>
          <span className="text-[10px]">북마크</span>
        </button>

        {/* 형광펜 */}
        <button
          onClick={() => hasSelection && setShowColors((v) => !v)}
          disabled={!hasSelection}
          className={`flex-1 flex flex-col items-center py-1 ${hasSelection ? 'text-yellow-500' : 'text-gray-300'}`}
        >
          <span className="text-xl">🖊</span>
          <span className="text-[10px]">형광펜</span>
        </button>

        {/* 메모 */}
        <button
          onClick={() => hasSelection && selectedVerses.length === 1 && setShowNote(true)}
          disabled={!hasSelection || selectedVerses.length !== 1}
          className={`flex-1 flex flex-col items-center py-1 ${hasSelection && selectedVerses.length === 1 ? 'text-green-600' : 'text-gray-300'}`}
        >
          <span className="text-xl">📝</span>
          <span className="text-[10px]">메모</span>
        </button>

        {/* 다음 장 */}
        <button
          onClick={() => { tts.stop(); goNextChapter(); }}
          className="flex-1 flex flex-col items-center py-1 text-gray-500 dark:text-gray-400"
        >
          <span className="text-xl">▶</span>
          <span className="text-[10px]">다음장</span>
        </button>
      </div>

      {showNote && <NoteEditor onClose={() => setShowNote(false)} />}
    </>
  );
}
