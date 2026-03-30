import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import { useAuthStore } from "./store/authStore";
import Chat from "./pages/Chat";

// Dummy pages
const Projects = () => <div>Projects Page</div>;
const Notes = () => <div>Notes Page</div>;
const Messaging = () => <div>Messaging Page</div>;
const Logs = () => <div>Logs Page</div>;
const Team = () => <div>Team Page</div>;

// ✅ FIXED Protected Route
function ProtectedRoute({ children }: any) {
  const token = useAuthStore((state) => state.accessToken);

  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { setAuth } = useAuthStore();

  // ✅ Restore auth from localStorage
  useEffect(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");

    if (access && refresh) {
      setAuth({
        access,
        refresh,
        user: {
          username: "persisted",
          role: "Founder",
        },
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="documents" element={<Documents />} />
          <Route path="notes" element={<Notes />} />
          <Route path="messaging" element={<Messaging />} />
          <Route path="ai-chat" element={<Chat />} />
          <Route path="logs" element={<Logs />} />
          <Route path="team" element={<Team />} />
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}