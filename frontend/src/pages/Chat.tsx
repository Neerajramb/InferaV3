import { useState } from "react";
import api from "../utils/api";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/chat/", {
        query: input,
      });

      const aiMessage: Message = {
        role: "ai",
        text: res.data.response,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error getting response ❌" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="flex flex-col min-h-screen max-w-4xl mx-auto text-black">

    <h1 className="text-2xl font-bold p-4">
      AI Chat
    </h1>

    {/* MESSAGES */}
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg max-w-xl ${
            msg.role === "user"
              ? "bg-black text-white ml-auto"
              : "bg-gray-200 text-black"
          }`}
        >
          {msg.text}
        </div>
      ))}

      {loading && (
        <div className="text-gray-500 text-sm">Thinking...</div>
      )}
    </div>

    {/* INPUT */}
    <div className="p-4 border-t flex gap-2">
      <input
        className="flex-1 border p-2 rounded text-black"
        placeholder="Ask something..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />

      <button
        onClick={sendMessage}
        className="bg-black text-white px-4 rounded"
      >
        Send
      </button>
    </div>
  </div>
);
}