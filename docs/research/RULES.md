# Research Rules

Guidelines for conducting efficient, rate-limit-aware research for Music Copilot.

## Search Tools & Rate Limits

Two tools are available for gathering external information:

| Tool | Endpoint | Rate limit | Best for |
|------|----------|------------|----------|
| `websearch` | `search.parallel.ai/mcp` (POST) | ~3–5 concurrent calls → 429 for several minutes | Finding resources when you don't have a URL |
| `webfetch` | HTTP GET on arbitrary URLs | No observed limit | Fetching specific known pages (docs, GitHub, PyPI) |

### Pacing Rules

1. **Max 3 parallel `websearch` calls per batch.** Beyond that triggers a multi-minute 429 lockout on the entire session.

2. **Use `webfetch` for any URL you already know.** If you have a GitHub repo URL, PyPI page, or docs site — fetch it directly. This never hits the search API rate limit.

3. **If you get a 429, switch to `webfetch`.** The search API locks up but `webfetch` keeps working fine. For remaining unknowns, wait a few minutes then retry at most 2 at a time.

4. **Priority order:**
   ```
   webfetch (known URL) > websearch ≤3 at a time > wait + retry
   ```

5. **Plan searches before executing.** List what you need, group by known-URL vs. search-needed, and batch accordingly. This minimizes search calls.

### Failure Recovery

If rate-limited mid-research:
1. Switch remaining known-URL needs to `webfetch`
2. For unknowns you still need, wait 2–3 minutes then retry in pairs
3. Triage: skip low-impact searches and flag as "assumed from context"

## Research Document Template

Every research doc follows this structure:

```
# Title — Subtitle description
**Last updated:** YYYY-MM-DD

## Overview — 1–2 paragraphs: context, goals, constraints

## 1. TopicSection — Per-tool/library sections
   | Property | Value |
   | URL / Stars / License / Approach / Depends on | ... |
   How it works (prose)
   Code example (```python```)
   Suitability for Music Copilot

## N. Phase-Based Recommendations — Summary table
   | Phase | Feature | Recommended Approach | Dependencies |

## References — Numbered list
```

## Verification Checklist

Before locking in a research recommendation:

- [ ] License compatibility checked (MIT/Apache/BSD preferred; GPL negotiable; AGPL/non-commercial flagged)
- [ ] Windows compatibility confirmed
- [ ] Offline-capable confirmed (for analysis features)
- [ ] Python `pip install` available (preferred)
- [ ] GPU requirement noted (none for Phase 1–3)
- [ ] Last release date checked (avoid abandoned tools)
