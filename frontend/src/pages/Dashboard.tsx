import { useEffect, useState } from "react";
import api from "../utils/api";
import { motion } from "framer-motion";
import {
  FolderKanban,
  FileText,
  Users,
  Sparkles,
  Clock,
  FileSearch
} from "lucide-react";

interface ActivityItem {
  id: number;
  action: string;
  timestamp: string;
}

interface RecentDoc {
  id: number;
  title: string;
  timestamp: string;
}

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
  recent_activities: ActivityItem[];
  recent_documents: RecentDoc[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard/");
        setData(res.data);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
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

  // 🔥 DYNAMIC DASHBOARD BLOCKS
  const userRole = data.role?.toUpperCase() || '';
  const showTeamBlock = ['FOUNDER', 'HR'].includes(userRole);

  const stats = [
    { title: "Projects", value: data.stats?.projects || 0, icon: FolderKanban },
    { title: "Documents", value: data.stats?.documents || 0, icon: FileText },
    // Conditionally render the Team block
    ...(showTeamBlock ? [{ title: "Team", value: data.stats?.team || 0, icon: Users }] : []),
    { title: "Queries", value: data.stats?.queries || 0, icon: Sparkles },
  ];

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "--:--";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 italic uppercase tracking-tight">
            Welcome, {data.username}
          </h1>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
            Role: {data.role}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Infera</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Local Node</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${showTeamBlock ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {stats.map((stat) => (
          <motion.div
            key={stat.title}
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">{stat.title}</p>
              <stat.icon className="w-5 h-5 text-gray-300" />
            </div>
            <h2 className="text-3xl font-bold mt-2 text-gray-900 tracking-tight">{stat.value}</h2>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ACTIVITY FEED */}
        <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Clock size={18} className="text-gray-400" /> Activity Feed
          </h3>
          <div className="space-y-5">
            {data.recent_activities?.length > 0 ? (
              data.recent_activities.map((act) => (
                <div key={act.id} className="flex justify-between items-center group">
                  <span className="text-sm text-gray-600 font-medium group-hover:text-black transition-colors">{act.action}</span>
                  <span className="text-[10px] font-bold text-gray-300 uppercase">{formatTime(act.timestamp)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No recent system activity recorded.</p>
            )}
          </div>
        </div>

        {/* RECENT DOCUMENTS */}
        <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <FileSearch size={18} className="text-gray-400" /> Recent Documents
          </h3>
          <div className="space-y-5">
            {data.recent_documents?.length > 0 ? (
              data.recent_documents.map((doc) => (
                <div key={doc.id} className="flex justify-between items-center group cursor-pointer">
                  <span className="text-sm text-gray-700 font-semibold group-hover:text-blue-600 transition-colors">{doc.title}</span>
                  <span className="text-[10px] font-bold text-gray-300 uppercase">Stored</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">Document library is currently empty.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}