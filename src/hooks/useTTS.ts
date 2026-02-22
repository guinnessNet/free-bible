import { useRef, useState, useCallback, useEffect } from 'react';
import type { Verse } from '../types/bible';

export function useTTS(verses: Verse[], language: string, rate: number = 1.0) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentIndexRef = useRef(0);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveVerse(null);
    currentIndexRef.current = 0;
  }, []);

  // 페이지 이동 시 TTS 정지
  useEffect(() => { return () => { window.speechSynthesis.cancel(); }; }, [verses]);

  const speakFrom = useCallback(
    (startIndex: number) => {
      window.speechSynthesis.cancel();
      currentIndexRef.current = startIndex;

      const speakNext = () => {
        const idx = currentIndexRef.current;
        if (idx >= verses.length) {
          setIsPlaying(false);
          setActiveVerse(null);
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
      speakNext();
    },
    [verses, language, rate, stop]
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

  return { isPlaying, activeVerse, toggle, stop };
}
