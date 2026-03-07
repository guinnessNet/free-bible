import { useRef, useState, useCallback, useEffect } from 'react';
import type { Verse } from '../types/bible';

type WakeLockHandle = { release(): Promise<void> };

export function useTTS(
  verses: Verse[],
  language: string,
  rate: number = 1.0,
  onChapterEnd?: () => void,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentIndexRef = useRef(0);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  // 자동 다음장 이동 중임을 표시 — true이면 cleanup 시 cancel/release 생략
  const autoAdvanceRef = useRef(false);
  // speakFrom을 항상 최신 버전으로 참조하기 위한 ref
  const speakFromRef = useRef<(startIndex: number) => void>(() => {});

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release(); } catch { /* ignore */ }
    wakeLockRef.current = null;
  }, []);

  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: string): Promise<WakeLockHandle> };
    };
    if (!nav.wakeLock) return;
    try {
      // 기존 lock 해제 후 새로 요청
      await wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch { /* ignore */ }
  }, []);

  const stop = useCallback(() => {
    autoAdvanceRef.current = false;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveVerse(null);
    currentIndexRef.current = 0;
    void releaseWakeLock();
  }, [releaseWakeLock]);

  // 페이지 이동 시 TTS 정지 (자동 다음장 이동 중에는 cancel/release 생략)
  useEffect(() => {
    return () => {
      if (!autoAdvanceRef.current) {
        window.speechSynthesis.cancel();
        void releaseWakeLock();
      }
    };
  }, [verses, releaseWakeLock]);

  const speakFrom = useCallback(
    (startIndex: number) => {
      window.speechSynthesis.cancel();
      currentIndexRef.current = startIndex;

      const speakNext = () => {
        const idx = currentIndexRef.current;
        if (idx >= verses.length) {
          if (onChapterEnd) {
            // 자동 다음장: wake lock 유지, 다음장 로드
            autoAdvanceRef.current = true;
            onChapterEnd();
          } else {
            setIsPlaying(false);
            setActiveVerse(null);
            void releaseWakeLock();
          }
          return;
        }

        const verse = verses[idx];
        setActiveVerse(verse.verse);

        const utter = new SpeechSynthesisUtterance(verse.text);
        utter.lang = language;
        utter.rate = rate;
        utter.onend = () => {
          currentIndexRef.current += 1;
          speakNext();
        };
        utter.onerror = () => stop();
        utteranceRef.current = utter;
        window.speechSynthesis.speak(utter);
      };

      setIsPlaying(true);
      void acquireWakeLock();
      speakNext();
    },
    [verses, language, rate, stop, onChapterEnd, acquireWakeLock, releaseWakeLock],
  );

  // speakFromRef를 항상 최신으로 유지
  useEffect(() => {
    speakFromRef.current = speakFrom;
  }, [speakFrom]);

  // 자동 다음장: 새 verses가 로드되면 처음부터 재생
  useEffect(() => {
    if (autoAdvanceRef.current && verses.length > 0) {
      autoAdvanceRef.current = false;
      speakFromRef.current(0);
    }
  }, [verses]);

  const speakFromVerse = useCallback(
    (verseNumber: number) => {
      const idx = verses.findIndex((v) => v.verse === verseNumber);
      speakFrom(idx >= 0 ? idx : 0);
    },
    [verses, speakFrom],
  );

  const play = useCallback(() => speakFrom(0), [speakFrom]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      speakFrom(currentIndexRef.current);
    }
  }, [speakFrom]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (window.speechSynthesis.paused) {
      resume();
    } else {
      play();
    }
  }, [isPlaying, pause, resume, play]);

  return { isPlaying, activeVerse, toggle, stop, speakFromVerse };
}
