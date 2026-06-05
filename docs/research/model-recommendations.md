# Model Recommendations — Lightweight Offline Models vs Free API Tiers

Model and tool recommendations for Music Copilot's audio, MIDI, and music analysis needs. Evaluates each candidate on offline capability, inference speed, package size, license, Windows compatibility, Python availability, and accuracy.

**Last updated:** 2026-06-05

## Overview

Music Copilot's architecture requires models that:
1. **Work fully offline** for core analysis (BPM, key, scale)
2. **Are Python-available** (`pip install` preferred)
3. **Run on Windows** without MSVC build tools (aubio is excluded)
4. **Are permissively licensed** (MIT/Apache/BSD preferred; GPL negotiable; AGPL/non-commercial problematic)
5. **Are lightweight** enough to run on producer laptops (no GPU required for Phase 1–3)

This document covers five categories: audio analysis, stem separation, music tagging/classification, music generation, and LLM inference for the AI Chat layer.

---

## 1. Audio Analysis (BPM, Key, Scale, Loudness)

Already implemented (`deeprhythm` + `librosa` + `music21`). This section validates the current stack and identifies upgrade paths.

| Tool | Task | Offline | Win | License | Weight | Accuracy | Phase | Verdict |
|------|------|---------|-----|---------|--------|----------|-------|---------|
| **deeprhythm 0.0.13** | BPM | ✅ | ✅ | MIT | ~7 MB model + ~123 MB PyTorch | ~95.9% Acc1 | ✅ Current | Keep — best offline BPM available |
| **librosa 0.11.0** | Features (chroma, onset, MFCC) | ✅ | ✅ | ISC | ~30 MB | N/A (toolkit) | ✅ Current | Keep — feature extraction only, not BPM |
| **music21 10.3.0** | Key/scale via Krumhansl-Schmuckler | ✅ | ✅ | BSD-3 | ~50 MB | ~75% key, ~83% mode | ✅ Current | Keep — best offline key analysis |
| **essentia 2.x** | BPM, key, loudness, features | ✅ | ✅ | AGPL-3.0 | ~80 MB + TF models | Comparable | Phase 2 | **Strong candidate** — replace librosa for feature extraction if AGPL acceptable. Includes EBU R128 loudness, spectral features, 578+ descriptors. Has `essentia_streaming_extractor_music` CLI for batch. |
| **bpm-detector** (libraz) | BPM + key | ✅ | ✅ | MIT | Minimal | ~85% BPM, ~80% key | Fallback | Lightweight alternative to deeprhythm. No GPU needed. Uses K-S key profiles + chroma. |
| **mixref 0.4.0** | BPM + LUFS + genre-aware | ✅ | ✅ | MIT | ~20 MB | ~90% BPM (EDM-focused) | Phase 2 | Genre-aware EDM profiles (DnB, Techno, House). EBU R128 loudness. Overlaps with Sample Analyzer plugin. |

### Essentia Deep Dive

Essentia is the most comprehensive audio analysis library available offline. Maintained by MTG at Universitat Pompeu Fabra. 2.1b6 released May 2026.

**Critical license note:** Essentia's core is AGPL-3.0. The pre-trained TensorFlow models are CC BY-NC-SA 4.0 (non-commercial). Commercial licensing is available upon request. This makes Essentia unsuitable for Music Copilot's core stack without a commercial license — but it's a **strong reference architecture** and useful for research/prototyping.

**Key models available:**
- TempoCNN — beat/tempo estimation (CNN-based, more robust than librosa)
- Discogs-EffNet — 400+ music style classification
- MusiCNN — auto-tagging (genre, mood, instrumentation)
- VGGish — AudioSet embeddings
- Spleeter — source separation (legacy, TF1.x)

**Recommendation:** Do not replace current stack with Essentia (AGPL issue). But monitor for permissive licensing changes. Use Essentia's model architecture as reference for custom implementations.

### BPM Accuracy Comparison (from 2026 benchmarks)

| Tool | Pop | Rock | EDM | Hip-Hop | Jazz/Odd | Avg |
|------|-----|------|-----|---------|----------|-----|
| deeprhythm | 96% | 94% | 98% | 92% | 88% | ~95% |
| Mixxx (open-source) | 93% | 92% | 96% | 85% | 58% | ~85% |
| essentia TempoCNN | 94% | 91% | 97% | 87% | 65% | ~87% |
| librosa beat_track | 70% | 65% | 80% | 60% | 40% | ~67% |
| bpm-detector (libraz) | 88% | 85% | 93% | 80% | 55% | ~82% |

Current stack (`deeprhythm`) is state-of-the-art for offline BPM. No replacement needed.

---

## 2. Stem Separation (Phase 9)

Not needed for v0.1 but important for future phases (reference track analysis, Finish My Idea).

| Tool | Stems | Offline | Win | License | Model Size | RAM | Quality (SDR) | Verdict |
|------|-------|---------|-----|---------|-----------|-----|---------------|---------|
| **Demucs (htdemucs)** | 4 (vocals/drums/bass/other) | ✅ | ✅ | MIT | ~2 GB | ~6-8 GB | ~9.5 dB avg | **Best overall** — actively maintained by Meta, best SDR scores, MIT license |
| **Demucs (htdemucs_ft)** | 4 + piano/guitar optional | ✅ | ✅ | MIT | ~2.5 GB | ~8 GB | ~10.2 dB avg | Higher quality but slower and more RAM |
| **BS-RoFormer** | 4–6 | ✅ | ✅ | MIT | ~1.5 GB | ~4 GB | ~10.5 dB avg | Emerging leader — slightly better than htdemucs, lower RAM. Newer architecture (2025–2026) |
| **Spleeter** (Deezer) | 2/4/5 | ✅ | ✅ | MIT | ~150 MB | ~2 GB | ~5.5 dB avg | Legacy — unmaintained since 2022, TF1.x, lower quality. Only if 5-stem (piano) needed |
| **Open-Unmix** | 2/4 | ✅ | ✅ | MIT | ~100 MB | ~2 GB | ~6.0 dB avg | Lightweight, good for batch. Lower quality than Demucs |
| **Meta Music AI** (new 2026) | multi-stem | ✅ | ✅ | MIT | ~3 GB | ~8 GB | ~11 dB avg | Very new, best reported SDR. Evaluate in Phase 9 |

### Decision: Skip for v0.1
- Stem separation is Phase 9 (Advanced Intelligence).
- When needed: start with **Demucs htdemucs** (MIT, production-ready, pip install).
- Monitor **BS-RoFormer** as it may overtake Demucs by Phase 9.

---

## 3. Music Tagging, Genre & Mood Classification (Phase 2+)

Beyond key/BPM, these models extract higher-level musical attributes for the AI Chat and Idea Library.

| Tool | Tasks | Offline | Win | License | Weight | Good For | Verdict |
|------|-------|---------|-----|---------|--------|----------|---------|
| **musicnn** | Genre, mood, instrumentation tags (50 tag vocabulary) | ✅ | ✅ | ISC | ~200 MB + TF | General-purpose tagging | Tag extraction: genre, mood, instrumentation. Pre-trained on MTT/MSD. Last updated 2021 but still functional. |
| **essentia MusiCNN** | Auto-tagging (87 genres, mood, instruments) | ✅ | ✅ | AGPL + CC BY-NC-SA | ~50 MB + TF | Genre classification | Best quality but license restricts commercial use |
| **essentia Discogs-EffNet** | 400+ style classification | ✅ | ✅ | AGPL + CC BY-NC-SA | ~30 MB + TF | Fine-grained genre | Overkill for v0.1, useful for Phase 9 |
| **librosa features + sklearn** | Custom classifier (train on your data) | ✅ | ✅ | BSD/MIT | Minimal | Custom use case | Not pre-trained — you need labeled data |
| **YAMNet** (Google) | 521 AudioSet events | ✅ | ✅ | Apache-2.0 | ~25 MB + TF | Sound event detection | Not music-specific — detects dog barks, applause, etc. Good for sample categorization |
| **mixref** | Genre-aware BPM + loudness profiles | ✅ | ✅ | MIT | ~20 MB | EDM-specific analysis | Limited to BPM/loudness, no genre classification per se |

### Decision: musicnn for Phase 2
- When "What genre is this?" or "What mood?" is needed: `pip install musicnn` gives 50-class tagging with ISC license.
- For deeper genre analysis: essentia models are better but license-restricted.
- No immediate need — Theory Engine handles scale/chord analysis deterministically.

---

## 4. Music/Symbolic Generation (Phase 3+)

For melody, bassline, and arrangement generation. Music Copilot's deterministic theory-based MIDI generation (already built) is the Phase 1 approach. These are for future AI-powered generation.

### Offline (Local) Models

| Model | Type | Offline | Win | License | GPU Needed? | Verdict |
|-------|------|---------|-----|---------|-------------|---------|
| **MusicGen** (Meta) | Text-to-audio, melody-conditioned | ✅ | ✅ | CC BY-NC 4.0 | Recommended (6 GB VRAM) | Best quality open-source music gen. Non-commercial license is limiting. |
| **MusicGen-1.5B** | Melody + text conditioning | ✅ | ✅ | CC BY-NC 4.0 | 8 GB VRAM | Higher quality, more control. Same license issue. |
| **ACE-Step 1.5** | Full song generation (with vocals) | ✅ | ✅ | Apache-2.0 | 4–8 GB VRAM | **Best license** (Apache). Generates full songs including vocals. Runs on consumer GPUs. |
| **YuE** (M-A-P) | Lyrics-to-song with singing vocals | ✅ | ✅ | Custom (free for commercial with AI disclosure) | 8+ GB VRAM | Impressive quality. License requires "generated with AI" disclosure. Supports style transfer via in-context learning. |
| **MusicGPT** | Wrapper around MusicGen, no Python required | ✅ | ✅ | Various | 6+ GB VRAM | Convenient CLI but same underlying model limits. |
| **Stable Audio Open** (Stability AI) | Text-to-audio, up to 47s | ✅ | ✅ | Stability AI Non-Commercial | 6 GB VRAM | Short clips only. Non-commercial license. |
| **LoopMaker** | On-device macOS (MLX) | ✅ | ❌ (macOS only) | Proprietary | Apple Silicon | Mac-only, closed source. Not suitable. |

### DLLM API Services (Cloud)

For when local generation is insufficient. These are complementary — Music Copilot's deterministic generations come first, AI generation is optional enhancement.

| Service | Capabilities | Free Tier | Paid | Notes |
|---------|-------------|-----------|------|-------|
| **Suno API** | Full song generation from text | Limited free credits | $10–30/mo | Best quality but costs money. |
| **Beatoven.ai** | Background music for content | Limited free | $6–20/mo | Target: content creators, not producers. |
| **ACE Music API** | Text-to-song, continues ACE-Step | Free tier available | Usage-based | Same model as ACE-Step but cloud-hosted. Free API key. |
| **Harmonai** (Dance Diffusion) | Audio-to-audio transformation | Free (open source) | N/A | Stable Diffusion for audio. Community-driven. |

### Decision: Procedural over ML for Phase 1–3

**For v0.1–Phase 3, Music Copilot's deterministic approach is correct.** The built-in Theory Engine + Chord Generator + Expression Engine cover all MIDI needs without AI. When AI generation is added (Phase 3+), the path is:

1. **Most practical**: ACE-Step 1.5 (Apache-2.0, runs on consumer GPUs, full songs)
2. **Highest quality open-source**: MusicGen (but CC BY-NC — can't use commercially without license purchase)
3. **Procedural hybrid**: Use `music21` + `arvo` library for algorithmic composition (isorhythm, minimalism, tintinnabuli) — MIT license, zero GPU, fully deterministic, unique output. Good for "Finish My Idea" groundwork.

---

## 5. LLM Provider Comparison (AI Chat Layer)

For the Co-Producer Chat, Why Does This Sound Good?, and Theory Teacher features. Music Copilot already has Provider ABC stubs for OpenAI, Groq, GLM, and OpenRouter.

| Provider | Free Tier | Best Model (Free) | Speed | Verdict |
|----------|-----------|-------------------|-------|---------|
| **Groq** | ~30 RPM, 500K tok/day, Llama 3.3 70B | Llama 3.3 70B (fits free tier) | 500–800 tok/s (fastest) | **Best for Music Copilot** — free tier generous enough for MVP production. 14K requests/day on Llama 3 8B. |
| **Google Gemini** | 1,500 req/day, 1M tok/min on Gemini 2.0 Flash | Gemini 2.0 Flash | Fast | Excellent free tier but Gemini Flash may not be music-theory-optimized. |
| **OpenRouter** | ~30 free models, aggregated | Various (routes to cheapest available) | Variable | Good as fallback — single API key to many providers. Free models are inconsistent. |
| **Mistral AI** | 1B tokens/month, all models (Large, Codestral) | Mistral Large | Fast | Very generous free tier. Strong for structured output (JSON) needed for plugin schemas. |
| **OpenAI** | No free tier (discontinued 2025) | N/A — paid only ($2.50–10/M tok) | Fast | Best quality but costs money. GPT-4o-mini is cheapest option at $0.15/M tok in. |
| **Anthropic Claude** | No free tier | N/A — paid only ($3–15/M tok) | Moderate | Best instruction following for complex music theory prompts. High cost. |
| **DeepSeek** | 500K tok/day, V3 model | DeepSeek V3 | Fast | Cost-effective at $0.30/M tok. Strong on code — useful for music serialization. |

### Recommendation: Groq as primary, OpenRouter as fallback

Music Copilot's Provider Layer already supports multiple backends. The recommended configuration:

| Priority | Provider | Use Case | Why |
|----------|----------|----------|-----|
| **Primary** | Groq (Llama 3.3 70B) | All chat features | Fastest inference, generous free tier (>14K req/day), OpenAI-compatible API |
| **Fallback** | OpenRouter | When Groq rate-limited | Single API key for 30+ free models |
| **Paid upgrade** | OpenAI GPT-4o-mini or Claude Sonnet 4 | If quality demands it | $0.15–3/M tok, significantly better music theory reasoning |

**Important:** Music Copilot already uses `llm.generate(prompt)` abstraction — switching providers is a config change, not a code change. Start with Groq free tier; upgrade to paid only if usage demands it.

---

## 6. Music Structure Analysis (Phase 5+)

For Arrangement Breakdown, Reference Track Intelligence, and Finish My Idea features.

| Tool | Tasks | Offline | Win | License | Verdict |
|------|-------|---------|-----|---------|---------|
| **MSAF** (Music Structure Analysis Framework) | Section boundary detection, segment labeling | ✅ | ✅ | MIT | Best open-source structure analysis. Pip install. MIT license. Last updated 2023 but stable. |
| **librosa** | Self-similarity matrix, novelty curves | ✅ | ✅ | ISC | Building blocks for custom structure analysis |
| **musicaiz** | Structure analysis with graph-based methods (G-PELT, G-Window) | ✅ | ✅ | MIT | Newer approach (2026 paper). F1-score ~0.56 on Schubert dataset. Integrated into Python package. |
| **chorus-from-music-structure** | Chorus detection for pop music | ✅ | ✅ | MIT | Specialized for pop song structure — useful for "Find the drop" feature |

### Decision: MSAF for Phase 5
- When structure analysis is needed: `pip install msaf` for MIT-licensed section boundary detection.
- For EDM-specific (drop/build/breakdown): custom approach using energy + novelty curves from librosa.
- musicaiz for symbolic music structure (MIDI-based, not audio).

---

## 7. Evaluation Framework

For each model candidate, the evaluation matrix is:

```
┌─────────────────┬─────────────────────────────────────────────┐
│ Criterion       │ Weight (1–5) │ Rationale                    │
├─────────────────┼──────────────┼──────────────────────────────┤
│ Offline         │ 5            │ Core architectural constraint │
│ Windows compat  │ 5            │ Only target platform (FL 24)  │
│ License         │ 4            │ MIT/Apache/BSD for comm prod  │
│ Python pip      │ 4            │ Must integrate with FastAPI   │
│ GPU not required│ 3            │ Laptops may lack GPU          │
│ Active maint    │ 3            │ Security + compatibility      │
│ Accuracy        │ 3            │ "Good enough" over "perfect"  │
│ Package size    │ 2            │ <2 GB preferred               │
│ Speed           │ 2            │ <5s for typical analysis      │
└─────────────────┴──────────────┴─────────────────────────────┘
```

---

## 8. Summary Recommendations by Phase

| Phase | Feature | Recommended Model/Tool | License | Cost |
|-------|---------|----------------------|---------|------|
| **v0.1** | BPM detection | `deeprhythm` (already in use) | MIT | Free |
| **v0.1** | Key/scale | `music21` K-S (already in use) | BSD-3 | Free |
| **v0.1** | Feature extraction | `librosa` (already in use) | ISC | Free |
| **v0.1** | AI Chat | Groq Llama 3.3 70B (free tier) | — | Free |
| **Phase 2** | Genre/mood tagging | `musicnn` | ISC | Free |
| **Phase 2** | Chord recognition | CREMA | BSD-2 | Free |
| **Phase 2** | Polyphonic pitch→MIDI | `basic-pitch` | Apache-2.0 | Free |
| **Phase 3** | Melody/bassline gen | `music21` + procedural rules | BSD-3 | Free |
| **Phase 3** | AI song generation | ACE-Step 1.5 | Apache-2.0 | Free (self-host) |
| **Phase 5** | Structure analysis | MSAF + librosa | MIT | Free |
| **Phase 7** | DAW live MIDI | `python-rtmidi` | MIT | Free |
| **Phase 9** | Stem separation | Demucs htdemucs | MIT | Free (~2 GB model) |
| **Phase 9** | Genre classification | essentia Discogs-EffNet | AGPL (research only) | Free (NC) |
| **Any** | Paid LLM upgrade | OpenAI GPT-4o-mini / Claude Sonnet 4 | — | $0.15–3/M tok |

### Never-Reccommended (why)

| Tool | Reason |
|------|--------|
| **aubio** | Windows requires MSVC build tools (confirmed blocker) |
| **madmom** | Non-commercial license, unmaintained since 2020 |
| **Spleeter** | TF1.x dependency, unmaintained, lower quality than Demucs |
| **autochord** | Windows unsupported, 67% accuracy |
| **librosa beat_track** | Already replaced by `deeprhythm` — 67% vs 95% |
| **MMM** (Markov Melody Model) | Rule-based alternatives (`music21`) are more capable |
| **Spotify audio-features API** | Discontinued November 2024 |

---

## References

1. deeprhythm. https://pypi.org/project/deeprhythm/
2. librosa. https://librosa.org/
3. music21. https://music21.org/
4. essentia. https://essentia.upf.edu/
5. essentia models. https://essentia.upf.edu/models.html
6. Demucs. https://github.com/facebookresearch/demucs
7. musicnn. https://github.com/jordipons/musicnn
8. MSAF. https://github.com/urinieto/msaf
9. ACE-Step. https://github.com/ACE-Step/ACE-Step
10. YuE. https://github.com/multimodal-art-projection/YuE
11. Groq pricing. https://groq.com/pricing/
12. OpenRouter. https://openrouter.ai/
13. AgentDeals LLM API Pricing Comparison 2026. https://agentdeals.dev/llm-api-pricing
14. free-llm.com. Best Free LLM APIs in 2026. https://free-llm.com/guides/best-free-llm-apis-2026
15. Beatoven.ai. *AI Music Generation Models — Complete Guide*. https://www.beatoven.ai/blog/ai-music-generation-models-the-only-guide-you-need
16. StemSplit. *htdemucs vs BS-RoFormer vs Spleeter: A 2026 Audio Source Separation Benchmark*. https://aistemsplitter.org/blog/htdemucs-vs-bs-roformer-vs-spleeter-2026-benchmark
17. LA Studio. *BPM Comparison 2026: 5 Free BPM Finders Tested*. https://la-studio.cc/en/blog/bpm-finder-comparison
18. bpm-detector (libraz). https://github.com/libraz/bpm-detector
19. mixref. https://pypi.org/project/mixref/
20. arvo. https://github.com/georgesdimitrov/arvo
