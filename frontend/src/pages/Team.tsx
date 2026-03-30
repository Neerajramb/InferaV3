import { motion } from 'framer-motion';
import { BadgeCheck, Circle, Shield, User, Users } from 'lucide-react';

export default function Team() {
  const members = [
    { name: 'Aarav Mehta', role: 'Founder', status: 'Online' },
    { name: 'Nina Kapoor', role: 'HR Lead', status: 'Online' },
    { name: 'Dev Shah', role: 'Product Manager', status: 'Offline' },
    { name: 'Riya Sen', role: 'Employee', status: 'Online' },
    { name: 'Kabir Nair', role: 'Employee', status: 'Offline' },
    { name: 'Sara Ali', role: 'HR Specialist', status: 'Online' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Team Management
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Founder and HR visibility across people, access, and status.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] px-4 py-2 text-sm text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur-md">
          <Users className="w-4 h-4" />
          6 active profiles
        </div>
      </div>

      {/* CARDS */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        {members.map((member) => (
          <motion.div
            key={member.name}
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            className="rounded-[28px] border border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            {/* TOP */}
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-[20px] bg-[#F5F5F7] dark:bg-[#2A2A2C] border border-gray-200 dark:border-[#2C2C2E] flex items-center justify-center">
                <User className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  member.status === 'Online'
                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-[#2A2A2C] dark:text-gray-400'
                }`}
              >
                <Circle className="w-3 h-3 fill-current" />
                {member.status}
              </div>
            </div>

            {/* INFO */}
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {member.name}
              </h3>

              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                {member.role}
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-gray-200 dark:border-[#2C2C2E] bg-[#F9F9FB] dark:bg-[#161618] px-4 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Security clearance
              </span>

              <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                <BadgeCheck className="w-4 h-4" />
                Verified
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}