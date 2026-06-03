import { useState } from "react";

interface FileInfo {
  name: string;
  size: number;
}

interface AnalysisResult {
  bpm?: number;
  key?: string;
  scale?: string;
  length_seconds?: number;
}

interface ContextData {
  activeFile: FileInfo | null;
  analysis: AnalysisResult | null;
  suggestions: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiStudio() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI copilot. Ask me about production, drop a file for analysis, or tell me about an idea you're working on.",
    },
  ]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ContextData>({
    activeFile: null,
    analysis: null,
    suggestions: [],
  });

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thanks for your message! AI features will be wired to the provider layer in a future update.",
        },
      ]);
    }, 500);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setContext({
      activeFile: { name: file.name, size: file.size },
      analysis: null,
      suggestions: ["This file will be analyzed by the Sample Analyzer plugin"],
    });
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Analyze this file: ${file.name}` },
      {
        role: "assistant",
        content: "File received. Analysis will run via the backend plugin system.",
      },
    ]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-full gap-4">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col" onDrop={handleFileDrop} onDragOver={handleDragOver}>
        <h2 className="text-2xl font-bold mb-4">AI Studio</h2>
        <div className="flex-1 rounded-lg border border-surface-700 bg-surface-800/50 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary-700 text-white"
                      : "bg-surface-700 text-gray-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-700 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask anything about your track..."
                className="flex-1 bg-surface-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Context
        </h3>

        {/* Active File */}
        <div className="rounded-lg border border-surface-700 bg-surface-800 p-3">
          <div className="text-xs text-gray-500 mb-1">Active File</div>
          {context.activeFile ? (
            <div>
              <div className="text-sm font-medium truncate">{context.activeFile.name}</div>
              <div className="text-xs text-gray-500">
                {(context.activeFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div
              className="border border-dashed border-surface-600 rounded p-4 text-center text-xs text-gray-600 cursor-pointer hover:border-primary-500 transition-colors"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
            >
              Drop a file here
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {context.activeFile && (
          <div className="rounded-lg border border-surface-700 bg-surface-800 p-3">
            <div className="text-xs text-gray-500 mb-2">Analysis</div>
            <div className="space-y-1 text-sm">
              {context.analysis?.bpm && (
                <div className="flex justify-between">
                  <span className="text-gray-400">BPM</span>
                  <span className="font-mono">{context.analysis.bpm}</span>
                </div>
              )}
              {context.analysis?.key && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Key</span>
                  <span className="font-mono">{context.analysis.key}</span>
                </div>
              )}
              {!context.analysis && (
                <div className="text-xs text-gray-600">
                  Waiting for analysis...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {context.suggestions.length > 0 && (
          <div className="rounded-lg border border-surface-700 bg-surface-800 p-3">
            <div className="text-xs text-gray-500 mb-2">Suggestions</div>
            <div className="space-y-1">
              {context.suggestions.map((s, i) => (
                <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-primary-400 mt-0.5">+</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
