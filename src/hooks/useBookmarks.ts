import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';

export function useBookmarks(translationId: string, bookId: string, chapter: number) {
  const bookmarks = useLiveQuery(
    () => db.bookmarks.where({ translationId, bookId, chapter }).toArray(),
    [translationId, bookId, chapter]
  );

  const bookmarkedVerses = new Set(bookmarks?.map((b) => b.verse) ?? []);

  const toggle = async (verse: number) => {
    const existing = await db.bookmarks
      .where({ translationId, bookId, chapter, verse })
      .first();
    if (existing?.id != null) {
      await db.bookmarks.delete(existing.id);
    } else {
      await db.bookmarks.add({ translationId, bookId, chapter, verse, createdAt: new Date() });
    }
  };

  return { bookmarkedVerses, toggle };
}
