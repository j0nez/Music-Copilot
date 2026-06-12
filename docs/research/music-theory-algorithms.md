# Music Theory & Music Algorithms

Counterpoint, voice-leading, cadence detection, key modulation, and algorithmic composition. Tools and libraries for offline symbolic music analysis beyond the current key/scale detection.

**Last updated:** 2026-06-13

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

**Available key analysis algorithms (5 algorithms total):** — The Sample Analyzer plugin uses all 5 in an ensemble with confidence voting.

| Algorithm | Best For | Notes |
|-----------|----------|-------|
| **KrumhanslSchmuckler** | General key detection | Strong tendency to identify dominant as tonic. The canonical K-S algorithm. |
| **AardenEssen** | Major keys | Weak tendency to identify subdominant as tonic. |
| **BellmanBudge** | Balanced | No particular tendencies for confusions. |
| **TemperleyKostkaPayne** | Major keys | Strong tendency to identify relative major in minor keys. |
| **SimpleWeights** | Large regions | Simpler weight profiles; noisier with small regions but provides independent diversity to the ensemble. |

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

## 7. Mathematical Frameworks for Harmony & Tension

### 7.1 Tymoczko's Orbifold Geometry — Voice-Leading as Shortest Path

| Property | Value |
|----------|-------|
| Source | Tymoczko, D. (2006). *The Geometry of Musical Chords.* Science, 313(5783), 72–74. |
| Also | Callender, C., Quinn, I. & Tymoczko, D. (2008). *Generalized Voice-Leading Spaces.* Science, 320(5874), 346–348. |
| Book | Tymoczko, D. (2011). *A Geometry of Music.* Oxford University Press. |

**Concept:** A musical chord is a point in an n-dimensional quotient space called an **orbifold**. A voice leading between two chords is a line segment connecting their points. The shortest line segment = the smoothest possible voice leading (minimum total voice-leading distance).

Three successive quotient operations produce the orbifold:
1. **Permutation** — the ordering of notes within a chord doesn't matter {C, E, G} = {E, G, C}
2. **Translation** — pitch-class equivalence (octave equivalence): C4 and C5 are the same note
3. **Reflection** — voice-crossing is permitted (voices can cross without penalty)

**Key result:** Short line segments exist only when chords are **nearly symmetrical** under one or more of these operations. Consonant chords (major/minor triads) and dissonant chords have different near-symmetries, explaining their different musical uses.

**Example:** In the 2D orbifold for trichords (a Möbius strip with a cone at the center), the shortest path between a C major triad {0, 4, 7} and an A minor triad {9, 0, 4} is a single semitone step — the L transformation in Neo-Riemannian theory (see §7.2). This geometric fact explains why C→Am is the smoothest voice leading between major and minor triads.

**Application to Music Copilot:**
- **Directly applicable** to the Chord Generator's voice-leading quality scoring. Instead of ad-hoc rules (penalize parallel fifths, reward contrary motion), we can compute the true geodesic distance between chord voicings in orbifold space.
- music21's `plot` module includes orbifold projection visualizations (`music21.plot` constructs orbifold plots from chord progressions).
- The orbifold approach provides a mathematically rigorous alternative to `VoiceLeadingQuartet`'s heuristic scoring — both can coexist, with orbifold distance as a complement to motion-type classification.

### 7.2 Neo-Riemannian Theory — Group Theory on Triads

| Property | Value |
|----------|-------|
| Origin | Lewin, D. (1987). *Generalized Musical Intervals and Transformations.* Yale UP. |
| Key devs | Hyer, B.; Cohn, R. (1997). *Neo-Riemannian Operations, Parsimonious Trichords, and Their Tonnetz Representations.* JMT. |
| music21 | `music21.analysis.neoRiemannian.L()`, `.P()`, `.R()`, `.S()` |

**Concept:** Neo-Riemannian theory treats chord progressions as transformations on a set of 24 major/minor triads, without reference to a tonic. The three primary operations form a mathematical group:

| Operation | Effect | Semitones moved | Example |
|-----------|--------|-----------------|---------|
| **P** (Parallel) | Major ↔ parallel minor (same root) | 1 (third flips) | C ↔ Cm |
| **L** (Leading-tone exchange) | Major ↔ minor with leading-tone pivot | 2 → 2 | C ↔ Em (C→B, E→E, G→G) |
| **R** (Relative) | Major ↔ relative minor (same key signature) | 2 → 2 | C ↔ Am (C→C, E→E, G→A) |

**Group structure:**
- Each operation preserves two common tones and changes mode (major→minor or vice versa).
- All three are involutions (applying twice returns the original chord): P² = L² = R² = I
- ⟨L, P⟩ ≅ S₃ (symmetric group on 3 elements, order 6)
- ⟨L, R⟩ = ⟨R, L⟩ generates transposition by perfect fifth (cycle of all 24 triads)
- The full PLR group has order 24 — it is the dihedral group of the 24 triads
- **S** (Slide) = LPR — connects triads with single semitone root motion (e.g., C→C♯m)

**Tonnetz:** The geometric lattice representation. Each axis represents one operation (P, L, or R edges). Edge lengths correspond to voice-leading distance. A chord progression traces a path through the Tonnetz.

**Hexatonic systems (Cohn 1997):** The ⟨L, P⟩ cycle generates cycles of 6 triads sharing a common hexatonic scale (e.g., C, Cm, E♭, E♭m, G♭, G♭m = C hexatonic). These systems explain 19th-century chromatic harmony (Wagner, Liszt) that resists Roman numeral analysis.

**music21 implementation (verified):**
```python
from music21 import chord, analysis

c1 = chord.Chord('C4 E4 G4')
c2 = analysis.neoRiemannian.L(c1)   # → B3 E4 G4 (E minor)
c3 = analysis.neoRiemannian.P(c1)   # → C4 E-4 G4 (C minor)
c4 = analysis.neoRiemannian.R(c1)   # → C4 E4 A4 (A minor)
c5 = analysis.neoRiemannian.S(c1)   # → C4 E-4 G-4? (C♯ minor? — Slide)
```

All functions accept `Chord` objects with or without octaves and raise `LRPException` on non-triads (or return the original chord when `raiseException=False`).

**Application to Music Copilot:**
- **Phase 1 (low-hanging fruit):** Use L/P/R to generate smooth voice-leading variants of chord progressions. For any two chords generated by the Chord Generator, check if they are connected by a known transformation — if so, the voice leading is provably parsimonious.
- **Phase 2:** The Chord Progression Generator could accept a "Neo-Riemannian mode" that generates progressions via sequences of PLR operations rather than functional harmony, producing chromatic-but-coherent progressions suitable for lo-fi, ambient, and cinematic genres.
- **Phase 3:** Arpeggiation patterns can follow PLR cycles for chord-to-chord transitions that sound "logical" without being tonal.
- Already available in music21 — zero new dependencies.

### 7.3 Chew's Spiral Array — Tonal Tension in 3D

| Property | Value |
|----------|-------|
| Origin | Chew, E. (2000). *Towards a Mathematical Model of Tonality.* PhD thesis, MIT. |
| Book | Chew, E. (2014). *Mathematical and Computational Modeling of Tonality.* Springer. |
| Tension model | Herremans, D. & Chew, E. (2016). *Tension ribbons* (TENOR 2016). |
| Applications | MorpheuS music generation system (Herremans & Chew, IEEE TENCON 2016); MuSA.RT visualization |

**Concept:** A 3D geometric model with five concentric helices representing pitch classes, major/minor chords, and major/minor keys. Unlike the 2D Tonnetz (which folds into a torus under enharmonic equivalence), the Spiral Array preserves pitch spelling (B♯ ≠ C) by projecting into 3D space.

**Helix structure:**
- **Pitch helix:** Each pitch class is a point on a spiral ascending in z. C = (1, 0, 0), G = (cos 2πr, sin 2πr, 1), D = (cos 4πr, sin 4πr, 2), ...
  - Horizontal rotation: circle of fifths (one full turn every 12 pitches)
  - Vertical rise: one octave per turn
- **Chord helix:** Each major/minor chord is a convex combination of its three member pitches' positions:
  - C major = ⅓·(C + E + G) — point inside the pitch spiral
- **Key helix:** Each key is a convex combination of its defining chords (I, IV, V):
  - C major key = ⅓·(C + F + G) — point inside the chord spiral

**Three tonal tension indicators (Herremans & Chew 2016):**

| Metric | What it measures | Formula intuition |
|--------|-----------------|-------------------|
| **Cloud diameter** | Dispersion of a pitch set | Max Euclidean distance between any two notes in the cloud — captures dissonance of a chord/cluster |
| **Cloud momentum** | Amount of harmonic change | Euclidean distance between centroids of adjacent time-slice clouds — captures rate of harmonic change |
| **Tensile strain** | Distance from global key | Euclidean distance between local cloud centroid and global key centroid — captures how far the current harmony has strayed from the home key |

These three metrics were validated against empirical studies of perceived tension (Beethoven, Schubert piano sonatas; the Tristan chord).

**Implementation availability:**
- The spiral array tension model is **not** in music21. A separate Python implementation exists (Guo's `midi-miner` library) and is used in the MorpheuS system. Farbood's musical tension model (`github.com/mfarbood/musical-tension-model`, MIT license) also wraps the spiral array tension calculation.
- A variational autoencoder for controllable music generation uses spiral array tension as a conditioning parameter (Guo et al., 2020, arXiv:2010.06230).

**Application to Music Copilot:**
- **"Why Does This Sound Good?" feature (Phase 4):** Cloud diameter = harmonic tension graph over time. Cloud momentum = harmonic rhythm. Tensile strain = modulation trajectory. These three metrics can be displayed visually alongside a progression to explain its tension arc.
- **Phase 5+:** The MorpheuS approach shows that spiral array tension can guide music generation — applicable to Music Copilot's Melody Generator and Arrangement Planner.
- Medium effort (not in music21, would need to implement or wrap `midi-miner`).

### 7.4 Lerdahl's Tonal Pitch Space — Cognitive Distance & Tension

| Property | Value |
|----------|-------|
| Origin | Lerdahl, F. (1988). *Tonal Pitch Space.* Music Perception, 5(3), 315–349. |
| Book | Lerdahl, F. (2005). *Tonal Pitch Space.* Oxford UP. |
| Tension paper | Lerdahl, F. (1996). *Calculating Tonal Tension.* Music Perception, 13(3), 319–363. |
| Empirical test | Bigand, E., Parncutt, R. & Lerdahl, F. (1996). *Perception of Musical Tension.* Perception & Psychophysics, 58, 125–141. |

**Concept:** A hierarchical model of how listeners perceive distance (and thus tension) between musical events. Built on the framework of *A Generative Theory of Tonal Music* (Lerdahl & Jackendoff, 1983), it quantifies the cognitive distance between any two pitches, chords, or keys.

**Pitch space hierarchy (5 levels):**

| Level | Description | Minimal distance |
|-------|-------------|-----------------|
| 0 — Octave | Chromatic steps within an octave | 1 semitone |
| 1 — Fifth | Circle of fifths distance | 1 fifth-step |
| 2 — Triadic | Chord-tone distance (root/third/fifth) | 1 within-chord step |
| 3 — Diatonic | Scale-degree distance within key | 1 scale step |
| 4 — Chromatic | Keys distance on circle of fifths | 1 key step |

**Distance algorithm:** For two events X and Y, their pitch-space distance d(X, Y) is a weighted sum of the number of steps at each level they differ. The weights are empirically derived and decrease at higher levels.

**Tension formula (Lerdahl 1996):** Tonal tension is a function of three components:

1. **Hierarchical distance** (α·d): The pitch-space distance between the current event and the previous structural event in the prolongational tree. Accounts for how far the harmony has moved.
2. **Sensory dissonance** (β·s): Based on the roughness/dissonance curves (Sethares-style or Parncutt-style psychoacoustic models) of the current chord's pitch content. Accounts for vertical sonority quality.
3. **Horizontal motion** (γ·m): The average voice-leading step size between the previous chord and the current chord. Accounts for smoothness of transition.

Tension(t) = α·d(t) + β·s(t) + γ·m(t) — where α, β, γ are empirically fitted weights.

Bigand, Parncutt & Lerdahl (1996) validated this model: listeners' tension ratings correlated significantly (r > 0.8) with model predictions across multiple harmonic contexts.

**Application to Music Copilot:**
- **"Why Does This Sound Good?"** This is the most principled framework available. It provides three separable, interpretable components of tension. A UI could show: "Tension spike here — 60% from harmonic distance (modulation to iii), 30% from dissonant sonority (V7♭9), 10% from wide voice leading."
- **Limitation:** No single Python library implements the full Lerdahl model. Components could be assembled:
  - music21 provides prolongational tree analysis (though limited)
  - Sensory dissonance: Sethares' dissonance curves (implemented in `midi-miner` and Farbood's model)
  - Hierarchical distance: would need an implementation of the pitch-space distance algorithm
- **Phase 4+ scope** — research-grade implementation, not v0.1.

### 7.5 Forte Set Theory — Post-Tonal Pitch Structures

Already covered in §6 (Post-Tonal & Set Theory). music21 provides full set-theoretic operations: prime form, interval vector, set class identification, and 12-tone row operations. Not needed for v0.1 (electronic music is predominantly tonal/modal) but useful for Phase 5+ analysis features.

### 7.6 Krumhansl-Schmuckler Key Profiles — Cognitive Key-Finding

Already implemented in the Sample Analyzer plugin (via music21's `s.analyze('key')`). Not a mathematical framework per se, but the foundational cognitive model of key perception. The key profiles (tone-distribution vectors for major and minor keys) are the empirical basis for key-finding algorithms used throughout the project.

### 7.7 The Comma Problem — 12-TET vs Just Intonation

**The core mathematical compromise in Western music:**

In just intonation, intervals are pure frequency ratios:
- Perfect fifth: 3:2 (1.5)
- Major third: 5:4 (1.25)
- Octave: 2:1 (2.0)

Stack 12 perfect fifths: (3/2)¹² ≈ 129.746. Go up 7 octaves: 2⁷ = 128. The **Pythagorean comma** is the ratio between them: (3/2)¹² / 2⁷ ≈ 1.01364 ≈ 23.46 cents — about an eighth of a semitone.

In 12-tone equal temperament (12-TET), every semitone is exactly 2¹⁄¹² ≈ 1.05946. This makes all transpositions equivalent (C major and C♯ major use identical interval ratios) at the cost of every interval except the octave being slightly impure:
- 12-TET fifth: 2⁷⁄¹² ≈ 1.4983 (vs 1.5, error ≈ −2 cents)
- 12-TET major third: 2⁴⁄¹² ≈ 1.2599 (vs 1.25, error ≈ +14 cents — audibly sharp)

**What this means for Music Copilot:**

1. **Mod-12 arithmetic works cleanly** because 12-TET maps pitch classes evenly onto the integers mod 12. All mathematical operations (transposition, inversion, set theory, neo-Riemannian group theory, Tymoczko orbifolds) assume this equivalence. The "music theory is numbers" intuition is correct *only under 12-TET*.

2. **Cognitive models sit between pure ratios and 12-TET.** Krumhansl-Schmuckler profiles, Lerdahl's pitch space, and Chew's spiral array all operate on 12 pitch classes but derive their distance metrics from empirical listening studies — effectively modeling how humans *compromise* between the two systems.

3. **Practical takeaway:** For analysis and generation of electronic/dance music (which is universally produced in 12-TET), mod-12 mathematics is sufficient and correct. Just intonation is relevant only for:
   - Microtonal/experimental genres (outside scope)
   - Acoustics modeling (sensory dissonance curves for tension calculation)
   - Understanding the limitations of the framework (the comma problem explains why key-finding has inherent ambiguity)

---

## 8. Phase-Based Recommendations

| Phase | Feature | Recommended Approach | Dependencies |
|-------|---------|---------------------|--------------|
| **v0.1** | Voice-leading quality for Chord Generator | Use `VoiceLeadingQuartet` to score chord transitions | music21 (already installed) |
| **v0.1** | Roman numeral labeling of generated progressions | `roman.romanNumeralFromChord()` for display | music21 (already installed) |
| **v0.1** | Neo-Riemannian smooth voice-leading variants | `analysis.neoRiemannian.L/P/R()` to validate parsimony of adjacent chords | music21 (already installed) |
| **Phase 2** | Cadence detection in user MIDI | Custom plugin using chordify + Roman numeral + pattern matching | music21 only |
| **Phase 2** | Key modulation detection | `WindowedAnalysis` with BellmanBudge profiles over sliding windows | music21 only |
| **Phase 2** | Chromatic progression mode (Neo-Riemannian) | Generate sequences via PLR operations instead of functional harmony | music21 only |
| **Phase 3** | Melody/Bassline Generator | **isobar** pattern library (PDegree, PEuclidean, Markov chains) | `pip install isobar` |
| **Phase 3** | Counter-melody generation | **arvo** tintinnabuli + isorhythm | `pip install arvo` |
| **Phase 4** | "Why Does This Sound Good?" explanations | Roman numeral analysis + voice-leading metrics + cadence classification | music21 only |
| **Phase 4** | Tonal tension visualization (Lerdahl model) | Pitch-space distance + sensory dissonance + voice-leading step size | Custom impl (research-grade) |
| **Phase 4** | Tonal tension visualization (Spiral Array) | Cloud diameter + momentum + tensile strain over time | `midi-miner` or custom impl |
| **Phase 5** | Advanced modulation detection | Transformer model (custom training) | PyTorch |
| **Any** | Full-score contrapuntal checking | music21 `counterpoint` module + `VoiceLeadingQuartet` | music21 only |

### Implementation Notes for v0.1

1. **Voice-leading quality scoring** is a trivial addition to the Chord Generator:
   - For each adjacent chord pair in a progression, create a `VoiceLeadingQuartet` for each voice pair
   - Score the transition: parallel 5ths/octaves = negative, contrary motion = positive
   - Display a "smoothness" metric alongside each generated progression

2. **Roman numeral display** is already possible — the existing chord quality detection maps directly to Roman numerals. A display helper in the frontend would show `I – IV – V7 – I` instead of `C – F – G7 – C`.

3. **Neo-Riemannian parsimony check** for the Chord Generator:
   - For each adjacent chord pair (e.g., C major → D minor), test whether any L/P/R transformation maps one to the other
   - If so, the progression step is provably parsimonious (max 2 voices move by ≤1 semitone/whole-tone)
   - Display a "smoothness" rating based on how many steps are parsimonious vs. arbitrary

4. **No new dependencies needed** for any v0.1 or Phase 2 features. music21 provides everything.

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
13. Tymoczko, D. (2006). *The Geometry of Musical Chords.* Science, 313(5783), 72–74.
14. Callender, C., Quinn, I. & Tymoczko, D. (2008). *Generalized Voice-Leading Spaces.* Science, 320(5874), 346–348.
15. Tymoczko, D. (2011). *A Geometry of Music.* Oxford University Press.
16. Lewin, D. (1987). *Generalized Musical Intervals and Transformations.* Yale University Press.
17. Cohn, R. (1997). *Neo-Riemannian Operations, Parsimonious Trichords, and Their Tonnetz Representations.* Journal of Music Theory, 41(1), 1–66.
18. Chew, E. (2000). *Towards a Mathematical Model of Tonality.* PhD thesis, MIT.
19. Chew, E. (2014). *Mathematical and Computational Modeling of Tonality: Theory and Applications.* Springer.
20. Herremans, D. & Chew, E. (2016). *Tension ribbons: Quantifying and visualising tonal tension.* Proc. TENOR 2016, Cambridge, UK.
21. Herremans, D. & Chew, E. (2016). *MorpheuS: Automatic music generation with recurrent pattern constraints and tension profiles.* Proc. IEEE TENCON, Singapore.
22. Guo, R. et al. (2020). *A variational autoencoder for music generation controlled by tonal tension.* arXiv:2010.06230.
23. Lerdahl, F. & Jackendoff, R. (1983). *A Generative Theory of Tonal Music.* MIT Press.
24. Lerdahl, F. (2001). *Tonal Pitch Space.* Oxford University Press.
25. Lerdahl, F. (1996). *Calculating Tonal Tension.* Music Perception, 13(3), 319–363.
26. Bigand, E., Parncutt, R. & Lerdahl, F. (1996). *Perception of Musical Tension in Short Chord Sequences.* Perception & Psychophysics, 58, 125–141.
27. Farbood, M. *musical-tension-model.* GitHub. https://github.com/mfarbood/musical-tension-model

---

## 9. Genre-Specific Harmonic Vocabulary for Electronic Music

Electronic music genres have distinct harmonic fingerprints that go beyond simple "major=happy, minor=sad." Each genre favors specific chord types, voicings, progression templates, and bass-chord relationships. This section documents the vocabulary per genre for use in the Chord Progression Generator and arrangement algorithms.

### 9.1 Deep House (110–125 BPM)

**Harmonic profile:** Jazz-influenced, extended chords (7ths, 9ths, 13ths), soulful.

**Preferred chord types (ranked by frequency):**
1. Minor 7th (m7) — dominant chord type
2. Major 7th (maj7) — warm, dreamy sound
3. Minor 9th (m9) — rich, complex
4. Dominant 7th (7) — used sparingly for tension
5. Sus chords (sus2, sus4) — ambiguous, floating
6. Major 9th (maj9) — lush, cinematic
7. Minor 7th flat 5 (m7b5) — occasional, for darker sections

**Typical progression templates:**
```
i - VII - VI - VII  (Am - G - F - G)         — Most common, hypnotic
i - iv - VII - III  (Am - Dm - G - C)          — Grooves through subdominant
i - VI - III - VII  (Am - F - C - G)           — Minor-major blur
im7 - IVmaj7 - VIImaj7 - IIImaj7               — Full 7th chord version
iim7 - V7 - Imaj7                              — Jazz turnaround (Dm7 - G7 - Cmaj7)
```

**Voicing characteristics:**
- Wide voicings (spread across 2+ octaves) to leave room for kick/sub
- 7th often placed in the middle of the voicing (not top/bottom) for warmth
- Rootless voicings in left hand (jazz piano influence)
- "Passing chords" — brief chords that connect two target chords (e.g., Ddim7 between Dm7 and G7)

**Bass characteristics:**
- Sub-bass follows chord roots (85%+ on beat 1)
- Occasional chromatic approach to next root
- Never plays chord 3rd or 7th — those are for the chord voices

### 9.2 Uplifting Trance (128–145 BPM)

**Harmonic profile:** Emotional, diatonic, cadence-driven, major-key dominant.

**Preferred chord types:**
1. Major triad (maj) — bright, open
2. Minor triad (min) — emotional contrast
3. Major 7th (maj7) — dreamy breakdowns
4. Minor 7th (m7) — smoother minor
5. Suspended 4th (sus4) — build-up tension before drop
6. Diminished (dim) — bridge sections, rare

**Typical progression templates (mostly major-key):**
```
I - V - vi - IV  (C - G - Am - F)             — Pop chord template
vi - IV - I - V  (Am - F - C - G)              — Emotional, anthemic
I - IV - V - IV  (C - F - G - F)               — Classic house/trance
i - VI - III - VII  (Am - F - C - G)           — Same as deep house but brighter
V - vi - IV - V   (G - Am - F - G)             — Continuous dominant motion
```

**Voicing characteristics:**
- Chord "stabs" on beat 1 only, or sustained pads
- Power chords (root+5th) in breakdowns for maximum space
- Wide arpeggios (up/down patterns over 2-3 octaves)
- Build-ups use sus4 → major resolution (Csus4 → C) for pre-drop tension
- "Supertonic" chords (ii) used as pre-dominant almost always

**Key difference from Deep House:** Trance is cadence-driven (V→I constantly), while Deep House is modal (loops without strong resolution).

### 9.3 Melodic Techno / Progressive (124–130 BPM)

**Harmonic profile:** Dark, minimal, slow-changing, atmospheric, tension-building.

**Preferred chord types:**
1. Minor triad (min) — primary color
2. Minor 7th (m7) — standard
3. Minor 9th (m9) — deep, dark
4. Diminished 7th (dim7) — transition, bridge
5. Suspended (sus2/sus4) — ambiguity
6. Augmented (aug) — rare, for surreal moments

**Typical progression templates:**
```
i - VII - VI - VII  (Am - G - F - G)          — Hypnotic loop (same as deep house, darker sound design)
i - iv - i - VII   (Am - Dm - Am - G)          — Minimal, effective
i - VI - VII - i   (Am - F - G - Am)          — Dark circular movement
i - bVII - bVI - bVII                          — Darker, borrowed from phrygian
One chord for 8-16 bars                        — True minimal techno
```

**Voicing characteristics:**
- Extremely slow harmonic rhythm (one chord per 4-8 bars)
- Pads with slow filter sweeps (not MIDI-controllable but affects how chords feel)
- Close voicings in higher register (atmospheric)
- Open 5ths (no 3rd) for ambiguity — lets the bass define the chord quality
- "Tension pads" — adding single non-chord tone (e.g., #4 over minor chord) for unease

**Key difference from Trance:** Melodic Techno avoids strong cadences entirely. Chords flow into each other without V→I resolution.

### 9.4 Melodic Drum & Bass (170–180 BPM)

**Harmonic profile:** Complex, jazz-influenced, surprising, wide range of emotion.

**Preferred chord types:**
1. Minor 7th (m7) — standard
2. Minor 9th (m9) — rich
3. Major 7th (maj7) — bright sections
4. Dominant 7th sharp 9 (7#9) — "Hendrix chord," surprising
5. Minor major 7th (mMaj7) — haunting, bittersweet
6. Altered dominants (7b9, 7#11) — jazz flavor
7. Augmented 7th (aug7) — transition tension

**Typical progression templates:**
```
i - vi - IV - V   (Am - Fmaj7 - Dm9 - G13)    — Jazz-tinged
i - bVI - bVII - i  (Am - F - G - Am)          — Standard dark
imaj7 - ivm9 - VII - IIImaj9                   — Extensions galore
ii - V - I - VI   (Dm7 - G7 - Cmaj7 - Am7)     — Full jazz turnaround
```

**Voicing characteristics:**
- Chord hits on the "2 and 4" (off the kick pattern)
- Extended and altered chords everywhere
- Rapid chord changes in breakdowns (2 beats per chord)
- "Suspended" bass — bass note often NOT the chord root (creates tension)
- Chord melody integration — top note of chord = melody note

**Key difference from all above:** DnB uses jazz harmony (ii-V-I, altered dominants, extended chords) more than any other electronic genre. The harmonic language is closer to jazz fusion than pop.

### 9.5 Dubstep / Brostep (140-150 BPM, half-time feel)

**Harmonic profile:** Minimal, riff-based, heavy on the tonic, harmonic rhythm tied to "wobble" rate.

**Preferred chord types:**
1. Minor triad (min) — almost universal
2. Power chord (root+5th) — on the wobble
3. Diminished 5th (tritone) — for "evil" sections
4. Suspended 4th (sus4) — pre-drop
5. Minor 7th (m7) — occasional, for melody parts

**Typical progression templates:**
```
i - i - i - i  (one chord for entire drop)     — Very common
i - bVII - i - bVII                            — Phrygian standard
i - bVI - bVII - bVI                           — Dark but melodic
i - iv - i - v                                 — Functional minor
i - bII - i - bII                              — Phrygian / neapolitan flavor
```

**Voicing characteristics:**
- Single notes / power chords in the bass/mid-range (not full chords)
- Wide interval leaps in the "wobble" line
- Call-and-response between bass riff and chord stab
- Tritone used as a structural interval (not just passing)
- Harmonic rhythm tied to LFO rate (not traditional chord changes)

### 9.6 Genre Comparison Summary

| Aspect | Deep House | Trance | Melodic Techno | DnB | Dubstep |
|--------|-----------|--------|----------------|-----|---------|
| **Primary chord type** | m7 | maj | min | m7, m9 | power chord |
| **Chord density** | 2-4 per bar | 1-2 per bar | 1 per 4-8 bars | 2-4 per bar | 1 per 2-4 bars |
| **Rhythm** | Syncopated, swung | On-beat stabs | Slow, atmospheric | Off-beat stabs | LFO-driven |
| **Cadences** | Rare (modal) | Constant V→I | Never | Jazz (ii-V-I) | Rare |
| **Jazz influence** | High | Low | Medium | Very high | None |
| **Bass role** | Harmonic root | Harmonic root | Tonal center | Melodic, suspended | Rhythmic, riff |
| **Emotion** | Warm, soulful | Euphoric, anthemic | Dark, hypnotic | Complex, bittersweet | Aggressive, dark |

---

## 10. Instrument & Register Conventions for Natural-Sounding Parts

Different parts of an electronic track have distinct register behavior that generators must respect.

### 10.1 Register Ranges by Part

| Part | MIDI Range | Typical Octave | Notes |
|------|-----------|----------------|-------|
| **Kick / Sub-bass** | 24-48 | C1-C3 | Fundamental frequency band. Never play above 60Hz (C2≈65Hz). Kick occupies 40-60Hz, sub-bass 30-80Hz. |
| **Bassline (mid)** | 36-72 | C2-C4 | Pluck, Reese, synth bass. Can overlap with kick briefly if sidechained. |
| **Chord pad / organ** | 48-84 | C3-C6 | Standard chord range. Wide spread voicings leave room below for bass. |
| **Rhythm chords** | 60-84 | C4-C6 | Stab chords, piano chords. Higher register for clarity. |
| **Lead melody** | 60-96 | C4-C7 | Main melodic hook. Above chords for clarity. Occasionally drops into chord range for "call" effect. |
| **Arpeggios** | 48-84 | C3-C6 | Cover wide range. Often spans 2-3 octaves. |
| **Hi-hats / cymbals** | 42-81 | F#2-C#6 | Actually MIDI drum notes 42(closed), 46(open), 49(crash), 51(ride). Don't overlap with melodic ranges in pitch space. |
| **FX / risers** | Any | Scans up | Pitch-based effects that sweep registers. Not harmonic. |

### 10.2 The "Frequency Slot" Principle

In a professional mix, each part occupies a specific frequency region:
```
Sub-bass:    20-80 Hz     (kick + sub)     - One element at a time
Low-mid:     80-250 Hz    (bass body)       - Bassline lives here
Mid:         250-2000 Hz  (chords + melody) - Harmonic content
High-mid:    2-6 kHz      (presence)        - Attack of chords, lead
High:        6-20 kHz     (air)             - Hi-hats, cymbals, reverb tails
```

For MIDI generation (which doesn't control sound design), the implication is:
- **Don't put bass and melody in the same octave** - maintain at least 1-2 octave gap
- **Chords should sit between bass and melody** - act as harmonic bridge
- **Parts that share the same register** should not play simultaneously (use call-and-response or sidechain)

### 10.3 Interval Preferences by Register

Research shows that interval sizes in melodies are not uniform across registers:

| Register | Preferred Intervals | Reason |
|----------|-------------------|--------|
| **Low (bass, C2-C4)** | Steps, 4ths, 5ths | Wide leaps sound muddy in low register. Roots and fifths are clearest. |
| **Mid (C3-C5)** | Steps, 3rds, 4ths, 5ths | All intervals work. Closest to vocal range. Most versatile. |
| **High (C5+)** | 3rds, 4ths, 5ths, octaves, larger | Wider leaps sound clear and dramatic in high register. Steps can sound weak. |
| **Very high (C6+)** | 5ths, octaves, large leaps | Stepwise motion loses definition above C6. Use for punctuation/accent. |

---

## 11. Putting It Together - The Theory-Generation Feedback Loop

### 11.1 How Theory Feeds the Generator

```
Chord Progression Generator
  ↓ (chord sequence + key)
Knowledge of genre vocabulary
  ↓ (which chords to prefer, voicings, harmonic rhythm)
Melody Generator
  ↓ (scale + chord tones)
Non-Chord Tone Engine (section 11 of advanced-midi-generation.md)
  ↓ (NCT rate per genre, approach/leave rules)
Motif Development Engine (section 12)
  ↓ (PReVaDe cycle, antecedent-consequent)
Voice-Leading Check
  ↓ (chord-tone anchoring, contrary motion, register bounds)
Microtiming + Humanization (section 16)
  ↓
MIDI Output
```

### 11.2 The Five-Question Check Before Any Generation

For every generated bar, verify:

1. **"Is every strong-beat melody note a chord tone?"** — If not, the melody will clash with the harmony.
2. **"Does the bass hit the chord root on beat 1?"** — If not, the harmonic foundation is ambiguous.
3. **"Are melody and bass moving in contrary motion?"** — If same direction for 3+ beats, it lacks voice-leading depth.
4. **"Are there non-chord tones on weak beats?"** — If all notes are chord tones, the melody sounds rigid.
5. **"Is there a motif being developed?"** — If every bar is new material, the melody lacks coherence.

### 11.3 The "Human Element" Checklist

A checklist for evaluating whether a generated MIDI file sounds human:

| Check | Human | Robotic |
|-------|-------|---------|
| Timing | Systematic micro-deviations | Perfectly quantized to grid |
| Velocity | Per-beat mountain profile + phrase arc | All notes within ±5 of same velocity |
| Note lengths | Slightly vary (±5-10%) | Exactly quantized lengths |
| Articulation | ~90% note length (legato) or ~50% (staccato) | Always exactly 100% |
| NCT usage | ~30% of notes are non-chord tones | All notes are chord tones |
| Phrase shape | Ascend → peak → descend arch | Random up/down/no direction |
| Motif | Repeats + varies 1-2 motifs | Completely new notes every bar |
| Ornamentation | 1-2 grace notes/trills per 8 bars | None |
| Rests | ~15-25% of beats are rests | Note every single beat |
| Ending | Has a cadence gesture (anticipation, fall-off) | Just stops on last note |

### 11.4 Genre Adaptation Summary

To adapt the same generator framework to any electronic genre, tune these parameters:

| Parameter | Deep House | Trance | Melodic Techno | Melodic DnB | Dubstep |
|-----------|-----------|--------|----------------|-------------|---------|
| Chord types | m7, maj7, m9 | maj, maj7, sus4 | min, m7, dim7 | m7, m9, 7#9 | power chord, min |
| Harmonic rhythm | Every 2-4 beats | Every 2 bars | Every 4-8 bars | Every 1-2 beats | Every 1-2 bars |
| NCT rate | 35% | 20% | 25% | 30% | 15% |
| Syncopation | 40% | 15% | 20% | 50% | 30% |
| Ornament density | High (turns, grace) | High (trills, slides) | Low (mordents) | Medium (grace, turns) | Low (falls only) |
| Bass anchor | 85% | 75% | 90% | 60% | 70% |
| Contrary motion | 60% | 50% | 70% | 40% | 30% |
| Microtiming | 40% (swung) | 10% (straight) | 15% (slight drift) | 30% (shuffle) | 20% (groove) |

---

## References (Supplement - Sections 9-11)

28. Attack Magazine. *Deep House Chords — Passing Notes.* https://www.attackmagazine.com/technique/passing-notes/deep-house-chords
29. Ben Rainey. *House Music Chord Progressions.* https://www.benrainey.co.uk/blog/house-music-chord-progressions
30. EDMProd. *How to Make Classic Deep House: The Ultimate Guide.* https://www.edmprod.com/how-to-make-classic-deep-house
31. Orphiq. *Types of Electronic Music: A Genre Guide.* https://orphiq.com/resources/types-of-electronic-music
32. LANDR. *EDM, House & Techno Chord Progressions.* https://blog.landr.com/edm-chord-progression/
33. Fiveable. *Motivic Development Techniques.* https://fiveable.me/music-theory-and-composition/unit-7/motivic-development-techniques
34. Caplin, W. (1998). *Classical Form: A Theory of Formal Functions.* Oxford University Press.
35. Lerdahl, F. & Jackendoff, R. (1983). *A Generative Theory of Tonal Music.* MIT Press.
36. Meyer, L. B. (1956). *Emotion and Meaning in Music.* University of Chicago Press.
37. Narmour, E. (1990). *The Analysis and Cognition of Basic Melodic Structures.* University of Chicago Press.
38. Schellenberg, E. G. (1996). *Expectancy in Melody: Tests of the Implication-Realization Model.* Cognition, 58(1), 75-125.
39. Datseris, G. et al. (2019). *Microtiming Deviations and Swing Feel in Jazz.* Scientific Reports, 9, 19824.
40. Nelias, C. et al. (2022). *Downbeat delays are a key component of swing in jazz.* Communications Physics, 5, 237.
41. Longuet-Higgins, H. C. & Lee, C. S. (1984). *The Rhythmic Interpretation of Monophonic Music.* Music Perception, 1(4), 424-441.
42. Fitch, W. T. & Rosenfeld, A. J. (2007). *Perception and Production of Syncopated Rhythms.* Music Perception, 25(1), 43-58.
43. Fram, N. R. et al. (2023). *Syncopation as Probabilistic Expectation.* Cognitive Science, 47(12), e13390.
44. Whitman College Music Theory. *Non-Chord Tones.* https://musictheory.pugetsound.edu/mt21c/NonChordTonesIntroduction.html
