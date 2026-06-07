import { useEffect, useRef, useState, useCallback } from "react";
import { sendChat, getChatHistory, clearChatHistory, listProviders } from "../api";
import ProviderSettings from "./ProviderSettings";
import type { ChatMessage, ProviderInfo, ActivePartsSummary, Project } from "../types";

interface AiStudioProps {
  project: Project | null;
  activeParts: Record<string, ActivePartsSummary>;
}

export default function AiStudio({ project, activeParts }: AiStudioProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [selectedModel, setSelectedModel] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadProviders = useCallback(async () => {
    const res = await listProviders();
    if (res.success && res.data) {
      setProviders(res.data.providers);
      const firstConfigured = res.data.providers.find(p => p.configured) ?? res.data.providers[0];
      if (firstConfigured) {
        setSelectedProvider(firstConfigured.name);
        setSelectedModel(firstConfigured.model ?? (firstConfigured.available_models[0] ?? ""));
      }
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await getChatHistory(20);
    if (res.success && res.data) {
      setMessages(res.data.history.map(h => ({ ...h, timestamp: Date.now() })));
    }
    setLoadedHistory(true);
  }, []);

  useEffect(() => {
    loadProviders();
    loadHistory();
  }, [loadProviders, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const res = await sendChat(text, activeParts, project ? { key: project.key, scale: project.scale, bpm: project.bpm } : null);

    if (res.success && res.data) {
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: res.data.reply,
        provider: res.data.provider_used,
        model: res.data.model_used,
        tokens_used: res.data.tokens_used,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } else {
      setError(res.error?.message ?? "Chat failed. Check your provider API key.");
    }
    setLoading(false);
  }, [input, loading, activeParts, project]);

  const handleNewChat = useCallback(async () => {
    await clearChatHistory();
    setMessages([]);
    setError(null);
  }, []);

  const handleProviderChange = useCallback(async (name: string) => {
    setSelectedProvider(name);
    const info = providers.find(p => p.name === name);
    setSelectedModel(info?.model ?? (info?.available_models[0] ?? ""));
  }, [providers]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/30 shrink-0">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Chat</span>
        <div className="flex-1" />
        <button onClick={handleNewChat}
          className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded border border-surface-700/50 transition-colors"
        >New Chat</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && loadedHistory && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            Ask a question about your project
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
              msg.role === "user"
                ? "bg-accent-500/20 text-accent-200 border border-accent-500/20"
                : "bg-surface-700/50 text-gray-300 border border-surface-600/30"
            }`}>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === "assistant" && (msg.provider || msg.tokens_used) && (
                <div className="mt-1 text-[10px] text-gray-600">
                  {[msg.provider && msg.model ? `${msg.provider} · ${msg.model}` : msg.provider || msg.model].filter(Boolean).join(" · ")}
                  {msg.tokens_used ? ` · ${msg.tokens_used} tok` : ""}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-xs bg-surface-700/50 border border-surface-600/30">
              <span className="text-gray-500">Thinking</span>
              <span className="ml-1 inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 max-w-full">
              {error}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-surface-700/30 p-2 space-y-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about music theory, arrangement, or production..."
            disabled={loading}
            className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50 disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="px-3 py-2 rounded text-xs font-medium bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30 disabled:opacity-50 transition-colors"
          >Send</button>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedProvider} onChange={e => handleProviderChange(e.target.value)}
            className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[10px] text-gray-400 focus:outline-none"
          >
            {providers.map(p => (
              <option key={p.name} value={p.name} disabled={!p.configured}>
                {p.name}{p.configured ? "" : " (not configured)"}
              </option>
            ))}
          </select>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
            className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[10px] text-gray-400 focus:outline-none flex-1"
          >
            {providers.find(p => p.name === selectedProvider)?.available_models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={() => setShowSettings(true)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-surface-700/50 transition-colors"
            title="Provider Settings"
          >⚙️</button>
        </div>
      </div>

      {showSettings && (
        <ProviderSettings
          providers={providers}
          onClose={() => { setShowSettings(false); loadProviders(); }}
          onConfigured={loadProviders}
        />
      )}
    </div>
  );
}
