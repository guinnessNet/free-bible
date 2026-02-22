import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';

export function useNotes(translationId: string, bookId: string, chapter: number) {
  const notes = useLiveQuery(
    () => db.notes.where({ translationId, bookId, chapter }).toArray(),
    [translationId, bookId, chapter]
  );

  const noteMap = new Map(notes?.map((n) => [n.verse, n]) ?? []);

  const save = async (verse: number, text: string) => {
    const existing = await db.notes.where({ translationId, bookId, chapter, verse }).first();
    if (existing?.id != null) {
      if (text.trim() === '') {
        await db.notes.delete(existing.id);
      } else {
        await db.notes.update(existing.id, { text, updatedAt: new Date() });
      }
    } else if (text.trim() !== '') {
      await db.notes.add({ translationId, bookId, chapter, verse, text, updatedAt: new Date() });
    }
  };

  return { noteMap, save };
}
