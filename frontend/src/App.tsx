import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import { useAuthStore } from "./store/authStore";
import Chat from "./pages/Chat";
import Projects from "./pages/Projects";
import Notes from "./pages/Notes";
import Messaging from "./pages/Messaging";
import Logs from "./pages/Logs";
import Team from "./pages/Team";

// ✅ Protected Route Component
function ProtectedRoute({ children }: any) {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { setAuth } = useAuthStore();

  // ✅ Restore auth session from localStorage on boot
  useEffect(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");
    const savedUser = localStorage.getItem("user");

    if (access && refresh) {
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      setAuth({
        access,
        refresh,
        user: parsedUser || {
          username: "admin",
          role: "Founder",
        },
      });
    }
  }, [setAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ACCESS --- */}
        <Route path="/login" element={<Login />} />

        {/* --- PROTECTED WORKSPACE --- */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Automatically send "/" to "/dashboard" */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="documents" element={<Documents />} />
          <Route path="notes" element={<Notes />} />
          <Route path="messaging" element={<Messaging />} />
          
          {/* 🔥 FIXED: Path changed from 'ai-chat' to 'chat' to match Sidebar.tsx */}
          <Route path="chat" element={<Chat />} /> 
          
          <Route path="logs" element={<Logs />} />
          <Route path="team" element={<Team />} />
        </Route>

        {/* --- CATCH-ALL REDIRECT --- */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}