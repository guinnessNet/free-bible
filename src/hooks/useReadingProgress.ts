import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';

export function useReadingProgress(translationId: string) {
  const records = useLiveQuery(
    () => db.readingRecords
      .where('translationId')
      .equals(translationId)
      .toArray(),
    [translationId]
  );

  const readChapters = new Set(
    records?.map((r) => `${r.bookId}-${r.chapter}`) ?? []
  );

  const isRead = (bookId: string, chapter: number) =>
    readChapters.has(`${bookId}-${chapter}`);

  const totalRead = readChapters.size;

  return { isRead, totalRead, readChapters };
}
