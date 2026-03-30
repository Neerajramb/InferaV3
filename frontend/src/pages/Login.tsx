import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 🔒 Prevent multiple requests
    if (loading) return;

    // ❗ Basic validation
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);

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

      console.log("LOGIN STATUS:", res.status);
      console.log("LOGIN RESPONSE:", data);

      if (res.ok) {
        // ✅ Save auth properly
        setAuth({
          access: data.access,
          refresh: data.refresh,
          user: {
            username,
            role: "Founder", // temp (we'll fix later from backend)
          },
        });

        navigate("/dashboard");
      } else {
        // 🔍 Show real backend error
        alert(data?.detail || "Invalid credentials ❌");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Server error ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="p-8 rounded-xl shadow bg-white w-80">
        <h2 className="text-xl mb-4 text-center">Login</h2>

        <input
          placeholder="Username"
          className="border p-2 mb-3 w-full"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <input
          type="password"
          placeholder="Password"
          className="border p-2 mb-3 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-black text-white w-full py-2 rounded disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}