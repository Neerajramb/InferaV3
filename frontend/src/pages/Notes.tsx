import { motion } from 'framer-motion';
import { Pin, StickyNote } from 'lucide-react';

export default function Notes() {
  const notes = [
    { title: 'Hiring sync', body: 'Review backend pairing schedule and share final shortlist with HR before 5 PM.', tone: 'bg-[#FFF4B5] text-[#3A2F00]' },
    { title: 'RAG prompt QA', body: 'Verify top-k retrieval remains stable for policy queries in dark mode demo builds.', tone: 'bg-[#FFE58F] text-[#3A2F00]' },
    { title: 'Founder review', body: 'Keep audit log visibility limited to founder role and confirm navigation labels are final.', tone: 'bg-[#1C1C1E] text-white' },
    { title: 'Docs cleanup', body: 'Archive expired PDFs and keep onboarding folder structure aligned with current permissions.', tone: 'bg-[#2A2A2C] text-white' },
    { title: 'Launch prep', body: 'Record walkthrough of protected routes, team cards, and project progress interactions.', tone: 'bg-[#FFF1A8] text-[#3A2F00]' },
    { title: 'PM follow-up', body: 'Capture sprint blockers from messaging channel and convert them into shared project tasks.', tone: 'bg-[#232326] text-white' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Internal Notes</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Private sticky notes with a tactile, desk-like layout.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {notes.map((note, index) => (
          <motion.div
            key={note.title}
            initial={{ opacity: 0, y: 18, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -1.5 : 1.5 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            className={`min-h-[220px] rounded-[28px] p-5 shadow-[0_16px_35px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] border border-black/5 dark:border-white/5 ${note.tone}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-white/5 flex items-center justify-center backdrop-blur-md">
                <StickyNote className="w-4 h-4" />
              </div>
              <Pin className="w-4 h-4 opacity-70" />
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{note.title}</h3>
            <p className="mt-3 text-sm leading-6 opacity-85">{note.body}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
