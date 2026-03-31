import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, Shield } from 'lucide-react';

import api from '../utils/api';

interface TeamMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  last_seen: string;
  online: boolean;
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await api.get('/team/');
        const payload = Array.isArray(response.data) ? response.data : response.data.results ?? [];
        setMembers(payload);
      } catch (error) {
        console.error(error);
      }
    };

    void loadMembers();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Team</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visibility into roles, presence, and availability across the workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-[#2C2C2E] dark:bg-[#1C1C1E] dark:shadow-none"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {member.first_name || member.last_name ? `${member.first_name} ${member.last_name}`.trim() : member.username}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{member.email || member.username}</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  member.online
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-[#000000] dark:text-gray-400'
                }`}
              >
                <Circle className="h-3 w-3 fill-current" />
                {member.online ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-[#2C2C2E] dark:bg-[#000000]">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Role</p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                <Shield className="h-4 w-4" />
                {member.role}
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Last seen {new Date(member.last_seen).toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
