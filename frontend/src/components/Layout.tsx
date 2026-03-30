import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore'; // Adjust if your store name is different
import { LayoutDashboard, Folder, MessageSquare, Activity, Sun, Moon, LogOut } from 'lucide-react';

export default function Layout() {
  const { user, logout, theme, toggleTheme } = useAuthStore();
  const location = useLocation();

  // Ensure dark mode class is applied to HTML element based on store
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: Folder },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Logs', path: '/logs', icon: Activity },
  ];

  return (
    <div className="flex h-screen w-full bg-apple-lightBg dark:bg-apple-darkBg overflow-hidden transition-colors duration-200">
      
      {/* Sidebar - Pure Solid Colors */}
      <aside className="w-64 h-full bg-apple-lightCard dark:bg-apple-darkCard border-r border-gray-200 dark:border-[#2C2C2E] flex flex-col justify-between p-4 transition-colors duration-200">
        
        <div>
          {/* Brand Header */}
          <div className="mb-8 px-2 mt-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Local RAG</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Secure workspace shell</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-black text-white dark:bg-white dark:text-black' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#2C2C2E]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-400 dark:text-gray-500'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User & Settings Footer */}
        <div className="space-y-4">
          {/* User Profile Mock */}
          <div className="p-3 bg-gray-50 dark:bg-[#000000] rounded-xl border border-gray-100 dark:border-[#2C2C2E]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-apple-primary text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role || 'Guest'}</p>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-[#000000] dark:hover:bg-[#2C2C2E] border border-gray-100 dark:border-[#2C2C2E] transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Theme</span>
            </div>
            <div className="w-8 h-4 bg-gray-300 dark:bg-[#3A3A3C] rounded-full relative">
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-4.5 right-0.5 bg-apple-primary' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}