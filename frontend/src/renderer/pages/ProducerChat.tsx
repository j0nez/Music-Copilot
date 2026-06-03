export default function ProducerChat() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Producer Chat</h2>
      <div className="rounded-lg border border-surface-700 h-[500px] flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-sm text-gray-500 text-center">
            Ask anything about music production
          </p>
        </div>
        <div className="border-t border-surface-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="How do I make harder kicks?"
              className="flex-1 bg-surface-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
