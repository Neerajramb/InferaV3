import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, SendHorizonal } from 'lucide-react';
import FolderTree from "../components/FolderTree";
import api from '../utils/api';
import MessageBubble from './MessageBubble';
import type { FolderNode } from './FolderTree';
import type { SourceItem } from './SourceList';

interface ChatSession {
  id: number;
  title: string;
  project: number | null;
  project_name?: string | null;
  selected_folder_ids: number[];
  selected_document_ids: number[];
  selected_note_ids: number[];
  messages: ChatMessage[];
  updated_at: string;
}

interface ChatMessage {
  id?: number;
  role: 'user' | 'ai';
  text: string;
  sources?: SourceItem[];
  timestamp?: string;
}

interface OptionItem {
  id: number;
  title: string;
}

interface ChatWindowProps {
  folders: FolderNode[];
  documents: OptionItem[];
  notes: OptionItem[];
  projects: OptionItem[];
}

export default function ChatWindow({ folders, documents, notes, projects }: ChatWindowProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('Thinking');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get('/chat/sessions/');
        const payload = Array.isArray(response.data) ? response.data : response.data.results ?? [];
        setSessions(payload);
        if (payload.length) {
          const firstSession = payload[0] as ChatSession;
          setActiveSessionId(firstSession.id);
          setSelectedProjectId(firstSession.project ?? '');
          setSelectedFolderIds(firstSession.selected_folder_ids ?? []);
          setSelectedDocumentIds(firstSession.selected_document_ids ?? []);
          setSelectedNoteIds(firstSession.selected_note_ids ?? []);
        }
      } catch (requestError) {
        console.error(requestError);
        setError('Unable to load chat sessions right now.');
      }
    };

    void fetchSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, loading]);

  useEffect(() => {
    if (!loading) return;
    const steps = ['Thinking', 'Thinking.', 'Thinking..', 'Thinking...'];
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % steps.length;
      setThinkingText(steps[index]);
    }, 350);
    return () => window.clearInterval(interval);
  }, [loading]);

  const syncFiltersFromSession = (session: ChatSession) => {
    setSelectedProjectId(session.project ?? '');
    setSelectedFolderIds(session.selected_folder_ids ?? []);
    setSelectedDocumentIds(session.selected_document_ids ?? []);
    setSelectedNoteIds(session.selected_note_ids ?? []);
  };

  const handleSessionClick = (session: ChatSession) => {
    setActiveSessionId(session.id);
    syncFiltersFromSession(session);
    setError(null);
  };

  const toggleSelection = (items: number[], setter: (value: number[]) => void, id: number) => {
    setter(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const optimisticMessage: ChatMessage = { role: 'user', text: trimmed };
    setInput('');
    setError(null);
    setLoading(true);

    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, optimisticMessage] }
            : session,
        ),
      );
    }

    try {
      const response = await api.post('/chat/', {
        query: trimmed,
        session_id: activeSessionId ?? undefined,
        project_id: selectedProjectId || undefined,
        folder_ids: selectedFolderIds,
        document_ids: selectedDocumentIds,
        note_ids: selectedNoteIds,
      });

      const aiMessage: ChatMessage = {
        id: response.data.id,
        role: 'ai',
        text: response.data.response || 'No response returned by the assistant.',
        sources: response.data.sources ?? [],
      };

      if (activeSessionId) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  title: session.title === 'New Chat' ? trimmed.slice(0, 80) : session.title,
                  messages: [...session.messages, aiMessage],
                  updated_at: new Date().toISOString(),
                }
              : session,
          ),
        );
      } else {
        const sessionsResponse = await api.get('/chat/sessions/');
        const payload = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : sessionsResponse.data.results ?? [];
        setSessions(payload);
        if (response.data.session_id) setActiveSessionId(response.data.session_id);
      }
    } catch (requestError) {
      setError('Unable to get an answer right now.');
      if (activeSessionId) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? { ...session, messages: session.messages.slice(0, -1) }
              : session,
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const response = await api.post('/chat/sessions/', {
        title: 'New Chat',
        project: selectedProjectId || null,
        selected_folder_ids: selectedFolderIds,
        selected_document_ids: selectedDocumentIds,
        selected_note_ids: selectedNoteIds,
      });
      const session = response.data as ChatSession;
      session.messages = session.messages ?? [];
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      syncFiltersFromSession(session);
    } catch (requestError) {
      setError('Unable to create a new chat session.');
    }
  };

  const conversation = activeSession?.messages ?? [];

  return (
    /* 🔥 FIT-TO-PAGE FIX:
       1. h-[calc(100vh-140px)] ensures the whole grid fits in the viewport.
       2. min-h-0 on the container and children allows them to shrink to fit.
    */
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[300px_1fr_280px] min-h-0 overflow-hidden">
      
      {/* SIDEBAR: CHATS */}
      <div className="flex flex-col rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E] min-h-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">Chats</h2>
            <p className="text-sm text-gray-500">Persisted per user</p>
          </div>
          <button
            onClick={() => void handleNewSession()}
            className="rounded-full bg-black px-3 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
          >
            New Chat
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                session.id === activeSessionId
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-gray-50 hover:bg-white dark:border-[#2C2C2E] dark:bg-black dark:text-gray-200'
              }`}
            >
              <p className="truncate text-sm font-medium">{session.title}</p>
              <p className="mt-1 text-xs opacity-75">{new Date(session.updated_at).toLocaleTimeString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: CHAT WINDOW */}
      <div className="flex flex-col rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E] min-h-0">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-[#2C2C2E] flex-shrink-0">
          <h1 className="text-2xl font-semibold dark:text-white">AI Workspace Chat</h1>
          <p className="text-sm text-gray-500">Ask across documents and project context.</p>
        </div>

        {/* MESSAGES - This area takes up the remaining height and scrolls */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 min-h-0 scroll-smooth">
          {conversation.length ? (
            conversation.map((message, index) => (
              <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <MessageBubble role={message.role} text={message.text} sources={message.sources} />
              </motion.div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-center text-gray-400">
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">Start a conversation</p>
                <p className="text-sm">Choose filters on the right to begin.</p>
              </div>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {thinkingText}
            </div>
          )}
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* INPUT BAR - Fixed to the bottom of the container */}
        <div className="border-t border-gray-200 p-4 dark:border-[#2C2C2E] flex-shrink-0">
          <div className="flex items-center gap-3 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#2C2C2E] dark:bg-black">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
              placeholder="Ask about documents..."
              className="flex-1 bg-transparent text-sm outline-none dark:text-white"
            />
            <button
              onClick={() => void handleSend()}
              disabled={loading || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: FILTERS */}
      <div className="flex flex-col rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E] min-h-0">
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-lg font-semibold dark:text-white">Filters</h2>
          <p className="text-sm text-gray-500">Constrain retrieval.</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-500">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:bg-black dark:border-[#2C2C2E] dark:text-white"
            >
              <option value="">All projects</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-500">Folders</label>
            <FolderTree
              folders={folders}
              selectedFolderIds={selectedFolderIds}
              onToggleFolder={(id) => toggleSelection(selectedFolderIds, setSelectedFolderIds, id)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-500">Documents</label>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggleSelection(selectedDocumentIds, setSelectedDocumentIds, doc.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selectedDocumentIds.includes(doc.id)
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-50 dark:bg-black dark:border-[#2C2C2E] dark:text-gray-200'
                  }`}
                >
                  {doc.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-500">Notes</label>
            <div className="space-y-2">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => toggleSelection(selectedNoteIds, setSelectedNoteIds, note.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selectedNoteIds.includes(note.id)
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-gray-50 dark:bg-black dark:border-[#2C2C2E] dark:text-gray-200'
                  }`}
                >
                  {note.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}