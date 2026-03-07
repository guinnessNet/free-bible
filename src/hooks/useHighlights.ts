import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Highlight } from '../services/db';

export type HighlightColor = Highlight['color'];

export function useHighlights(translationId: string, bookId: string, chapter: number) {
  const highlights = useLiveQuery(
    () => db.highlights
      .where('[translationId+bookId+chapter]')
      .equals([translationId, bookId, chapter])
      .toArray(),
    [translationId, bookId, chapter]
  );

  const highlightMap = new Map(highlights?.map((h) => [h.verse, h.color]) ?? []);

  const apply = async (verses: number[], color: HighlightColor, verseTexts?: Map<number, string>) => {
    for (const verse of verses) {
      const text = verseTexts?.get(verse) ?? '';
      const existing = await db.highlights
        .where('[translationId+bookId+chapter+verse]')
        .equals([translationId, bookId, chapter, verse])
        .first();
      if (existing?.id != null) {
        await db.highlights.update(existing.id, { color, text, createdAt: new Date() });
      } else {
        await db.highlights.add({
          translationId, bookId, chapter, verse, color,
          createdAt: new Date(),
          text,
        });
      }
    }
  };

  const remove = async (verse: number) => {
    await db.highlights
      .where('[translationId+bookId+chapter+verse]')
      .equals([translationId, bookId, chapter, verse])
      .delete();
  };

  return { highlightMap, apply, remove };
}
