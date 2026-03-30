import { create } from "zustand";

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
  logout: () => void;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  theme: "light",

  setAuth: (data) => {
    console.log("SETTING AUTH:", data);

    set({
      user: {
        username: data.user?.username || "admin",
        role: data.user?.role || "Founder",
      },
      accessToken: data.access,
      refreshToken: data.refresh,
    });

    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),
}));