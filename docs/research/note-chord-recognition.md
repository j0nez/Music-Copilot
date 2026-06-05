# Note & Chord Recognition

Monophonic and polyphonic pitch/chord detection from audio. Offline-capable approaches.

**Last updated:** 2026-06-05

## Overview

Sixteen resources were evaluated for their applicability to Music Copilot's note and chord recognition pipeline. The needs are:
- **Monophonic pitch → MIDI**: extract a single melodic line (e.g., vocal, lead synth) from audio and convert to MIDI notes.
- **Polyphonic chord detection**: identify chord names/qualities from full-mix audio (offline, no cloud API).
- **Key detection**: determine key signature and mode (major/minor) from audio.

---

## 1. NFJones/audio-to-midi

| Property | Value |
|----------|-------|
| URL | https://github.com/NFJones/audio-to-midi |
| Stars | 229 |
| License | MIT |
| Approach | Signal processing (FFT → 12-tone binning → MIDI) |
| Polyphonic | No (configurable top-N notes via `--note-count`) |
| Requires training | No |
| Offline | Yes |
| Dependencies | `libsndfile`, `soundfile`, `numpy` |

### How it works

1. Performs overlapping FFTs on each channel at configurable time steps.
2. Bins frequency magnitudes into 12 pitch classes per octave (equal temperament).
3. Writes MIDI note-on/off events based on an amplitude activation threshold.
4. Optional post-processing: condense contiguous notes, single-note mode, pitch set filtering, BPM quantization.

### CLI flags

| Flag | Description |
|------|-------------|
| `--time-window` | FFT window in ms (default: 30) |
| `--activation-level` | Amplitude threshold [0-1] for note events |
| `--condense` | Combine contiguous notes at average amplitude |
| `--single-note` | Only the loudest note per window |
| `--note-count` | Top-N notes per window |
| `--bpm` / `--beat` | Quantize timing to beats |
| `--pitch-set` | Restrict to specific scale (e.g., `-p 0 2 4 5 7 9 11` = major) |
| `--pitch-range` | Min/max MIDI note range |
| `--transpose` | Constant pitch offset |

### Strengths
- Zero ML dependencies, works on any machine.
- Interpretable and debuggable (raw FFT output).
- Fast — processes audio in real time or faster.
- Pitch-set filtering allows restricting to a specific scale (useful for Music Copilot's Theory Engine integration).

### Weaknesses
- No polyphonic chord recognition — can only detect individual pitches.
- No chord naming (no chord quality labels).
- Sensitive to noise and non-pitched percussion.
- No key detection.
- No pitch bends in MIDI output.

### Suitability for Music Copilot
- **Good for monophonic transcription** (vocal melodies, basslines, monophonic synth leads).
- **Not suitable** for chord detection from polyphonic audio.
- Could be used as a lightweight fallback when ML models are unavailable.

---

## 2. Spotify basic-pitch

| Property | Value |
|----------|-------|
| URL | https://github.com/spotify/basic-pitch |
| Stars | 5,100 |
| License | Apache 2.0 |
| Approach | Lightweight CNN (AMT) |
| Polyphonic | Yes |
| Requires training | No (pre-trained model included) |
| Offline | Yes (model bundled) |
| Inference runtime | TensorFlow / CoreML / TFLite / ONNX |
| Python versions | 3.7–3.11 |
| Paper | ICASSP 2022 (arXiv:2203.09893) |
| VST plugin | NeuralNote by DamRsn |

### How it works

1. Input audio is resampled to 22050 Hz, downmixed to mono.
2. A lightweight CNN processes mel-spectrogram frames.
3. Outputs multi-pitch estimates with confidence per pitch per frame.
4. Post-processing converts pitch activations to MIDI note events with pitch bends.
5. Supports `.mp3`, `.ogg`, `.wav`, `.flac`, `.m4a`.

### CLI / API

```bash
basic-pitch <output-dir> <input-audio>
```

```python
from basic_pitch.inference import predict
model_output, midi_data, note_events = predict("audio.wav")
```

Optional outputs: MIDI sonification (WAV), raw model outputs (NPZ), note events (CSV).

### Strengths
- Instrument-agnostic, polyphonic — works on full mixes.
- Pitch bend detection (not just flat semitones).
- Small model footprint, multiple runtime options (TF/CoreML/TFLite/ONNX).
- Well-maintained by Spotify's Audio Intelligence Lab.
- Active community (5.1k stars, 458 forks).
- VST plugin available (NeuralNote) for real-time use in DAWs.

### Weaknesses
- Works best on one instrument at a time (polyphonic but not full-mix transcription).
- No chord recognition — outputs individual notes, not chord symbols.
- No key detection.
- Requires PyTorch or TensorFlow runtime (~100 MB+ dependency).

### Suitability for Music Copilot
- **Excellent for polyphonic pitch-to-MIDI** — best option for transcribing audio into MIDI notes.
- **Not suitable** for chord symbol recognition.
- The ONNX runtime option is ideal for Windows deployment (no TF/PyTorch required).
- Could feed into a downstream chord recognizer (e.g., map detected notes to chord templates).

---

## 3. TU Berlin Master's Thesis — Hamed Fard

| Property | Value |
|----------|-------|
| URL | https://www.static.tu.berlin/fileadmin/www/10002020/Dokumente/Abschlussarbeiten/Masterarbeit_Hamed_Fard_final.pdf |
| Approach | Fully Convolutional Neural Network (MultiResUnet) |
| Task | Frame-wise chord recognition |
| Polyphonic | Yes (chord-level output) |
| Requires training | Yes |
| Dataset | 361 songs (20h 27min) — Beatles, Queen, RWC-Pop, Robbie Williams |
| Input | Harmonic Constant-Q Transform (HCQT), 3 harmonics × 216 bins × 6 octaves |
| Output | Root pitch class (12), bass pitch class (13 incl. N), active pitch classes (12 binary), final chord label |
| Baseline | Crema (CNN + Bi-GRU) |

### Architecture

- **Modified MultiResUnet**: 3 encoding blocks (MultiRes), 3 decoding blocks, residual skip connections (Res paths).
- **Spatial dropout** (20%) before classification heads.
- **Structured representation**: decomposes chord labels into root + bass + pitch classes (multi-task learning).
- **Loss**: sparse categorical cross-entropy (root, bass, label) + binary cross-entropy (pitch classes).
- **Training**: 5-fold cross-validation, 6-second patches (64 frames), Adam optimizer, early stopping.
- **Parameters**: ~52k fewer than Crema, training time per epoch reduced by half.

### Key Results (median weighted CSR)

| Method | MultiResUnet | Crema |
|--------|-------------|-------|
| root | ~0.86 | ~0.84 |
| thirds | ~0.84 | ~0.83 |
| triads | ~0.82 | ~0.80 |
| majmin | ~0.85 | ~0.84 |
| sevenths | ~0.79 | ~0.76 |
| tetrads | ~0.77 | ~0.75 |
| majmin_inv | ~0.82 | ~0.80 |
| tetrads_inv | ~0.68 | ~0.64 |

### Error Analysis Findings

1. Both models are robust at major/minor triads but struggle with rare chord qualities (dim7, minmaj7, sus2, sus4).
2. Root confusion tends towards perfect fourths and perfect fifths (due to harmonic overlap).
3. Crema (with RNN) performs better on minority chord classes due to temporal context.
4. MultiResUnet has better segmentation quality (less over/under-segmentation).
5. Bass-sensitive (inversion) scores are ~6% lower than bass-agnostic — insufficient training data for inversions.
6. The model shows V vs. V7 confusion (dominant seventh frame predicted as major triad).

### Strengths
- State-of-the-art chord recognition without recurrence (fully convolutional).
- Structured representation enables root, bass, and pitch-class outputs — useful for downstream theory analysis.
- Explicit evaluation on inversions, sevenths, tetrads — directly applicable to Music Copilot.
- Detailed error analysis (confusion matrices) helps understand model limitations.
- Fewer parameters, faster training — suitable for real-time applications.

### Weaknesses
- Requires training data and model building — not a plug-and-play library.
- No public pre-trained model weights available.
- Built on TensorFlow 1.x — would need migration to TF2/PyTorch.
- Struggles with rare chord qualities (data imbalance).
- Requires HCQT preprocessing (more complex than mel-spectrogram).

### Suitability for Music Copilot
- **Excellent reference architecture** for chord recognition.
- The structured representation (root + bass + pitch classes) matches Music Copilot's theory engine data model.
- The error analysis provides realistic expectations for chord recognition accuracy.
- Would need re-implementation (TF1 → PyTorch) and pre-trained weights.
- Could be simplified: skip inversions for v0.1, focus on maj/min/seventh triads.

---

## 4. pnlong/determine_key

| Property | Value |
|----------|-------|
| URL | https://github.com/pnlong/determine_key |
| Stars | 17 |
| License | Not specified |
| Approach | Custom CNN (PyTorch) |
| Task | Key class (12 key signatures) + Key quality (Major/minor) |
| Requires training | Yes (pre-trained weights available via Google Drive) |
| Dataset | 71,750 samples from 2,000 songs (20-second clips, 5-second stride) |
| Input | Mel-spectrogram |
| Output | 12 logits (key class, Circle of Fifths order) + 1 sigmoid (key quality) |

### Architecture

- 4 convolutional blocks (Conv2D + ReLU + MaxPool2D).
- 3 linear blocks (1000 → 500 → 100 features).
- Output: 12 logits (key class) or 1 sigmoid (key quality).
- Custom network (not ResNet/transfer learning).

### Results

| Metric | Accuracy |
|--------|----------|
| Exact key (1/24) | 5.18% |
| Key class (1/12) | 71.78% |
| Key quality (Major/minor) | 71.28% |
| Key class within 2 Circle steps | ~90% |

### Strengths
- Simple, custom CNN architecture — easy to understand and re-implement.
- Pre-trained weights available (Google Drive links).
- Uses mel-spectrograms (standard librosa preprocessing).
- Circle of Fifths error metric — musically meaningful evaluation.
- Two-stage design (key class + key quality) allows separate optimization.

### Weaknesses
- Low exact-key accuracy (5%) — only useful for relative key / key signature.
- No mode detection beyond Major/minor (no Dorian, Phrygian, etc.).
- Dataset from personal music collection — unknown quality/reproducibility.
- Small project (17 stars), not actively maintained.
- No inference pipeline packaged as a library — would need to adapt code.

### Suitability for Music Copilot
- **Decent reference for key class detection** — the two-stage architecture is sound.
- Key quality (71%) is on par with music21 Krumhansl-Schmuckler — not a clear improvement.
- For v0.1, music21 K-S key detection (already implemented in Sample Analyzer) is sufficient.
- Could revisit if key class (without mode) becomes a priority for chord analysis.
- Custom CNN architecture could be adapted for chord recognition.

---

## 5. CREMA

| Property | Value |
|----------|-------|
| URL | https://github.com/bmcfee/crema |
| Stars | 95 |
| License | BSD-2-Clause |
| Author | Brian McFee (librosa author, NYU) |
| Approach | CNN + Bi-GRU |
| Task | Chord recognition |
| Requires training | No (pre-trained included) |
| Offline | Yes |
| Dependencies | TensorFlow, librosa |

### Description

CREMA (Convolutional and Recurrent Estimators for Music Analysis) provides pre-trained statistical models for music analysis tasks — currently only chord recognition, with more planned. It uses a CNN + Bi-directional GRU architecture. The analyzer operates on audio files or numpy arrays and outputs results as JAMS objects. Installation via `pip install crema`.

### Key Details

- Unified `Analyzer` interface for all tasks.
- CLI usage: `python -m crema.analyze -o output.jams input.ogg`.
- Python API: `from crema.analyze import analyze`.
- Pre-trained chord model retrained in 2022 (v0.2.0).
- Used as the **baseline model** in the Fard thesis (see Section 3).

### Relationship to Fard Thesis

The Fard thesis directly compares MultiResUnet against CREMA's CNN-BiGRU architecture. CREMA achieved median weighted chord symbol recall of ~0.80 for triads, ~0.76 for sevenths, and ~0.64 for tetrads with inversions. MultiResUnet outperformed CREMA on all metrics while having ~52k fewer parameters and half the training time per epoch. However, CREMA's RNN helped it perform better on minority chord classes due to temporal context.

### Suitability for Music Copilot

- **Best plug-and-play chord recognition** — pip install, pre-trained, no training needed.
- Accuracy is reasonable for major/minor triads but drops for 7ths and inversions.
- Could be used as a quick chord recognition baseline in v0.2 without re-implementation.
- The JAMS output format is not native to Music Copilot's data model — would need conversion.

---

## 6. Google MT3

| Property | Value |
|----------|-------|
| URL | https://github.com/magenta/mt3 |
| Stars | 1,700 |
| License | Apache 2.0 |
| Authors | Josh Gardner, Ian Simon, Ethan Manilow, Curtis Hawthorne, Jesse Engel (Google Magenta) |
| Approach | Transformer (T5X framework) |
| Task | Multi-instrument polyphonic AMT |
| Requires training | No (pre-trained checkpoints available) |
| Offline | Yes |
| Inference | JAX/T5X on GPU |
| Papers | ISMIR 2021 (piano), ICLR 2022 (multi-instrument) |

### How It Works

MT3 treats AMT as a sequence-to-sequence problem: log mel-spectrogram → MIDI-like token sequence. It uses a general-purpose Transformer (T5 architecture) to jointly transcribe arbitrary combinations of musical instruments. The output vocabulary is a deterministic MIDI-like token representation that can be decoded to piano roll or rendered via FluidSynth.

### Key Results

- Up to **260% improvement** on low-resource instruments (guitar) compared to task-specific architectures.
- Strong performance on piano (MAESTRO), drums, and multi-instrument datasets (Slakh2100, Cerberus4, GuitarSet).
- Six datasets aggregated for training with standardized evaluation metrics.
- Multi-task training across datasets improves generalization.

### Known Issues

- Not trained on singing — vocal audio produces unreliable results.
- Multi-instrument transcription is still not fully solved.
- Training from scratch is difficult (requires T5X, JAX, TPU-scale compute).
- No official pip package — uses Colab notebook for inference.

### Derivatives

- **MR-MT3** (gudgud96/MR-MT3, 48 stars): Memory retaining mechanism to mitigate instrument leakage. Uses prior token sampling + token shuffling data augmentation.
- **YourMT3+** (mimbres/YourMT3, paper 2407.04822): Enhanced encoder with hierarchical attention + mixture of experts (MoE). Adds multi-channel decoding for incomplete annotations and cross-stem augmentation. Supports vocal transcription without separate source separation.
- **MT3-Infer** (openmirlab/mt3-infer, 0.1.3): Unified inference toolkit for all MT3 variants (MR-MT3, MT3-PyTorch, YourMT3). `pip install mt3-infer`. Auto-downloads checkpoints, CLI + Python API.

### Suitability for Music Copilot

- **State-of-the-art multi-instrument transcription** — the best option if full-mix AMT is needed.
- Significantly larger dependency than basic-pitch (JAX/T5X vs ONNX).
- MT3-Infer simplifies integration but still requires PyTorch/JAX.
- For v0.1–v0.2, basic-pitch is preferred for its simplicity. MT3 is Phase 4+ scope.

---

## 7. Onsets and Frames

| Property | Value |
|----------|-------|
| URL | https://github.com/magenta/magenta (models/onsets_frames_transcription/) |
| License | Apache 2.0 |
| Authors | Curtis Hawthorne, Erich Elsen, Jialin Song et al. (Google Brain) |
| Approach | CNN + LSTM dual-objective |
| Task | Piano & drum transcription |
| Requires training | No (pre-trained available) |
| Paper | ISMIR 2018 (arXiv:1710.11153) |
| Status | Inactive — superseded by MT3 |

### How It Works

A deep convolutional and recurrent network trained to jointly predict onsets and frames. The model predicts pitch onset events, then uses those predictions to condition framewise pitch predictions. During inference, framewise predictions are restricted: no new note is allowed unless the onset detector also agrees.

### Key Results

- **Over 100% relative improvement** on MAPS dataset: previous SOTA F1 of 23.14 → 50.22.
- Novel dual-objective architecture: onset conditioning prevents false-positive notes.
- Extended to drum transcription with E-GMD dataset.
- JavaScript port available via @magenta/music npm package (Piano Scribe demo).

### Relationship to MT3

Onsets and Frames is the direct predecessor to MT3 from the same team. While Onsets and Frames uses task-specific CNN+RNN architecture with piano-roll output, MT3 uses a general-purpose Transformer with MIDI-token output. The MT3 README explicitly states: "For our current transcription work, see the MT3 repository."

### Suitability for Music Copilot

- **Superseded by MT3** — no reason to start with this architecture for new development.
- Historical significance: established the onset-conditioning paradigm used in many subsequent systems.
- The PyTorch re-implementation (jongwook/onsets-and-frames) is available but unmaintained.

---

## 8. ByteDance Piano Transcription

| Property | Value |
|----------|-------|
| URL | https://github.com/bytedance/piano_transcription |
| Stars | 2,000 (archived Dec 2025) |
| License | Apache 2.0 / MIT |
| Approach | High-resolution CNN + RNN (PyTorch) |
| Task | Piano transcription |
| Requires training | No (pre-trained via `pip install piano_transcription_inference`) |
| Offline | Yes |
| Dataset | MAESTRO v2.0.0 (200+ hours, 7.13M notes) |
| Inference | PyTorch, ~6 min for full piece on GPU |

### How It Works

A high-resolution piano transcription system that detects note onsets, offsets, pitch, velocity, and sustain pedal usage from audio. Uses a CNN-RNN architecture trained on the MAESTRO dataset. The inference package (`piano_transcription_inference`) provides a clean API.

### Key Details

- `pip install piano_transcription_inference` — minimal code to transcribe.
- Pedal detection included — captures sustain pedal for expressive performance.
- High temporal resolution (~3 ms alignment with note labels).
- Used to build a large-scale classical piano MIDI dataset.
- Repository archived by ByteDance Dec 2025 — no further development expected.

### Suitability for Music Copilot

- **Best piano-specific transcription** — high accuracy, pedal detection, straightforward API.
- Limited to piano — does not handle other instruments or full mixes.
- PyTorch dependency (~123 MB) is comparable to DeepRhythm already in use.
- Could be a specialized piano transcription option in the Samples page alongside basic-pitch.

---

## 9. Omnizart

| Property | Value |
|----------|-------|
| URL | https://github.com/Music-and-Culture-Technology-Lab/omnizart |
| Stars | 1,800+ |
| License | MIT |
| Authors | Music and Culture Technology Lab, Academia Sinica, Taiwan |
| Approach | Multiple task-specific deep learning models |
| Tasks | Pitched instruments, drums, vocal melody, chords, beat/downbeat |
| Requires training | No (pre-trained checkpoints auto-downloaded) |
| Offline | Yes |
| Install | `pip install omnizart + omnizart download-checkpoints` |
| Paper | Journal of Open Source Software (JOSS), 2021 (DOI: 10.21105/joss.03391) |

### Transcribable Content

| Application | Task |
|-------------|------|
| `music` | Multi-instrument note transcription (11 piano-roll channels) |
| `drum` | Percussive event transcription (CNN based, 9.4M params) |
| `vocal` | Note-level vocal melody transcription |
| `chord` | Chord progression recognition (Harmony Transformer) |
| `beat` | Beat/downbeat tracking (symbolic MIDI input) |

### Chord Recognition: Harmony Transformer

Omnizart's chord recognition uses the Harmony Transformer (HT), an encoder-decoder architecture where the encoder performs chord segmentation and the decoder identifies chord progressions based on the segmentation. This multi-task approach (segmentation + recognition) is unique among chord recognition systems.

### Relationship to Other Sources

- Omnizart's chord model is the **Harmony Transformer** (see Section 10 below) — a separate publication by the same lab.
- The beat/downbeat model reproduces Chuang & Su (2020), outperforming madmom and librosa on symbolic data.
- Multi-instrument transcription uses self-attention-based instance segmentation (Wu et al., IEEE/ACM TASLP 2020).

### Suitability for Music Copilot

- **Most comprehensive single toolbox** — covers pitch, chords, drums, vocals, and beat in one library.
- The chord recognition component (Harmony Transformer) is competitive with Fard thesis approach.
- TensorFlow dependency (not ideal for Music Copilot's current stack).
- Could be used as a comprehensive analysis pipeline for project import (given audio → full project state).
- The modular design (separate subcommands for each task) maps well to plugin architecture.

---

## 10. Harmony Transformer

| Property | Value |
|----------|-------|
| URL | https://github.com/Tsung-Ping/Harmony-Transformer |
| Stars | 44 |
| License | Not specified |
| Authors | Tsung-Ping Chen, Li Su (Academia Sinica) |
| Approach | Transformer encoder-decoder (multi-task) |
| Task | Chord recognition + chord segmentation |
| Paper | ISMIR 2019 |
| Dataset | McGill Billboard (audio + symbolic) |

### Architecture

Encoder-decoder Transformer where:
- **Encoder**: performs chord segmentation on the input (detects chord boundaries).
- **Decoder**: identifies chord progression based on segmentation results.
- **Multi-task learning**: both tasks trained jointly with a non-autoregressive decoding framework.
- Input: chroma features (audio) or pitch-class profiles (symbolic).

### Key Innovation

Unlike most chord recognition systems that treat chord recognition as frame-wise classification (followed by post-processing smoothing), the Harmony Transformer explicitly learns to segment chord changes as part of the recognition process. This produces cleaner chord boundaries and fewer over-segmentation errors.

### Relationship to Other Sources

- Used as the chord recognition engine in **Omnizart** (Section 9).
- Evaluated on McGill Billboard dataset — achieved state-of-the-art at time of publication.
- The encoder-decoder approach differs from CREMA's CNN-BiGRU, Fard's MultiResUnet, and BTC's bi-directional Transformer.
- Open source implementation available (44 stars, TensorFlow).

### Suitability for Music Copilot

- **Strong reference for chord recognition with explicit boundary detection** — addresses the over-segmentation problem noted in the Fard thesis error analysis.
- Multi-task segmentation+recognition is a unique advantage over single-task models.
- Would need TensorFlow→PyTorch migration to fit Music Copilot's stack.
- Could be simplified: the encoder-decoder architecture may be overkill for v0.2.

---

## 11. BTC — Bi-directional Transformer for Chord Recognition

| Property | Value |
|----------|-------|
| URL | ISMIR 2019 paper |
| Authors | Kakao / Kakao Brain |
| Approach | Bi-directional Transformer with self-attention |
| Task | Frame-wise chord recognition |
| Paper | ISMIR 2019, Delft |
| Output | 25 chord classes (12 major + 12 minor + N) |

### Architecture

A bi-directional Transformer (not encoder-decoder — a single Transformer with bi-directional self-attention) applied to chord recognition. Key features:
- Self-attention captures long-range dependencies relevant to chord context.
- Multi-head attention allows the model to attend to different musical features simultaneously.
- Attention map analysis shows: early layers focus on neighboring frames, middle layers broaden the receptive field, final layers attend only to essential information.

### Key Results

- Competitive with CREMA and other state-of-the-art models on standard metrics.
- First application of Transformer to chord recognition (ISMIR 2019).
- Attention analysis revealed musically meaningful behavior: attends to similar chord regions, correctly weights shared-note chords.

### Relationship to Other Sources

- **BTC is one of the three models used in ChordMini** (alongside Chord-CNN-LSTM and Beat-Transformer) — see Section 13.
- Published in the same ISMIR 2019 conference as the Harmony Transformer — different architectural philosophy (single bi-directional Transformer vs encoder-decoder).
- BTC's self-attention approach is more similar to MT3 than to CNN-based approaches like CREMA or Fard.
- BTC's frame-wise output (not segmentation-aware) differs from Harmony Transformer's explicit boundary learning.

### Suitability for Music Copilot

- **Important reference for Transformer-based chord recognition** — demonstrates that self-attention works well for this task.
- No public implementation with pre-trained weights (unlike CREMA or Harmony Transformer).
- Would need to be implemented from scratch if desired.
- The attention analysis insights are valuable for designing future models.

---

## 12. autochord

| Property | Value |
|----------|-------|
| URL | https://github.com/cjbayron/autochord |
| Stars | 3 |
| License | Not specified |
| Authors | Christian J. Bayron |
| Approach | NNLS-Chroma → Bi-LSTM-CRF |
| Task | Chord recognition |
| Requires training | No (pre-trained TensorFlow model auto-downloaded) |
| Offline | Yes |
| Output | 25 classes (12 major + 12 minor + N) |
| Accuracy | 67.33% |
| Paper | ISMIR 2021 Late-Breaking Demo |
| Dependencies | TensorFlow, VAMP plugin (NNLS-Chroma) |

### How It Works

1. Audio is processed by the NNLS-Chroma VAMP plugin to extract chroma features.
2. Chroma features (24-dimensional) are fed to a Bi-LSTM-CRF model.
3. The CRF layer ensures smooth chord sequence transitions.
4. Output: list of (start_time, end_time, chord_label) tuples in MIREX format.

### Key Details

- Very simple API: `autochord.recognize('audio.wav', lab_fn='chords.lab')`.
- Processes a 4-minute song in ~7 seconds on CPU.
- **Windows is officially unsupported** (VAMP plugin compatibility issues).
- CRF layer improves temporal consistency compared to frame-wise models.
- Trained on McGill Billboard dataset (600+ songs for training, ~100 for testing).

### Relationship to Other Sources

- Uses the same NNLS-Chroma features as the **Fard thesis** (HCQT-based) — but Fard uses a deeper architecture with MultiResUnet instead of Bi-LSTM-CRF.
- 67.33% accuracy is significantly lower than CREMA (~80% triads) and MultiResUnet (~82% triads) — but autochord is a small, single-purpose library.
- The Bi-LSTM-CRF architecture is similar to CREMA's CNN-BiGRU but without the CNN frontend.

### Suitability for Music Copilot

- **Not recommended** — accuracy is too low, Windows support is missing, and TensorFlow dependency.
- The simple API is appealing, but the accuracy trade-off is too severe.
- The Bi-LSTM-CRF architecture concept (sequential model + CRF smoothing) is informative but better implemented via CREMA or a custom solution.

---

## 13. madmom

| Property | Value |
|----------|-------|
| URL | https://github.com/CPJKU/madmom |
| Stars | 1,600 |
| License | BSD (code) + CC BY-NC-SA (models) |
| Authors | Sebastian Böck, Filip Korzeniowski, Jan Schlüter et al. (CPJKU, JKU Linz) |
| Approach | CNN + CRF for chroma extraction and chord recognition |
| Tasks | Onset detection, beat/downbeat tracking, tempo estimation, chord recognition |
| Offline | Yes |
| Latest release | 0.16.1 (Nov 2018) |
| Paper | ACM Multimedia 2016 |

### Chord Recognition Pipeline

1. **CNNChordFeatureProcessor**: CNN extracts deep chroma features from spectrograms.
2. **CRFChordRecognitionProcessor**: Conditional Random Field decodes chord labels from chroma features.
3. **DeepChromaChordRecognitionProcessor**: Combined CNN+CRF pipeline (convenience wrapper).
4. Post-processing with `majmin_targets_to_chord_labels()` to produce (start, end, label) tuples.

### Key Details

- Comprehensive MIR library, not just chord recognition — also onset, beat, downbeat, tempo.
- Cython-accelerated for performance.
- Pre-trained models available but **non-commercial license** (CC BY-NC-SA).
- Libraries.io reports 3 dependent packages, but ChordMini uses madmom beat detection.
- Last updated 2018 — no longer actively maintained.

### Relationship to Other Sources

- **madmom is used in ChordMini** (Section 14) for beat/algorithms alongside deep learning models.
- The CNN+CRF architecture is conceptually similar to CREMA (CNN+RNN) and autochord (Bi-LSTM-CRF) but uses a CRF instead of RNN for temporal modeling.
- CPJKU is the same research group behind many influential MIR datasets and evaluation frameworks.

### Suitability for Music Copilot

- **Non-commercial model license is a blocker** for Music Copilot (even if open-source, commercial use of models is not permitted without contacting the authors).
- The architecture (CNN chroma + CRF decoding) is a valid reference design.
- For reference only — too old, unmaintained, and license-restricted for production use.

---

## 14. ChordMini

| Property | Value |
|----------|-------|
| URL | https://github.com/ptnghia-j/ChordMiniApp |
| License | Open source |
| Authors | Nghĩa Phan Trọng (California State University, Fullerton) |
| Approach | Ensemble of multiple ML models + LLM |
| Tasks | Chord recognition, beat tracking, key detection |
| Models used | Chord-CNN-LSTM, BTC, Beat-Transformer, madmom |

### Architecture

ChordMini is a web application (Next.js + Flask backend) that combines:
- **Chord-CNN-LSTM**: for primary chord recognition (25+ types over 12 keys = 301 chord labels).
- **BTC (Bi-directional Transformer for Chord Recognition)**: used in ensemble with Chord-CNN-LSTM.
- **Beat-Transformer + madmom**: for beat/downbeat tracking and tempo detection.
- **Gemini LLM**: post-processing for enharmonic correction, key/tonal modulation analysis, structural segmentation, and chord quality refinement.

### Unique Features

- **301 chord labels** (12 keys × 25 chord types + N) — far wider vocabulary than most systems (25-class limit in autochord, CREMA, etc.).
- **LLM-based correction**: uses Gemini to detect and fix enharmonic errors (e.g., C# major vs Db major) based on local key context.
- **Multi-model ensemble**: combines deep learning predictions for higher accuracy.
- The research paper (in progress) explores pseudo-labeling + knowledge distillation — a teacher BTC model generates labels for 1,000+ hours of unlabeled audio, and a student model (BTC or 2E1D) is trained on these pseudo-labels, achieving 98% of teacher performance with just pseudo-labels.

### Relationship to Other Sources

- Uses **BTC** (Section 11) as one of its core models.
- Uses **madmom** (Section 13) for beat detection.
- The Chord-CNN-LSTM model is a custom architecture not published elsewhere.
- The ensemble approach (multiple models + LLM post-processing) is unique in the open-source chord recognition space.
- The pseudo-labeling research directly addresses the data scarcity problem noted in the Fard thesis error analysis.

### Suitability for Music Copilot

- **Excellent reference architecture** for a production chord recognition system.
- The multi-model + LLM approach is more complex than Music Copilot's current needs but valuable for Phase 3+.
- The pseudo-labeling + distillation research is directly applicable if custom chord models are trained.
- Web-based inference (Flask backend) could integrate with Music Copilot's REST architecture.
- As an open-source project actively developed (v0.5.0, Oct 2025), it provides recent best practices.

---

## 15. librosa Built-in Chord Recognition

| Property | Value |
|----------|-------|
| Location | `librosa.sequence.viterbi_discriminative` |
| Approach | CQT chroma → template matching → Viterbi decoding |
| Task | Chord recognition (demonstration only) |
| Accuracy | Low (explicitly documented as not production-ready) |
| Classes | 25 (12 major + 12 minor + N) |

### How It Works

1. Compute CQT chroma features (12-bin pitch class profile per frame).
2. Define template vectors for major, minor, and no-chord classes (24 + 1 = 25 states).
3. Use discriminative Viterbi decoding with a self-loop transition matrix to find the most likely chord sequence.

### Key Documentation Warning

> "Note: this chord model is not accurate enough to use in practice. It is only intended to demonstrate how to use discriminative Viterbi decoding."

### Relationship to Other Sources

- The template matching approach is the simplest form of chord recognition — no ML required.
- More sophisticated versions of the same idea (chroma + template matching) are used in jasonleeaudio/chord-recognition (Section 16) as a classical baseline.
- Conceptually similar to the pitch-set template matching proposed in Music Copilot's Implementation Plan (Section 4).

### Suitability for Music Copilot

- **Not for production use** — the documentation explicitly warns against it.
- Useful as a **quick prototype** to validate chroma extraction and chord labeling pipelines.
- The template matching concept (chroma → pitch set → chord mapping) aligns with Music Copilot's existing Theory Engine chord definitions.

---

## 16. jasonleeaudio/chord-recognition

| Property | Value |
|----------|-------|
| URL | https://github.com/jasonleeaudio/chord-recognition |
| Stars | 0 (new project) |
| Approach | CQT chroma + template matching vs CNN-BiGRU, CR2+S |
| Task | Guitar chord recognition comparison |
| Dataset | GuitarSet |

### Description

Compares three approaches for chord recognition on guitar audio using GuitarSet:
1. **Classical**: CQT chroma extraction + template matching (baseline).
2. **CNN-BiGRU**: Deep learning with convolutional frontend + bidirectional GRU.
3. **CR2+S**: A more complex deep learning architecture.

### Relationship to Other Sources

- Provides a direct comparison between classical signal processing (also used by librosa's built-in chord recognizer) and deep learning approaches (similar to CREMA's CNN-BiGRU).
- The template-matching baseline is conceptually identical to the approach proposed for Music Copilot's Phase 2 (basic-pitch notes → chord template mapping).
- GuitarSet is also used as an evaluation dataset in the MT3 paper.

### Suitability for Music Copilot

- **Useful reference for the template-matching vs deep learning trade-off** — helps calibrate expectations.
- The template-matching baseline provides context for how much accuracy gain comes from deep learning vs. simple chroma matching.
- Very new project (1 commit) — not yet a mature library.

---

## Comparison Matrix

| Feature | audio-to-midi | basic-pitch | Fard Thesis | determine_key | CREMA | MT3 | Omnizart | BTC | autochord | madmom |
|---------|---------------|-------------|-------------|---------------|-------|-----|----------|-----|-----------|--------|
| **Task** | Mono pitch→MIDI | Poly pitch→MIDI | Chord recog | Key detection | Chord recog | Multi-AMT | Multi-AMT + chord | Chord recog | Chord recog | MIR suite |
| **ML required** | No | Yes (pre-trained) | Yes (scratch) | Yes (pre-trained) | Yes (pre-trained) | Yes (pre-trained) | Yes (pre-trained) | Yes (scratch) | Yes (pre-trained) | Yes (pre-trained) |
| **Polyphonic** | Top-N notes | Multi-pitch | Chord-level | N/A | Chord-level | Multi-track | Multi-track + chord | Chord-level | Chord-level | Multiple |
| **Chord quality output** | No | No | Yes | N/A | Yes (maj/min/7th) | No (pitch/track) | Yes (HT) | Yes (maj/min) | Yes (maj/min only) | Yes (maj/min) |
| **Key output** | No | No | Implicit | Yes | No | No | No | No | No | No |
| **Dependency size** | Minimal | Medium (ONNX) | Very large (TF1) | Moderate (PyTorch) | Large (TF) | Very large (JAX) | Large (TF) | N/A (paper) | Medium (TF+VAMP) | Medium (Cython) |
| **Offline** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Integration effort** | Low | Low | Very high | Medium | Low | Medium (mt3-infer) | Low | Very high | Low (no Windows) | Low (non-commercial) |
| **Music Copilot fit** | Mono fallback | Best poly pitch→MIDI | Best chord ref | Redundant | Best plug-and-play chord | Future multi-AMT | Multi-task analysis ref | Transformer ref | Not recommended | Reference only |

### Approach Comparison by Architecture Family

| Family | Systems | Characteristics |
|--------|---------|-----------------|
| **Signal processing** | audio-to-midi, librosa chord, jasonleeaudio template | No ML, FFT/chroma only, limited accuracy |
| **CNN + RNN** | CREMA (CNN-BiGRU), autochord (Bi-LSTM-CRF), Fard (MultiResUnet), ByteDance (CNN-RNN) | Workhorse architecture for AMT/chord recog. CNN extracts features, RNN models temporal context |
| **CNN + CRF** | madmom, autochord (CRF layer) | CRF replaces RNN for temporal smoothing — better boundary modeling |
| **Transformer (encoder-only)** | BTC (bi-directional self-attention) | Self-attention replaces RNN for temporal context. Simpler training than encoder-decoder |
| **Transformer (encoder-decoder)** | MT3, Harmony Transformer, Omnizart | Two-stage: encode features → decode tokens. More expressive, harder to train |
| **Ensemble + LLM** | ChordMini | Multiple models combined with LLM post-processing. Highest accuracy, most complex |

## Recommendations for Music Copilot (Updated)

### v0.1 (current MVP)
- **Keep existing approach**: music21 Krumhansl-Schmuckler for key detection (already works at ~70%).
- **Keep existing approach**: DeepRhythm for BPM detection (95.9% Acc1).
- **Skip note/chord recognition for v0.1** as previously decided.

### Phase 2
1. **basic-pitch** remains the primary polyphonic pitch-to-MIDI tool.
2. **CREMA** as the quickest path to chord recognition — `pip install crema`, pre-trained, works offline, reasonable major/minor accuracy (~80%). No training or re-implementation needed.
3. **NFJones/audio-to-midi** as monophonic fallback.

### Phase 3
1. **Omnizart** for comprehensive project import — transcribe pitched instruments + chords + drums + beat in one pass. TensorFlow dependency is the main cost.
2. **Harmony Transformer** as the reference architecture for chord recognition with explicit boundary detection — addresses over-segmentation issues noted in Fard thesis.
3. **ChordMini ensemble approach** (multi-model + LLM post-processing) for highest accuracy if AI-assisted correction is acceptable (use local LLM, not cloud).
4. **Fard thesis MultiResUnet** as a potential custom architecture if TF1→PyTorch migration is justified.

### Phase 4+
1. **MT3** (via MT3-Infer) for state-of-the-art multi-instrument transcription — full-mix audio to multi-track MIDI.
2. **ByteDance piano transcription** as a specialized tool for piano-only recordings (highest piano accuracy).
3. **YourMT3+** or **MR-MT3** if MT3 instrument leakage becomes a problem.

### Tools NOT Recommended
- **determine_key**: already redundant with music21 K-S (both ~70%).
- **librosa built-in chord recognition**: explicitly warned as not production-quality.
- **autochord**: Windows unsupported, low accuracy (67%), TF dependency.
- **madmom**: non-commercial model license, unmaintained since 2018.
- **jasonleeaudio/chord-recognition**: too early-stage (1 commit, 0 stars).

### Updated Concrete Implementation Plan

1. Add `basic-pitch` as optional dependency for polyphonic pitch→MIDI (Phase 2).
2. Add `crema` as optional dependency for quick chord recognition (Phase 2):
   - Replace or supplement basic-pitch → template matching approach with CREMA's pre-trained model.
   - Convert JAMS output to Music Copilot's chord data model.
3. Add `mt3-infer` as optional dependency for multi-instrument transcription (Phase 4):
   - Use for full-mix import when user has GPU.
4. Create `plugins/chord_recognition/` plugin (Phase 3) with configurable backend:
   - Backend options: CREMA (fast), Omnizart (comprehensive), Harmony Transformer (accurate).
   - Auto-fallback between backends based on availability.
5. Implement template-matching fallback (basic-pitch notes → theory engine chords) as lightweight alternative when no ML model is installed.
6. Use Omnizart's chord + beat + drum pipeline for comprehensive sample analysis in a single pass (Phase 3 evaluation).

---

## References

1. NFJones. *audio-to-midi*. GitHub. https://github.com/NFJones/audio-to-midi
2. Bittner, R. M. et al. (2022). *A Lightweight Instrument-Agnostic Model for Polyphonic Note Transcription and Multipitch Estimation*. ICASSP 2022. https://arxiv.org/abs/2203.09893
3. Habibi Fard, H. (2020). *Automatic Chord Recognition with Fully Convolutional Neural Networks*. Master's Thesis, TU Berlin. https://www.static.tu.berlin/fileadmin/www/10002020/Dokumente/Abschlussarbeiten/Masterarbeit_Hamed_Fard_final.pdf
4. Long, P. N. *determine_key*. GitHub. https://github.com/pnlong/determine_key
5. McFee, B. *CREMA: Convolutional and Recurrent Estimators for Music Analysis*. GitHub. https://github.com/bmcfee/crema
6. Gardner, J. et al. (2022). *MT3: Multi-Task Multitrack Music Transcription*. ICLR 2022. https://arxiv.org/abs/2111.03017
7. Hawthorne, C. et al. (2018). *Onsets and Frames: Dual-Objective Piano Transcription*. ISMIR 2018. https://arxiv.org/abs/1710.11153
8. Kong, Q. et al. (2020). *High-Resolution Piano Transcription with Pedals by Regressing Onset and Offset Times*. ByteDance. https://github.com/bytedance/piano_transcription
9. Wu, Y.-T. et al. (2021). *Omnizart: A General Toolbox for Automatic Music Transcription*. JOSS. https://doi.org/10.21105/joss.03391
10. Chen, T.-P. and Su, L. (2019). *Harmony Transformer: Incorporating Chord Segmentation into Harmony Recognition*. ISMIR 2019. https://archives.ismir.net/ismir2019/paper/000030.pdf
11. Park, J. et al. (2019). *A Bi-Directional Transformer for Musical Chord Recognition*. ISMIR 2019.
12. Bayron, C. J. (2021). *autochord: Automatic Chord Recognition Library*. ISMIR 2021 Late-Breaking Demo. https://github.com/cjbayron/autochord
13. Böck, S. et al. (2016). *madmom: A New Python Audio and Music Signal Processing Library*. ACM Multimedia 2016. https://github.com/CPJKU/madmom
14. Phan Trọng, N. *ChordMini: Chord Recognition and Beat Tracking with LLM*. GitHub. https://github.com/ptnghia-j/ChordMiniApp
15. Lee, J. *chord-recognition: Classical vs Deep Learning on GuitarSet*. GitHub. https://github.com/jasonleeaudio/chord-recognition
16. McFee, B. et al. *librosa: Audio and Music Signal Analysis in Python*. https://librosa.org/
17. Min, K. et al. (2024). *MR-MT3: Memory Retaining Multi-Track Music Transcription to Mitigate Instrument Leakage*. arXiv:2403.10024
18. Wu, Y.-T. et al. (2024). *YourMT3+: Multi-instrument Music Transcription with Enhanced Transformer Architectures and Cross-dataset Stem Augmentation*. arXiv:2407.04822
19. *MT3-Infer: Unified Inference Toolkit for MT3 Model Family*. https://github.com/openmirlab/mt3-infer
