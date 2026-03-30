import { motion } from 'framer-motion';
import { Circle, MessageSquare, Paperclip, Search, SendHorizonal } from 'lucide-react';

export default function Messaging() {
  const contacts = [
    { name: 'Nina Kapoor', role: 'HR Lead', status: 'Online' },
    { name: 'Dev Shah', role: 'Product Manager', status: 'Typing…' },
    { name: 'Sara Ali', role: 'HR Specialist', status: 'Away' },
    { name: 'Aarav Mehta', role: 'Founder', status: 'Offline' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Real-time Messaging</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">A polished split layout for people, presence, and conversation.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-[30px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-[#F9F9FB] dark:bg-[#161618] px-4 py-3 mb-5">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Search people</span>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.name}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`rounded-2xl border px-4 py-3 ${
                  index === 1
                    ? 'border-gray-900 dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-gray-200 dark:border-[#2C2C2E] bg-[#F9F9FB] dark:bg-[#161618]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className={`text-sm ${index === 1 ? 'text-white/70 dark:text-black/70' : 'text-gray-500 dark:text-gray-400'}`}>
                      {contact.role}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs">
                    <Circle className="w-3 h-3 fill-current" />
                    {contact.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md flex flex-col min-h-[640px]">
          <div className="border-b border-gray-200 dark:border-[#2C2C2E] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-[#2A2A2C] border border-gray-200 dark:border-[#2C2C2E] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Dev Shah</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Typing a secure update…</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F7] dark:bg-[#2A2A2C] border border-gray-200 dark:border-[#2C2C2E] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-gray-900 dark:text-white">Select a conversation</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md">
                Start a secure conversation, share notes, or send project documents from the protected workspace.
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200 dark:border-[#2C2C2E]">
            <div className="rounded-[24px] border border-gray-200 dark:border-[#2C2C2E] bg-[#F9F9FB] dark:bg-[#161618] px-4 py-3 flex items-center gap-3">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">Write a message</span>
              <button className="w-10 h-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                <SendHorizonal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
