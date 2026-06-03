export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          title="Sample Analyzer"
          description="Detect BPM, key, and scale from audio files"
          status="planned"
        />
        <FeatureCard
          title="Theory Engine"
          description="Scale generation, chord construction, interval analysis"
          status="planned"
        />
        <FeatureCard
          title="Chord Generator"
          description="Generate chord progressions by key, mood, and genre"
          status="planned"
        />
        <FeatureCard
          title="Producer Chat"
          description="Ask AI-powered production questions"
          status="planned"
        />
        <FeatureCard
          title="Why Does This Sound Good?"
          description="Understand tension, resolution, and harmony in your music"
          status="planned"
        />
        <FeatureCard
          title="Finish My Idea"
          description="Get structure suggestions for your unfinished track"
          status="planned"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: "planned" | "active" | "done";
}) {
  const statusColors = {
    planned: "bg-surface-700 border-surface-600",
    active: "bg-blue-900/30 border-blue-700",
    done: "bg-green-900/30 border-green-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs capitalize text-gray-500">{status}</span>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
