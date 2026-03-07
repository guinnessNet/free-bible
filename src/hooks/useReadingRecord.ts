import { useEffect } from 'react';
import { db } from '../services/db';

export function useReadingRecord(translationId: string, bookId: string, chapter: number) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const existing = await db.readingRecords
        .where('[translationId+bookId+chapter]')
        .equals([translationId, bookId, chapter])
        .first();
      if (!existing) {
        await db.readingRecords.add({
          translationId, bookId, chapter, readAt: new Date(),
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [translationId, bookId, chapter]);
}
