import type { Translation, TranslationMeta, BookData } from '../types/bible';

// 메모리 캐시 — 같은 권을 반복 요청해도 한 번만 fetch
const bookCache = new Map<string, BookData>();
const metaCache = new Map<string, TranslationMeta>();

export async function loadTranslations(): Promise<Translation[]> {
  const res = await fetch('/bibles/translations.json');
  if (!res.ok) throw new Error('translations.json 로드 실패');
  return res.json();
}

export async function loadTranslationMeta(translationId: string): Promise<TranslationMeta> {
  if (metaCache.has(translationId)) return metaCache.get(translationId)!;
  const res = await fetch(`/bibles/${translationId}/metadata.json`);
  if (!res.ok) throw new Error(`${translationId} metadata 로드 실패`);
  const data: TranslationMeta = await res.json();
  metaCache.set(translationId, data);
  return data;
}

export async function loadBook(translationId: string, bookId: string): Promise<BookData> {
  const key = `${translationId}/${bookId}`;
  if (bookCache.has(key)) return bookCache.get(key)!;
  const res = await fetch(`/bibles/${translationId}/${bookId}.json`);
  if (!res.ok) throw new Error(`${key} 로드 실패`);
  const data: BookData = await res.json();
  bookCache.set(key, data);
  return data;
}
