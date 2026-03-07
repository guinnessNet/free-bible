import { useState, useCallback } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import { useHighlights, type HighlightColor } from '../../hooks/useHighlights';
import NoteEditor from '../Notes/NoteEditor';
import type { Verse } from '../../types/bible';

interface TTS {
  isPlaying: boolean;
  toggle: () => void;
  stop: () => void;
}

interface Props {
  tts: TTS;
  onNavigate: () => void;
  verses: Verse[];
}

const COLORS: { key: HighlightColor; cls: string }[] = [
  { key: 'yellow', cls: 'bg-yellow-300' },
  { key: 'green',  cls: 'bg-green-300' },
  { key: 'pink',   cls: 'bg-pink-300' },
  { key: 'blue',   cls: 'bg-blue-300' },
];

export default function BottomToolbar({ tts, onNavigate, verses }: Props) {
  const {
    translationId, bookId, chapterIndex,
    selectedVerses, clearSelection,
    goNextChapter, goPrevChapter,
    currentMeta, translations, showToast,
  } = useBibleStore();
  const chapter = chapterIndex + 1;

  const { apply: applyHighlight } = useHighlights(translationId, bookId, chapter);

  const [showColors, setShowColors] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const hasSelection = selectedVerses.length > 0;

  const handleHighlight = (color: HighlightColor) => async () => {
    if (!hasSelection) return;
    const verseTexts = new Map(
      verses
        .filter((v) => selectedVerses.includes(v.verse))
        .map((v) => [v.verse, v.text])
    );
    await applyHighlight(selectedVerses, color, verseTexts);
    setShowColors(false);
    clearSelection();
  };

  const handleShare = useCallback(async () => {
    if (!hasSelection) return;
    const selected = verses
      .filter((v) => selectedVerses.includes(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (selected.length === 0) return;

    const bookName = currentMeta?.books.find((b) => b.id === bookId)?.name ?? bookId;
    const translationName = translations.find((t) => t.id === translationId)?.name ?? translationId;
    const text = selected.map((v) => v.text).join('\n');
    const verseRange = selected.length === 1
      ? `${selected[0].verse}`
      : `${selected[0].verse}-${selected[selected.length - 1].verse}`;
    const shareText = `${text}\n- ${bookName} ${chapter}:${verseRange} (${translationName})`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        showToast('클립보드에 복사되었습니다');
      }
    } catch {
      // 사용자가 공유 취소한 경우
    }
    clearSelection();
  }, [hasSelection, verses, selectedVerses, currentMeta, bookId, translationId, translations, chapter, clearSelection, showToast]);

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
          onClick={() => { tts.stop(); onNavigate(); goPrevChapter(); }}
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

        {/* 공유 */}
        <button
          onClick={handleShare}
          disabled={!hasSelection}
          className={`flex-1 flex flex-col items-center py-1 ${hasSelection ? 'text-purple-600' : 'text-gray-300'}`}
        >
          <span className="text-xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 inline">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </span>
          <span className="text-[10px]">공유</span>
        </button>

        {/* 다음 장 */}
        <button
          onClick={() => { tts.stop(); onNavigate(); goNextChapter(); }}
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
