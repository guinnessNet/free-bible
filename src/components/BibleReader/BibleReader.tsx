import { useRef, useCallback, useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useBibleStore } from '../../store/bibleStore';
import { useTTS } from '../../hooks/useTTS';
import { useReadingRecord } from '../../hooks/useReadingRecord';
import VerseList from './VerseList';
import BottomToolbar from '../BottomToolbar/BottomToolbar';
import type { Chapter } from '../../types/bible';

const pageAudio = new Audio(`${import.meta.env.BASE_URL}bookSound.mp3`);
pageAudio.volume = 0.6;
const playPageSound = () => { pageAudio.currentTime = 0; pageAudio.play().catch(() => {}); };

export default function BibleReader() {
  const {
    currentChapter, isLoading,
    bookId, chapterIndex,
    goNextChapter, goPrevChapter,
    translations, translationId,
    ttsRate,
    selectedVerses,
  } = useBibleStore();

  const lang = translations.find((t) => t.id === translationId)?.language ?? 'ko';

  // 5초 이상 머물면 읽기 기록 자동 저장
  useReadingRecord(translationId, bookId, chapterIndex + 1);

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
  const tts = useTTS(verses, lang, ttsRate, goNextChapter);

  // 선택된 구절이 있으면 해당 구절부터 재생, 없으면 기존 toggle 동작
  const handleTtsToggle = useCallback(() => {
    if (!tts.isPlaying && selectedVerses.length > 0) {
      tts.speakFromVerse(selectedVerses[0]);
    } else {
      tts.toggle();
    }
  }, [tts, selectedVerses]);

  const handlers = useSwipeable({
    onSwipedLeft: () => { tts.stop(); playPageSound(); goNextChapter(); },
    onSwipedRight: () => { tts.stop(); playPageSound(); goPrevChapter(); },
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

  const wrappedTts = { ...tts, toggle: handleTtsToggle };

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

      <BottomToolbar tts={wrappedTts} onNavigate={playPageSound} verses={verses} />
    </>
  );
}
