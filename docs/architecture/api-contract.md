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
| `DATABASE_ERROR` | 500 | Database operation failed |
| `FILE_VALIDATION_ERROR` | 422 | File rejected (bad extension or mime) |
| `NETWORK_ERROR` | — | Frontend network error (never sent by server) |
| `INTERNAL_ERROR` | 500 | Unhandled exception fallback |

## Endpoint Naming

```
# Plugin system
GET    /api/plugins                          # List plugins (9 total)
POST   /api/plugins/{name}/execute           # Execute a plugin
GET    /api/plugins/{name}/schema            # Get plugin input schema

# Upload
POST   /api/upload/                          # Upload audio file

# Progressions / Ideas
POST   /api/progressions/                    # Save idea (progression)
GET    /api/progressions/                    # List ideas (with type filter, sort)
GET    /api/progressions/{id}                # Get single idea
DELETE /api/progressions/{id}                # Delete idea
GET    /api/progressions/{id}/midi           # Download as MIDI

# Projects
POST   /api/projects/                        # Create project
GET    /api/projects/                        # List projects
GET    /api/projects/last                    # Get most recent project
GET    /api/projects/{id}                    # Get project by ID
PUT    /api/projects/{id}                    # Update project metadata
DELETE /api/projects/{id}                    # Delete project

# Search
GET    /api/search/?q={query}               # Global search (ideas, projects)

# Health
GET    /api/health                           # Health check
```

## File Uploads

File uploads use `multipart/form-data`. The backend processes files via the service layer, never exposing the filesystem path to the renderer.

## Authentication

No authentication in v0.1. All routes are local-only. Future versions may add API key management for AI providers.
