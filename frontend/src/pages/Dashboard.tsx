import { useEffect, useState } from "react";
import api from "../utils/api";
import { motion } from "framer-motion";
import {
  FolderKanban,
  FileText,
  Users,
  Sparkles,
} from "lucide-react";

interface DashboardStats {
  projects: number;
  documents: number;
  team: number;
  queries: number;
}

interface DashboardResponse {
  username: string;
  role: string;
  stats: DashboardStats;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/auth/dashboard/");
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    {
      title: "Projects",
      value: data?.stats?.projects || 0,
      icon: FolderKanban,
    },
    {
      title: "Documents",
      value: data?.stats?.documents || 0,
      icon: FileText,
    },
    {
      title: "Team",
      value: data?.stats?.team || 0,
      icon: Users,
    },
    {
      title: "Queries",
      value: data?.stats?.queries || 0,
      icon: Sparkles,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, {data?.username}
        </h1>
        <p className="text-gray-500">
          Role: {data?.role}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              whileHover={{ scale: 1.03 }}
              className="rounded-2xl bg-white dark:bg-[#1C1C1E] p-5 shadow-md border border-gray-200 dark:border-[#2C2C2E]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>

              <h2 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {stat.value}
              </h2>
            </motion.div>
          );
        })}
      </div>

      {/* ACTIVITY MOCK (UI ONLY) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] p-5 border border-gray-200 dark:border-[#2C2C2E]">
          <h3 className="font-semibold text-lg mb-3">
            Activity Feed
          </h3>
          <p className="text-gray-500 text-sm">
            Compliance handbooks re-indexed • 12 min ago
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] p-5 border border-gray-200 dark:border-[#2C2C2E]">
          <h3 className="font-semibold text-lg mb-3">
            Recent Documents
          </h3>
          <p className="text-gray-500 text-sm">
            Hiring_Policy_2026.pdf
          </p>
        </div>
      </div>
    </motion.div>
  );
}
