import { motion } from 'framer-motion';
import { CalendarClock, FolderKanban, MoreHorizontal } from 'lucide-react';

export default function Projects() {
  const projects = [
    { name: 'Project Aurora', progress: 82, owner: 'Nina Kapoor', updated: '2 hours ago' },
    { name: 'Phoenix Migration', progress: 64, owner: 'Dev Shah', updated: 'Yesterday' },
    { name: 'Internal Knowledge Base', progress: 91, owner: 'Aarav Mehta', updated: '6 minutes ago' },
    { name: 'Onboarding Rewrite', progress: 47, owner: 'Sara Ali', updated: '3 days ago' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Project Workspaces</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Shared timelines, owners, and progress across protected workspaces.</p>
      </div>

      <div className="space-y-4">
        {projects.map((project, index) => (
          <motion.div
            key={project.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            className="rounded-[28px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-[#2A2A2C] border border-gray-200 dark:border-[#2C2C2E] flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{project.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Owner: {project.owner}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-4 h-4" />
                      {project.updated}
                    </span>
                  </div>
                </div>
              </div>

              <button className="self-start md:self-center w-10 h-10 rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-[#F9F9FB] dark:bg-[#161618] flex items-center justify-center text-gray-600 dark:text-gray-300">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>Completion</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 dark:bg-[#2A2A2C] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.8, delay: 0.15 + index * 0.08 }}
                  className="h-full rounded-full bg-black dark:bg-white"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
