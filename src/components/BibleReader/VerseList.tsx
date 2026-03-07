import { useRef, useState, useEffect, useCallback } from 'react';
import type { Verse } from '../../types/bible';
import { useBibleStore } from '../../store/bibleStore';
import { useHighlights } from '../../hooks/useHighlights';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useNotes } from '../../hooks/useNotes';
import { loadBook } from '../../services/bibleLoader';

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
  const {
    translationId, bookId, chapterIndex, selectedVerses, toggleVerseSelection,
    fontSize, compareTranslationId, translations,
  } = useBibleStore();
  const chapter = chapterIndex + 1;

  const { highlightMap } = useHighlights(translationId, bookId, chapter);
  const { bookmarkedVerses } = useBookmarks(translationId, bookId, chapter);
  const { noteMap } = useNotes(translationId, bookId, chapter);

  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const clickTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // 토글된 절 (비교 번역본으로 표시 중인 절들)
  const [toggledVerses, setToggledVerses] = useState<Set<number>>(new Set());
  // 비교 번역본의 해당 장 절 데이터
  const [compareVerses, setCompareVerses] = useState<Map<number, string>>(new Map());
  const [compareLoading, setCompareLoading] = useState(false);

  // 장/번역본 변경 시 토글 상태 초기화
  useEffect(() => {
    setToggledVerses(new Set());
    setCompareVerses(new Map());
  }, [chapterIndex, bookId, translationId, compareTranslationId]);

  // 비교 번역본 데이터 미리 로드
  useEffect(() => {
    if (!compareTranslationId) return;
    let cancelled = false;
    setCompareLoading(true);
    loadBook(compareTranslationId, bookId)
      .then((bookData) => {
        if (cancelled) return;
        const ch = bookData.chapters[chapterIndex];
        if (ch) {
          const map = new Map<number, string>();
          ch.verses.forEach((v) => map.set(v.verse, v.text));
          setCompareVerses(map);
        }
      })
      .finally(() => { if (!cancelled) setCompareLoading(false); });
    return () => { cancelled = true; };
  }, [compareTranslationId, bookId, chapterIndex]);

  const compareTranslationName = compareTranslationId
    ? translations.find((t) => t.id === compareTranslationId)?.name ?? compareTranslationId
    : '';

  const handleClick = useCallback((verse: number) => {
    if (!compareTranslationId) {
      toggleVerseSelection(verse);
      return;
    }
    // 더블클릭과 충돌 방지: 300ms 딜레이
    const timer = setTimeout(() => {
      clickTimerRef.current.delete(verse);
      toggleVerseSelection(verse);
    }, 300);
    clickTimerRef.current.set(verse, timer);
  }, [compareTranslationId, toggleVerseSelection]);

  const handleDoubleClick = useCallback((verse: number) => {
    if (!compareTranslationId) return;
    // 싱글 클릭 타이머 취소
    const timer = clickTimerRef.current.get(verse);
    if (timer) {
      clearTimeout(timer);
      clickTimerRef.current.delete(verse);
    }
    setToggledVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) {
        next.delete(verse);
      } else {
        next.add(verse);
      }
      return next;
    });
  }, [compareTranslationId]);

  return (
    <div className={`px-4 py-4 space-y-1 text-${fontSize}`}>
      {verses.map((v) => {
        const isSelected = selectedVerses.includes(v.verse);
        const hlColor = highlightMap.get(v.verse);
        const isActive = activeVerse === v.verse;
        const isBookmarked = bookmarkedVerses.has(v.verse);
        const note = noteMap.get(v.verse);
        const isToggled = toggledVerses.has(v.verse);
        const compareText = compareVerses.get(v.verse);

        return (
          <p
            key={v.verse}
            ref={isActive ? activeRef : undefined}
            onClick={() => handleClick(v.verse)}
            onDoubleClick={() => handleDoubleClick(v.verse)}
            className={[
              'leading-relaxed rounded-sm px-1 py-0.5 cursor-pointer select-none transition-colors',
              isSelected && !isToggled ? 'ring-2 ring-blue-400 ring-offset-1' : '',
              hlColor && !isToggled ? HIGHLIGHT_COLORS[hlColor] : '',
              isActive && !isToggled ? 'bg-amber-100 dark:bg-amber-900/40' : '',
              isToggled ? 'border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg' : '',
            ].join(' ')}
          >
            <sup className="text-[0.65rem] text-gray-400 mr-1 font-semibold">
              {isBookmarked ? '🔖' : ''}{v.verse}
            </sup>
            {isToggled ? (
              compareLoading ? (
                <span className="text-gray-400 italic">로딩 중...</span>
              ) : (
                <>
                  <span className="inline-block text-[0.6rem] font-semibold text-blue-500 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 rounded px-1 py-0.5 mr-1 align-middle">
                    {compareTranslationName}
                  </span>
                  {compareText ?? <span className="text-gray-400 italic">해당 절 없음</span>}
                </>
              )
            ) : (
              v.text
            )}
            {note && !isToggled && (
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
