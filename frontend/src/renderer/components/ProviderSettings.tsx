import { useState, useCallback } from "react";
import { configureProvider, setProviderPriority, testProvider } from "../api";
import type { ProviderInfo } from "../types";

interface ProviderSettingsProps {
  providers: ProviderInfo[];
  onClose: () => void;
  onConfigured: () => void;
}

export default function ProviderSettings({ providers, onClose, onConfigured }: ProviderSettingsProps) {
  const [priority, setPriority] = useState<string[]>(providers.map(p => p.name));
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, { healthy: boolean; latency?: number } | null>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromIdx === toIdx) return;
    const next = [...priority];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setPriority(next);
  }, [priority]);

  const handleTest = useCallback(async (name: string) => {
    setTesting(prev => ({ ...prev, [name]: true }));
    const res = await testProvider(name);
    if (res.success && res.data) {
      const d = res.data;
      setStatuses(prev => ({ ...prev, [name]: { healthy: true, latency: d.latency_ms } }));
    } else {
      setStatuses(prev => ({ ...prev, [name]: { healthy: false } }));
    }
    setTesting(prev => ({ ...prev, [name]: false }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    for (const p of providers) {
      const key = keys[p.name];
      const model = models[p.name];
      if (key || model) {
        await configureProvider(p.name, key || undefined, model || undefined);
      }
    }
    await setProviderPriority(priority);
    setSaving(false);
    onConfigured();
    onClose();
  }, [providers, keys, models, priority, onConfigured, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-700 rounded-xl w-[400px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/50">
          <span className="text-xs font-semibold text-gray-300">Provider Settings</span>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Priority */}
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Failover Priority</p>
            <div className="space-y-1">
              {priority.map((name, idx) => (
                <div key={name}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, idx)}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-surface-900 border border-surface-700/50 cursor-grab active:cursor-grabbing text-xs text-gray-300"
                >
                  <span className="text-gray-600 text-sm">≡</span>
                  <span className="flex-1">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-surface-700/30" />

          {/* Provider configs */}
          {providers.map(p => (
            <div key={p.name}>
              <p className="text-xs font-medium text-gray-300 mb-2">{p.name}</p>
              {statuses[p.name] && (
                <div className={`mb-2 text-[10px] ${statuses[p.name]?.healthy ? "text-green-400" : "text-red-400"}`}>
                  {statuses[p.name]?.healthy
                    ? `Healthy (${statuses[p.name]?.latency}ms)`
                    : "Connection failed"}
                </div>
              )}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">API Key</label>
                  <input
                    defaultValue={p.configured ? "••••••••" : ""}
                    onChange={e => setKeys(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.configured ? "Leave blank to keep current" : "Enter API key..."}
                    className="w-full bg-surface-900 border border-surface-700 rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-0.5">Model</label>
                    <select
                      defaultValue={p.model ?? ""}
                      onChange={e => setModels(prev => ({ ...prev, [p.name]: e.target.value }))}
                      className="w-full bg-surface-900 border border-surface-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="">Default</option>
                      {p.available_models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="self-end">
                    <button onClick={() => handleTest(p.name)} disabled={testing[p.name]}
                      className="px-2 py-1.5 rounded text-[10px] text-gray-400 border border-surface-700/50 hover:text-gray-200 transition-colors disabled:opacity-50"
                    >{testing[p.name] ? "..." : "Test"}</button>
                  </div>
                </div>
                <p className="text-[9px] text-gray-600">Type any model name not in the list</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-surface-700/50">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-gray-400 border border-surface-700/50 hover:text-gray-200 transition-colors"
          >Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 rounded text-xs font-medium bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30 disabled:opacity-50 transition-colors"
          >{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
