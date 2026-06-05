# Overall Musical Understanding — Holistic Music Analysis & Comprehension

Tools, libraries, and frameworks for combining low-level audio features (BPM, key, genre) into a unified, intelligent understanding of musical structure, emotion, transcription, and similarity. Covers the analysis pipeline needed for Finish My Idea, Why Does This Sound Good?, Reference Track Intelligence, and the Producer Chat context layer.

**Last updated:** 2026-06-05

## Overview

Music Copilot's current analysis stack handles individual features (BPM via deeprhythm, key/scale via music21 K-S, samples via librosa). But features like "Why Does This Sound Good?" and "Finish My Idea" require a **holistic** understanding — combining structure analysis, harmonic reduction, instrumentation detection, energy/tension curves, genre classification, and audio-to-MIDI transcription into a unified representation a producer can interact with.

This research evaluates tools that bridge the gap between isolated features and comprehensive musical comprehension. The goal is to build a layered analysis pipeline where each stage enriches the next:

```
Audio → [librosa features] → structure boundaries → sections labeled → 
  → harmonic reduction → tension/energy curve → genre/mood → 
  → transcription (optional) → unified project state
```

---

## 1. Omnizart — Full Automatic Music Transcription (AMT)

The single most impactful finding for holistic musical understanding. Omnizart transcribes polyphonic music into multiple symbolic representations simultaneously.

| Property | Value |
|----------|-------|
| URL | https://github.com/Music-and-Culture-Technology-Lab/omnizart |
| Version | 0.6.3 (May 2026) |
| Stars | 1,900 |
| License | MIT |
| Approach | Deep learning (CNN + RNN hybrids), separate models per task |
| Depends on | TensorFlow, Keras, librosa |
| CLI | `omnizart music transcribe`, `omnizart drum transcribe`, `omnizart chord transcribe`, etc. |
| Python API | Yes — `from omnizart import ...` |

### What It Transcribes

| Application | Output | Quality |
|-------------|--------|---------|
| `music` | MIDI notes of pitched instruments (multi-instrument) | Strong for solo/instrumental; degrades with dense mixes |
| `drum` | MIDI drum events (kick, snare, hi-hat, etc.) | Good for pop/rock; electronic drum patterns may vary |
| `vocal` | Note-level vocal melody (pitches + timing) | Monophonic — works well for lead vocals |
| `vocal-contour` | Frame-level F0 contour | Continuous pitch track, useful for pitch correction analysis |
| `chord` | Chord progressions (time-stamped) | Strong — 80%+ accuracy on pop music |
| `beat` | Beat positions (time-stamped) | Solid beat tracking, comparable to librosa |

### Usage

```python
# CLI
omnizart music transcribe my_track.wav       # → my_track.mid (pitched instruments)
omnizart chord transcribe my_track.wav        # → my_track.chord (text format)
omnizart drum transcribe my_track.wav         # → my_track.mid (drum events)
omnizart vocal transcribe my_track.wav        # → my_track.mid (vocal melody)
omnizart beat transcribe my_track.wav         # → my_track.beat (beat positions)

# Python
from omnizart.music import app as music_app
midi_data = music_app.transcribe("my_track.wav")
# midi_data is an omnizart MusicTranscriptionResult with notes, time_signature, etc.
```

### Suitability for Music Copilot

- **Phase 1–2 (current scope):** Too heavy for core analysis pipeline. ~2 GB model download, TF dependency. But excellent for advanced features.
- **Phase 3+ (Finish My Idea):** Omnizart's chord transcription + beat tracking could power "analyze this loop" features without human input.
- **Phase 5+ (Reference Track Intelligence):** Full transcription of reference tracks into MIDI + chord labels + drum patterns is the ideal input for recreation guides.
- **Key advantage:** Single `pip install omnizart` gives 6 transcription modes (music, drum, vocal, vocal-contour, chord, beat) — drastically reducing per-feature dependencies.
- **Limitation:** Not real-time. Transcription takes 30s–2min for a 3-minute track. GPU recommended but CPU works (slower).
- **License:** MIT — fully compatible with commercial use.

---

## 2. Music Structure Analysis (Section Boundary Detection)

Detecting where intro ends, verse begins, chorus hits, breakdown starts, and outro fades. Essential for arrangement breakdown, reference track analysis, and Finish My Idea.

### 2.1 MSAF — Music Structure Analysis Framework

| Property | Value |
|----------|-------|
| URL | https://github.com/urinieto/msaf |
| Stars | 555 |
| License | MIT |
| Last release | v0.1.80 (Jun 2023) — beta, stable |
| Approach | Multiple algorithms: spectral clustering, HMM, CNN features, novelty curves |
| Input | Audio file (WAV/MP3) |
| Output | Section boundaries (time-stamped) + labels (A, B, C...) |

**How it works:**
1. Extracts features (MFCCs, chroma, spectral) via librosa
2. Computes self-similarity matrix
3. Applies one of several algorithms for boundary detection:
   - `scluster` — spectral clustering
   - `fmc2d` — fast multi-feature 2D segmentation
   - `custom` — user-defined via `msaf.algorithms`
4. Labels sections by similarity (homogeneous segments get same label)

```python
import msaf

boundaries, labels = msaf.process("track.wav")
# boundaries: [0.0, 8.0, 24.0, 40.0, 56.0, 62.0] (seconds)
# labels: ['A', 'B', 'A', 'C', 'B', 'A']
```

**Suitability for Music Copilot:**
- **Phase 5 (Reference Track Intelligence):** Best option for section boundary detection. MIT license, pip install, battle-tested.
- **Limitation:** Labels are abstract (A/B/C) — doesn't name "verse" vs "chorus". Needs custom labeling logic based on repetition, instrumentation changes, or AI classification.
- **EDM limitation:** MSAF was trained/tested primarily on pop/rock. Electronic music (long breakdowns, build-ups, drops) may need custom tuning of the novelty curve parameters.

### 2.2 Symbolic Music Section Detection (2025)

| Property | Value |
|----------|-------|
| Paper | https://arxiv.org/abs/2509.16566 |
| Dataset | SLMS — 6,134 MIDI files annotated with section boundaries from Lakh MIDI |
| Approach | CNN on 3-channel piano rolls synthesized with overtone encoding |
| F1 score | ~0.52 (outperforms audio-based CBM by ~0.10) |

Key finding: MIDI-based structure detection outperforms audio-based approaches for symbolic music. Uses a novel encoding scheme that converts arbitrary MIDI instrumentations into 3-channel piano rolls (synthesized overtones). Not available as a pip-installable package but the code and models are open-source.

**Relevance:** When Music Copilot has generated MIDI (Theory Engine + MIDI Export Engine), this approach could automatically label sections (intro → verse → chorus → breakdown → drop). Phase 6+ scope.

### 2.3 MusicBoundariesCNN (Research)

| Property | Value |
|----------|-------|
| URL | https://github.com/carlosholivan/MusicBoundariesCNN |
| Stars | 40 |
| License | View license (research code) |
| Approach | CNN taking SSLM (Self-Similarity Lag Matrices) + MLS features |
| Dataset | SALAMI 2.0 |
| F1 score | ~0.41 (comparable to state-of-the-art at time of paper, 2021) |

Research-grade boundary detection with pretrained weights. Not pip-installable. The SSLM computation is done via a separate library (SelfSimilarityMatrices). Suitable as a reference architecture for a custom boundary detection system, not as a drop-in library.

### Suitability for Music Copilot

| Tool | Phase | Verdict |
|------|-------|---------|
| MSAF | Phase 5 | **Primary choice** — `pip install msaf`, MIT, battle-tested. Needs EDM-specific parameter tuning. |
| SLMS MIDI MSA | Phase 6 | Reference architecture for MIDI-based structure detection. Useful when analyzing generated arrangements. |
| MusicBoundariesCNN | Research only | Not production-ready. Refer to CNN SSLM approach if building custom boundary detection. |

---

## 3. Energy Curve / Musical Tension Analysis

No standalone library exists for computing musical energy curves or tension over time. These must be built from librosa features.

### 3.1 Audio-Based Energy Curve (librosa)

A multi-dimensional energy curve can be constructed from:

```python
import librosa
import numpy as np

def compute_energy_curve(audio_path):
    y, sr = librosa.load(audio_path)

    # 1. RMS energy envelope (loudness over time)
    rms = librosa.feature.rms(y=y)[0]

    # 2. Spectral centroid (brightness — correlates with intensity)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

    # 3. Spectral bandwidth (width — correlates with density)
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]

    # 4. Onset strength (rhythmic density)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    # 5. Chroma deviation (harmonic change — correlates with tension)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_deviation = np.std(chroma, axis=0)  # high = more harmonic complexity

    return {
        "rms": rms,
        "centroid": centroid,
        "bandwidth": bandwidth,
        "onset_strength": onset_env,
        "chroma_deviation": chroma_deviation,
        "tempo": librosa.feature.tempo(y=y, sr=sr),
    }
```

Each curve is a time series that can be:
- Normalized to [0, 1] and combined into a single "energy score"
- Smoothed with a rolling window for macro-level structure (verse → build → drop)
- Used as input to section boundary detection (energy drops signal breakdowns)

### 3.2 Tonal Tension (Music Theory-Based)

For the "Why Does This Sound Good?" feature, Lerdahl's Tonal Pitch Space tension formula (already documented in Topic 5, Section 5.2) provides a principled model:

```
Tension = α·hierarchical_distance + β·sensory_dissonance + γ·horizontal_motion
```

This requires chord labels as input (not raw audio). The pipeline is:
1. Detect chords from audio (Omnizart or CREMA)
2. Map chords to TPS coordinates
3. Compute per-chord tension values
4. Plot tension curve over time

**No Python library implements this.** Music Copilot would need to implement Lerdahl's TPS as a music21 plugin or standalone module. The implementation is ~200 lines of Python (pitch-class set distances + key profile distances + sensory dissonance from interval vectors).

### 3.3 Implementation Strategy for Music Copilot

| Feature | Approach | Dependencies | Phase |
|---------|----------|--------------|-------|
| Energy curve (audio) | librosa spectral + RMS features | librosa (already installed) | Phase 1 |
| Tonal tension (symbolic) | Lerdahl TPS from chord labels | music21 (already installed) | Phase 4 |
| Combined understanding | Normalize + fuse energy + tension + structural info | numpy | Phase 4 |

---

## 4. Genre, Mood & Instrumentation Classification

Already covered in depth in Topic 4 (Model Recommendations), Section 3. Brief summary and MIR-specific additions:

### Currently Recommended Stack

| Tool | License | Tags | Install | Phase |
|------|---------|------|---------|-------|
| **musicnn** | ISC | 50 tags: genre, mood, instrumentation | `pip install musicnn` | Phase 2 |
| **YAMNet** | Apache-2.0 | 521 AudioSet events (not music-specific) | `pip install yamnet` | Phase 2 |
| **Essentia Discogs-EffNet** | AGPL (research) | 400+ style classifications | Reference only | Phase 9 |
| **Omnizart** (instrument via transcription) | MIT | Instrument from note density per pitch range | `pip install omnizart` | Phase 3+ |

### musicnn Deep Dive

Pronounced "musician" — a set of pre-trained CNNs for music audio tagging:

```python
from musicnn.tagger import top_tags

tags = top_tags('track.mp3', model='MTT_musicnn', topN=10)
# ['techno', 'electronic', 'synth', 'fast', 'beat', 'drums', 'no vocals', 'dance', 'ambient']

from musicnn.extractor import extractor
taggram, tags = extractor('track.mp3', model='MTT_musicnn')
# taggram: time-frequency tagging (how tags change over time)
```

Key advantages:
- **ISC license** — permissive, no restrictions
- **Time-varying taggram** — detects how genre/mood/instrumentation changes within a track (intro vs drop)
- **Pre-trained on MagnaTagATune (MTT)** — 25,000+ tracks, 188 tags
- **Also trained on Million Song Dataset (MSD)** — for genre-only tasks

**Limitation:** Last updated 2021. Uses TensorFlow 1.x. May have compatibility issues with TF 2.x (workaround exists via TF 1.x compatibility mode). Consider `tf2onnx` conversion if issues arise.

---

## 5. Audio-to-MIDI Transcription (Full Polyphonic)

Beyond Basic Pitch (already covered in Topic 4), full multi-instrument transcription unlocks reference track intelligence and Finish My Idea.

### Comparison Table

| Tool | Instruments | License | Model Size | GPU Req | Accuracy | Phase |
|------|-------------|---------|------------|---------|----------|-------|
| **Omnizart** (music) | Multi-pitch, multi-instrument | MIT | ~2 GB | Optional (slower on CPU) | Good (solo/instrumental) | Phase 3+ |
| **Basic Pitch** | Single instrument (polyphonic) | Apache-2.0 | ~30 MB | No | Very good (single instrument) | Phase 2 |
| **Omnizart** (chord) | Chord labels | MIT | ~500 MB | Optional | 80%+ on pop | Phase 3+ |
| **Omnizart** (drums) | Drum MIDI | MIT | ~300 MB | Optional | Good | Phase 3+ |
| **CREMA** | Chord recognition | BSD-2 | ~200 MB | No | ~75% on real recordings | Phase 2 |

### Transcription Pipeline for Reference Track Intelligence

```
Reference audio
    ↓
[Omnizart music transcribe] → MIDI of pitched instruments
[Omnizart chord transcribe] → Chord progression with timestamps
[Omnizart drum transcribe]  → Drum pattern MIDI
[Omnizart beat transcribe]  → Beat grid alignment
    ↓
Music21 analysis → Key, scale, harmonic function
    ↓
Structure analysis (MSAF) → Section boundaries
    ↓
Unified project state → Ready for recreation guide / analysis
```

This pipeline is Phase 5+ scope. For Phase 1–2, the existing deeprhythm (BPM) + music21 (key) + librosa (features) stack is sufficient.

---

## 6. Music Similarity & Recommendation

Content-based music similarity enables "Find similar tracks" and intelligent sample suggestions.

### 6.1 Gaia (by MTG, Essentia's companion)

| Property | Value |
|----------|-------|
| URL | https://github.com/MTG/gaia |
| Stars | 298 |
| License | AGPL-3.0 |
| Approach | C++ library with Python bindings. Applies similarity measures & classification on audio analysis results. Uses SVM + kNN on feature vectors from Essentia. |
| Status | Last release v2.4.6 (Nov 2019) — unmaintained |

**How it works:**
1. Extract features with Essentia (mel-spectrum, MFCC, tonal features, rhythm descriptors)
2. Build a Gaia "pool" of feature vectors
3. Train SVM classifier or use kNN for similarity search
4. Classify new audio or find nearest neighbors in feature space

**Critical license note:** AGPL-3.0. Same restriction as Essentia — can't use in core Music Copilot without commercial license. Reference architecture only.

### 6.2 Custom Similarity from librosa Features

For Phase 2–3, a simpler approach without external dependencies:

```python
def compute_similarity_features(audio_path):
    y, sr = librosa.load(audio_path)
    features = {
        "mfcc_mean": librosa.feature.mfcc(y=y, sr=sr).mean(axis=1),       # 20-dim timbre
        "chroma_mean": librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1), # 12-dim harmony
        "spectral_contrast": librosa.feature.spectral_contrast(y=y, sr=sr).mean(axis=1),  # 7-dim texture
        "tempo": librosa.feature.tempo(y=y, sr=sr),
    }
    return np.concatenate([v.flatten() for v in features.values()])

def find_similar(reference_features, library_features, top_n=5):
    from sklearn.metrics.pairwise import cosine_similarity
    similarities = cosine_similarity([reference_features], library_features)[0]
    return np.argsort(similarities)[-top_n:][::-1]
```

This approach:
- Requires zero extra dependencies (librosa + numpy + sklearn)
- Can be extended with deeprhythm BPM, music21 key, and musicnn tags
- Works offline
- Suitable for Phase 2 "suggest similar samples" feature

### 6.3 Other Similarity Tools

| Tool | Purpose | License | Verdict |
|------|---------|---------|---------|
| **midisim** (GitHub) | MIDI-to-MIDI similarity at scale | Not specified (4 ★) | Small project. Useful reference for MIDI similarity algorithms. |
| **beattrack (HerrStolzier)** | Sonic similarity via Chromaprint + vector embeddings | Not specified (1 ★) | Web-based prototype (Next.js + Python). Interesting approach (audio fingerprinting → embeddings) but not production-ready. |
| **EigenBeats** | Content-based similarity via PCA + autoencoder | Not specified (0 ★) | Academic project. Reference for autoencoder-based similarity. |

### Suitability for Music Copilot

- **Phase 2:** Custom librosa feature vector + cosine similarity covers "find similar" with no extra deps.
- **Phase 5+:** Gaia's SVM approach is the principled solution (AGPL compatibility must be resolved).
- **MIDI similarity:** midisim's approach could be adapted for the Idea Library when comparing generated melodies.

---

## 7. MIRFLEX — Unified Feature Extraction Framework

| Property | Value |
|----------|-------|
| Paper | https://arxiv.org/abs/2411.00469 (ISMIR 2024 Late-Breaking Demo) |
| Authors | Chopra, Roy, Herremans (SUTD) |
| License | CC BY 4.0 (research) |
| Approach | Modular system wrapping SOTA models for unified feature extraction |
| Features | Key, downbeats, genre, instrument recognition, vocals/instrumental classification, vocals gender detection |

**Integrated models:**
- Key detection: CREMA or deep learning models
- Downbeats: Madmom (non-commercial) or custom models
- Genre: Musicnn or Essentia Discogs-EffNet
- Instrument recognition: Custom CNN
- Vocals/instrumental: Custom classifier
- Vocals gender: Custom classifier

**Relevance:** MIRFLEX demonstrates the architectural pattern Music Copilot should follow: wrap individual SOTA models behind a unified interface. The modular design allows swapping models as better ones emerge. No pip package available yet — monitor for 2026–2027 release.

---

## 8. Unified Analysis Pipeline Architecture

Combining all findings into a layered architecture for Music Copilot:

```
┌─────────────────────────────────────────────────────────┐
│                    Producer Chat / AI                     │
│  (context: full project state + analysis results)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Comprehension Layer (Phase 4+)               │
│  • Lerdahl TPS tension calculation                       │
│  • Energy + tension fused curve                          │
│  • "Why does this sound good?" analysis                  │
│  • Arrangement structure labeling                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Analysis Layer (Phase 2-3+)                  │
│  • MSAF → section boundaries                             │
│  • musicnn → genre/mood/instrumentation taggram          │
│  • Omnizart → full transcription (optional)              │
│  • librosa → energy curves + feature extraction          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Core Layer (Phase 1 — already built)         │
│  • deeprhythm → BPM                                      │
│  • music21 K-S → key, scale                              │
│  • librosa → MFCC, chroma, onset, spectral features      │
│  • Theory Engine → chords, scales, intervals             │
└─────────────────────────────────────────────────────────┘
```

Each layer feeds into the next. The Core Layer runs on every sample upload. The Analysis Layer runs on explicit user action (transcribe, analyze). The Comprehension Layer runs on demand for "Why Does This Sound Good?" and similar features.

---

## 9. Phase-Based Recommendations

| Phase | Feature | Recommended Approach | Dependencies |
|-------|---------|---------------------|--------------|
| **v0.1** | BPM detection | deeprhythm (already built) | deeprhythm |
| **v0.1** | Key/scale detection | music21 K-S (already built) | music21 |
| **v0.1** | Feature extraction | librosa (already built) | librosa |
| **Phase 2** | Genre/mood tagging | musicnn `top_tags()` | `pip install musicnn` |
| **Phase 2** | Sample similarity | librosa feature vector + cosine similarity | librosa + numpy |
| **Phase 3+** | Full audio transcription | Omnizart for chords + beat + instrument separation | `pip install omnizart` (~2 GB models) |
| **Phase 3+** | Chord detection from audio | Omnizart `chord transcribe` or CREMA | `pip install omnizart` |
| **Phase 4** | Tension/energy curve | Custom librosa features + Lerdahl TPS (from Topic 5) | librosa + music21 |
| **Phase 4** | "Why Does This Sound Good?" | Lerdahl TPS tension analysis of detected chords | music21 (implement TPS) |
| **Phase 5** | Section boundary detection | MSAF with EDM-tuned parameters | `pip install msaf` |
| **Phase 5** | Reference track analysis | Omnizart + MSAF + music21 unified pipeline | omnizart + msaf |
| **Phase 5** | Structure-aware similarity | MSAF boundaries + librosa features per section | msaf + librosa |
| **Phase 5+** | ML similarity search | Gaia SVM approach if AGPL resolved | Essentia + Gaia |
| **Phase 6** | MIDI structure labeling | SLMS-inspired CNN on generated MIDI | Custom model |

### Implementation Notes

1. **Omnizart is the biggest unlock** for Phase 3+ — a single dependency that provides chord detection, drum transcription, beat tracking, and pitched instrument transcription. The ~2 GB model download is a one-time cost. GPU recommended but CPU works at ~3–5x real-time.

2. **musicnn fills the genre/mood gap** for Phase 2 with zero additional hardware requirements. The taggram (time-varying tags) is especially useful for detecting energy changes within a track.

3. **MSAF needs EDM parameter tuning** — the default parameters were optimized for pop/rock. For electronic music, the novelty curve window size and spectral features may need adjustment. A small evaluation on EDM tracks would determine the optimal parameters.

4. **No single library provides holistic understanding** — the analysis pipeline must be assembled from multiple libraries. The comprehension layer (Lerdahl TPS, fused energy curves) is custom-built using music21 + librosa, both already in the dependency tree.

5. **All Phase 1–4 features work offline** — musicnn, MSAF, and librosa-based energy curves require no internet. Omnizart requires a one-time model download but then runs fully offline.

---

## References

1. Omnizart. GitHub. https://github.com/Music-and-Culture-Technology-Lab/omnizart
2. Omnizart on PyPI. https://pypi.org/project/omnizart/
3. Wu, Y. et al. (2021). *Omnizart: A General Toolbox for Automatic Music Transcription.* JOSS. https://doi.org/10.21105/joss.03391
4. MSAF. GitHub. https://github.com/urinieto/msaf
5. Nieto, O., Bello, J. P. (2016). *Systematic Exploration Of Computational Music Structure Research.* ISMIR.
6. MSAF on PyPI. https://pypi.org/project/msaf/
7. musicnn. GitHub. https://github.com/jordipons/musicnn
8. musicnn on PyPI. https://pypi.org/project/musicnn/
9. MIRFLEX. Chopra, A. et al. (2024). ISMIR Late-Breaking Demo. https://arxiv.org/abs/2411.00469
10. musicinformationretrieval.com. *MIR tutorial notebooks.* https://musicinformationretrieval.com/
11. Gaia. GitHub. https://github.com/MTG/gaia
12. Essentia documentation. https://essentia.upf.edu/documentation.html
13. MusicBoundariesCNN. GitHub. https://github.com/carlosholivan/MusicBoundariesCNN
14. Hernandez-Olivan, C. et al. (2021). *Music Boundary Detection using CNNs.* arXiv:2008.07527
15. ElDeeb, O. & Malandro, M. (2025). *Barwise Section Boundary Detection in Symbolic Music Using CNNs.* arXiv:2509.16566
16. SLMS dataset. GitHub. https://github.com/m-malandro/SLMS
17. MIDI MSA. GitHub. https://github.com/omareldeeb/midi-msa
18. musicaiz. PyPI. https://pypi.org/project/musicaiz/
19. Hernandez-Olivan, C. & Beltran, J. R. (2022). *musicaiz: A Python Library for Symbolic Music Generation, Analysis and Visualization.* arXiv:2209.07974
20. Basic Pitch. GitHub. https://github.com/spotify/basic-pitch
21. Bittner, R. et al. (2022). *A Lightweight Instrument-Agnostic Model for Polyphonic Note Transcription.* ICASSP.
22. EigenBeats. GitHub. https://github.com/Chamath-Adithya/EigenBeats
23. beattrack (sonic similarity). GitHub. https://github.com/HerrStolzier/beattrack
24. midisim. GitHub. https://github.com/asigalov61/midisim
25. Lerdahl, F. (2001). *Tonal Pitch Space.* Oxford University Press.
26. DeepRhythm. PyPI. https://pypi.org/project/deeprhythm/
