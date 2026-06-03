# Frontend Architecture

The frontend is an Electron application with a React renderer, TypeScript throughout, and Tailwind CSS for styling.

## Process Model

```
┌─────────────────────────────────────┐
│          Main Process               │
│  - Window management                │
│  - IPC handlers                     │
│  - Native dialogs (file open/save)  │
│  - MIDI drag-and-drop to FL Studio  │
└──────────┬──────────────────────────┘
           │ preload.ts (contextBridge)
           ▼
┌─────────────────────────────────────┐
│        Renderer Process             │
│  - React application                │
│  - No direct filesystem access      │
│  - Communicates via HTTP to backend │
│    and via IPC to main process      │
└─────────────────────────────────────┘
```

## Component Tree (v0.1)

```
App
├── Layout
│   ├── Sidebar (navigation)
│   └── MainContent
│
├── Pages
│   ├── Dashboard
│   ├── SampleAnalyzer
│   │   ├── FileUpload
│   │   └── AnalysisResults
│   ├── TheoryEngine
│   │   ├── ScaleGenerator
│   │   ├── ChordBuilder
│   │   └── IntervalAnalyzer
│   ├── ChordGenerator
│   │   ├── InputForm (key, mood, genre)
│   │   ├── ProgressionDisplay
│   │   └── MidiExportButton
│   ├── ProducerChat
│   │   ├── ChatWindow
│   │   └── MessageInput
│   ├── WhyDoesThisSoundGood
│   │   ├── InputForm
│   │   └── AnalysisDisplay
│   └── FinishMyIdea
│       ├── FileUpload
│       └── Suggestions
│
└── Shared Components
    ├── Button
    ├── Input
    ├── Select
    ├── Modal
    ├── Spinner
    └── ErrorBoundary
```

## State Management

v0.1 uses React Context + hooks. No external state library needed at this scale.

```typescript
// Example: useAnalysis hook
function useAnalyze() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/api/analyze/sample", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, analyze };
}
```

## Routing

Simple hash-based routing (no React Router dependency in v0.1):

```typescript
const routes = {
  "/": Dashboard,
  "/analyze": SampleAnalyzer,
  "/theory": TheoryEngine,
  "/chords": ChordGenerator,
  "/chat": ProducerChat,
  "/why": WhyDoesThisSoundGood,
  "/finish": FinishMyIdea,
};
```

## Key Conventions

- No `any` types — strict TypeScript everywhere.
- Functional components only, no class components.
- Custom hooks encapsulate all API communication.
- Components receive data via props, never access APIs directly.
- Tailwind for styling, no CSS modules or styled-components.
