# Advanced MIDI Generation

Multi-track MIDI generation, procedural melody/bass/drums, swing quantization, velocity patterns, note expression, and arpeggiation tools for offline algorithmic composition in Music Copilot.

**Last updated:** 2026-06-05

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
