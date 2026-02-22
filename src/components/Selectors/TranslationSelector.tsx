import { useBibleStore } from '../../store/bibleStore';

interface Props { onClose: () => void; }

export default function TranslationSelector({ onClose }: Props) {
  const {
    translationId, bookId, chapterIndex,
    translations, favoriteTranslations, setLocation,
  } = useBibleStore();

  // 즐겨찾기가 있으면 해당 항목만, 없으면 전체 표시
  const displayed = favoriteTranslations.length > 0
    ? translations.filter((t) => favoriteTranslations.includes(t.id))
    : translations;

  const handleSelect = async (id: string) => {
    if (id !== translationId) {
      await setLocation(id, bookId, chapterIndex);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="font-semibold dark:text-white">번역본 선택</span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-xl leading-none">✕</button>
        </div>

        {favoriteTranslations.length > 0 && (
          <p className="text-[11px] text-gray-400 px-5 pt-2">
            즐겨찾기 {favoriteTranslations.length}개 표시 중 · 설정에서 변경 가능
          </p>
        )}

        <div className="overflow-y-auto flex-1 py-2">
          {displayed.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={[
                'w-full text-left px-5 py-3.5 flex items-center justify-between',
                t.id === translationId
                  ? 'text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              <div>
                <span className="block">{t.name}</span>
                <span className="text-xs text-gray-400">{t.id} · {t.language.toUpperCase()}</span>
              </div>
              {t.id === translationId && <span className="text-blue-700 dark:text-blue-400 text-lg">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
