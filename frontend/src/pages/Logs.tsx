import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, ShieldAlert, User } from 'lucide-react';

export default function Logs() {
  const rows = [
    { time: '2026-03-29 09:42', user: 'Aarav Mehta', action: 'Viewed founder audit panel', status: 'Allowed' },
    { time: '2026-03-29 09:18', user: 'Nina Kapoor', action: 'Uploaded Hiring_Policy_2026.pdf', status: 'Success' },
    { time: '2026-03-29 08:51', user: 'Dev Shah', action: 'Requested project export', status: 'Pending' },
    { time: '2026-03-29 08:14', user: 'Sara Ali', action: 'Opened employee directory', status: 'Allowed' },
    { time: '2026-03-29 07:58', user: 'Riya Sen', action: 'Attempted notes access', status: 'Blocked' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">System Audit Logs</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            A founder-only view into access events, uploads, and restricted actions.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] px-4 py-2 text-sm text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur-md">
          <ShieldAlert className="w-4 h-4" />
          Protected visibility
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="grid grid-cols-[1.2fr_1fr_2fr_0.9fr] gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#2C2C2E]">
          <span>Timestamp</span>
          <span>User</span>
          <span>Action</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-[#2C2C2E]">
          {rows.map((row, index) => (
            <motion.div
              key={`${row.time}-${row.user}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-[1.2fr_1fr_2fr_0.9fr] gap-4 px-6 py-5 text-sm items-center hover:bg-[#F9F9FB] dark:hover:bg-[#161618] transition-colors"
            >
              <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock3 className="w-4 h-4" />
                {row.time}
              </div>
              <div className="inline-flex items-center gap-2 text-gray-900 dark:text-white">
                <User className="w-4 h-4" />
                {row.user}
              </div>
              <span className="text-gray-600 dark:text-gray-300">{row.action}</span>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  row.status === 'Blocked'
                    ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                    : row.status === 'Pending'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {row.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
