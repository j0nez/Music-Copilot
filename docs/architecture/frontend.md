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
           │ preload.js (contextBridge)
           ▼
┌─────────────────────────────────────┐
│        Renderer Process             │
│  - React application                │
│  - No direct filesystem access      │
│  - Communicates via HTTP to backend │
│    and via IPC to main process      │
└─────────────────────────────────────┘
```

In dev mode (`npm run dev:electron`), Electron loads `http://localhost:5173` from the Vite dev server. In production, it loads the built files from `dist/index.html`.

## File Structure

```
frontend/
├── package.json              # Dependencies + scripts
├── vite.config.ts            # Vite config, React plugin, path aliases
├── tsconfig.json             # Renderer TypeScript config
├── tsconfig.node.json        # Vite config TypeScript
├── tailwind.config.js        # Tailwind theme + colors
├── postcss.config.js         # PostCSS with Tailwind + autoprefixer
├── index.html                # Entry HTML (CSP headers included)
├── src/
│   ├── main/main.js          # Electron main process (plain JS)
│   ├── preload/preload.js    # Electron preload (contextBridge)
│   └── renderer/
│       ├── main.tsx          # React entry (createRoot + HashRouter)
│       ├── App.tsx           # Route definitions
│       ├── index.css         # Tailwind directives + global styles
│       ├── components/
│       │   └── Layout.tsx    # Sidebar + main content area
│       └── pages/
│           ├── Dashboard.tsx
│           ├── SampleAnalyzer.tsx
│           ├── TheoryEngine.tsx
│           ├── ChordGenerator.tsx
│           ├── ProducerChat.tsx
│           ├── WhyDoesThisSoundGood.tsx
│           └── FinishMyIdea.tsx
└── dist/                     # Production build output
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

v0.1 uses React's built-in `useState` + `useEffect` in custom hooks. No external state library needed at this scale.

```typescript
// Example: hook that calls the plugin API
const API_BASE = "http://localhost:8000/api";

function usePluginExecute(name: string) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (payload: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/plugins/${name}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error?.message ?? "Unknown error");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, execute };
}
```

## Routing

Hash-based routing via `react-router-dom` with `HashRouter` (required for Electron's file:// protocol in production):

```typescript
// src/renderer/main.tsx
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
```

Routes are defined declaratively:

```typescript
<Routes>
  <Route element={<Layout />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/analyze" element={<SampleAnalyzer />} />
    <Route path="/theory" element={<TheoryEngine />} />
    <Route path="/chords" element={<ChordGenerator />} />
    <Route path="/chat" element={<ProducerChat />} />
    <Route path="/why" element={<WhyDoesThisSoundGood />} />
    <Route path="/finish" element={<FinishMyIdea />} />
  </Route>
</Routes>
```

## Key Conventions

- No `any` types — strict TypeScript everywhere.
- Functional components only, no class components.
- Custom hooks encapsulate all API communication.
- Components receive data via props, never access APIs directly.
- Tailwind for styling, no CSS modules or styled-components.
