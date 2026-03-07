import { useBibleStore } from '../../store/bibleStore';

export default function Toast() {
  const message = useBibleStore((s) => s.toastMessage);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm rounded-full shadow-lg animate-fade-in">
      {message}
    </div>
  );
}
