import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import api from '../utils/api';

interface LogEntry {
  id: number;
  action: string;
  username: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const response = await api.get('/logs/');
        const payload = Array.isArray(response.data) ? response.data : response.data.results ?? [];
        setLogs(payload);
      } catch (error) {
        console.error(error);
      }
    };

    void loadLogs();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Founder-only visibility into auth, uploads, chat queries, and collaboration events.
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:shadow-none">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_2fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-[#2C2C2E] dark:bg-[#000000] dark:text-gray-400">
          <span>Timestamp</span>
          <span>User</span>
          <span>Action</span>
          <span>Metadata</span>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-[#2C2C2E]">
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[1.2fr_1fr_1fr_2fr] gap-4 px-5 py-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
              <span className="text-gray-900 dark:text-white">{log.username || 'System'}</span>
              <span className="text-gray-900 dark:text-white">{log.action}</span>
              <span className="truncate text-gray-500 dark:text-gray-400">{JSON.stringify(log.metadata)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
