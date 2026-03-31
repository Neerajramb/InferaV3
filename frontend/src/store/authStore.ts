import { create } from "zustand";
import api from "../utils/api";

interface User {
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  theme: "light" | "dark";

  setAuth: (data: any) => void;
  switchRole: (newRole: string) => Promise<void>; // 🔥 Added this
  logout: () => void;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  theme: "light",

  setAuth: (data) => {
    console.log("SETTING AUTH:", data);

    const userData = {
      username: data.user?.username || "admin",
      role: data.user?.role || "Founder",
    };

    set({
      user: userData,
      accessToken: data.access,
      refreshToken: data.refresh,
    });

    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    localStorage.setItem("user", JSON.stringify(userData));
  },

  // 🔥 NEW: Function to sync role changes with the backend
  switchRole: async (newRole: string) => {
    try {
      const token = localStorage.getItem('access');
      
      // 1. Tell Django to update your role in the DB
      await api.patch('/auth/profile/update-role/', 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // 2. Update local state and localStorage
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, role: newRole };
        set({ user: updatedUser });
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      console.log(`Successfully switched role to: ${newRole}`);
      
      // Optional: Force reload to reset all permission-based UI elements
      window.location.reload();

    } catch (err) {
      console.error("Failed to switch role on backend:", err);
      alert("Role switch failed. Check your backend logs.");
    }
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
  },

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),
}));