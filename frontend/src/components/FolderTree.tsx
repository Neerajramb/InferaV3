import { ChevronDown, ChevronRight, FileText, Folder, StickyNote, Edit2, Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';

export interface FolderNode {
  id: number;
  name: string;
  parent: number | null;
  project: number | null;
  created_at: string;
  documents_count: number;
  notes_count: number;
  children: FolderNode[];
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderIds: number[];
  onToggleFolder: (folderId: number) => void;
  onRenameFolder?: (folderId: number, newName: string) => Promise<void> | void;
  onDeleteFolder?: (folderId: number) => Promise<void> | void;
}

interface FolderBranchProps {
  node: FolderNode;
  selectedFolderIds: number[];
  onToggleFolder: (folderId: number) => void;
  onRenameFolder?: (folderId: number, newName: string) => Promise<void> | void;
  onDeleteFolder?: (folderId: number) => Promise<void> | void;
}

function FolderBranch({ node, selectedFolderIds, onToggleFolder, onRenameFolder, onDeleteFolder }: FolderBranchProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const selected = selectedFolderIds.includes(node.id);

  const handleSaveRename = async () => {
    if (editName.trim() && editName !== node.name && onRenameFolder) {
      await onRenameFolder(node.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleSaveRename();
    if (e.key === 'Escape') {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-2">
      {isEditing ? (
        <div className="flex w-full items-center justify-between rounded-2xl border border-black bg-white px-3 py-2 dark:border-white dark:bg-[#1C1C1E]">
          <div className="flex flex-1 items-center gap-2 pr-2">
            <Folder className="h-4 w-4 text-gray-400" />
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm font-medium outline-none text-black dark:text-white"
            />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => void handleSaveRename()} className="rounded-lg p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30">
              <Check className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                setEditName(node.name);
                setIsEditing(false);
              }} 
              className="rounded-lg p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`group flex w-full items-center justify-between rounded-2xl border px-3 py-2 transition ${
            selected
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:text-gray-200 dark:hover:bg-[#2C2C2E]'
          }`}
        >
          <div 
            className="flex flex-1 cursor-pointer min-w-0 items-center gap-2"
            onClick={() => onToggleFolder(node.id)}
          >
            <span
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
                selected ? 'hover:bg-white/20 dark:hover:bg-black/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {node.children.length ? (
                expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
            </span>
            <span className="truncate text-sm font-medium">{node.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs ${selected ? 'opacity-90' : 'opacity-60'}`}>
              <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{node.documents_count}</span>
              <span className="inline-flex items-center gap-1"><StickyNote className="h-3 w-3" />{node.notes_count}</span>
            </div>
            
            {/* Action Buttons (Visible on Hover) */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onRenameFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={`rounded-lg p-1.5 transition ${
                    selected ? 'hover:bg-white/20 dark:hover:bg-black/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title="Rename folder"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDeleteFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteFolder(node.id);
                  }}
                  className={`rounded-lg p-1.5 transition ${
                    selected ? 'text-red-300 hover:bg-white/20 dark:text-red-600 dark:hover:bg-black/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                  title="Delete folder"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {expanded && node.children.length ? (
        <div className="ml-4 space-y-2 border-l border-gray-200 pl-4 dark:border-[#2C2C2E]">
          {node.children.map((child) => (
            <FolderBranch 
              key={child.id} 
              node={child} 
              selectedFolderIds={selectedFolderIds} 
              onToggleFolder={onToggleFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function FolderTree({ folders, selectedFolderIds, onToggleFolder, onRenameFolder, onDeleteFolder }: FolderTreeProps) {
  if (!folders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-center text-gray-500 dark:border-[#2C2C2E] dark:text-gray-400">
        No folders yet. Create one above!
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
      {folders.map((folder) => (
        <FolderBranch 
          key={folder.id} 
          node={folder} 
          selectedFolderIds={selectedFolderIds} 
          onToggleFolder={onToggleFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  );
}