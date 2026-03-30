import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    // Clear tokens
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    // Clear Zustand state
    logout();

    // Redirect to login
    navigate("/login");
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
      <div className="text-sm text-gray-500">
        Currently viewing as:
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Access</span>

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full bg-black text-white text-sm hover:opacity-90 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}