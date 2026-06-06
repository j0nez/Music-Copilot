import { useEffect, useState } from 'react';
import { deleteProgression, downloadMidiUrl, listProgressions } from '../api';
import type { SavedProgression } from '../types';

type SortField = 'key' | 'mood' | 'genre' | 'name' | 'created_at';
type SortDir = 'ASC' | 'DESC';

const TYPE_TABS = [
  { label: 'All', value: null },
  { label: 'Progressions', value: 'progression' },
  { label: 'Melodies', value: 'melody' },
  { label: 'Basslines', value: 'bassline' },
  { label: 'Drums', value: 'drum_pattern' },
  { label: 'Arpeggios', value: 'arpeggio' },
] as const;

export default function Library() {
  const [items, setItems] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('DESC');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function fetchItems() {
    setLoading(true);
    setError('');
    try {
      const res = await listProgressions(sortBy, sortDir, typeFilter);
      if (res.success && res.data) {
        setItems(res.data.progressions);
      } else {
        setError(res.error?.message ?? 'Failed to load');
      }
    } catch {
      setError('Failed to connect to backend');
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
      setError('Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortDir('ASC');
    }
  }

  function sortArrow(field: SortField) {
    if (sortBy !== field) return '';
    return sortDir === 'ASC' ? ' ↑' : ' ↓';
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Library</h2>
      <p className="text-sm text-gray-400 mb-6">
        Saved ideas — progressions, melodies, basslines, and more.
      </p>

      {error && <p className="mb-4 text-red-300 text-sm">{error}</p>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value ?? 'all'}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              typeFilter === tab.value
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                : 'bg-surface-700 text-gray-400 hover:text-white border border-surface-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No ideas saved yet</p>
          <p className="text-sm">Generate a progression in Music Theory and click Save.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 text-left text-gray-400">
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider">Type</th>
                <th
                  className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  Name{sortArrow('name')}
                </th>
                <th
                  className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('key')}
                >
                  Key{sortArrow('key')}
                </th>
                <th
                  className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('mood')}
                >
                  Mood{sortArrow('mood')}
                </th>
                <th
                  className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('genre')}
                >
                  Genre{sortArrow('genre')}
                </th>
                <th className="pb-3 pr-4">Chords</th>
                <th
                  className="pb-3 pr-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('created_at')}
                >
                  Saved{sortArrow('created_at')}
                </th>
                <th className="pb-3 pr-4">MIDI</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-surface-700 text-gray-300 capitalize">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium">{p.name || '—'}</td>
                  <td className="py-3 pr-4 font-medium">{p.key}</td>
                  <td className="py-3 pr-4 capitalize text-gray-300">{p.mood ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-300">{p.genre ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {p.data.map((c, i) => (
                        <span key={i}
                          className="px-2 py-0.5 rounded bg-purple-800/30 text-purple-200 text-xs border border-purple-700/40"
                        >
                          {c.roman}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs" title={p.created_at}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <a
                      href={downloadMidiUrl(p.id)}
                      download
                      className="px-3 py-1 rounded bg-blue-900/40 text-blue-300 text-xs hover:bg-blue-900/60 transition-colors inline-block"
                    >
                      MIDI
                    </a>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="px-3 py-1 rounded bg-red-900/40 text-red-300 text-xs hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    >
                      {deleting === p.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
