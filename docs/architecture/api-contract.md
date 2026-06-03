# API Contract

All communication between frontend and backend happens via REST over HTTP on `localhost:8000`.

## Base URL

```
http://localhost:8000/api
```

## Response Envelope

Every response follows a standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_FILE",
    "message": "Unsupported file format. Accepted: .wav, .mp3, .flac"
  }
}
```

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_INPUT` | 422 | Validation failure |
| `PLUGIN_ERROR` | 500 | Plugin execution failed |
| `AI_ERROR` | 502 | AI provider returned an error |
| `RATE_LIMITED` | 429 | Too many requests |

## Endpoint Naming

```
GET    /api/plugins                          # List plugins
POST   /api/plugins/{name}/execute           # Execute a plugin

POST   /api/analyze/sample                   # Sample Analyzer
POST   /api/theory/scales                    # Theory: scale generation
POST   /api/theory/chords                    # Theory: chord construction
POST   /api/theory/intervals                 # Theory: interval analysis

POST   /api/generate/chords                  # Chord progression
POST   /api/generate/melody                  # Melody generation
POST   /api/generate/bassline                # Bassline generation
POST   /api/generate/arpeggio                # Arpeggiator
POST   /api/generate/midi                    # MIDI file export

POST   /api/analyze/reference                # Reference track analysis
POST   /api/analyze/structure                # Arrangement breakdown

POST   /api/chat                             # Producer Chat
POST   /api/analyze/sound-good               # "Why Does This Sound Good?"

POST   /api/finish/analyze                   # Finish My Idea: analyze input
POST   /api/finish/suggest                   # Finish My Idea: get suggestions
```

## File Uploads

File uploads use `multipart/form-data`. The backend processes files via the service layer, never exposing the filesystem path to the renderer.

## Authentication

No authentication in v0.1. All routes are local-only. Future versions may add API key management for AI providers.
