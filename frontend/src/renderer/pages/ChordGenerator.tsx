export default function ChordGenerator() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Chord Progression Generator</h2>
      <div className="rounded-lg border border-surface-700 p-4">
        <p className="text-sm text-gray-500 mb-4">
          Generate chord progressions by key, mood, and genre.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-surface-800 rounded-lg">
            <label className="text-xs text-gray-500 block mb-1">Key</label>
            <span className="text-sm">C Minor</span>
          </div>
          <div className="p-3 bg-surface-800 rounded-lg">
            <label className="text-xs text-gray-500 block mb-1">Mood</label>
            <span className="text-sm">Emotional</span>
          </div>
          <div className="p-3 bg-surface-800 rounded-lg">
            <label className="text-xs text-gray-500 block mb-1">Genre</label>
            <span className="text-sm">Melodic Techno</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
          Generate
        </button>
      </div>
    </div>
  );
}
