import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/rbac';
import { Settings2, Check } from 'lucide-react';

export default function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, switchRole } = useAuthStore();

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-2 w-48 mb-2"
          >
            <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Dev Tool: Switch Role</p>
            <div className="space-y-1">
              {Object.values(ROLES).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    switchRole(role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    user.role === role ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {role}
                  {user.role === role && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
      >
        <Settings2 className="w-5 h-5" />
      </button>
    </div>
  );
}