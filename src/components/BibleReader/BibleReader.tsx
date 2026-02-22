import { useRef, useCallback, useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useBibleStore } from '../../store/bibleStore';
import { useTTS } from '../../hooks/useTTS';
import VerseList from './VerseList';
import BottomToolbar from '../BottomToolbar/BottomToolbar';
import type { Chapter } from '../../types/bible';

export default function BibleReader() {
  const {
    currentChapter, isLoading,
    bookId, chapterIndex,
    goNextChapter, goPrevChapter,
    translations, translationId,
    ttsRate,
  } = useBibleStore();

  const lang = translations.find((t) => t.id === translationId)?.language ?? 'ko';

  // 로딩 중에도 이전 내용을 유지해서 스크롤 위치가 무너지지 않도록 함
  const [displayedChapter, setDisplayedChapter] = useState<Chapter | null>(currentChapter);
  const prevBookKey = useRef(`${bookId}/${chapterIndex}`);
  const scrollEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading && currentChapter) {
      const newKey = `${bookId}/${chapterIndex}`;
      const bookOrChapterChanged = prevBookKey.current !== newKey;

      setDisplayedChapter(currentChapter);

      if (bookOrChapterChanged) {
        // 책/장 이동 시에만 상단으로
        requestAnimationFrame(() => scrollEl.current?.scrollTo({ top: 0 }));
        prevBookKey.current = newKey;
      }
      // 번역본만 바뀐 경우 → 스크롤 위치 그대로 유지
    }
  }, [isLoading, currentChapter, bookId, chapterIndex]);

  const verses = displayedChapter?.verses ?? [];
  const tts = useTTS(verses, lang, ttsRate);

  const handlers = useSwipeable({
    onSwipedLeft: () => { tts.stop(); goNextChapter(); },
    onSwipedRight: () => { tts.stop(); goPrevChapter(); },
    swipeDuration: 500,
    preventScrollOnSwipe: false,
    delta: 50,
    trackMouse: false,
  });

  const { ref: swipeRef, ...eventHandlers } = handlers;
  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      swipeRef(el);
      scrollEl.current = el;
    },
    [swipeRef]
  );

  return (
    <>
      <div
        ref={combinedRef}
        className="fixed inset-0 overflow-y-auto bg-white dark:bg-gray-900"
        style={{ paddingTop: '56px', paddingBottom: '64px' }}
        {...eventHandlers}
      >
        {/* 로딩 오버레이 — 내용은 유지, 상단에 얇은 인디케이터만 */}
        {isLoading && (
          <div className="fixed top-14 left-0 right-0 h-0.5 bg-blue-500 z-40 animate-pulse" />
        )}

        {verses.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            내용이 없습니다
          </div>
        ) : (
          <VerseList verses={verses} activeVerse={tts.activeVerse} />
        )}
      </div>

      <BottomToolbar tts={tts} />
    </>
  );
}
