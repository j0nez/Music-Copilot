# Music Theory & Music Algorithms

Counterpoint, voice-leading, cadence detection, key modulation, and algorithmic composition. Tools and libraries for offline symbolic music analysis beyond the current key/scale detection.

**Last updated:** 2026-06-05

## Overview

Music Copilot already uses `music21` for Krumhansl-Schmuckler key detection in the Sample Analyzer. This research goes deeper into music21's analysis capabilities (voice leading, Roman numeral analysis, counterpoint) plus related libraries for cadence detection, key modulation detection, and algorithmic composition.

---

## 1. music21 Voice Leading Analysis

music21's `voiceLeading` module (`music21/voiceLeading.py`, ~2,510 lines) provides a comprehensive framework for analyzing contrapuntal motion between voices.

### VoiceLeadingQuartet

The core object is `VoiceLeadingQuartet` — a 2×2 note matrix representing two voices moving between two points in time:

```
v1n1 ──hInterval──→ v1n2   (upper voice, note 1 → note 2)
   │                    │
vInterval            vInterval
   │                    │
v2n1 ──hInterval──→ v2n2   (lower voice, note 1 → note 2)
```

**Motion type classification** (via `VoiceLeadingQuartet.motionType()`):

| Motion Type | Description | Enum |
|-------------|-------------|------|
| Parallel | Both voices move same direction, same interval | `MotionType.parallel` |
| Similar | Both voices move same direction, different interval | `MotionType.similar` |
| Contrary | Voices move in opposite directions | `MotionType.contrary` |
| Oblique | One voice moves, other stays | `MotionType.oblique` |
| Anti-Parallel | Contrary motion that arrives at the same interval | `MotionType.antiParallel` |
| No Motion | Neither voice moves | `MotionType.noMotion` |

**Specialized detection methods:**

- `parallelFifth()` — detects parallel perfect fifths (common in counterpoint rules)
- `parallelOctave()` — detects parallel octaves
- `parallelUnison()` — detects parallel unisons
- `hiddenFifth()` / `hiddenOctave()` — detects hidden/direct intervals
- `voiceOverlap()` — detects if voices cross registrally
- `voiceCrossing()` — detects if voices cross pitch boundaries

**Usage pattern:**

```python
from music21 import voiceLeading, note
vlq = voiceLeading.VoiceLeadingQuartet(
    note.Note('C4'), note.Note('D4'),  # v1: C→D
    note.Note('G3'), note.Note('A3'),  # v2: G→A
)
vlq.motionType()             # MotionType.parallel
vlq.parallelFifth()          # True (C→D against G→A = parallel 5ths)
vlq.parallelOctave()         # False
```

### Verticality System

- `Verticality` — represents vertical context (all simultaneous notes at a moment in a score)
- `VerticalityNTuplet` — group of N contiguous verticalities
- `VerticalityTriplet` — three verticalities with special analysis features (voice-leading rules between chord pairs)
- `NNoteLinearSegment` / `ThreeNoteLinearSegment` — linear note sequences in a single voice

### Iterating Voice Leading

`iterateAllVoiceLeadingQuartets()` yields every VLQ in a piece — pairing each pair of parts, then each pair of adjacent vertical moments. This enables full-score contrapuntal analysis.

### Voice Leading Counterpoint Rules (cpos.py)

music21 has a dedicated **counterpoint** module (`music21.cpos`, ~2,800 lines plus associated tests and data) that implements first-species, second-species, and strict counterpoint validation:

- **ContrapuntalRule** base class with concrete subclasses:
  - `NoParallelOctaves`, `NoParallelFifths` — forbids parallel perfect consonances
  - `NoHiddenParallels` — forbids hidden fifths/octaves
  - `PrepareResolution` — standard suspension preparation/resolution patterns
  - `SkipLeapTreatment` — large leap handling rules
  - `MiContraFa` — tritone resolution rules (mi contra fa)
- `counterpoint.music21.counterpoint.Counterpoint` class for full-species workflow

### Suitability for Music Copilot

- **VoiceLeadingQuartet** is directly usable for analyzing chord voicings and voice-leading quality between consecutive chords in the Chord Generator / Expression Engine.
- The `motionType()` classifier enables features like "smooth voice leading score" for generated progressions.
- Counterpoint module is likely overkill for electronic music (where parallel 5ths are common) but could be referenced for "Why Does This Sound Good?" explanations.

---

## 2. Roman Numeral & Harmonic Analysis

music21's `roman` module provides functional harmony analysis — already partially used in the Chord Generator's secondary dominants and chord quality detection.

### Key Features

- `romanNumeralFromChord(chord, key)` — converts any chord to a Roman numeral in a given key context
- `RomanNumeral` objects are subclasses of `Chord` with additional properties:
  - `.figure` — Roman numeral string (e.g., `"I"`, `"ii65"`, `"V7/V"`)
  - `.figureAndKey` — e.g., `"I in F major"`
  - `.scaleDegree` — integer scale degree (1–7)
  - `.scaleDegreeWithAlteration` — degree + accidental for borrowed chords
  - `.quality` — `"major"`, `"minor"`, `"diminished"`, `"augmented"`
  - `.inversion()` — 0, 1, 2 (root, first, second)
  - `.functionalityScore` — 0–100 rating of how "functional" the chord is
  - `.primeForm` — pitch-class set representation
  - `.figuresWritten` / `.figuresNotationObj` — figured bass notation

### Secondary Dominants & Borrowed Chords

```python
from music21 import roman, key
rn = roman.RomanNumeral('V7/V', 'C')  # Secondary dominant of V in C major
rn.figure       # "V7/V"
rn.figureAndKey # "V7/V in C major"
```

### Chordify

`music21.chordify` converts any score into a sequence of chords by stacking simultaneously sounding notes. Combined with `romanNumeralFromChord`, this enables full-score harmonic analysis:

```python
from music21 import chordify, roman
score = corpus.parse('bach/bwv66.6')
chordified = score.chordify()
for c in chordified.recurse().getElementsByClass('Chord'):
    rn = roman.romanNumeralFromChord(c, score.analyze('key'))
```

### Suitability for Music Copilot

- **Already usable today**: The Chord Generator can use `functionalityScore` to rank progression quality.
- **Phase 2+**: Full Roman numeral analysis of user-imported MIDI to derive harmonic structure.
- **"Why Does This Sound Good?"**: Roman numeral analysis provides the theoretical vocabulary needed for AI explanations.

---

## 3. Cadence Detection

### cadence-detector (pip install)

| Property | Value |
|----------|-------|
| PyPI | `cadence-detector` 0.3.0 |
| License | MIT |
| Approach | Rule-based from MusicXML scores |
| Cadence types | PAC (Perfect Authentic), IAC (Imperfect Authentic), HC (Half) |
| Input | MusicXML files (single or folder) |
| Output | Measure/offset locations + labeled MusicXML |

Simple API:
```python
from cadence_detector import cadence_detector
cadence_detector.detect_cadences_in_file(
    full_path="score.musicxml",
    output_path="./output/"
)
```

**Limitations:** MusicXML-only input (no audio, no MIDI). Rule-based approach limited to common-practice repertoire.

### CADET — Graph Neural Network Approach

| Property | Value |
|----------|-------|
| URL | https://github.com/manoskary/cadet |
| License | Not specified |
| Approach | Graph Convolutional Network |
| Input | Symbolic scores (MusicXML/MIDI) |
| Output | PAC/IAC/HC at note, beat, or measure granularity |

**Architecture:** Represents scores as homogeneous graphs with note-wise features. Uses GraphSMOTE (imbalanced classification GCN) adapted for larger graphs with stochastic training. Features include general note features, graph topology (Laplacian eigenvectors), and cadence-relevant features (harmonic, voice-leading).

**Results:** Comparable to state-of-the-art on Bach WTC fugues and string quartet datasets. The model is capable of making predictions at multiple levels of granularity (notes, beats).

**Key innovation:** Graph convolution learns non-local features automatically, eliminating the need for specialized feature engineering for harmonic context.

### music21-based Detection

A simpler approach using music21's existing tools:

1. Parse score, chordify, run Roman numeral analysis
2. Detect cadence patterns:
   - **PAC**: V→I, both in root position, soprano ends on tonic
   - **IAC**: V→I with exceptions (inversion, soprano not tonic)
   - **HC**: ends on V (any preceding chord)
   - **Plagal**: IV→I
   - **Deceptive**: V→vi (or other unexpected resolution)
3. Could be implemented as a ~100-line custom function

### Suitability for Music Copilot

- **cadence-detector** is too limited (MusicXML only) for direct use but provides reference logic.
- **music21-based approach** is preferred: implement a simple cadence detector plugin using chordify + Roman numeral analysis + pattern matching. This gives PAC, IAC, HC, Plagal, and Deceptive detection from MIDI.
- **CADET** is a research reference; not production-ready without pre-trained weights.
- For electronic music, cadence detection is less critical (many genres avoid traditional cadences) but useful for the "Why Does This Sound Good?" feature.

---

## 4. Key Modulation Detection

### music21 Windowed Analysis

music21's `WindowedAnalysis` class can apply any `DiscreteAnalysis` (including key analysis) over sliding windows:

```python
from music21 import analysis, stream, corpus
s = corpus.parse('bach/bwv66.6')
wa = analysis.windowed.WindowedAnalysis(
    analysis.discrete.KrumhanslSchmuckler(),
    windowSize=10,  # measures
)
for result in wa.analyze(s):
    print(result)
```

This creates a time-series of key estimates — spikes or shifts indicate modulation points.

**Available key analysis algorithms (5 algorithms total):**

| Algorithm | Best For | Notes |
|-----------|----------|-------|
| **KrumhanslSchmuckler** | General key detection | Current default. Strong tendency to identify dominant as tonic. |
| **AardenEssen** | Major keys | Weak tendency to identify subdominant as tonic. |
| **BellmanBudge** | Balanced | No particular tendencies for confusions. |
| **TemperleyKostkaPayne** | Major keys | Strong tendency to identify relative major in minor keys. |
| **SimpleWeights** | Large regions | Performs most consistently with large regions; noisier with small. |

**Modulation detection strategy:** Compare key profiles between overlapping windows. A significant change in the top-1 key suggests a modulation.

### Transformer-Based Approach

A 2024 University of Rochester project (Boning Wang et al.) developed a transformer model specifically for key modulation detection:

- **Dataset:** 411 songs across multiple languages and genres (including modulation examples)
- **Architecture:** Transformer with multi-output heads for multiple key sections
- **Output:** List of (section_start, section_end, key_label)
- **Key finding:** Traditional single-key detection methods dramatically underperform on music with modulation

### Essentia Key Detection

Essentia provides HPCP (Harmonic Pitch Class Profile) + key detection but is AGPL-licensed (see model-recommendations.md for license concern). Not recommended for production use in Music Copilot.

### Suitability for Music Copilot

- **music21 WindowedAnalysis** is the most practical approach — already installed, works offline, no additional dependencies. Use BellmanBudge for modulation detection (most balanced profiles reduce false positives).
- **Phase 2+ plugin**: A `KeyModulationDetector` plugin that runs WindowedAnalysis on a chord progression or MIDI file and returns modulation points.
- Transformer approach is Phase 5+ scope (Reference Track Intelligence).

---

## 5. Algorithmic Composition Libraries

### arvo — Procedural Music Composition

| Property | Value |
|----------|-------|
| URL | https://github.com/georgesdimitrov/arvo |
| Stars | 57 |
| License | MIT |
| Author | Dr. Georges Dimitrov (Concordia University) |
| Depends on | music21 |

**Modules:**

| Module | Description |
|--------|-------------|
| `isorhythm` | Generate isorhythmic constructions from pitch and duration sequences |
| `minimalism` | Additive/subtractive processes (Glass/Reich-inspired) |
| `tintinnabuli` | Arvo Pärt-inspired tintinnabuli voice pairing |
| `transformations` | Scalar transpositions, inversions, retrogrades |
| `scales` | Extended scale system building on music21 |
| `sequences` | Integer sequences (primes, Fibonacci, Kolakoski) for composition |
| `tools` | Helper functions for manipulating music21 streams |

**Example:**
```python
from arvo import isorhythm, minimalism
melody = isorhythm.create_isorhythm(
    ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    [1, 0.5, 0.5, 2]
)
# Apply additive process (Glass-style phase shifting)
evolved = minimalism.additive_process(
    melody, repetitions=[1],
    direction=minimalism.Direction.FORWARD
)
```

**Suitability for Music Copilot:**
- **Already referenced in model-recommendations.md** for Phase 1-3 procedural generation.
- The isorhythm + minimalism tools can generate interesting variations on chord generator output.
- tintinnabuli is useful for creating counter-melodies (M-voice and T-voice pairing).
- Samples include recreations of Messiaen, Pärt, and Rzewski — demonstrating compositional range.
- Not actively updated (last release 2021) but stable since it builds on music21.

### isobar — Pattern-Based Algorithmic Composition

| Property | Value |
|----------|-------|
| URL | https://github.com/ideoforms/isobar |
| Stars | 426 |
| License | MIT |
| Status | Actively maintained (v0.2.1, Aug 2025) |
| Outputs | MIDI, OSC, MIDI files, custom actions |

**Pattern class hierarchy (8 categories, ~60 classes):**

| Category | Key Classes | Purpose |
|----------|-------------|---------|
| **Core** | `Pattern`, `PConstant`, `PRef`, `PFunc`, `PDict` | Base abstractions |
| **Arithmetic** | `PAdd`, `PSub`, `PMul`, `PDiv`, `PMod`, `PPow` | Math on patterns |
| **Sequence** | `PSeries`, `PLoop`, `PPingPong`, `PArpeggiator`, `PEuclidean` | Note sequencing |
| **Chance** | `PWhite`, `PBrown`, `PWalk`, `PChoice`, `PShuffle`, `PMarkov` | Stochastic generators |
| **Tonal** | `PDegree`, `PFilterByKey`, `PNearestNoteInKey` | Scale/key-aware |
| **Markov** | `PMarkov` | First-order Markov chains |
| **L-System** | `PLSystem` | Lindenmayer system sequences |
| **Warp** | `PWInterpolate`, `PWSine`, `PWRallantando` | Tempo/time manipulation |

**Example:**
```python
from isobar import *
arpeggio = PDegree(PSeries(0, 2, 6), iso.Scale.minor) + 72
arpeggio = PPingPong(PLoop(arpeggio))
amplitude = PSequence([50, 35, 25, 35]) + PBrown(0, 1, -20, 20)
timeline = Timeline(120)
timeline.schedule({"note": arpeggio, "duration": 0.25, "amplitude": amplitude})
timeline.run()
```

**Suitability for Music Copilot:**
- **Strong candidate for Phase 3 Melody/Bassline Generator.** The pattern-based approach aligns well with Music Copilot's existing deterministic philosophy.
- Euclidean rhythm generator (`PEuclidean`) is directly usable for drum pattern generation.
- Markov chains provide controlled randomness for variations while maintaining musical coherence.
- MIDI output means it integrates cleanly with existing MIDI Export Engine.
- The `PFilterByKey` / `PDegree` classes enforce key/scale constraints — exactly matching Music Copilot's Theory Engine.

### pycomposer — GAN-Based Composition

| Property | Value |
|----------|-------|
| PyPI | `pycomposer` 1.0.6 |
| License | GPL-2.0 |
| Approach | Generative Adversarial Networks |
| Dependency | PyTorch + GPU recommended |

Generates monophonic melodies using GANs trained on MIDI datasets. The GPL-2.0 license is compatible with Music Copilot (also open source) but the GAN approach is overkill for Phase 1-3 needs.

**Not recommended for current phases** — procedural approaches (arvo, isobar) provide more control with zero GPU dependency.

### musicaiz — Symbolic Music Framework

| Property | Value |
|----------|-------|
| PyPI | `musicaiz` 0.1.2 |
| License | AGPL v3 (blocker) |
| Last release | Mar 2023 |
| Paper | arXiv:2209.07974 |

Comprehensive framework with loaders, harmony analysis, rhythm, tokenizers, converters, datasets, and ML models. However, **AGPL v3 license is a blocker** (same issue as essentia — cannot be used in commercial open-source projects without separate licensing).

**Not recommended.** Referenced for architecture inspiration only.

---

## 6. Post-Tonal & Set Theory

music21 includes a full post-tonal theory module:

- `music21.serial` — 12-tone row operations (prime, retrograde, inversion, transposition)
- `music21.interval` — interval vectors, set classes
- `music21.chord.Chord.primeForm` — Forte prime form labels
- `music21.chord.Chord.intervalVector` — interval-class vector

```python
c = chord.Chord(['C4', 'E-4', 'G4', 'B4'])
c.primeForm         # [0, 3, 7, 11] — dominant seventh
c.intervalVector    # [0, 0, 1, 1, 1, 1]
c.commonName        # "dominant-seventh chord"
```

This is unlikely to be used in v0.1 (electronic music rarely uses atonal theory), but available for future "Analysis" features.

---

## 7. Phase-Based Recommendations

| Phase | Feature | Recommended Approach | Dependencies |
|-------|---------|---------------------|--------------|
| **v0.1** | Voice-leading quality for Chord Generator | Use `VoiceLeadingQuartet` to score chord transitions | music21 (already installed) |
| **v0.1** | Roman numeral labeling of generated progressions | `roman.romanNumeralFromChord()` for display | music21 (already installed) |
| **Phase 2** | Cadence detection in user MIDI | Custom plugin using chordify + Roman numeral + pattern matching | music21 only |
| **Phase 2** | Key modulation detection | `WindowedAnalysis` with BellmanBudge profiles over sliding windows | music21 only |
| **Phase 3** | Melody/Bassline Generator | **isobar** pattern library (PDegree, PEuclidean, Markov chains) | `pip install isobar` |
| **Phase 3** | Counter-melody generation | **arvo** tintinnabuli + isorhythm | `pip install arvo` |
| **Phase 4** | "Why Does This Sound Good?" explanations | Roman numeral analysis + voice-leading metrics + cadence classification | music21 only |
| **Phase 5** | Advanced modulation detection | Transformer model (custom training) | PyTorch |
| **Any** | Full-score contrapuntal checking | music21 `counterpoint` module + `VoiceLeadingQuartet` | music21 only |

### Implementation Notes for v0.1

1. **Voice-leading quality scoring** is a trivial addition to the Chord Generator:
   - For each adjacent chord pair in a progression, create a `VoiceLeadingQuartet` for each voice pair
   - Score the transition: parallel 5ths/octaves = negative, contrary motion = positive
   - Display a "smoothness" metric alongside each generated progression

2. **Roman numeral display** is already possible — the existing chord quality detection maps directly to Roman numerals. A display helper in the frontend would show `I – IV – V7 – I` instead of `C – F – G7 – C`.

3. **No new dependencies needed** for any v0.1 or Phase 2 features. music21 provides everything.

---

## References

1. Cuthbert, M. S. A. & Ariza, C. *music21: A Toolkit for Computer-Aided Musical Analysis.* http://www.music21.org/
2. CuthbertLab. *music21 voiceLeading module.* GitHub. https://github.com/cuthbertLab/music21/blob/master/music21/voiceLeading.py
3. CuthbertLab. *music21 cpos module (counterpoint).* GitHub. https://github.com/cuthbertLab/music21/tree/master/music21/cpos
4. MusicalStateMachines. *cadence-detector.* PyPI. https://pypi.org/project/cadence-detector/
5. Karystinaios, M. *CADET: Cadence Detection in Symbolic Classical Music using Graph Neural Networks.* GitHub. https://github.com/manoskary/cadet
6. Karystinaios, M. et al. (2022). *Cadence Detection in Symbolic Classical Music using Graph Neural Networks.* arXiv:2208.14819
7. Dimitrov, G. *arvo: Python library for procedural music composition.* GitHub. https://github.com/georgesdimitrov/arvo
8. ideoforms. *isobar: Python library for algorithmic composition.* GitHub. https://github.com/ideoforms/isobar
9. Hernandez-Olivan, C. & Beltran, J. R. (2022). *musicaiz: A Python Library for Symbolic Music Generation, Analysis and Visualization.* arXiv:2209.07974
10. Wang, B. et al. (2024). *Key Detection for Pop Music Supporting Modulation Point Locating Based on Transformer.* University of Rochester.
11. Andersen, K. *music21 analysis.discrete module.* https://www.music21.org/music21docs/moduleReference/moduleAnalysisDiscrete.html
12. Sapp, C. *Humdrum keycor command.* https://extras.humdrum.org/man/keycor/
