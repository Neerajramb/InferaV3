import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, Users, UserPlus, Check, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import api from '../utils/api';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Data Retrieval Logic
  const loadData = async () => {
    try {
      const [projRes, teamRes] = await Promise.all([
        api.get('/projects/'),
        api.get('/team/')
      ]);
      // Support for both paginated and raw array responses
      setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data.results ?? []);
      setTeam(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data.results ?? []);
    } catch (err) { 
      console.error("Load Error:", err);
      setError('Failed to establish connection with Local Node.'); 
    }
  };

  useEffect(() => { void loadData(); }, []);

  // 2. Selection Sync: Ensures IDs are unique and numeric
  const toggleUser = (e: React.MouseEvent, userId: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const id = parseInt(userId, 10);
    if (isNaN(id)) return;

    setSelectedUserIds(prev => {
      const isPresent = prev.includes(id);
      const next = isPresent ? prev.filter(i => i !== id) : [...prev, id];
      console.log(`🎯 Selection Sync | User ID: ${id} | Active Set:`, next);
      return next;
    });
  };

  // 3. Project Deployment Logic
  const handleCreate = async () => {
    if (!name.trim()) return setError("Project identifier required.");
    setLoading(true);
    setError(null);
    
    const payload = { 
        name, 
        description, 
        user_ids: selectedUserIds 
    };
    
    console.info("🚀 DEPLOYING PAYLOAD:", payload);

    try {
      await api.post('/projects/', payload);
      setName('');
      setDescription('');
      setSelectedUserIds([]);
      await loadData(); 
    } catch (err: any) {
      setError('Deployment failed: Check for duplicate names or node constraints.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      
      {/* INITIALIZATION PANEL */}
      <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-sm dark:bg-[#1C1C1E] dark:border-[#2C2C2E]">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-8 dark:text-white">Initialize Project</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Project Identifier</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. ALPHA-STRIKE" 
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 font-bold outline-none dark:bg-black dark:border-[#2C2C2E] dark:text-white focus:border-black transition-all" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Mission Objective</label>
            <input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Summary of goals..." 
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 font-bold outline-none dark:bg-black dark:border-[#2C2C2E] dark:text-white focus:border-black transition-all" 
            />
          </div>
        </div>
        
        {/* TEAM ASSIGNMENT SECTION */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Assign Operatives</p>
            <span className="text-[10px] font-black bg-black text-white px-4 py-1 rounded-full dark:bg-white dark:text-black">
                {selectedUserIds.length} OPERATIVES READY
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {team.map(u => {
              const isSelected = selectedUserIds.includes(Number(u.id));
              return (
                <button 
                  key={u.id} 
                  type="button"
                  onClick={(e) => toggleUser(e, u.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-6 py-3 text-xs font-black transition-all duration-200 ${
                    isSelected 
                    ? 'bg-black text-white border-black scale-105 shadow-xl dark:bg-white dark:text-black dark:border-white' 
                    : 'bg-white border-gray-100 text-gray-400 dark:bg-black dark:border-[#2C2C2E] hover:border-gray-300'
                  }`}
                >
                  {isSelected ? <Check size={14} /> : <UserPlus size={14} />}
                  {u.username} <span className="opacity-30">[{u.role}]</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
        
        <button 
          onClick={handleCreate} 
          disabled={loading || !name.trim()}
          className="mt-12 w-full rounded-[24px] bg-black py-6 text-[11px] font-black uppercase tracking-[0.4em] text-white hover:opacity-90 disabled:opacity-20 transition-all dark:bg-white dark:text-black"
        >
          {loading ? 'DEPLOYING TO NODE...' : 'Deploy Workspace'}
        </button>
      </div>

      {/* ACTIVE WORKSPACES LIST */}
      <div className="grid gap-6 xl:grid-cols-2">
        {projects.map(p => (
          <div key={p.id} className="group rounded-[40px] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md dark:bg-[#1C1C1E] dark:border-[#2C2C2E]">
            <div className="flex gap-5 items-center mb-8">
              <div className="p-4 bg-black rounded-2xl shadow-lg dark:bg-white">
                <FolderKanban className="text-white dark:text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">{p.name}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.description || 'No objective defined'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-50 pt-6 dark:border-[#2C2C2E]">
              {/* Ensure members list handles nested user object correctly */}
              {p.members?.map((m: any) => (
                <span 
                  key={m.id} 
                  className={`rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                    m.role === 'owner' 
                      ? 'bg-black text-white dark:bg-white dark:text-black' 
                      : 'bg-gray-100 text-gray-500 dark:bg-black dark:text-gray-400'
                  }`}
                >
                  {m.user?.username || 'Unknown'} {m.role === 'owner' ? '⭐' : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}