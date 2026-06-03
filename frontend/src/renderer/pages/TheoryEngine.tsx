export default function TheoryEngine() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Theory Engine</h2>
      <div className="space-y-4">
        <Section title="Scale Generator" />
        <Section title="Chord Builder" />
        <Section title="Interval Analyzer" />
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500">Coming soon</p>
    </div>
  );
}
