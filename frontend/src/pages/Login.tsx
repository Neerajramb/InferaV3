import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);

        setAuth({
          access: data.access,
          refresh: data.refresh,
          user: data.user || {
            username,
            role: "Founder",
          },
        });

        navigate("/dashboard");
      } else {
        setError(data?.detail || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Unable to connect to the Infera server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#000000] text-white selection:bg-white selection:text-black">
      
      {/* BRANDING COLUMN (LEFT) - NOW CENTERED & BIG FONT */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-[#1C1C1E] border-r border-white/5">
        {/* Empty top slot to push content down for vertical centering */}
        <div />

        {/* Centerised Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center text-center p-10"
        >
          {/* 🔥 BIG "INFERA" FONT */}
          <h1 className="text-7xl font-black tracking-tighter uppercase italic text-white">
            Infera
          </h1>
          
          {/* 🔥 BIG SUBTITLE FONT */}
          <p className="mt-8 text-2xl text-gray-400 font-medium max-w-lg leading-snug">
            The Secure Local-Network Intelligence Hub for Modern Teams.
          </p>
        </motion.div>

        {/* Audit / Version Footer */}
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold text-center">
          © {new Date().getFullYear()} Infera Systems · Local Node v1.0
        </div>
      </div>

      {/* LOGIN FORM COLUMN (RIGHT) - UNCHANGED */}
      <div className="flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 mt-2 text-sm">Please enter your workspace credentials.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded-2xl text-red-400 text-xs font-bold"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-white transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Workspace identifier"
                  className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-white/20 focus:bg-[#252527] transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-white transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-white/20 focus:bg-[#252527] transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Decrypting..." : "Access Workspace"}
                {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-600 font-medium">
              Forgot credentials? <a href="#" className="text-gray-400 hover:text-white transition-colors underline underline-offset-4">Contact System Administrator</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}