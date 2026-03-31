import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Folder, Plus, Save, StickyNote, Trash2, 
  ExternalLink, FileText, CornerDownRight, X, Check, Edit2
} from 'lucide-react';

import FolderTree from '../components/FolderTree';
import type { FolderNode } from '../components/FolderTree';
import api from '../utils/api';

interface NoteItem {
  id: number;
  title: string;
  content: string;
  folder: number | null;
  project: number | null;
  updated_at: string;
}

export default function Notes() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [noteRes, folderRes] = await Promise.all([
        api.get('/notes/'), 
        api.get('/folders/tree/')
      ]);
      setNotes(Array.isArray(noteRes.data) ? noteRes.data : noteRes.data.results ?? []);
      setFolders(folderRes.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  // --- Explorer Navigation Logic ---
  const findFolder = (nodes: FolderNode[], id: number): FolderNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFolder(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const currentFolder = currentFolderId ? findFolder(folders, currentFolderId) : null;
  
  // Sidebar: Show folders and notes belonging to the currently navigated directory
  const displayFolders = currentFolder ? currentFolder.children : folders.filter(f => !f.parent);
  const displayNotes = notes.filter(n => n.folder === currentFolderId);

  const selectedNote = notes.find((note) => note.id === activeNoteId) ?? null;

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedNote]);

  const handleSave = async () => {
    if (!content.trim()) return;

    const payload = {
      title: title.trim() || content.trim().split('\n')[0].slice(0, 60),
      content,
      folder: currentFolderId, // Automatically saves to the folder you are currently viewing
    };

    try {
      const token = localStorage.getItem('access');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

      if (activeNoteId) {
        await api.put(`/notes/${activeNoteId}/`, payload, config);
      } else {
        await api.post('/notes/', payload, config);
      }
      
      await loadData();
      setActiveNoteId(null);
      setTitle('');
      setContent('');
    } catch (err) {
      setError('Failed to save and index note.');
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${noteId}/`);
      if (activeNoteId === noteId) setActiveNoteId(null);
      await loadData();
    } catch (err) {
      setError('Delete failed.');
    }
  };

  const handleOpenExternal = (note: NoteItem) => {
    const blob = new Blob([note.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // --- Shared Folder Actions (Rename/Delete) ---
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const token = localStorage.getItem('access');
      await api.post('/folders/', { 
        name: newFolderName.trim(),
        parent: currentFolderId 
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setNewFolderName('');
      await loadData();
    } catch (err) { setError('Folder creation failed.'); }
  };

  const handleRenameFolder = async (id: number, name: string) => {
    try {
      await api.patch(`/folders/${id}/`, { name });
      await loadData();
    } catch (err) { setError('Rename failed.'); }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!window.confirm("Delete folder?")) return;
    try {
      await api.delete(`/folders/${id}/`);
      if (currentFolderId === id) setCurrentFolderId(null);
      await loadData();
    } catch (err) { setError('Delete failed.'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 xl:grid-cols-[320px_1fr]">
      {/* SIDEBAR: FILE EXPLORER STYLE */}
      <div className="flex flex-col gap-4">
        <div className="space-y-4 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold dark:text-white">Workspace</h1>
            <button
              onClick={() => { setActiveNoteId(null); setTitle(''); setContent(''); }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Folder Management UI */}
          <div className="grid gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs outline-none dark:border-[#2C2C2E] dark:bg-black dark:text-white"
            />
            <button onClick={handleCreateFolder} className="rounded-xl bg-gray-100 py-2 text-[10px] font-bold uppercase dark:bg-[#2C2C2E] dark:text-gray-300">
              + New Subfolder
            </button>
          </div>

          <hr className="dark:border-[#2C2C2E]" />

          {/* Directory Navigation */}
          <div className="space-y-1">
            {currentFolderId && (
              <button 
                onClick={() => setCurrentFolderId(currentFolder?.parent || null)}
                className="mb-2 flex w-full items-center gap-2 px-2 text-xs font-bold text-blue-500"
              >
                <ChevronLeft className="h-3 w-3" /> Back to {currentFolder?.parent ? 'Parent' : 'Root'}
              </button>
            )}
            
            <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Folders</p>
            {displayFolders.length === 0 && <p className="px-2 py-2 text-[10px] italic text-gray-400">No subfolders</p>}
            {displayFolders.map(f => (
              <div key={f.id} className="group flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[#2A2A2C]">
                <button 
                  onClick={() => setCurrentFolderId(f.id)}
                  className="flex flex-1 items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <Folder className="h-4 w-4 text-yellow-500 fill-yellow-500/20" /> {f.name}
                </button>
                <button onClick={() => handleDeleteFolder(f.id)} className="opacity-0 group-hover:opacity-100 text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <p className="mt-4 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Notes in this folder</p>
            {displayNotes.length === 0 && <p className="px-2 py-2 text-[10px] italic text-gray-400">No notes here</p>}
            {displayNotes.map(n => (
              <button 
                key={n.id} 
                onClick={() => setActiveNoteId(n.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  activeNoteId === n.id 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#2A2A2C]'
                }`}
              >
                <FileText className="h-4 w-4 opacity-70" /> 
                <span className="truncate">{n.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-blue-500">
              <Folder className="h-3 w-3" /> root {currentFolder && `/ ${currentFolder.name}`}
            </div>
            <h2 className="text-2xl font-bold dark:text-white">{activeNoteId ? 'Edit Note' : 'Create New Note'}</h2>
          </div>
          
          <div className="flex gap-2">
            {activeNoteId && (
              <>
                <button onClick={() => handleOpenExternal(selectedNote!)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium dark:border-[#2C2C2E] dark:text-white">
                  <ExternalLink className="h-4 w-4" /> Open
                </button>
                <button onClick={() => handleDelete(activeNoteId)} className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-900/20">
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-black px-6 py-2 text-sm font-bold text-white dark:bg-white dark:text-black">
              <Save className="h-4 w-4" /> {activeNoteId ? 'Update' : 'Save & Index'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20">{error}</div>}

        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title..."
            className="w-full bg-transparent text-xl font-bold outline-none dark:text-white"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note content here. This will be automatically indexed for RAG..."
            className="h-[550px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none dark:text-gray-300"
          />
        </div>
      </div>
    </motion.div>
  );
}