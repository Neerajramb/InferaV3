import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { SendHorizonal, User, ShieldCheck } from 'lucide-react';
import api from '../utils/api';

export default function Messaging() {
  const [members, setMembers] = useState<any[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const res = await api.get('/team/');
      const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      setMembers(data);
      if (data.length > 0 && !activeMemberId) setActiveMemberId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async () => {
    if (!activeMemberId) return;
    try {
      const res = await api.get(`/messages/?user_id=${activeMemberId}`);
      setMessages(Array.isArray(res.data) ? res.data : res.data.results ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { void loadData(); }, []);

  // 🔥 THE FIX: Polling interval for live chat
  useEffect(() => { 
    if (!activeMemberId) return;
    
    // Initial load when user is selected
    void loadMessages(); 
    
    // Set up silent background check every 3 seconds
    const intervalId = setInterval(() => {
      void loadMessages();
    }, 3000);

    // Clean up interval when you click a different user or leave the page
    return () => clearInterval(intervalId);
  }, [activeMemberId]);
  
  // Auto-scroll to bottom
  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeMemberId) return;
    try {
      await api.post('/messages/', { receiver_id: activeMemberId, content: input });
      setInput('');
      await loadMessages(); // Fetch immediately so sender sees it instantly
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="grid h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[320px_1fr] overflow-hidden"
    >
      {/* LEFT: TEAMMATES LIST */}
      <div className="flex flex-col rounded-[35px] border border-gray-100 bg-white p-6 shadow-sm dark:bg-[#1C1C1E]">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Operatives</h1>
            <ShieldCheck size={16} className="text-gray-300" />
        </div>
        <div className="space-y-2 overflow-y-auto pr-2">
          {members.map(m => (
            <button 
              key={m.id} 
              onClick={() => setActiveMemberId(m.id)} 
              className={`flex w-full items-center gap-4 rounded-[20px] p-4 transition-all ${
                activeMemberId === m.id 
                ? 'bg-black text-white shadow-lg' 
                : 'hover:bg-gray-50 text-gray-500'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeMemberId === m.id ? 'bg-white/10' : 'bg-gray-100'}`}>
                <User size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-tight">{m.username}</p>
                <p className={`text-[9px] font-bold uppercase opacity-50 ${activeMemberId === m.id ? 'text-white' : 'text-gray-400'}`}>
                  {m.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: CHAT AREA */}
      <div className="flex flex-col rounded-[35px] border border-gray-100 bg-white shadow-sm overflow-hidden dark:bg-[#1C1C1E]">
        {/* MESSAGES LIST */}
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-8 scroll-smooth">
          {messages.length > 0 ? messages.map(msg => {
            const isMe = msg.sender.id !== activeMemberId;

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-[22px] px-5 py-3 text-sm font-medium shadow-sm ${
                    isMe 
                    ? 'bg-black text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 px-2">
                    {isMe ? 'Sent' : 'Received'}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="flex h-full items-center justify-center text-gray-300 italic text-sm">
                No communications found. Start the debrief.
            </div>
          )}
        </div>

        {/* INPUT BAR */}
        <div className="p-6 border-t border-gray-50">
            <div className="flex gap-3 bg-gray-50 rounded-[22px] p-2 pr-3 items-center border border-gray-100">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Secure transmission..." 
                className="flex-1 bg-transparent px-5 py-2 text-sm outline-none font-medium" 
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim()}
                className="rounded-xl bg-black p-3 text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-20"
              >
                <SendHorizonal size={20} />
              </button>
            </div>
        </div>
      </div>
    </motion.div>
  );
}