import { useEffect, useState } from "react";
import { deleteProgression, downloadFromUrl, downloadMidiUrl, exportArrangement, exportSinglePart, listProgressions } from "../api";
import type { Note, SavedProgression } from "../types";
import { midiPitchToName } from "../music/pitch";

type SortField = "key" | "mood" | "genre" | "name" | "created_at";
type SortDir = "ASC" | "DESC";

const TYPE_TABS = [
  { label: "All", value: null },
  { label: "Progressions", value: "progression" },
  { label: "Melodies", value: "melody" },
  { label: "Basslines", value: "bassline" },
  { label: "Arrangements", value: "arrangement" },
  { label: "Drums", value: "drum_pattern" },
  { label: "Arpeggios", value: "arpeggio" },
] as const;

export default function LibraryModal({ onClose, onLoad }: { onClose: () => void; onLoad?: (item: SavedProgression) => void }) {
  const [items, setItems] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("DESC");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const res = await listProgressions(sortBy, sortDir, typeFilter);
      if (res.success && res.data) {
        setItems(res.data.progressions);
      } else {
        setError(res.error?.message ?? "Failed to load");
      }
    } catch {
      setError("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, [sortBy, sortDir, typeFilter]);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteProgression(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSortDir("ASC");
    }
  }

  function sortArrow(field: SortField) {
    if (sortBy !== field) return "";
    return sortDir === "ASC" ? " ↑" : " ↓";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-[800px] max-w-[90vw] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Library</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Saved ideas — {loading ? "..." : `${items.length} item${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-surface-700/50 flex-wrap shrink-0">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value ?? "all"}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                typeFilter === tab.value
                  ? "bg-accent-500/20 text-accent-300 border border-accent-500/40"
                  : "bg-surface-700 text-gray-400 hover:text-white border border-surface-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="mb-4 text-red-300 text-sm">{error}</p>}

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-md mb-1">No ideas saved yet</p>
              <p className="text-xs">Generate a progression in Music Theory and click Save.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left text-gray-400">
                    <th className="pb-3 pr-4 text-xs uppercase tracking-wider">Type</th>
                    <th className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                      Name{sortArrow("name")}
                    </th>
                    <th className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("key")}>
                      Key / Scale{sortArrow("key")}
                    </th>
                    <th className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("mood")}>
                      Mood{sortArrow("mood")}
                    </th>
                    <th className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("genre")}>
                      Genre{sortArrow("genre")}
                    </th>
                    <th className="pb-3 pr-4">Chords</th>
                    <th className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("created_at")}>
                      Saved{sortArrow("created_at")}
                    </th>
                    <th className="pb-3 pr-4">MIDI</th>
                    {onLoad && <th className="pb-3" />}
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-surface-700 text-gray-300 capitalize">{displayType(p.type)}</span>
                      </td>
                      <td className="py-3 pr-4 font-medium">{p.name || "—"}</td>
                      <td className="py-3 pr-4 font-medium">{p.key}{p.scale ? ` \u2014 ${p.scale}` : ''}</td>
                      <td className="py-3 pr-4 capitalize text-gray-300">{p.mood ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-300">{p.genre ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {p.type === 'arrangement' ? (
                          <ArrangementDataCell data={p.data as unknown as { chords: Note[]; melody: Note[]; bassline: Note[] }} />
                        ) : p.type === 'arrangement_chords' || p.type === 'melody' || p.type === 'bassline' ? (
                          <NoteNameBadges type={p.type} notes={p.data as unknown as Note[]} />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(p.data as { roman: string }[]).map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-purple-800/30 text-purple-200 text-xs border border-purple-700/40">
                                {c.roman}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs" title={p.created_at}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        {p.type === 'arrangement' ? (
                          <ArrangementMidiButton bpm={p.bpm} data={p.data as unknown as { chords: Note[]; melody: Note[]; bassline: Note[] }} />
                        ) : p.type === 'progression' ? (
                          <a href={downloadMidiUrl(p.id)} download
                            className="px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 text-xs hover:bg-blue-900/60 transition-colors inline-block">
                            MIDI
                          </a>
                        ) : (
                          <NoteListMidiButton bpm={p.bpm} type={p.type === 'arrangement_chords' ? 'chords' : p.type === 'melody' ? 'melody' : 'bassline'} notes={p.data as unknown as Note[]} />
                        )}
                      </td>
                      {onLoad && (
                        <td className="py-3 pr-2">
                          {p.type === 'arrangement' ? (
                            <div className="flex flex-col gap-1">
                              <button onClick={() => onLoad(p)}
                                className="px-2 py-0.5 rounded bg-green-900/40 text-green-300 text-xs hover:bg-green-900/60 transition-colors whitespace-nowrap">
                                Load All
                              </button>
                              <ArrangementPartLoadButtons item={p} onLoad={onLoad} />
                            </div>
                          ) : (
                            <button onClick={() => onLoad(p)}
                              className="px-2.5 py-1 rounded bg-green-900/40 text-green-300 text-xs hover:bg-green-900/60 transition-colors">
                              Load
                            </button>
                          )}
                        </td>
                      )}
                      <td className="py-3">
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          className="px-2.5 py-1 rounded bg-red-900/40 text-red-300 text-xs hover:bg-red-900/60 transition-colors disabled:opacity-50">
                          {deleting === p.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────── */

function displayType(type: string): string {
  return type === 'arrangement_chords' ? 'Arrangement Chords' : type;
}

function NoteListMidiButton({ bpm, type, notes }: { bpm: number | null; type: string; notes: Note[] }) {
  const [busy, setBusy] = useState(false);
  async function handleClick() {
    setBusy(true);
    const res = await exportSinglePart(type as 'chords' | 'melody' | 'bassline', notes, bpm ?? 120);
    if (res.success && res.data) {
      await downloadFromUrl(res.data.download_url, res.data.filename);
    }
    setBusy(false);
  }
  return (
    <button onClick={handleClick} disabled={busy}
      className="px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 text-xs hover:bg-blue-900/60 transition-colors disabled:opacity-50 inline-block">
      {busy ? '...' : 'MIDI'}
    </button>
  );
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  arrangement_chords: 'bg-purple-800/30 text-purple-200 border-purple-700/40',
  melody: 'bg-green-800/30 text-green-200 border-green-700/40',
  bassline: 'bg-blue-800/30 text-blue-200 border-blue-700/40',
};

function NoteNameBadges({ type, notes }: { type: string; notes: Note[] }) {
  const MAX_VISIBLE = 20;
  const visible = notes.slice(0, MAX_VISIBLE);
  const remaining = notes.length - MAX_VISIBLE;
  const colorClass = NOTE_TYPE_COLORS[type] ?? 'bg-gray-800/30 text-gray-200 border-gray-700/40';
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((n, i) => (
        <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] border ${colorClass}`}>
          {midiPitchToName(n.pitch)}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-700 text-gray-500 border border-surface-600">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function ArrangementDataCell({ data }: { data: { chords: Note[]; melody: Note[]; bassline: Note[] } }) {
  const count = (arr: Note[]) => arr?.length ?? 0;
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="text-purple-400">Chords: {count(data.chords)}</span>
      <span className="text-green-400">Melody: {count(data.melody)}</span>
      <span className="text-blue-400">Bassline: {count(data.bassline)}</span>
    </div>
  );
}

function ArrangementMidiButton({ bpm, data }: { bpm: number | null; data: { chords: Note[]; melody: Note[]; bassline: Note[] } }) {
  const [busy, setBusy] = useState(false);
  async function handleClick() {
    setBusy(true);
    const res = await exportArrangement(
      data.chords ?? [], data.melody ?? [], data.bassline ?? [],
      bpm ?? 120, 0, { chords: true, melody: true, bassline: true },
    );
    if (res.success && res.data) {
      await downloadFromUrl(res.data.download_url, res.data.filename);
    }
    setBusy(false);
  }
  return (
    <button onClick={handleClick} disabled={busy}
      className="px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 text-xs hover:bg-blue-900/60 transition-colors disabled:opacity-50 inline-block">
      {busy ? '...' : 'MIDI'}
    </button>
  );
}

function ArrangementPartLoadButtons({ item, onLoad }: { item: SavedProgression; onLoad: (item: SavedProgression & { _part?: string }) => void }) {
  const parts = [
    { key: 'chords', label: 'Chords', color: 'text-purple-400' },
    { key: 'melody', label: 'Melody', color: 'text-green-400' },
    { key: 'bassline', label: 'Bassline', color: 'text-blue-400' },
  ] as const;
  return (
    <div className="flex flex-col gap-0.5">
      {parts.map(p => (
        <button key={p.key} onClick={() => onLoad({ ...item, _part: p.key })}
          className={`${p.color} hover:text-white text-[10px] text-left leading-none px-0.5`}>
          Load {p.label}
        </button>
      ))}
    </div>
  );
}
