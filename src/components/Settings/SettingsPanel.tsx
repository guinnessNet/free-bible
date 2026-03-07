import { useBibleStore } from '../../store/bibleStore';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { db } from '../../services/db';

interface Props {
  onClose: () => void;
  onOpenSaved: () => void;
}

const FONT_OPTIONS: { value: 'sm' | 'base' | 'lg' | 'xl'; label: string }[] = [
  { value: 'sm',   label: '작게' },
  { value: 'base', label: '보통' },
  { value: 'lg',   label: '크게' },
  { value: 'xl',   label: '매우 크게' },
];

const TTS_RATES: { value: number; label: string }[] = [
  { value: 0.5,  label: '아주\n느리게' },
  { value: 0.75, label: '느리게' },
  { value: 1.0,  label: '보통' },
  { value: 1.25, label: '빠르게' },
  { value: 1.5,  label: '아주\n빠르게' },
];

export default function SettingsPanel({ onClose, onOpenSaved }: Props) {
  const {
    darkMode, toggleDarkMode,
    translations, translationId, favoriteTranslations, setFavoriteTranslations,
    fontSize, setFontSize,
    ttsRate, setTtsRate,
    compareTranslationId, setCompareTranslation,
    currentMeta,
  } = useBibleStore();

  const { totalRead } = useReadingProgress(translationId);
  const totalChapters = currentMeta
    ? currentMeta.books.reduce((sum: number, b: { chapters: number }) => sum + b.chapters, 0)
    : 1189;

  const toggleFav = (id: string) => {
    const next = favoriteTranslations.includes(id)
      ? favoriteTranslations.filter((f) => f !== id)
      : [...favoriteTranslations, id];
    setFavoriteTranslations(next);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex flex-col" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-auto rounded-t-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="font-semibold dark:text-white">설정</span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 pb-8">
          {/* 저장된 항목 */}
          <section className="px-4 pt-5 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">저장 항목</h3>
            <button
              onClick={() => { onClose(); onOpenSaved(); }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-xl"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">🖊 형광펜 보기</span>
              <span className="text-gray-400">›</span>
            </button>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 통독 현황 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">통독 현황</h3>
            <div className="px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {totalRead} / {totalChapters}장 완료
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${totalChapters > 0 ? (totalRead / totalChapters) * 100 : 0}%` }}
                />
              </div>
              {totalRead > 0 && (
                <button
                  onClick={() => db.readingRecords.where('translationId').equals(translationId).delete()}
                  className="mt-2 text-xs text-gray-400 underline"
                >
                  읽기 기록 초기화
                </button>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 화면 설정 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">화면</h3>

            {/* 다크 모드 토글 */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">다크 모드</p>
                <p className="text-xs text-gray-400 mt-0.5">어두운 배경으로 전환</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={[
                  'relative w-12 h-6 shrink-0 rounded-full transition-colors duration-200',
                  darkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-500',
                ].join(' ')}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={[
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    darkMode ? 'translate-x-[22px]' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 폰트 크기 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">폰트 크기</h3>
            <div className="flex gap-2">
              {FONT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFontSize(value)}
                  className={[
                    'flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                    fontSize === value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* TTS 속도 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">TTS 속도</h3>
            <div className="flex gap-2">
              {TTS_RATES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTtsRate(value)}
                  className={[
                    'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-pre-line leading-tight',
                    ttsRate === value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 비교 번역본 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">비교 번역본</h3>
            <p className="text-xs text-gray-400 mb-3">
              구절을 더블클릭하면 비교 번역본으로 전환됩니다
            </p>
            <select
              value={compareTranslationId ?? ''}
              onChange={(e) => setCompareTranslation(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 appearance-none"
            >
              <option value="">사용 안함</option>
              {translations
                .filter((t) => t.id !== translationId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
            </select>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 캐시 초기화 */}
          <section className="px-4 pt-4 pb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">데이터</h3>
            <button
              onClick={async () => {
                if (!confirm('캐시를 초기화하고 새로고침합니다. 계속할까요?')) return;
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((name) => caches.delete(name)));
                const regs = await navigator.serviceWorker?.getRegistrations();
                if (regs) await Promise.all(regs.map((r) => r.unregister()));
                window.location.reload();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-xl"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">캐시 초기화</p>
                <p className="text-xs text-gray-400 mt-0.5">새 번역본이 안 보일 때 사용하세요</p>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            <button
              onClick={async () => {
                if (!confirm('북마크, 형광펜, 메모, 읽기 기록이 모두 삭제됩니다. 계속할까요?')) return;
                await db.delete();
                window.location.reload();
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-700 rounded-xl mt-2"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-red-500">DB 초기화</p>
                <p className="text-xs text-gray-400 mt-0.5">형광펜/북마크 오류 시 사용 (데이터 삭제됨)</p>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </section>

          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />

          {/* 즐겨찾기 번역본 */}
          <section className="px-4 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">즐겨찾기 번역본</h3>
            <p className="text-xs text-gray-400 mb-3">
              선택한 번역본만 번역본 선택 목록에 표시됩니다.
              {favoriteTranslations.length === 0 && ' (현재: 전체 표시)'}
            </p>
            <div className="space-y-2">
              {translations.map((t) => {
                const isFav = favoriteTranslations.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleFav(t.id)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors',
                      isFav
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700',
                    ].join(' ')}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isFav ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400">{t.id} · {t.language.toUpperCase()}</p>
                    </div>
                    <span className={`text-lg ${isFav ? 'text-blue-600' : 'text-gray-300'}`}>
                      {isFav ? '★' : '☆'}
                    </span>
                  </button>
                );
              })}
            </div>
            {favoriteTranslations.length > 0 && (
              <button
                onClick={() => setFavoriteTranslations([])}
                className="mt-3 text-xs text-gray-400 underline"
              >
                즐겨찾기 초기화 (전체 표시)
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
