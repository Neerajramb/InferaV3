import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, Users, FolderKanban, FileText, 
  StickyNote, MessageSquare, Bot, ListChecks 
} from "lucide-react";

export default function Sidebar() {
  // 1. Retrieve the user role securely from storage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.role?.toUpperCase() || '';

  // 2. Build the menu dynamically based on strict role access
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    
    // 🔥 TEAM TAB: Explicitly visible ONLY to Founder and HR
    ...(['FOUNDER', 'HR'].includes(userRole) ? [{ name: "Team", path: "/team", icon: Users }] : []),
    
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Documents", path: "/documents", icon: FileText },
    { name: "Notes", path: "/notes", icon: StickyNote },
    { name: "Messaging", path: "/messaging", icon: MessageSquare },
    { name: "AI Chat", path: "/chat", icon: Bot },
    
    // 🔥 LOGS TAB: Explicitly visible ONLY to Founder
    ...(userRole === 'FOUNDER' ? [{ name: "Logs", path: "/logs", icon: ListChecks }] : []),
  ];

  return (
    <div className="w-64 h-screen flex flex-col bg-white border-r border-gray-100">
      <div className="p-6 border-b border-gray-50">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-black">
          Infera
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                isActive
                  ? "bg-black text-white shadow-lg shadow-black/10"
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            System Live
          </span>
        </div>
      </div>
    </div>
  );
}