import { useRef } from 'react';
import type { Verse } from '../../types/bible';
import { useBibleStore } from '../../store/bibleStore';
import { useHighlights } from '../../hooks/useHighlights';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useNotes } from '../../hooks/useNotes';

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-500/25 dark:text-yellow-200',
  green:  'bg-green-200 text-green-900 dark:bg-green-500/25 dark:text-green-200',
  pink:   'bg-pink-200 text-pink-900 dark:bg-pink-500/25 dark:text-pink-200',
  blue:   'bg-blue-200 text-blue-900 dark:bg-blue-500/25 dark:text-blue-200',
};

interface Props {
  verses: Verse[];
  activeVerse: number | null;
}

export default function VerseList({ verses, activeVerse }: Props) {
  const { translationId, bookId, chapterIndex, selectedVerses, toggleVerseSelection, fontSize } =
    useBibleStore();
  const chapter = chapterIndex + 1;

  const { highlightMap } = useHighlights(translationId, bookId, chapter);
  const { bookmarkedVerses } = useBookmarks(translationId, bookId, chapter);
  const { noteMap } = useNotes(translationId, bookId, chapter);

  const activeRef = useRef<HTMLParagraphElement | null>(null);

  return (
    <div className={`px-4 py-4 space-y-1 text-${fontSize}`}>
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const hlColor = highlightMap.get(v.verse);
        const isActive = activeVerse === v.verse;
        const isBookmarked = bookmarkedVerses.has(v.verse);
        const note = noteMap.get(v.verse);

        return (
          <p
            key={v.verse}
            ref={isActive ? activeRef : undefined}
            onClick={() => toggleVerseSelection(v.verse)}
            className={[
              'leading-relaxed rounded-sm px-1 py-0.5 cursor-pointer select-none transition-colors',
              isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : '',
              hlColor ? HIGHLIGHT_COLORS[hlColor] : '',
              isActive ? 'bg-amber-100 dark:bg-amber-900/40' : '',
            ].join(' ')}
          >
            <sup className="text-[0.65rem] text-gray-400 mr-1 font-semibold">
              {isBookmarked ? '🔖' : ''}{v.verse}
            </sup>
            {v.text}
            {note && (
              <span className="block text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic pl-3">
                📝 {note.text}
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
}
