# Data Flow

This document traces a complete request lifecycle from user interaction to response.

## Standard Request Flow

```
User clicks "Analyze Sample" button
        │
        ▼
┌───────────────────┐
│   React Component  │  e.g., SampleAnalyzerPage.tsx
│   calls hook:      │
│   useAnalyze(file) │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Custom Hook       │  e.g., useSampleAnalysis.ts
│  builds FormData   │
│  POST /api/plugins │
│  /sample_analyzer  │
│  /execute          │
└────────┬──────────┘
         │  HTTP Request (localhost:8000)
         ▼
┌───────────────────┐
│  FastAPI Route     │  /api/plugins/{name}/execute
│  validates input   │
│  delegates to      │
│  execute_plugin()  │
└────────┬──────────┘
         │
         ▼
┌──────────────────────────┐
│  execute_plugin()         │
│  validates via input_     │
│  schema if present        │
│  calls plugin.execute()   │
└────────┬─────────────────┘
         │
         ▼
┌───────────────────┐
│  Plugin.execute()  │  e.g., SampleAnalyzerPlugin
│  contains feature  │
│  logic             │
└────────┬──────────┘
         │
         ├──► AI call? ──► llm.generate(prompt) ──► Provider Layer ──► External API
         │                                                                    │
         │                    ◄────────── Response ◄──────────────────────────┘
         │
         ▼
┌───────────────────┐
│  event_bus.emit()  │  e.g., emit("sample.analyzed", ...)
│  Other plugins     │  ChordGenerator.on_sample_analyzed reacts
│  react asynchronously │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Return PluginResult│
│  to HTTP response  │
└────────┬──────────┘
         │  Response chain (reverse)
         ▼
  JSON Response → React state update → UI re-render
```

## AI Request Flow (Detailed)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Service /   │────►│  Provider     │────►│  Registry     │
│  Plugin      │     │  Interface    │     │  (config)     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     llm.generate(prompt)   Selects active provider
                            │                     │
                            ▼                     ▼
                     ┌───────────────────────────────────┐
                     │  OpenAIProvider  │  GroqProvider   │
                     │  GLMProvider     │  OpenRouter...  │
                     └──────────────┬────────────────────┘
                                    │
                                    ▼
                            External API Call
                                    │
                                    ▼
                            Response parsed
                            → validated by Pydantic
                            → returned as structured data
```

## Key Rules

- **Renderer never accesses the filesystem directly.** All file operations go through the preload bridge (Electron main process).
- **Plugins never call AI providers directly.** They call `llm.generate()` which routes through the Provider Layer.
- **Plugins never call other plugins directly.** They communicate via `event_bus.emit()`.
- **LLMs never touch raw audio / MIDI.** Audio → DSP → structured JSON → LLM. The LLM's job is interpretation, not perception.
- **Services are stateless.** State lives in SQLite or in React state.
- **All async.** FastAPI routes are async, plugin execution is async, AI calls are async.
