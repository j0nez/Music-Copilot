import { useEffect, useState } from 'react';
import { deleteProgression, listProgressions } from '../api';
import type { SavedProgression } from '../types';

type SortField = 'key' | 'mood' | 'genre' | 'created_at';
type SortDir = 'ASC' | 'DESC';

export default function Library() {
  const [progressions, setProgressions] = useState<SavedProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('DESC');
  const [deleting, setDeleting] = useState<number | null>(null);

  async function fetchProgressions() {
    setLoading(true);
    setError('');
    try {
      const res = await listProgressions(sortBy, sortDir);
      if (res.success && res.data) {
        setProgressions(res.data.progressions);
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
    fetchProgressions();
  }, [sortBy, sortDir]);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await deleteProgression(id);
      setProgressions((prev) => prev.filter((p) => p.id !== id));
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
      <h2 className="text-2xl font-bold mb-4">Progression Library</h2>
      <p className="text-sm text-gray-400 mb-6">
        Saved chord progressions from Music Theory and AI generation.
      </p>

      {error && <p className="mb-4 text-red-300 text-sm">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : progressions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No progressions saved yet</p>
          <p className="text-sm">Generate a progression in Music Theory and click Save.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 text-left text-gray-400">
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
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {progressions.map((p) => (
                <tr key={p.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 pr-4 font-medium">{p.key}</td>
                  <td className="py-3 pr-4 capitalize text-gray-300">{p.mood ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-300">{p.genre ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {p.chords.map((c, i) => (
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
