export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          title="Music Theory"
          description="Scales, chords, intervals, and chord progressions"
          status="planned"
        />
        <FeatureCard
          title="AI Studio"
          description="Chat, analysis, and composition assistant — all in one place"
          status="planned"
        />
        <FeatureCard
          title="Samples"
          description="Upload and analyze audio files for BPM, key, and scale"
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
