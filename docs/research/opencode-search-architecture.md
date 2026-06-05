# OpenCode Search Architecture — Rate limits, built-in tools, and free MCP alternatives

**Last updated:** 2026-06-05

## Overview

Documents the internal architecture of OpenCode's built-in search tools (websearch, webfetch), quantitative rate-limit characterization, and recommendations for supplementing with free MCP-based search servers. These findings govern all web research conducted for Music Copilot development.

## 1. Built-in Search Tool Architecture

### 1.1 websearch

| Property | Value |
|----------|-------|
| Backend | Exa AI hosted MCP service |
| Endpoint | `search.parallel.ai/mcp` (POST) |
| Auth | None required — connects via OpenCode's Exa proxy |
| Availability | Requires OpenCode provider OR `OPENCODE_ENABLE_EXA=1` env var |
| Transport | HTTP POST to Exa's hosted MCP endpoint |
| Rate limit | Shared proxy (not per-user) |

The `websearch` tool is one of OpenCode's built-in tools. It does not use an MCP server configuration — it is hardcoded into OpenCode's tool set and always connects to Exa AI via `search.parallel.ai/mcp`. No API key is needed; OpenCode handles the connection transparently.

### 1.2 webfetch

| Property | Value |
|----------|-------|
| Transport | Direct HTTP GET |
| Endpoint | User-specified URL |
| Auth | None |
| Rate limit | No observed limit |

`webfetch` fetches content from arbitrary URLs via direct HTTP GET. It has no intermediary proxy, no authentication, and no observed rate limit. It is safe for concurrent use and is the preferred tool for retrieving content from known URLs.

## 2. Rate Limit Characterization

Tests were performed on 2026-06-05 using the OpenCode DeepSeek V4 Flash Free model. Three rounds of testing with varying concurrency and query types.

### 2.1 Test Results

| Test | Concurrent Calls | Query Type | Result | Notes |
|------|-----------------|------------|--------|-------|
| Round 1a | 3 | Dummy ("timing test A/B/C") | ✅ All 200 OK | No rate limit |
| Round 1b | 5 | Dummy ("timing test A–E") | ✅ All 200 OK | No rate limit |
| Round 1c | 8 | Dummy ("test 1"–"test 8") | ✅ All 200 OK | No rate limit |
| Round 2 | 10 | Realistic music research | ❌ ALL 429 | Limit hit instantly |
| Recovery | 1 (serial) | Realistic music query | ❌ 429 after 30s | Still locked |
| Recovery | 1 (serial) | Realistic music query | ❌ 429 after 90s | Still locked |
| Recovery | 1 (serial) | Realistic music query | ❌ 429 after 150s | Still locked |
| Recovery | 1 (serial) | Minimal query | ❌ 429 after ~5+ min | Still locked |

### 2.2 Key Findings

1. **Rate limit is per-unit-time, not per-call-count.** ~15 successful calls were allowed in Round 1 before Round 2 triggered the lockout. The limit resets on a fixed or sliding window, not per-session.

2. **Trigger threshold is approximately 10 concurrent calls.** 8 calls succeeded, 10 failed. The exact ceiling may vary with window state.

3. **Cooldown exceeds 5 minutes.** No recovery observed within that window. This is a hard lockout, not a brief throttle.

4. **Query content does not affect rate limiting.** Both dummy queries and realistic music research queries were treated identically. The limit is purely on request volume.

5. **Rate limit is shared across all OpenCode users** of the Exa proxy (`search.parallel.ai/mcp`). It is not per-user or per-session — concurrency from other users can contribute to the limit being hit.

6. **webfetch is completely unaffected** when websearch is rate-limited. The two tools share no infrastructure.

## 3. Free MCP Server Options for Web Search

Configuring a secondary search MCP server provides a fallback when the built-in `websearch` Exa proxy is rate-limited, and gives two independent search backends with separate rate limits.

### 3.1 Brave Search MCP — Recommended

| Property | Value |
|----------|-------|
| URL | https://github.com/brave/brave-search-mcp-server |
| Maintainer | Brave Software (official) |
| Stars | 1,100+ |
| License | MIT |
| Version | v2.0.83 (Jun 1, 2026) |
| Language | TypeScript |
| Install | `npx -y @brave/brave-search-mcp-server` |
| Free tier | 2,000 queries/month (no credit card required) |
| API key | Required — sign up at https://brave.com/search/api/ |

**Available tools:**

| Tool | Description |
|------|-------------|
| `brave_web_search` | Web search (max 400 chars, 20 results/page, freshness/country/spellcheck filters) |
| `brave_local_search` | Local business and place search |
| `brave_video_search` | Video search with metadata and thumbnails |
| `brave_image_search` | Image search (up to 200 results) |
| `brave_news_search` | News search with freshness controls |
| `brave_summarizer` | AI-powered summarization from search results |
| `brave_llm_context` | Pre-extracted web content optimized for LLMs/RAG |
| `brave_place_search` | POI search by lat/long or location name |

**Pricing:**

| Plan | Queries/mo | Price | Best for |
|------|-----------|-------|----------|
| Free | 2,000 | $0 | Research, light use |
| Pro | 10,000 | $19.99 | Regular development |
| Enterprise | Custom | Custom | Production |

**OpenCode configuration:**

```json
{
  "mcp": {
    "brave-search": {
      "type": "local",
      "command": ["npx", "-y", "@brave/brave-search-mcp-server", "--transport", "stdio"],
      "environment": {
        "BRAVE_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

On Windows, wrap with `cmd /c`:

```json
{
  "mcp": {
    "brave-search": {
      "type": "local",
      "command": ["cmd", "/c", "npx", "-y", "@brave/brave-search-mcp-server", "--transport", "stdio"],
      "environment": {
        "BRAVE_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

### 3.2 Puppeteer MCP — Browser Automation (Archived)

| Property | Value |
|----------|-------|
| URL | https://github.com/modelcontextprotocol/servers-archived/tree/main/src/puppeteer |
| Maintainer | MCP steering group (archived May 2025) |
| Stars | 275 (archived repo) |
| License | MIT |
| Install | `npx -y @modelcontextprotocol/server-puppeteer` |
| API key | None required |

Not recommended for search. It opens a real browser instance (Chrome/Chromium) which is resource-heavy. Better suited for visual browser automation (screenshots, JS execution, form filling) than text search.

### 3.3 Other MCP Search Servers

| Server | Type | Cost | Notes |
|--------|------|------|-------|
| Context7 | Remote MCP | Free tier | Documentation search (https://mcp.context7.com/mcp) |
| Tavily Search | Local MCP | Free tier (1,000 queries/mo) | Needs Tavily API key |
| Grep by Vercel | Remote MCP | Free | Code search on GitHub (https://mcp.grep.app) — not general web search |

## 4. Updated Search Strategy

### Rotation Pattern

Built on the findings above, the research rotation strategy is:

```
Round A: websearch (≤5 concurrent) → webfetch (parse results) → 
Round B: webfetch (known URLs from Round A) → webfetch (docs/sources) →
Round C: websearch (≤5 concurrent, if recovered) → webfetch → ...
```

If websearch returns 429 at any point:
1. Immediately switch to webfetch-only for all remaining research
2. Wait 3+ minutes before retrying websearch
3. If Brave Search MCP is configured, use it as an alternative search backend during the cooldown

### Concurrency Guidelines

- **websearch**: Maximum 5 concurrent calls per batch. Prefer 3-4 for safety margin.
- **webfetch**: No concurrency limit observed. Can fire all known URLs in parallel.
- **Cross-session**: The rate limit persists across conversation compaction turns and model switches. A 429 in one conversation session means websearch will likely 429 in the next.

## 5. DeepSeek V4 Flash Free — Model Context

| Property | Value |
|----------|-------|
| Provider | OpenCode Zen |
| Model ID | `opencode/deepseek-v4-flash-free` |
| Type | Chat completion (OpenAI-compatible API) |
| Cost | Free (limited time) |
| Privacy | Data may be used for model improvement during free period |

The model is served through OpenCode Zen's infrastructure using an OpenAI-compatible chat completions API. It is listed among 4 free models alongside Big Pickle, MiMo-V2.5 Free, and Nemotron 3 Ultra Free.

## References

1. OpenCode Built-in Tools documentation — https://opencode.ai/docs/tools/
2. OpenCode MCP Servers documentation — https://opencode.ai/docs/mcp-servers/
3. Brave Search MCP Server (GitHub) — https://github.com/brave/brave-search-mcp-server
4. Brave Search API Pricing — https://brave.com/search/api/
5. MCP Reference Servers (archived — Puppeteer) — https://github.com/modelcontextprotocol/servers-archived/tree/main/src/puppeteer
6. OpenCode Custom Tools documentation — https://opencode.ai/docs/custom-tools/
