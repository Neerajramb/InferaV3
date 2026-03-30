import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '../utils/rbac';
import {
  LayoutDashboard,
  Users,
  Folder,
  FileText,
  MessageSquare,
  StickyNote,
  Activity,
  ShieldAlert,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';

export default function Sidebar() {
  const { user, theme, toggleTheme } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: PERMISSIONS.DASHBOARD },
    { name: 'Team', path: '/team', icon: Users, roles: PERMISSIONS.TEAM },
    { name: 'Projects', path: '/projects', icon: Folder, roles: PERMISSIONS.PROJECTS },
    { name: 'Documents', path: '/documents', icon: FileText, roles: PERMISSIONS.DOCUMENTS },
    { name: 'Notes', path: '/notes', icon: StickyNote, roles: PERMISSIONS.NOTES },
    { name: 'Messaging', path: '/messaging', icon: MessageSquare, roles: PERMISSIONS.MESSAGING },

    // ✅ FIXED PATH HERE
    { name: 'AI Chat', path: '/ai-chat', icon: Bot, roles: PERMISSIONS.AI_CHAT },

    { name: 'Logs', path: '/logs', icon: Activity, roles: PERMISSIONS.LOGS },
  ];

  return (
    <aside className="w-64 h-full bg-apple-card/95 dark:bg-apple-darkCard/95 backdrop-blur-md border-r border-gray-200 dark:border-[#2C2C2E] flex flex-col p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-500 ease-in-out">
      
      {/* LOGO */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="p-2.5 bg-black dark:bg-white rounded-2xl shadow-sm">
          <ShieldAlert className="w-5 h-5 text-white dark:text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Secure RAG</h1>
          <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-[0.22em]">
            Local Workspace
          </p>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          if (!user || !item.roles.includes(user.role)) return null;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* THEME BUTTON */}
      <div className="pt-4 border-t border-gray-200 dark:border-[#2C2C2E]">
        <motion.button
          onClick={toggleTheme}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-between px-3 py-3 rounded-2xl bg-[#F9F9FB] dark:bg-[#000000] border border-gray-200 dark:border-[#2C2C2E]"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>Theme</span>
          </div>

          <div className="h-8 w-8 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
        </motion.button>
      </div>

    </aside>
  );
}