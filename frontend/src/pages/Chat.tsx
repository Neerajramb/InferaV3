import { useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import type { FolderNode } from '../components/FolderTree';
import api from '../utils/api';

interface OptionItem {
  id: number;
  title: string;
}

interface ProjectItem {
  id: number;
  name: string;
}

export default function Chat() {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [documents, setDocuments] = useState<OptionItem[]>([]);
  const [notes, setNotes] = useState<OptionItem[]>([]);
  const [projects, setProjects] = useState<OptionItem[]>([]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [folderRes, documentRes, noteRes, projectRes] = await Promise.all([
          api.get('/folders/tree/'),
          api.get('/documents/'),
          api.get('/notes/'),
          api.get('/projects/'),
        ]);

        const documentPayload = Array.isArray(documentRes.data) ? documentRes.data : documentRes.data.results ?? [];
        const notePayload = Array.isArray(noteRes.data) ? noteRes.data : noteRes.data.results ?? [];
        const projectPayload = Array.isArray(projectRes.data) ? projectRes.data : projectRes.data.results ?? [];

        setFolders(folderRes.data);
        setDocuments(documentPayload.map((item: { id: number; title: string }) => ({ id: item.id, title: item.title })));
        setNotes(notePayload.map((item: { id: number; title: string }) => ({ id: item.id, title: item.title })));
        setProjects(projectPayload.map((item: ProjectItem) => ({ id: item.id, title: item.name })));
      } catch (error) {
        console.error(error);
      }
    };

    void loadFilters();
  }, []);

  return (
    /**
     * 🛠️ THE ABSOLUTE LOCKDOWN FIX:
     * We use a relative container with a fixed height.
     * We then use an absolute inner container to force the ChatWindow to occupy 
     * the exact space between the top bar and the bottom of the screen.
     */
    <div className="relative h-[calc(100vh-170px)] w-full overflow-hidden bg-gray-50/30 rounded-3xl border border-gray-100">
      <div className="absolute inset-0 flex flex-col min-h-0">
        <ChatWindow
          folders={folders}
          documents={documents}
          notes={notes}
          projects={projects}
        />
      </div>
      
      {/* Absolute Branding Overlay */}
      <div className="absolute bottom-3 right-8 opacity-40 pointer-events-none select-none">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Infera Intel Engine</p>
      </div>
    </div>
  );
}