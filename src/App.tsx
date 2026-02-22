import { useEffect } from 'react';
import { useBibleStore } from './store/bibleStore';
import Header from './components/Header/Header';
import BibleReader from './components/BibleReader/BibleReader';

export default function App() {
  const init = useBibleStore((s) => s.init);
  const darkMode = useBibleStore((s) => s.darkMode);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className={`h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${darkMode ? 'dark' : ''}`}>
      <Header />
      <BibleReader />
    </div>
  );
}
