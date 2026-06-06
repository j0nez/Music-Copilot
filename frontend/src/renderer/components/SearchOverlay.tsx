import { useState, useEffect, useCallback, useRef } from "react";
import { searchAll } from "../api";
import type { SearchResult } from "../types";

interface Props {
  onClose: () => void;
  onSelectIdea?: (result: SearchResult) => void;
  onSelectProject?: (result: SearchResult) => void;
}

export default function SearchOverlay({ onClose, onSelectIdea, onSelectProject }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSelectedIdx(-1);
      return;
    }
    setLoading(true);
    try {
      const res = await searchAll(q.trim());
      if (res.success && res.data) {
        setResults(res.data.results);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIdx >= 0 && selectedIdx < results.length) {
      handleSelect(results[selectedIdx]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.source_type === "idea") {
      onSelectIdea?.(result);
    } else if (result.source_type === "project") {
      onSelectProject?.(result);
    }
    onClose();
  };

  const grouped = groupBy(results, (r) => r.source_type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-surface-800 rounded-xl border border-surface-700 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700/50">
          <span className="text-gray-500 text-sm">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ideas, samples, projects..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
          />
          <kbd className="text-[10px] text-gray-600 border border-surface-700/50 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-sm text-gray-500">Searching...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="p-6 text-center text-sm text-gray-500">No results found</div>
          )}

          {!loading && !query.trim() && (
            <div className="p-6 text-center text-sm text-gray-600">
              Start typing to search across ideas, samples, and projects
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {grouped.map(([sourceType, items]) => (
                <div key={sourceType}>
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-600 font-medium">
                    {sourceType === "idea" ? "Ideas" : sourceType === "sample" ? "Samples" : "Projects"}
                  </div>
                  {items.map((item) => {
                    const globalIdx = results.indexOf(item);
                    return (
                      <button
                        key={`${item.source_type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          globalIdx === selectedIdx
                            ? "bg-accent-500/10 border-l-2 border-accent-400"
                            : "border-l-2 border-transparent hover:bg-surface-700/50"
                        }`}
                      >
                        <span className="text-xs text-gray-500 w-14 shrink-0">
                          {sourceTypeIcon(item.subtype)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate">{item.name || `Unnamed ${item.subtype}`}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {[item.key, item.mood, item.genre].filter(Boolean).join(" · ") || item.subtype}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">{formatDate(item.created_at)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-surface-700/30 flex gap-4 text-[10px] text-gray-600">
          <span><kbd className="text-gray-500">↑↓</kbd> Navigate</span>
          <span><kbd className="text-gray-500">↵</kbd> Open</span>
          <span><kbd className="text-gray-500">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ──────────── */

function groupBy<T>(arr: T[], fn: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  arr.forEach((item) => {
    const key = fn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries());
}

function sourceTypeIcon(subtype: string): string {
  switch (subtype) {
    case "progression": return "🎹";
    case "melody":      return "🎵";
    case "bassline":    return "🎸";
    case "drum_pattern":return "🥁";
    case "arpeggio":    return "🔄";
    case "phrase":      return "📝";
    case "sample":      return "🎧";
    case "project":     return "📁";
    default:            return "📄";
  }
}

function formatDate(d: string): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d.slice(0, 10) || "";
  }
}
