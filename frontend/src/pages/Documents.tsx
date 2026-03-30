import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, FileText, FolderOpen, Search, Trash2, UploadCloud } from 'lucide-react';
import api from '../utils/api';

interface DocumentItem {
  id: number;
  title: string;
  file: string;
  file_url: string;
  created_at: string;
  chunk_count: number;
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents/');
      const payload = Array.isArray(response.data) ? response.data : response.data.results ?? [];
      setDocuments(payload);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load documents right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) =>
      document.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [documents, search]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('title', file.name);
    formData.append('file', file);

    try {
      setUploading(true);
      await api.post('/documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchDocuments();
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again with a PDF, TXT, or DOCX file.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await api.delete(`/documents/${documentId}/`);
      setDocuments((prev) => prev.filter((document) => document.id !== documentId));
    } catch (err) {
      console.error(err);
      setError('Delete failed. Please try again.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Documents Repository</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Upload secure files, index them for RAG, and manage your workspace library.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black">
            <UploadCloud className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Document'}
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] px-4 py-3 shadow-sm backdrop-blur-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search filenames"
              className="bg-transparent text-sm text-gray-500 outline-none placeholder:text-gray-400 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-[30px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-5 shadow-sm dark:shadow-none backdrop-blur-md">
        <div className="mb-5 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <FolderOpen className="w-4 h-4" />
          Indexed Documents
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 dark:border-[#2C2C2E] bg-gray-50 dark:bg-[#161618] text-center">
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="mt-4 text-base font-medium text-gray-900 dark:text-white">No documents uploaded yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload a PDF, TXT, or DOCX file to start the RAG pipeline.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document, index) => {
              const extension = document.title.split('.').pop()?.toLowerCase() ?? '';
              const isPdf = extension === 'pdf';

              return (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[24px] border border-gray-200 dark:border-[#2C2C2E] bg-gray-50 dark:bg-[#161618] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2A2A2C]">
                        {isPdf ? (
                          <FileArchive className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">{document.title}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(document.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDelete(document.id)}
                      className="rounded-xl border border-gray-200 dark:border-[#2C2C2E] bg-white px-3 py-2 text-gray-500 transition hover:bg-gray-100 dark:bg-[#1C1C1E] dark:text-gray-300 dark:hover:bg-[#2C2C2E]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] px-3 py-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Indexed chunks</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{document.chunk_count}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
