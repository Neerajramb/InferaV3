import { FileText, StickyNote } from 'lucide-react';

export interface SourceItem {
  entity_type?: 'document' | 'note' | string;
  document_id?: number | null;
  document_title?: string | null;
  note_id?: number | null;
  note_title?: string | null;
  chunk_index?: number | null;
  score?: number | null;
}

interface SourceListProps {
  sources: SourceItem[];
}

export default function SourceList({ sources }: SourceListProps) {
  if (!sources.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-[#2C2C2E] dark:bg-[#000000]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        Sources
      </p>
      <div className="mt-2 space-y-2">
        {sources.map((source, index) => {
          const isNote = source.entity_type === 'note';
          const label = isNote ? source.note_title : source.document_title;
          const Icon = isNote ? StickyNote : FileText;

          return (
            <div
              key={`${label ?? 'source'}-${source.chunk_index ?? index}`}
              className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 dark:bg-[#1C1C1E]"
            >
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-[#2C2C2E] dark:bg-[#000000]">
                <Icon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {label || 'Indexed Source'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Chunk {source.chunk_index ?? 0}
                  {source.score !== null && source.score !== undefined ? ` - Score ${source.score.toFixed(3)}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
