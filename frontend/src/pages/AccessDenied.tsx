import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertOctagon, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-soft text-center"
      >
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          Your current role (<span className="font-bold text-black">{user?.role}</span>) does not have the required permissions to view this page.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </button>
      </motion.div>
    </div>
  );
}