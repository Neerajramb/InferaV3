import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RoleSwitcher from '../components/RoleSwitcher';
import { useAuthStore } from '../store/authStore';

export default function MainLayout() {
  const { theme } = useAuthStore();

  // Ensure dark mode class is applied immediately on load
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  return (
    <div className="flex h-screen w-full bg-apple-bg dark:bg-black overflow-hidden transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
      <RoleSwitcher />
    </div>
  );
}
