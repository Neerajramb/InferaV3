import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import RoleSwitcher from '../components/RoleSwitcher';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-apple-bg overflow-hidden">
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