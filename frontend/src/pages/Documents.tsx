import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileArchive, FileText, FolderOpen, Plus, Search, Trash2, 
  UploadCloud, Folder, ChevronLeft, StickyNote, ExternalLink, RefreshCw 
} from 'lucide-react';

import FolderTree from '../components/FolderTree';
import type { FolderNode } from '../components/FolderTree';
import api from '../utils/api';

interface DocumentItem {
  id: number;
  title: string;
  file: string;
  file_url: string;
  created_at: string;
  chunk_count: number;
  folder: number | null;
}

interface NoteItem {
  id: number;
  title: string;
  content: string;
  folder: number | null;
  updated_at: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

      const [docRes, folderRes, noteRes] = await Promise.all([
        api.get('/documents/', config),
        api.get('/folders/tree/', config),
        api.get('/notes/', config)
      ]);
      
      setDocuments(Array.isArray(docRes.data) ? docRes.data : docRes.data.results ?? []);
      setFolders(folderRes.data);
      setNotes(Array.isArray(noteRes.data) ? noteRes.data : noteRes.data.results ?? []);
      setError(null);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError('Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  // --- Explorer Navigation ---
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

  const displayFolders = folders.filter(f => 
    (currentFolderId ? f.parent === currentFolderId : !f.parent) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayDocuments = documents.filter(doc => 
    doc.folder === currentFolderId && 
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const displayNotes = notes.filter(note => 
    note.folder === currentFolderId &&
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  // --- Actions ---
  const handleCreateFolder = async () => {
    console.log("🔘 Create Folder button clicked!"); // Check F12 console for this
    
    if (!newFolderName.trim()) {
      alert("Please enter a folder name first.");
      return;
    }

    try {
      const token = localStorage.getItem('access');
      const payload: any = { name: newFolderName.trim() };
      
      if (currentFolderId) {
        payload.parent = currentFolderId;
      }

      const response = await api.post('/folders/', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      console.log("✅ Folder created:", response.data);
      setNewFolderName('');
      await fetchData();
      
    } catch (err: any) {
      console.error("❌ Folder Creation Failed:", err);
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const token = localStorage.getItem('access');
      const formData = new FormData();
      formData.append('title', file.name);
      formData.append('file', file);
      if (currentFolderId) formData.append('folder', String(currentFolderId));

      setUploading(true);
      await api.post('/documents/upload/', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
    } catch (err) {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${id}/`);
      await fetchData();
    } catch (err) {
      setError("Delete failed.");
    }
  };

  const handleOpenFile = (url: string) => window.open(url, '_blank');
  
  const handleOpenNoteAsText = (note: NoteItem) => {
    const blob = new Blob([note.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6 xl:grid-cols-[280px_1fr]">
      {/* SIDEBAR */}
      <div className="space-y-4 rounded-[30px] border border-gray-200 bg-white p-4 dark:border-[#2C2C2E] dark:bg-[#1C1C1E] shadow-sm">
        <div className="flex items-center justify-between">
           <h1 className="text-xl font-bold dark:text-white">Workspace</h1>
           <button onClick={() => void fetchData()} className="p-1 hover:rotate-180 transition-transform duration-500">
             <RefreshCw className="h-4 w-4 text-gray-400" />
           </button>
        </div>

        <div className="grid gap-2">
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder..."
            className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm outline-none dark:border-[#2C2C2E] dark:bg-black dark:text-white"
          />
          <button 
            type="button" 
            onClick={() => void handleCreateFolder()} 
            className="flex items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-[10px] font-bold uppercase text-white hover:bg-gray-800 dark:bg-white dark:text-black"
          >
            <Plus className="h-3 w-3" /> Create Folder
          </button>
        </div>

        <FolderTree 
          folders={folders} 
          selectedFolderIds={[currentFolderId || 0]} 
          onToggleFolder={(id) => setCurrentFolderId(id)} 
        />
      </div>

      {/* EXPLORER GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-blue-500">
              <FolderOpen className="h-3 w-3" /> / {currentFolder?.name || 'root'}
            </div>
            <h1 className="text-3xl font-bold dark:text-white">Directory Explorer</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
               <Search className="h-4 w-4 text-gray-400" />
               <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm outline-none dark:text-white" />
             </div>
             <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-black px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-black">
               <UploadCloud className="h-4 w-4" /> {uploading ? '...' : 'Upload'}
               <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && void handleUpload(e.target.files[0])} />
             </label>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <div className="min-h-[550px] rounded-[30px] border border-gray-200 bg-white p-6 dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
          {currentFolderId && (
            <button onClick={() => setCurrentFolderId(currentFolder?.parent || null)} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black dark:hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent dark:border-white" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayFolders.map(f => (
                <div key={f.id} onDoubleClick={() => setCurrentFolderId(f.id)} className="group flex cursor-pointer flex-col items-center gap-2 rounded-3xl p-4 transition hover:bg-gray-50 dark:hover:bg-[#2A2A2C]">
                  <Folder className="h-20 w-20 text-yellow-500 fill-yellow-500/10" />
                  <p className="w-full truncate text-center text-xs font-bold dark:text-white">{f.name}</p>
                </div>
              ))}

              {displayDocuments.map(doc => (
                <div key={doc.id} onClick={() => handleOpenFile(doc.file_url)} className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-3xl p-4 transition hover:bg-gray-50 dark:hover:bg-[#2A2A2C]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-black">
                    {doc.title.endsWith('.pdf') ? <FileArchive className="h-10 w-10 text-red-500" /> : <FileText className="h-10 w-10 text-blue-500" />}
                  </div>
                  <p className="w-full truncate text-center text-[11px] font-medium dark:text-gray-300">{doc.title}</p>
                  <button onClick={(e) => { e.stopPropagation(); void handleDeleteDoc(doc.id); }} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}

              {displayNotes.map(note => (
                <div key={note.id} onClick={() => handleOpenNoteAsText(note)} className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-3xl p-4 transition hover:bg-gray-50 dark:hover:bg-[#2A2A2C]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-black">
                    <StickyNote className="h-10 w-10 text-green-500" />
                  </div>
                  <p className="w-full truncate text-center text-[11px] font-medium dark:text-gray-300">{note.title}.txt</p>
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-400"><ExternalLink className="h-3 w-3" /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}