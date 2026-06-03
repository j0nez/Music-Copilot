export default function WhyDoesThisSoundGood() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Why Does This Sound Good?</h2>
      <div className="rounded-lg border border-surface-700 p-4">
        <p className="text-sm text-gray-500 mb-4">
          Paste a chord progression or upload a sample to analyze what makes it
          work.
        </p>
        <textarea
          placeholder="Fm - Db - Ab - Eb"
          className="w-full bg-surface-800 rounded-lg p-4 text-sm outline-none focus:ring-1 focus:ring-primary-500 resize-none h-24"
        />
        <button className="mt-2 px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
          Analyze
        </button>
      </div>
    </div>
  );
}
