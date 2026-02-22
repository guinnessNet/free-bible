import { useState } from 'react';
import { useBibleStore } from '../../store/bibleStore';
import { useNotes } from '../../hooks/useNotes';

interface Props { onClose: () => void; }

export default function NoteEditor({ onClose }: Props) {
  const { translationId, bookId, chapterIndex, selectedVerses, clearSelection } = useBibleStore();
  const chapter = chapterIndex + 1;
  const { noteMap, save } = useNotes(translationId, bookId, chapter);

  const verse = selectedVerses[0];
  const existing = noteMap.get(verse);
  const [text, setText] = useState(existing?.text ?? '');

  const handleSave = async () => {
    await save(verse, text);
    clearSelection();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-800 dark:text-gray-100">{chapter}:{verse} 메모</span>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400">✕</button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이 구절에 대한 메모를 입력하세요..."
          className="w-full h-36 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium"
          >
            저장
          </button>
          {existing && (
            <button
              onClick={async () => { await save(verse, ''); clearSelection(); onClose(); }}
              className="px-4 bg-red-100 text-red-600 rounded-lg font-medium"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
