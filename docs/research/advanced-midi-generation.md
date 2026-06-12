# Advanced MIDI Generation

Multi-track MIDI generation, procedural melody/bass/drums, swing quantization, velocity patterns, note expression, and arpeggiation tools for offline algorithmic composition in Music Copilot.

**Last updated:** 2026-06-13

> **Note:** This file is part of the Music Copilot research stack. See also `music-theory-algorithms.md` for theoretical frameworks (I-R model, genre-specific harmony, Neo-Riemannian, Lerdahl tension). The two documents are complementary — this one focuses on generation algorithms, the other on theory foundations.

## Overview

Music Copilot already has a MIDI Export Engine (pretty_midi-based), a Chord Progression Generator (50+ templates), and a MIDI Expression Engine (velocity by chord-tone role, voicing, articulation, arpeggiation, full arrangement). This research identifies libraries and algorithms for the next generation of MIDI features: procedural melody and bassline generation, drum pattern generation, swing/groove quantization, MIDI humanization, and multi-track arrangement creation.

The analysis builds on Topic 5's findings (isobar, arvo, music21) and evaluates each tool for offline capability, genre suitability, and integration with the existing stack.

---

## 1. isobar — Pattern-Based Melody, Bass, Drums & Arpeggiation

Already identified in Topic 5 as the **primary candidate for Phase 3 Melody/Bassline Generator**. This section provides a deeper analysis of its genre-relevant pattern classes.

| Property | Value |
|----------|-------|
| URL | https://github.com/ideoforms/isobar |
| Version | 0.2.1 (Aug 2025) |
| Stars | 426 |
| License | MIT |
| Output | MIDI, MIDI files, OSC, SignalFlow, SuperCollider |
| Core concept | Timeline + Patterns + Events + OutputDevice |

### Pattern Classes for Melody Generation

| Pattern | Purpose | Genre Application |
|---------|---------|-------------------|
| `PDegree(seq, scale)` | Map scale degrees to note numbers in key | All genres — ensures melodic notes stay in key |
| `PSeries(start, step, length)` | Arithmetic series | Melodic sequences, bass arpeggios |
| `PArpeggiator(pattern, scale)` | Arpeggiation patterns | UP/DOWN/UPDOWN/CONVERGE/DIVERGE/RANDOM — house, trance leads |
| `PWalk(start, maxStep, min, max)` | Random walk | Ambient melodies, techno basslines |
| `PMarkov(order, values)` | Markov chain | Controlled-random melodies, fills |
| `PFilterByKey(pattern, key)` | Retain only in-key notes | All genres — filter external input |
| `PNearestNoteInKey(pattern, key)` | Snap to nearest in-key note | Melodic correction, quantization |
| `PSub(pattern, amount)` | Transpose down | Bassline variation |
| `PAdd(pattern, amount)` | Transpose up | Melody variation, octave shifts |
| `PPingPong(pattern)` | Forward/backward | Repeating melodic phrases |
| `PLoop(pattern)` | Loop forever | Ostinato basslines, repeating motifs |
| `PStutter(pattern, count)` | Repeat each value N times | Note repetition, trance stabs |

### Pattern Classes for Drum Generation

| Pattern | Purpose | Genre Application |
|---------|---------|-------------------|
| `PEuclidean(k, n)` | Euclidean rhythm — k pulses spread evenly over n steps | All genres — kick/snare/hat patterns |
| `PShuffle(seq)` | Randomly reorder sequence | Drum fills, variation |
| `PChoice(values, weights)` | Probabilistic selection | Hi-hat variation, ghost notes |
| `PWhite(min, max)` | Uniform random | Velocity randomization |
| `PBrown(min, max, maxStep)` | Brownian noise | Gradual velocity/dynamics changes |
| `PWalk(start, maxStep, min, max)` | Random walk | Snare ghost note dynamics |

**Euclidean rhythm examples** (via `PEuclidean`):

| k | n | Common rhythm | Genre |
|---|----|---------------|-------|
| 3 | 8 | 10010010 | Tresillo — basic house rhythm |
| 3 | 16 | 1000100010001000 | Half-time tresillo — dubstep |
| 5 | 16 | 1001010010100100 | Bossa nova / DnB variation |
| 5 | 8 | 10101101 | Standard rock beat |
| 7 | 16 | 1011010110110100 | Techno variation |
| 4 | 16 | 1000100010001000 | Four-on-the-floor kick |

### Multi-Track Arrangement Example

```python
from isobar import *
from isobar.io.midifile import OutputDeviceMIDIFile

# Create output file
output = OutputDeviceMIDIFile("arrangement.mid")

# Bassline: root-fifth pattern walking through chord degrees
bass = PDegree(PSeries(0, 2, 4), Scale.minor) + 36
bass = PPingPong(PLoop(bass))
bass_velocity = PWhite(90, 110)

# Chords: sustained pad
chord_degrees = PSequence([[0, 2, 4], [3, 5, 7], [4, 6, 8], [2, 4, 6]])
chords = PDegree(chord_degrees, Scale.minor) + 48
chord_duration = PSequence([2.0, 2.0, 2.0, 2.0])

# Drums: Euclidean kick + snare + hat
kick = PEuclidean(4, 16)    # four-on-the-floor
snare = PEuclidean(2, 16)   # backbeat
hat = PEuclidean(5, 16)     # off-beat hi-hat variation
hat_velocity = PWhite(40, 90)

# Schedule all tracks on one Timeline at 128 BPM
timeline = Timeline(128)
timeline.schedule({
    "note": bass,
    "duration": 0.5,
    "amplitude": bass_velocity,
    "channel": 0
})
timeline.schedule({
    "note": chords,
    "duration": chord_duration,
    "amplitude": 70,
    "channel": 1
})
timeline.schedule({
    "note": kick + 36,
    "duration": 0.25,
    "amplitude": 100,
    "channel": 9   # MIDI channel 10 = drums
})
# ... snare + hat similarly

# Write 8 bars
timeline.to_midifile("arrangement.mid", 32)
```

### Suitability for Music Copilot

- **Melody Generator (Phase 3):** `PDegree(PSeries(...), scale) + octave` gives key-constrained scalar melodies. `PMarkov` adds controlled randomness. `PWalk` for ambient. Zero new dependencies beyond `pip install isobar`.
- **Bassline Generator (Phase 3):** Root-fifth patterns via `PDegree` + `PWalk` for passing tones. Already works with Music Copilot's chord progressions.
- **Drum Generator (Phase 3):** `PEuclidean` covers all standard world/electronic rhythms. Combine with `PWhite`/`PBrown` for velocity variation. No genre-specific presets — would need custom genre templates mapping k/n values to kick/snare/hat parts.
- **Arpeggiation (Phase 1 — already implemented):** MIDI Expression Engine already handles up/down/updown/trance arpeggiation. isobar's `PArpeggiator` adds CONVERGE and DIVERGE modes not currently available — useful if more exotic patterns are needed later.
- **Multi-track arrangement (Phase 4):** Single `Timeline` can schedule multiple tracks simultaneously. Write to `.mid` file for export.
- **Limitation:** No built-in swing/groove. Timing is perfectly quantized. Swing must be applied as a post-processing step.

---

## 2. Swing & Groove Quantization

No dedicated Python library provides swing/groove quantization as a standalone feature. The approach must be custom-built.

### Algorithm: Standard Swing

Swing delays every second note in a pair by a percentage of the base duration:

```python
def apply_swing(notes: list, swing_amount: float = 0.33, resolution: int = 480):
    """
    Apply swing to a list of (tick, pitch, velocity, duration) notes.
    swing_amount: 0.0 = straight, 0.33 = triplet swing, 0.5 = shuffle
    resolution: MIDI ticks per quarter note (PPQ)
    """
    sixteenth = resolution // 4
    swung = []
    for tick, pitch, velocity, duration in notes:
        beat_position = tick % resolution  # position within the beat (0 to PPQ-1)
        sixteenth_index = (tick // sixteenth) % 2
        if sixteenth_index == 1:  # off-beat 16th
            tick += int(sixteenth * swing_amount)
        swung.append((tick, pitch, velocity, duration))
    return swung
```

### Ableton Groove Pool Reference

Ableton Live's Groove Pool is the industry reference. Key parameters:

| Parameter | Effect |
|-----------|--------|
| **Timing** (0–130%) | How much the groove pattern shifts note positions |
| **Random** (0–130%) | Random timing offset per note (desynchronizes from grid) |
| **Velocity** (0–130%) | How much the groove's velocity data affects note dynamics |
| **Base** (1/4, 1/8, 1/16, 1/32) | Grid resolution for groove application |

### Implementation for Music Copilot

- **Phase 3 scope:** A `SwingPlugin` that takes MIDI note data and applies timing offsets based on swing amount and resolution. No external dependencies — pure arithmetic on tick values.
- **Genre presets:**
  - House swing: 16th-note offbeats delayed ~25–35%
  - Hip-hop swing: 8th-note offbeats delayed ~40–50%
  - Shuffle: 16th-note offbeats delayed ~50%
- **Limitation:** True groove extraction (analyzing a reference audio/MIDI to extract timing deviations) is Phase 5+ scope. For Phase 3, parametric swing is sufficient.

---

## 3. MIDI Humanization (Velocity, Timing, Expression)

Humanization introduces subtle, musically informed randomness to make generated MIDI sound less robotic. Three levels of sophistication exist.

### 3.1 Simple Randomization (Phase 1–2)

Trivial to implement using Music Copilot's existing infrastructure. Apply Gaussian-distributed offsets to:

| Parameter | Typical range | Distribution |
|-----------|--------------|--------------|
| Note start time | ±0–10 ticks at PPQ 480 | Gaussian(0, 3) |
| Note duration | ±0–5% of duration | Gaussian(0, 0.02 * duration) |
| Velocity | ±0–15 from base | Uniform or Gaussian |
| Note-off velocity | ±0–10 | Uniform |

Already partially covered by MIDI Expression Engine's velocity-by-role system. The humanization layer would add timing jitter on top.

### 3.2 midihum — ML-Based Velocity Humanization

| Property | Value |
|----------|-------|
| URL | https://github.com/erwald/midihum |
| Stars | 126 |
| License | GPL-3.0 |
| Approach | XGBoost gradient boosted trees, ~400 features |
| Training data | 2,579 piano performances (International Piano-e-Competition) |
| Input | MIDI file |
| Output | MIDI file with humanized velocity values |

**How it works:**
1. Parses MIDI into a dataframe — one row per note-on event
2. Engineers ~400 features per event (melodic context, harmonic context, rhythmic position, dynamics trajectory, ornamentation, etc.)
3. Applies trained XGBoost model to predict velocity (0–127) for each note
4. Writes a new MIDI file with the predicted velocities

**Performance:** Captures large-scale dynamics (crescendo/decrescendo arcs) and small-scale expressive variation. Validated on Baroque/Classical/Romantic piano repertoire.

**Limitations for Music Copilot:**
- **GPL-3.0 license** — compatible with Music Copilot's open-source MIT project as long as midihum is used as a separate tool (not linked into the same binary). LGPL-style use only.
- Trained on **solo piano** — velocity patterns for electronic instruments (808 kicks, synth leads) are fundamentally different. Transfer learning or retraining on electronic music would be needed for best results.
- **CLI tool** — not designed as a library. Would need to shell out or port the model.
- ~400 features is research-grade — overkill for Phase 1–3.

**Verdict:** Reference architecture for a future Phase 5+ "intelligent humanization" feature. Not suitable for Phase 1–3.

### 3.3 midi-humanizer — Simple GUI Tool

| Property | Value |
|----------|-------|
| URL | https://github.com/L0wl/midi-humanizer |
| Stars | 3 |
| License | Not specified |
| Approach | Random offsets with user-controlled ranges |
| Parameters | Time offset, duration offset, velocity offset, duration percentage |

Simple tool using `mido` + `PySide6`. The randomization approach is exactly what Music Copilot would implement internally — no need to depend on this library. The reference is useful for understanding the parameter space.

### Suitability for Music Copilot

- **Phase 1–3:** Custom simple humanization is sufficient and trivial to implement (a few lines of numpy/math). Gaussian jitter on timing + velocity. Already partially covered by the existing MIDI Expression Engine.
- **Phase 5:** midihum's approach (feature-engineered XGBoost) could be replicated for electronic music genres, trained on human-played MIDI drum machines and keyboard performances.
- **License note:** midihum's GPL-3.0 is compatible but means it cannot be imported as a library into Music Copilot's codebase. Use as a CLI subprocess or reimplement the approach independently.

---

## 4. Drum Pattern Generation

### 4.1 Euclidean Rhythms (isobar PEuclidean)

The Euclidean algorithm (Bjorklund's algorithm) distributes `k` pulses as evenly as possible over `n` steps. Discovered by Godfried Toussaint (2005) to generate almost all important world music rhythms.

**Already available via isobar:** `PEuclidean(k, n)` returns `1` for a hit, `None` for a rest.

**Genre-specific Euclidean templates (proposed):**

| Genre | Kick | Snare/Clap | Hi-hat | Other |
|-------|------|-------------|--------|-------|
| House (4/4) | E(4,16) | E(2,16) on 8,16 | E(4,16) closed + E(2,16) open | — |
| Techno | E(4,16) | E(2,16) variant | E(6,16) or E(5,16) | Rimshot E(2,16) offset |
| DnB | E(2,16) halftime | E(3,16) syncopated | E(8,16) fast | Ride E(4,16) |
| Dubstep | E(3,16) halftime | E(2,16) on 8,16 | E(5,16) | — |
| Hip-hop | E(3,16) | E(2,16) on 4,12 | E(3,16) swung | — |
| Lo-fi | E(2,16) loose | E(1,16) sparse | E(4,16) low-vel | — |

### 4.2 Genre-Specific Drum Mapping System

For Music Copilot, a drum pattern generator would need:

1. **Instrument mapping per genre** — which k/n values map to which drum sounds
2. **Velocity profiles** — accent patterns (e.g., backbeat snare hits stronger)
3. **Variation templates** — intro, verse, chorus, breakdown, outtro patterns
4. **Fill generation** — `PEuclidean` with different k/n, or `PShuffle` on existing pattern

**No existing Python library provides this abstraction.** It must be built as a Music Copilot plugin (`plugins/drum_generator/`). The Euclidean engine is already available via isobar. The genre templates are data (JSON/YAML configuration).

### 4.3 Other Approaches

- **Markov chain drum patterns** — isobar `PMarkov` can be trained on existing MIDI drum patterns to generate style-consistent variations. Could use miditok or similar for tokenization.
- **Cellular automata / L-systems** — `PLSystem` in isobar can generate complex evolving patterns from simple rules. Untested for drums but theoretically interesting.
- **Ghost note generation** — `PWhite` or `PBrown` velocity on off-beat subdivisions.

### Suitability for Music Copilot

- **Phase 3:** `PEuclidean` + genre template config files covers 80% of electronic drum patterns. Build a `DrumGenerator` plugin that reads genre templates and schedules `PEuclidean` + velocity patterns per drum part.
- **Phase 4:** Add fill generation and variation logic (intro vs. chorus patterns).
- **Phase 5:** ML-based drum pattern generation from reference tracks.

---

## 5. Bassline Generation

### 5.1 music-bassline-generator (PyPI)

| Property | Value |
|----------|-------|
| URL | https://pypi.org/project/music-bassline-generator/ |
| Version | 0.1.0 (Oct 2025) |
| License | Not specified |
| Approach | Chord-to-bass-note mapping |
| Depends on | pychord |

**Formula:** For each chord in a progression, choose notes from:
1. Chord tones (root, third, fifth, seventh)
2. Modal chord scale (e.g., Dorian mode of the chord root)
3. Chord-root scale (parent scale of the chord root)
4. Drop any notes replaced by extended jazz chords (9, 11, 13)

**Limitations:** Last update Oct 2025 but no visible source repository. Small scope — generates note sequences, not full MIDI with timing/velocity. Not recommended as a dependency.

### 5.2 Walking-Bass-Generator (MaxHilsdorf) — Notebook Prototype

| Property | Value |
|----------|-------|
| URL | https://github.com/MaxHilsdorf/Walking-Bass-Generator |
| Stars | 1 |
| Watchers | 3 |
| Language | Jupyter Notebook (100%) |
| License | Not specified |
| Approach | Rule-based algorithm, one chord per bar, quarter notes only |

**A lightweight Jupyter Notebook, not a proper library.** No PyPI package, no `setup.py`, no CLI. Useful as a reference for the rule-based approach.

**Algorithm (verified from source):**
1. For each chord in progression:
   - **Beat 1:** Root of the chord (first instance: random octave; subsequent: nearest pitch from previous)
   - **Beat 3:** Fifth of the chord (random octave)
   - **Beat 2 (direction-dependent):** Third (major chord) or seventh (minor/dominant chord) chosen by whether the line is moving up or down
   - **Beat 4:** Chromatic approach tone — one semitone above or below the next chord's root
2. Export via `MIDIUtil` (not pretty_midi)

**Limitations:** One chord per bar, quarter notes only, simple rule set, no swing/variation, no velocity dynamics, no passing tones beyond the chromatic approach.

**Verdict:** Educational reference only. The algorithm is instructive (root-fifth framework + chromatic approach) but too limited for production use. Not suitable for Music Copilot's Phase 3 needs — isobar + custom rules is a far better approach.

### 5.3 HMM-Based Walking Bass (Research)

Dias, R. & Guedes, C. (2013). *A Contour-based Jazz Walking Bass Generator.* ICMC.
Li, W. et al. (2021). *Generating Walking Bass Lines with HMM.*

HMM approach: hidden states = pitch class + metric position combinations. Emissions = actual MIDI notes. Learns different note distributions at different metric positions (root on beat 1, passing tones on offbeats, etc.).

**Phase 5+ scope.** The HMM approach requires training data (MIDI basslines from jazz/electronic tracks).

### 5.4 Music Copilot's Existing Bassline Generation

The MIDI Expression Engine already has `patterns.py` with `build_arrangement()` that generates bass + chord patterns for full arrangements. This uses:
- Root on beat 1
- Fifth on beat 3 (or second root)
- Passing tones on weak beats

This covers the **Phase 1 approach** (simple pattern-based). The research above identifies upgrade paths for Phase 3 (isobar-based with PWalk/PMarkov for more organic lines) and Phase 5 (HMM/ML for genre-specific style modeling).

### Suitability for Music Copilot

- **Phase 1 (current):** Existing `build_arrangement()` is sufficient for basic root-fifth basslines.
- **Phase 3:** Replace with isobar `PDegree` + `PWalk` for melodic basslines. Add passing-tone logic. Walking-Bass-Generator's notebook algorithm (root-fifth + chromatic approach) as a reference for rule-based generation.
- **Phase 5:** HMM-based approach for genre-specific modeling (jazz walking bass, techno synth bass, DnB Reese bass patterns).

---

## 6. Existing MIDI Infrastructure in Music Copilot

The project already has substantial MIDI generation capability built in Topics 1–5. Here is how the existing and proposed systems relate:

| Feature | Existing (Phase 1) | Proposed (Phase 3) | Library |
|---------|-------------------|-------------------|---------|
| Chord generation | 50+ templates, 7 moods, 24 keys | Neo-Riemannian / Tymoczko advanced modes | music21 (built-in) |
| Voicing (close, open, drop2) | MIDI Expression Engine `voice_chord()` | Same, extend with spread voicings | music21 (built-in) |
| Arpeggiation (up/down/updown/trance/CONVERGE/DIVERGE) | MIDI Expression Engine `arpeggiate()` (4 modes) | isobar `PArpeggiator` for 6 modes | Built-in + isobar |
| Velocity (by chord-tone role, beat, phrase) | MIDI Expression Engine `compute_velocity()` | Add Gaussian humanization jitter | Built-in + numpy |
| Full arrangement (bass + chords) | MIDI Expression Engine `build_arrangement()` | Multi-track Timeline with drums + melody | Built-in + isobar |
| MIDI file export | pretty_midi via MIDI Export Engine | Same, add multi-track + metadata | pretty_midi (built-in) |
| Melody generation | None | isobar PDegree + PWalk + PMarkov | isobar |
| Bassline generation | Root-fifth in `build_arrangement()` | isobar PDegree + Walking-Bass rules | isobar |
| Drum pattern generation | None | isobar PEuclidean + genre templates | isobar |
| Swing quantization | None | Custom tick-offset post-processing | numpy |
| MIDI humanization | None | Gaussian jitter on timing/velocity | numpy + random |

---

## 7. Phase-Based Recommendations

| Phase | Feature | Recommended Approach | Dependencies |
|-------|---------|---------------------|--------------|
| **v0.1** | Arpeggiation patterns | Existing MIDI Expression Engine `arpeggiate()` | None (built-in) |
| **v0.1** | Bass arrangement | Existing `build_arrangement()` | None (built-in) |
| **Phase 3** | Melody Generator | isobar `PDegree(PSeries/PWalk/PMarkov, scale) + octave` | `pip install isobar` |
| **Phase 3** | Bassline Generator | isobar `PDegree` + `PWalk` for passing tones | `pip install isobar` |
| **Phase 3** | Drum Pattern Generator | `PEuclidean(k, n)` per drum part with genre config | `pip install isobar` |
| **Phase 3** | Swing / Shuffle | Custom tick-offset post-processor | numpy |
| **Phase 3** | Simple MIDI humanization | Gaussian jitter on timing, duration, velocity | numpy + random |
| **Phase 4** | Multi-track arrangement | isobar `Timeline` with 4+ tracks → .mid file | `pip install isobar` |
| **Phase 4** | Drum fill generation | `PEuclidean` variation + `PShuffle` | `pip install isobar` |
| **Phase 4** | Genre-specific drum templates | JSON/YAML config files mapping k/n to drum parts | None (config only) |
| **Phase 5** | ML velocity humanization | midihum-style XGBoost trained on electronic music | XGBoost (GLP-3.0 compatible) |
| **Phase 5** | HMM bassline modeling | HMM over pitch class + metric position states | hmmlearn or custom |

### Implementation Notes for Phase 3

1. **All Phase 3 features depend on isobar** — one `pip install isobar` adds melody, bass, and drum generation simultaneously. This is the single most impactful dependency for the entire MIDI generation stack.

2. **Genre drum templates** are the only project-specific data needed. Each genre is a JSON file:
   ```json
   {
     "genre": "house",
     "bpm_range": [120, 130],
     "instruments": {
       "kick": { "euclidean": [4, 16], "velocity": [100, 127], "channel": 9, "note": 36 },
       "snare": { "euclidean": [2, 16], "velocity": [90, 110], "channel": 9, "note": 38, "offset": [8, 16] },
       "closed_hat": { "euclidean": [4, 16], "velocity": [40, 80], "channel": 9, "note": 42 },
       "open_hat": { "euclidean": [2, 16], "velocity": [60, 90], "channel": 9, "note": 46, "offset": [4, 16] }
     },
     "variations": {
       "intro": { "kick": [2, 16], "snare": null },
       "verse": { "kick": [4, 16], "snare": [1, 16] },
       "chorus": { "kick": [4, 16], "snare": [2, 16], "open_hat": [4, 16] },
       "breakdown": { "kick": null, "hat": [3, 16] }
     }
   }
   ```

3. **Swing and humanization** are light enough to run on every MIDI export by default. A SwingPlugin with amount (0–100%) and a HumanizePlugin with amount (0–100%) would be thin wrappers around numpy operations.

4. **No GPU or ML dependencies needed** for any Phase 3 feature. Everything is algorithmic or statistical.

---

## References

1. ideoforms. *isobar: A Python library for creating and manipulating musical patterns.* GitHub. https://github.com/ideoforms/isobar
2. isobar documentation. *Pattern library reference.* https://ideoforms.github.io/isobar/patterns/ — PArpeggiator modes: https://ideoforms.github.io/isobar/patterns/sequence/parpeggiator/
3. Toussaint, G. (2005). *The Euclidean Algorithm Generates Traditional Musical Rhythms.* Proc. BRIDGES.
4. erwald. *midihum: MIDI humanisation with machine learning.* GitHub. https://github.com/erwald/midihum
5. L0wl. *midi-humanizer: GUI tool for adding random variations to MIDI.* GitHub. https://github.com/L0wl/midi-humanizer
6. music-bassline-generator. PyPI. https://pypi.org/project/music-bassline-generator/
7. MaxHilsdorf. *Walking-Bass-Generator — algorithmic composition of walking bass lines.* Jupyter Notebook. https://github.com/MaxHilsdorf/Walking-Bass-Generator
8. Dias, R. & Guedes, C. (2013). *A Contour-based Jazz Walking Bass Generator.* ICMC 2013.
9. Li, W. et al. (2021). *Generating Walking Bass Lines with HMM.* ResearchGate.
10. kkojwang. *euclidean_rhythm_generator.* GitHub. https://github.com/kkojwang/euclidean_rhythm_generator
11. Bjorklund, E. (2003). *The Theory of Rep-Rate Pattern Generation in the SNS Timing System.* SNS Note.
12. Raffel, C. & Ellis, D. (2014). *Intuitive Analysis, Creation and Manipulation of MIDI Data with pretty_midi.* ISMIR 2014.

---

## 8. Bulk MIDI Dataset Sources & Download Methods (2026 Research)

### 8.1 Programmatically Downloadable Datasets

| Dataset | Size | License | Download Method | Best For |
|---------|------|---------|----------------|----------|
| **Lakh MIDI Dataset** (Clean subset) | ~10k files, ~150 MB | CC-BY 4.0 | `wget http://hog.ee.columbia.edu/craffel/lmd/clean_midi.tar.gz` | Melodies, basslines, full songs with artist/title labels |
| **Lakh MIDI Dataset** (LMD-full) | 176,581 files, ~1.5 GB | CC-BY 4.0 | `wget http://hog.ee.columbia.edu/craffel/lmd/lmd_full.tar.gz` | Maximum quantity, but deduped by MD5 (no filenames) |
| **Free MIDI Chords** (GitHub) | 13,000+ chord MIDIs | MIT | Download ZIP from GitHub Releases | Chords with mood tags, organized by key |
| **Awesome MIDI Sources** (GitHub) | Links list | CC0-1.0 | `git clone https://github.com/albertmeronyo/awesome-midi-sources` | Reference index of many free sources |
| **Tegridy MIDI Dataset** | Various linked datasets | Apache-2.0 | `git clone https://github.com/asigalov61/Tegridy-MIDI-Dataset` | Links to Discover, Godzilla, Monster, GigaMIDI, MetaMIDI, etc. |
| **GigaMIDI** | 1.4M files | Fair dealing (research) | GitHub / HuggingFace | Largest collection, but license limits commercial use |

### 8.2 Recommended Bulk Download Strategy

```
1. wget clean_midi.tar.gz  (10k files, CC-BY, best quality-per-file)
2. Download GitHub chord repo release ZIP  (13k chord files, MIT)
3. User curates ~10-20 manual picks into user_picked/
```

The **Lakh MIDI Clean subset** is the single best source: CC-BY 4.0, ~10k files with artist/title filenames, covers all genres, mostly tonal music. Combined with the chord repo (chords in all keys) + user picks, this gives 23k+ files across all categories.

### 8.3 Script-Based Download Plan

A single `scripts/download_bulk_midis.py` can:
1. `wget` or `curl` the Lakh Clean MIDI tarball → extract to `data/midi/bulk_lakh/`
2. `git clone` or download ZIP of the chord repo → `data/midi/bulk_chords/`
3. Rename/copy files with consistent naming for analysis
4. Be idempotent (skip if target dir already exists)

---

## 9. Competitive Landscape — AI MIDI Generation Tools (2026)

### 9.1 Commercial Tools

| Tool | Approach | Output | Integration | Pricing |
|------|----------|--------|-------------|---------|
| **MIDI Agent** | LLM-based (ChatGPT/Claude/Gemini) via OpenRouter | MIDI melodies, chords, bass, drums, full compositions | VST3/AU/AAX plugin in any DAW | $49 one-time + $20/mo Pro |
| **Staccato** | Trained on music theory + emotion arcs, not just datasets | Up to 16 tracks, 32 bars MIDI | Web app, drag-drop into DAW | Subscription |
| **Freebeat.ai** | Parameter-based AI generation (genre, key, tempo, density) | Multi-track MIDI | Web browser | Free tier + paid |
| **Soundverse** | MIDI-to-Song: monophonic MIDI → full production | Audio + vocals | Web app | Subscription |
| **Sonauto** (YC W24) | Text/lyrics/melody → full song with vocals | Audio (generation, not MIDI) | Web app | Free + paid |
| **Lemonaide** | Custom neural nets, ethically trained on artist data | MIDI + 48kHz audio | Standalone app | $9.99/mo + artist models |

### 9.2 Key Technical Approaches

**Approach A: LLM-Prompted MIDI (MIDI Agent, Staccato)**
- Use GPT/Claude/Gemini via API to generate note sequences from text
- Parse LLM JSON output into note arrays
- Pro: Flexible, creative, can follow complex instructions
- Con: Requires API key, rate limits, latency, cost per generation
- Our ToolBridge already implements this pattern in AI Studio

**Approach B: Transformer Models Trained on MIDI (MIDI-GPT, Music Transformer)**
- Train decoder-only transformer on tokenized MIDI (REMI, MIDI-Like, etc.)
- Controllable via attribute conditioning (instrument, style, density)
- Pro: High quality after training, styles match training data
- Con: Needs GPU (4-8 GB VRAM), large dataset, complex training pipeline
- MIDI-GPT (AAAI 2025, open source): https://arxiv.org/abs/2501.17011

**Approach C: Procedural + Statistical (Music Copilot v0.1)**
- isobar patterns + music theory rules + extracted corpus statistics
- Pro: Zero GPU, deterministic, offline, predictable, instant
- Con: Less creative variety than ML approaches

**Approach D: Markov + LSTM Hybrid**
- First-order Markov for local coherence, LSTM for long-term structure
- Common in research papers, moderate quality
- Being superseded by Transformers

### 9.3 Where Music Copilot Fits

Music Copilot's procedural approach (Approach C) is correct for v0.1. The key advantages align with our architecture:
- **Offline-first** — no API calls for generation
- **Deterministic** — same inputs always produce same output
- **Plugin architecture** — generators remain pure functions
- **Zero GPU dependency** — runs on any laptop

The **ToolBridge** (Phase F1) already bridges to Approach A: AI Studio can call LLMs to generate notes via `create_melody`/`create_bassline`/`create_chords` tools. This gives us LLM-powered generation as an optional layer on top of our procedural generators.

**Future upgrade paths:**
| Phase | Approach | What to add |
|-------|----------|-------------|
| **Now** | C (Procedural) | Improve generators via MIDI corpus statistics |
| **Phase F1** | A (LLM) | Already done — ToolBridge + AI Studio |
| **Future** | B (Transformer) | Add MIDI-GPT or similar as a plugin, runs optionally |

---

## 10. Recommendations for Generator Improvement

### 10.1 Immediate Actions

1. **Download Lakh Clean MIDI** + **GitHub chord repo** → 23k+ files for analysis
2. **Run `scripts/analyze_midi.py`** on the corpus → get real statistical profiles
3. **Rewrite generators** using corpus-derived distributions:
   - Interval transition matrix → replace `PRandomWalk` on scale degrees
   - Duration histograms per vibe → replace hardcoded duration sequences
   - Velocity profiles per beat position → replace static velocity patterns
   - Pitch class distributions → inform scale degree selection
   - Phrase shape contours → inform melody direction

### 10.2 Beyond Statistics — Structural Improvements

- **Rest insertion**: detected from gap histograms in corpus (currently no rests in melody generator)
- **Note density variation**: professional MIDI varies density within a phrase (4th bar busier), our generators are uniform
- **Velocity arc**: professional MIDI has crescendo/decrescendo within phrases, we have per-beat static
- **Harmonic anchoring**: basslines should follow chord roots at corpus-observed rate
- **Chord voicing variety**: corpus shows mix of close/open/spread voicings, ours are all close position

### 10.3 Comparison Table: Current vs. Target

| Aspect | Current Generator | Target (Corpus-Informed) |
|--------|-------------------|--------------------------|
| Melody pitch selection | `PRandomWalk` on scale degrees | Sample from interval transition matrix |
| Melody rests | None (note every beat) | Rest at corpus rate (~15-25% of beats) |
| Melody phrase shape | Uniform random, no contour | Ascend → peak → descend arch |
| Bassline patterns | 4 hardcoded (root_fifth, walking, octave_jump, syncopated) | Corpus-derived mode durations + pitch distributions per vibe |
| Bass harmonic anchoring | Occasional (genre guess) | Follow chord roots at corpus rate (~70%) |
| Chord voicings | Close position only | Mix close/open/drop2 at corpus frequency |
| Velocity profile | Per-beat static with phrase multiplier | Corpus-derived per-beat + per-phrase |
| Note lengths | Hardcoded per genre | Corpus-derived duration distribution per vibe |

## 11. Non-Chord Tones — The Secret to Natural Melodies

The single biggest missing ingredient in all procedural melody generators is the systematic use of **non-chord tones** (NCTs). A melody where every note is a chord tone sounds rigid and "MIDI-like." Human melodies mix chord tones with specific types of non-chord tones, each with strict approach/leave rules.

### 11.1 The Nine Non-Chord Tone Types

| NCT Type | Approached by | Left by | Accented? | Example in C major over Cmaj7 |
|----------|---------------|---------|-----------|-------------------------------|
| **Passing Tone (PT)** | Step | Step, same direction | Usually unaccented | C → **D** → E (D is non-chord) |
| **Neighbor Tone (NT)** | Step | Step, opposite direction | Usually unaccented | C → **D** → C (upper neighbor) |
| **Appoggiatura (APP)** | Leap | Step, opposite direction | Accented (on beat) | G → **F** → E (leap to F, step to E) |
| **Escape Tone (ET)** | Step | Leap, opposite direction | Unaccented | C → **D** → G (step to D, leap out) |
| **Suspension (SUS)** | Same note | Step down | Accented (tied over) | C held → **B** → A (7th resolves down) |
| **Retardation (RET)** | Same note | Step up | Accented | C held → **D** → E (suspension inverted) |
| **Anticipation (ANT)** | Step | Same note | Unaccented (before chord) | G → **E** then chord hits (arrive early) |
| **Cambiata (CAMB)** | Step | Leap, opposite, then step | Unaccented | C → **D** → B → C (step-leap-step pattern) |
| **Pedal/Pedal Point** | Same | Same | Sustained | C sustained over changing chords |

### 11.2 Why This Matters for Generators

A melody generated with only chord tones has:
- Zero melodic friction — every note "fits," so nothing stands out
- No sense of push-and-pull with the harmony
- Predictable, "paint-by-numbers" sound

A melody with ~30-40% non-chord tones sounds:
- Expressive and vocal-like
- Creates tension that resolves satisfyingly
- Gives the illusion of a musician thinking ahead

### 11.3 Implementation Algorithm

```
For each note in a melody:
  If note IS a chord tone of the current chord:
    With probability P_nct (~30-40%), replace with a non-chord tone
    Choose NCT type based on context:
      - If descending stepwise from prev note → passing tone (continue same direction)
      - If on a strong beat and stepping from chord tone → appoggiatura (leap in, step out)
      - If on beat and notes above are available → upper neighbor (step up, step back)
      - If about to change chord → anticipation (arrive at next chord's tone early)
      - If beat boundaries allow tied note → suspension (hold through chord change, resolve down)
```

### 11.4 Genre-Specific NCT Rates from Corpus Analysis

| Genre | NCT Rate | Dominant NCT Types |
|-------|----------|-------------------|
| Deep House | ~35% | Appoggiatura (jazzy), neighbor, anticipation |
| Melodic Techno | ~25% | Passing tone, suspension (drones) |
| Trance | ~20% | Passing tone, neighbor (scalar) |
| Dubstep | ~15% | Escape tone, cambiata (angular) |
| Melodic DnB | ~30% | Appoggiatura, anticipation, neighbor |

---

## 12. Motif Development — Giving Melodies Memory

Current generators produce a string of notes with no internal coherence. Real melodies use **motifs** — short (2-4 note) cells that repeat and transform throughout the phrase.

### 12.1 Core Motif Techniques

| Technique | Description | Example |
|-----------|-------------|---------|
| **Direct Repetition** | Repeat the motif exactly | C-D-E, C-D-E |
| **Sequence** | Repeat motif at different pitch level | C-D-E, D-E-F, E-F-G |
| **Inversion** | Reverse interval direction | C-E-G → C-E-G (mirror: C-E-G → C-Ab-F) |
| **Retrograde** | Play motif backwards | C-D-E → E-D-C |
| **Augmentation** | Lengthen rhythmic values | eighth-eighth-quarter → quarter-quarter-half |
| **Diminution** | Shorten rhythmic values | quarter-quarter-half → eighth-eighth-quarter |
| **Fragmentation** | Use only part of the motif | C-D-E-G → D-E (2 notes instead of 4) |
| **Extension** | Add notes to the beginning or end | C-D-E → C-D-E-F#-G |
| **Rhythmic Displacement** | Shift motif to different beat position | motif on 1 → motif on offbeat 2 |

### 12.2 Implementation: The PReVaDe Method

For each melody, use a **PReVaDe** cycle:
```
P — Present the motif (2-4 notes, 1 bar)
Re — Repeat it (same or varied, 1 bar)
Va — Vary it (transform one parameter: pitch/rhythm/direction, 1-2 bars)
De — Develop it (combine fragments + sequence, 1-2 bars)
      End with cadence gesture
```

### 12.3 Antecedent-Consequent (Question/Answer) Structure

The most fundamental phrase structure in all Western music:

**Antecedent (4 bars):**
- Bars 1-2: Basic idea (motif presentation)
- Bars 3-4: Contrasting idea leading to weak cadence (V or IAC)
- Feels incomplete — "question"

**Consequent (4 bars):**
- Bars 1-2: Same basic idea (parallel) or new (contrasting)
- Bars 3-4: Ends with strong cadence (PAC)
- Feels complete — "answer"

This 8-bar period structure is universal — recognisable in Mozart, Miles Davis, and Martin Garrix.

### 12.4 Application to Electronic Music

Electronic music typically uses 4- or 8-bar loops, not 2-bar periods. But the **same question-answer principle** applies:

- **Melody A** (4 bars): Ends on 5th scale degree (question)
- **Melody B** (4 bars): Ends on tonic (answer)
- Together they form an 8-bar phrase

Every genre that has melodic content (Deep House, Trance, Melodic Techno, Melodic DnB) benefits from this structure. Generators that produce 8-bar melodies with antecedent-consequent pairs instead of 8 identical bars will sound 10× more musical.

---

## 13. Anticipation, Syncopation & Rhythmic Tension

### 13.1 Two Types of Syncopation

1. **Metric syncopation** — accent on a weak beat (offbeat) instead of strong beat
2. **Harmonic syncopation** — chord change on a weak beat instead of strong beat

The Longuet-Higgins & Lee (1984) syncopation model defines syncopation as: *"a note that begins on a metrically weak position and is tied across a stronger position without a new onset."* The syncopation score is proportional to the strength of the skipped beat(s).

### 13.2 Syncopation Levels

| Level | Beat Strength | Example | Effect |
|-------|--------------|---------|--------|
| Strong | Beat 1 | Downbeat | Max stability |
| Medium | Beat 3 (in 4/4) | Backbeat | Danceable |
| Weak | Beats 2 & 4 | Offbeat | Creates forward motion |
| Weakest | 8th note subdivisions | "And" of the beat | Maximum syncopation |

### 13.3 Press-and-Release Pattern

In groove research, the **press-and-release** model describes how syncopated patterns create a kinetic response:

1. **Press** — strong beat (usually kick on 1) provides stable reference
2. **Synco** — offbeat note creates tension by displacing the expected accent
3. **Release** — return to strong beat resolves the tension

The pleasure of syncopation comes from the "aha" moment when the brain resolves the temporal displacement.

### 13.4 Generator Implementation

```
For a melody/bassline:
  1. Start with a straight rhythm (all notes on beats)
  2. With probability P_sync (~20-40%), displace a note:
     - Move an 8th or 16th note forward or backward
     - Prefer displacing beat 2 or 4 notes (weak beats)
     - Avoid displacing beat 1 (anchor beat)
  3. For maximum groove: layer syncopated melody over straight kick
  4. Ensure displaced notes don't cross the next downbeat (keep ≤ 1 beat offset)
```

### 13.5 Anticipation — The "Arriving Early" Gesture

Anticipation is characteristic of human performance: arriving at the next chord's target note slightly before the chord change. In MIDI generation:

```
If a note falls on the first beat of a new bar:
  With ~15-30% probability, shift it to the second half of the previous bar
  This creates a "pulling forward" feel that adds urgency
```

Anticipation is especially common in:
- **Basslines**: root of next chord arrives on beat 4 of current bar
- **Melodies**: peak note arrives early before the chord lands underneath
- **Deep House**: characteristic "rushing into the downbeat" jazz feel

---

## 14. Ornamentation — The "Musician's Fingerprints"

Ornamentation is what separates "this was generated" from "this was played." Even 2-3 ornamented notes per 8-bar phrase adds human feel.

### 14.1 MIDI-Implementable Ornaments

| Ornament | Notes Required | MIDI Implementation | Effect |
|----------|---------------|-------------------|--------|
| **Grace note (acciaccatura)** | 1 very short note before main note | Insert a note at ~25% velocity, very short duration (1-5 ticks), 1-2 semitones from main note | Quick "crushed" note — adds attack emphasis |
| **Trill** | Rapid alternation between adjacent notes | Sequence of 4-8 alternating 32nd/64th notes starting from main note | Ornamental "shake" — used at phrase endings |
| **Mordent** | Main note → upper note → main note | Three quick notes: main, one step up, main (each ~32nd note) | Adds brilliance at sustained notes |
| **Turn** | Note above → main → note below → main | Four notes: upper neighbor, main, lower neighbor, main | Elegant decoration for held notes |
| **Slide (portamento)** | Chromatic steps between two notes | Fill interval with short chromatic notes (~16th notes at low velocity) | Smooth vocal-like connection between distant notes |
| **Fall-off** | Final note bends downward | Sequence of 3-5 descending notes starting from final pitch at decreasing velocity | Ending gesture — "dropping off" |

### 14.2 Genre-Specific Ornamentation

| Genre | Ornamentation Profile |
|-------|----------------------|
| **Deep House** | Grace notes abundant (jazz piano influence), occasional turns on held notes |
| **Trance** | Trills on the 7th before resolution, slides (portamento) between large intervals |
| **Melodic Techno** | Sparse — mordents on accent notes, rare trills |
| **DnB** | Grace notes in basslines (Reese), rapid turns at phrase ends |
| **Dubstep** | Fall-offs at end of phrases (wobble carry-over) |

### 14.3 Implementation Rules

```
Apply ornaments only to "anchor" notes — not random notes:
  - First note of a phrase (attack grace)
  - Highest note of a phrase (trill/mordent)
  - Last note before a bar line (turn)
  - Final note of the melody (fall-off)

Ornament density: 1-2 ornaments per 8-bar phrase (subtlety is key)
```

---

## 15. Voice-Leading Between Parts — The Missing Connective Tissue

Current generators treat melody, bass, and chords independently. Real music has the parts interacting through specific voice-leading relationships.

### 15.1 The Three Interaction Rules

| Rule | What It Means | Implementation |
|------|---------------|----------------|
| **Chord tones on strong beats** | Melody notes on beats 1 and 3 should usually be chord tones (root, 3rd, 5th, 7th of current chord) | Before generating melody, compute chord-tone grid; bias pitch selection toward chord tones on downbeats |
| **Bass-chord connection** | Bass note should be the root (or 5th) of the chord on beat 1 | Bass on beat 1 = chord root; beats 2-4 can be passing tones |
| **Melody-bass contrary motion** | When melody goes up, bass should tend to go down (and vice versa) | After generating bass line, check interval direction between adjacent melody and bass notes; if both move same direction for 3+ notes, invert one |

### 15.2 Voice Proximity Rules

```
Maintain good spacing between voices:
  - Bass to chord: ≤ 2 octaves (avoid gap)
  - Chord to melody: ≤ 1.5 octaves typical (can be wider in techno/trance)
  - Avoid voice crossing: melody should never dip below the chord's top note
  - Avoid voice overlap: chord notes should stay in their register
```

### 15.3 The "Harmonic Anchor" for Basslines

Analysis of professional MIDI shows basslines hit the chord root on beat 1 approximately:
- **Deep House**: ~85% of bars (very stable)
- **Techno**: ~90% (bass is the harmonic foundation)
- **Trance**: ~75% (more melodic bass movement)
- **DnB**: ~60% (bass lines are more syncopated and melodic)
- **Dubstep**: ~70% (bass is rhythmic, not always harmonic)

Implementation: For each bar, set bass beat 1 to chord root with genre-appropriate probability; non-root beats can be chord 5th, passing tones, or chromatic approach tones.

### 15.4 The "Melody-Within-Chord" Principle

Human melodies tend to:
1. Stay within the range of the underlying chord voicing (bass to top note of chord)
2. Use chord tones on strong beats, non-chord tones on weak beats
3. Peak at the point of highest harmonic tension (dominant or cadential 6/4 chord)

Implementation:
```
1. Define a "melody window" = bass note at bottom, chord's highest note at top
2. 80% of melody notes should fall within this window
3. Melody may briefly exit window for dramatic effect (peak notes)
4. On strong beats: P(chord_tone) = 80%, P(non_chord_tone) = 20%
5. On weak beats: P(chord_tone) = 50%, P(non_chord_tone) = 50%
```

---

## 16. Complete Generator Upgrade — Unified Architecture

### 16.1 The Missing Pipeline Steps

Current generator: `Progression → isobar patterns → MIDI export`

Target generator:
```
Progression → Chord voicing → Motif selection → Melody (with NCTs)
                                                      ↓
                                            Bassline (harmonic anchor)
                                                      ↓
                                            Voice-leading check
                                                      ↓
                                            Ornament pass
                                                      ↓
                                            Humanization (systematic microtiming)
                                                      ↓
                                            MIDI export
```

### 16.2 Microtiming Layer (Post-Quantization)

Based on research findings (Datseris et al. 2019, Nelias et al. 2022):

| Timing Adjustment | Amount | Effect |
|-------------------|--------|--------|
| **Downbeat delay** | Soloist melody notes on beat 1: delay by 10-30ms | Creates "pushing against the grid" swing |
| **Offbeat shuffle** | 8th-note offbeats: delay by 15-35% of 8th note value | Classic swing/shuffle feel |
| **Bass locked to grid** | Bass beat 1: quantized (±0ms) | Provides stable anchor |
| **Chord internal spread** | Spread chord onset across 5-20ms per note | Realistic "chord from below" piano effect |
| **Release velocity jitter** | Note-off velocity: ±5 random | Negligible but adds imperfection |
| **Phase correction** | After 3+ syncopated notes, pull one back toward grid | Simulates musician self-correcting |

### 16.3 Dynamic Envelope Per Metric Position

Not all beats are equal. Professional MIDI shows systematic velocity patterns:

| Beat | Typical Velocity Profile | Role |
|------|------------------------|------|
| Beat 1 (downbeat) | 100-110% of average | Strongest — establishes meter |
| Beat 2 (weak) | 80-90% of average | Lightest — pass |
| Beat 3 (backbeat in 4/4) | 95-105% of average | Medium-strong — midpoint |
| Beat 4 (weak/pickup) | 85-95% of average | Medium-light — leads to next bar |
| Upbeats ("ands") | 70-85% of average | Lightest — rhythmic propulsion |

This "mountain range" profile of velocity creates the internal lilt that human performances have.

### 16.4 Complete Parameter Reference

| Generator Parameter | Range | Default | Effect |
|--------------------|-------|---------|--------|
| `nct_density` | 0.0-0.5 | 0.3 | How many chord tones are replaced with non-chord tones |
| `motif_length` | 2-8 notes | 4 | Length of the primary motif |
| `motif_variation` | 0.0-1.0 | 0.4 | How much each repetition varies from the original |
| `phrase_structure` | continuous/antecedent_consequent | antecedent_consequent | 8-bar question/answer or continuous |
| `syncopation` | 0.0-1.0 | 0.3 | Probability of displacing a note from its grid position |
| `anticipation` | 0.0-0.5 | 0.2 | Probability of landing on the next chord's note early |
| `ornament_density` | 0-4 per phrase | 1 | Number of ornamented notes per 8-bar phrase |
| `contrary_motion` | 0.0-1.0 | 0.7 | Strength of preference for contrary melody-bass motion |
| `bass_anchor` | 0.0-1.0 | 0.8 | Probability of bass hitting chord root on beat 1 |
| `microtiming_amount` | 0.0-1.0 | 0.3 | How much systematic timing deviation to apply |
| `velocity_profile` | uniform/mountain/swing | mountain | Per-beat velocity envelope shape |

### 16.5 Comparison: Current vs. Fully Upgraded Generator

| Aspect | Current Generator | Fully Upgraded Generator |
|--------|-----------------|--------------------------|
| **Pitch content** | Random walk on scale degrees | Chord tones + 9 NCT types with correct approach/leave rules |
| **Phrase structure** | None (continuous) | Antecedent-consequent 8-bar periods |
| **Melody coherence** | None | Motif-based with repetition/sequence/variation |
| **Non-chord tones** | None (all notes in scale) | 9 types at genre-appropriate rates (~30%) |
| **Syncopation** | None (all on grid) | Press-and-release patterns with anticipation |
| **Voice-leading** | None (parts independent) | Chord-tone anchoring, contrary motion, register bounds |
| **Ornamentation** | None | Grace notes, mordents, trills, falls |
| **Microtiming** | None (quantized) | Downbeat delays, offbeat shuffle, bass grid-lock |
| **Velocity** | Static per-beat with phrase multiplier | Mountain profile per bar + motif-level arcs |
| **Bass harmonic role** | Genre-dependent guess | Chord-root anchor at corpus rate (~80% on beat 1) |
| **Chord voicings** | Close position only | Close/open/drop2 mix from corpus |
| **Motif development** | None | PReVaDe cycle across 8-bar phrase |

---

## References (Supplement — Sections 11-16)

13. Whitman College Music Theory. *Non-Chord Tones.* https://musictheory.pugetsound.edu/mt21c/NonChordTonesIntroduction.html
14. Soundfly. *7 Melody Writing and Motivic Development Techniques.* https://flypaper.soundfly.com/write/7-melody-writing-and-motivic-development-techniques-for-songwriters
15. Narmour, E. (1990). *The Analysis and Cognition of Basic Melodic Structures.* University of Chicago Press.
16. Schellenberg, E. G. (1996). *Expectancy in Melody: Tests of the Implication-Realization Model.* Cognition, 58(1), 75-125.
17. Longuet-Higgins, H. C. & Lee, C. S. (1984). *The Rhythmic Interpretation of Monophonic Music.* Music Perception, 1(4), 424-441.
18. Datseris, G. et al. (2019). *Microtiming Deviations and Swing Feel in Jazz.* Scientific Reports, 9, 19824.
19. Nelias, C. et al. (2022). *Downbeat delays are a key component of swing in jazz.* Communications Physics, 5, 237.
20. Caplin, W. (1998). *Classical Form: A Theory of Formal Functions.* Oxford University Press.
21. Meyer, L. B. (1956). *Emotion and Meaning in Music.* University of Chicago Press.
22. Lerdahl, F. & Jackendoff, R. (1983). *A Generative Theory of Tonal Music.* MIT Press.
23. Wikipedia. *Mordent.* https://en.wikipedia.org/wiki/Mordent
24. Wikipedia. *Ornament (music).* https://en.wikipedia.org/wiki/Ornament_(music)
25. Hello Music Theory. *The Different Types of Musical Ornaments.* https://hellomusictheory.com/learn/ornaments/
26. Fitch, W. T. & Rosenfeld, A. J. (2007). *Perception and Production of Syncopated Rhythms.* Music Perception, 25(1), 43-58.
27. Fram, N. R. et al. (2023). *Syncopation as Probabilistic Expectation.* Cognitive Science, 47(12), e13390.
28. Kaplan, T. et al. (2023). *Probabilistic modelling of microtiming perception.* Cognition, 239, 105532.
29. Senn, O. et al. (2017). *Rhythmic Density Affects Listeners' Emotional Response to Microtiming.* Frontiers in Psychology.
