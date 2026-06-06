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

In dev mode, Electron loads `http://localhost:5173` from the Vite dev server. In production, it loads the built files from `dist/index.html`.

## File Structure

```
frontend/
├── package.json              # Dependencies + scripts
├── vite.config.ts            # Vite config, React plugin, path aliases
├── tsconfig.json             # Renderer TypeScript config
├── tailwind.config.js        # Tailwind theme + colors (Neon Mint palette)
├── index.html                # Entry HTML (CSP headers included)
├── src/
│   ├── main/main.js          # Electron main process (plain JS)
│   ├── preload/preload.js    # Electron preload (contextBridge)
│   └── renderer/
│       ├── main.tsx          # React entry (no router — single screen)
│       ├── App.tsx           # Single route: /
│       ├── index.css         # Tailwind directives + global styles
│       ├── types.ts          # TypeScript interfaces for all data models
│       ├── api.ts            # HTTP client (fetchJson, post, put, get, del)
│       ├── store/
│       │   └── projectContext.tsx  # React Context for project state
│       ├── hooks/
│       │   └── useApi.ts    # Generic API hook (loading/error/data)
│       ├── components/
│       │   ├── Layout.tsx         # App shell (no sidebar — full screen)
│       │   ├── MusicTheoryPanel.tsx   # Inline music theory (4 tabs)
│       │   ├── ChordPads.tsx      # Web Audio playback, drag reorder
│       │   ├── SampleAnalysisPanel.tsx  # Drop zone + results cards
│       │   ├── LibraryModal.tsx   # Library overlay with sort/filter
│       │   ├── SearchOverlay.tsx  # Ctrl+K global search overlay
│       │   ├── LoadingSkeleton.tsx # Animated pulse placeholder
│       │   └── RetryButton.tsx    # Small retry ↻ button
│       └── pages/
│           └── Dashboard.tsx  # Co-hero bento grid (the only page)
└── dist/                     # Production build output
```

## Component Tree (v0.1)

```
App (wrapped in ProjectProvider)
└── Dashboard
    ├── SearchOverlay (modal, Ctrl+K)
    ├── LibraryModal (overlay)
    ├── TopBar (logo, Ctrl+K btn, Library btn, New/Switch Project)
    ├── Left Column
    │   ├── ProjectAnchor (compact: name, BPM, key, scale, FL Studio badge)
    │   └── MusicTheoryPanel (collapsible, 4 tabs)
    │       ├── ScaleGenerator
    │       ├── ChordBuilder
    │       ├── IntervalAnalyzer
    │       └── Progressions (generator + voice-leading badge)
    ├── Right Column (Co-Producer Chat — placeholder)
    └── Bottom Row
        ├── ChordPads (Web Audio playback, drag reorder, MIDI export)
        ├── SampleAnalysisPanel (drop zone, BPM range, results, Apply)
        └── Session Notes (textarea)
```

## State Management

React Context (`ProjectProvider`) for project state with optimistic debounced saves (500ms):

```typescript
const { project, createProject, updateProject, refreshProject } = useProject();
```

Individual panels use local `useState` (no global store for UI state). The project is the only shared state.

## Routing

No route-based navigation. The dashboard is the only screen. Library opens as a modal overlay. All old pages (Music Theory, Samples, AI Studio) are absorbed as inline panels.

## Key Conventions

- No `any` types — strict TypeScript everywhere.
- Functional components only, no class components.
- Components receive data via props; API calls happen in `api.ts` via `fetchJson()` helper.
- Tailwind for styling, no CSS modules or styled-components.
- Every API function returns `ApiResponse<T>` — no thrown exceptions for HTTP errors.
