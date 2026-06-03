import { useState } from "react";

const tabs = ["Scale Generator", "Chord Builder", "Interval Analyzer", "Chord Progressions"] as const;
type Tab = (typeof tabs)[number];

export default function MusicTheory() {
  const [activeTab, setActiveTab] = useState<Tab>("Scale Generator");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Music Theory</h2>
      <div className="border-b border-surface-700 mb-4">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Scale Generator" && <ScaleGenerator />}
      {activeTab === "Chord Builder" && <ChordBuilder />}
      {activeTab === "Interval Analyzer" && <IntervalAnalyzer />}
      {activeTab === "Chord Progressions" && <ChordProgressions />}
    </div>
  );
}

function ScaleGenerator() {
  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Generate scales by key and type. Results display note names and interval patterns.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>C</option>
            <option>C#</option>
            <option>D</option>
            <option>Eb</option>
            <option>E</option>
            <option>F</option>
            <option>F#</option>
            <option>G</option>
            <option>Ab</option>
            <option>A</option>
            <option>Bb</option>
            <option>B</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Scale</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>Major</option>
            <option>Natural Minor</option>
            <option>Harmonic Minor</option>
            <option>Melodic Minor</option>
            <option>Dorian</option>
            <option>Phrygian</option>
            <option>Lydian</option>
            <option>Mixolydian</option>
            <option>Locrian</option>
            <option>Pentatonic Major</option>
            <option>Pentatonic Minor</option>
          </select>
        </div>
      </div>
      <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
        Generate
      </button>
    </div>
  );
}

function ChordBuilder() {
  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Build chords by root note and quality. Shows notes and harmonic function.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Root</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>C</option>
            <option>C#</option>
            <option>D</option>
            <option>Eb</option>
            <option>E</option>
            <option>F</option>
            <option>F#</option>
            <option>G</option>
            <option>Ab</option>
            <option>A</option>
            <option>Bb</option>
            <option>B</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Quality</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>Major</option>
            <option>Minor</option>
            <option>Diminished</option>
            <option>Augmented</option>
            <option>Major 7th</option>
            <option>Minor 7th</option>
            <option>Dominant 7th</option>
            <option>Sus2</option>
            <option>Sus4</option>
          </select>
        </div>
      </div>
      <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
        Build
      </button>
    </div>
  );
}

function IntervalAnalyzer() {
  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Enter two notes to find the interval between them.
      </p>
      <div className="flex items-end gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Note 1</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>C</option>
            <option>C#</option>
            <option>D</option>
            <option>Eb</option>
            <option>E</option>
            <option>F</option>
            <option>F#</option>
            <option>G</option>
            <option>Ab</option>
            <option>A</option>
            <option>Bb</option>
            <option>B</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Note 2</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>C</option>
            <option>C#</option>
            <option>D</option>
            <option>Eb</option>
            <option>E</option>
            <option>F</option>
            <option>F#</option>
            <option>G</option>
            <option>Ab</option>
            <option>A</option>
            <option>Bb</option>
            <option>B</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
          Analyze
        </button>
      </div>
    </div>
  );
}

function ChordProgressions() {
  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Generate chord progressions by key, mood, and genre. Export to MIDI.
      </p>
      <div className="grid grid-cols-3 gap-4 mb-4 max-w-lg">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>C Minor</option>
            <option>F Minor</option>
            <option>G Minor</option>
            <option>A Minor</option>
            <option>C Major</option>
            <option>G Major</option>
            <option>D Major</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mood</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>Emotional</option>
            <option>Dark</option>
            <option>Uplifting</option>
            <option>Melancholic</option>
            <option>Energetic</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Genre</label>
          <select className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            <option>Melodic Techno</option>
            <option>House</option>
            <option>Trance</option>
            <option>Techno</option>
            <option>Deep House</option>
            <option>Progressive House</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
          Generate
        </button>
        <button className="px-4 py-2 bg-surface-700 rounded-lg text-sm hover:bg-surface-600 transition-colors">
          Export MIDI
        </button>
      </div>
    </div>
  );
}
