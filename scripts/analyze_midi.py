import argparse
import json
from pathlib import Path
from collections import Counter, defaultdict
import os
import sys
import statistics

import pretty_midi


CACHE_FILE = Path("data/analysis/scan_cache.json")
DEFAULT_DATA_DIR = Path("data/midi")
MIN_TAG_GROUP = 3


def parse_filename(path: Path) -> dict:
    stem = path.stem
    parts = stem.split("_")
    if len(parts) == 1:
        return {"name": parts[0], "tags": []}
    return {"name": parts[0], "tags": parts[1:]}


def load_cache() -> dict:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_cache(cache: dict):
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def find_midi_files(data_dir: Path) -> list[Path]:
    files = []
    for ext in ("*.mid", "*.midi", "*.MID", "*.MIDI"):
        files.extend(data_dir.rglob(ext))
    return sorted(set(files))


def estimate_beat_interval(onset_times: list[float]) -> float:
    if len(onset_times) < 4:
        return 0.5
    intervals = [
        onset_times[i + 1] - onset_times[i]
        for i in range(len(onset_times) - 1)
        if onset_times[i + 1] - onset_times[i] > 0.05
    ]
    if not intervals:
        return 0.5
    buckets: dict[float, int] = {}
    for interval in intervals:
        bucket = round(interval * 20) / 20
        if 0.15 <= bucket <= 2.0:
            buckets[bucket] = buckets.get(bucket, 0) + 1
    if not buckets:
        return 0.5
    return max(buckets, key=buckets.get)


def detect_type(pm: pretty_midi.PrettyMIDI) -> str:
    notes = []
    for inst in pm.instruments:
        if inst.is_drum:
            continue
        notes.extend(inst.notes)
    if not notes:
        return "unknown"
    time_groups: dict[float, list] = defaultdict(list)
    for n in notes:
        ts = round(n.start * 20) / 20
        time_groups[ts].append(n)
    if max(len(g) for g in time_groups.values()) >= 2:
        return "chords"
    pitches = [n.pitch for n in notes]
    med = statistics.median(pitches) if pitches else 60
    return "bass" if med <= 60 else "melody"


def analyze_file(path: Path) -> dict | None:
    try:
        pm = pretty_midi.PrettyMIDI(str(path))
    except Exception as e:
        print(f"  Warning: Could not parse {path.name}: {e}")
        return None
    notes = []
    for inst in pm.instruments:
        if inst.is_drum:
            continue
        notes.extend(inst.notes)
    if not notes:
        print(f"  Warning: No notes in {path.name}")
        return None
    notes_sorted = sorted(notes, key=lambda n: n.start)

    file_type = detect_type(pm)
    onset_times = [n.start for n in notes_sorted]
    beat_interval = estimate_beat_interval(onset_times)

    pitch_hist_raw: dict[str, int] = Counter()
    pitch_class_raw: dict[str, int] = Counter()
    interval_raw: dict[str, int] = Counter()
    vel_sums: dict[str, float] = defaultdict(float)
    vel_counts: dict[str, int] = defaultdict(int)
    vel_hist_raw: dict[str, int] = Counter()
    duration_raw: dict[str, int] = Counter()
    gap_raw: dict[str, int] = Counter()

    for i, n in enumerate(notes_sorted):
        str_pitch = str(n.pitch)
        pitch_hist_raw[str_pitch] += 1
        pc = str(n.pitch % 12)
        pitch_class_raw[pc] += 1
        vel_hist_raw[str(n.velocity)] += 1

        dur_beats = (n.end - n.start) / beat_interval
        dq = round(dur_beats * 8) / 8
        duration_raw[str(dq)] += 1

        beat_pos = (n.start / beat_interval) % 4
        bp = round(beat_pos * 4) / 4
        vel_sums[str(bp)] += n.velocity
        vel_counts[str(bp)] += 1

    for i in range(len(notes_sorted) - 1):
        interval = notes_sorted[i + 1].pitch - notes_sorted[i].pitch
        interval_raw[str(interval)] += 1

    for i in range(len(notes_sorted) - 1):
        gap = (notes_sorted[i + 1].start - notes_sorted[i].end)
        if gap > 0:
            gb = gap / beat_interval
            gq = round(gb * 4) / 4
            gap_raw[str(gq)] += 1

    total_dur_beats = (notes_sorted[-1].end - notes_sorted[0].start) / beat_interval
    bars = max(1, total_dur_beats / 4)
    notes_per_bar = len(notes_sorted) / bars

    phrase_shape: dict = {}
    if len(notes_sorted) >= 4:
        third = len(notes_sorted) // 3
        start_avg = statistics.mean(n.pitch for n in notes_sorted[:third])
        mid_avg = statistics.mean(n.pitch for n in notes_sorted[third:2 * third])
        end_avg = statistics.mean(n.pitch for n in notes_sorted[2 * third:])
        phrase_shape = {
            "start_avg": round(start_avg, 1),
            "mid_avg": round(mid_avg, 1),
            "end_avg": round(end_avg, 1),
        }
        if abs(start_avg - end_avg) < 2:
            phrase_shape["contour"] = "flat"
        elif end_avg > start_avg:
            phrase_shape["contour"] = "ascending"
        else:
            phrase_shape["contour"] = "descending"

    return {
        "type": file_type,
        "num_notes": len(notes_sorted),
        "beat_interval": round(beat_interval, 3),
        "notes_per_bar": round(notes_per_bar, 2),
        "pitch_hist_raw": dict(sorted(pitch_hist_raw.items(), key=lambda x: int(x[0]))),
        "pitch_class_raw": dict(sorted(pitch_class_raw.items(), key=lambda x: int(x[0]))),
        "interval_raw": dict(sorted(interval_raw.items(), key=lambda x: int(x[0]))),
        "vel_sums": {k: int(v) for k, v in sorted(vel_sums.items(), key=lambda x: float(x[0]))},
        "vel_counts": {k: v for k, v in sorted(vel_counts.items(), key=lambda x: float(x[0]))},
        "vel_hist_raw": dict(sorted(vel_hist_raw.items(), key=lambda x: int(x[0]))),
        "duration_raw": dict(sorted(duration_raw.items(), key=lambda x: float(x[0]))),
        "gap_raw": dict(sorted(gap_raw.items(), key=lambda x: float(x[0]))),
        "phrase_shape": phrase_shape,
        "pitch_min": min(n.pitch for n in notes_sorted),
        "pitch_max": max(n.pitch for n in notes_sorted),
        "pitch_range": max(n.pitch for n in notes_sorted) - min(n.pitch for n in notes_sorted),
    }


def merge_stats(entries: list[dict]) -> dict:
    if not entries:
        return {}
    n = len(entries)
    total_notes = sum(e["num_notes"] for e in entries)

    def sum_raw(key: str) -> dict[str, int]:
        c: Counter[str] = Counter()
        for e in entries:
            c.update(Counter(e.get(key, {})))
        return dict(sorted(c.items(), key=lambda x: float(x[0]) if _is_num(x[0]) else x[0]))

    def percentage(raw: dict[str, int], total: int) -> dict[str, float]:
        return {k: round(v * 100 / max(1, total), 1) for k, v in raw.items()}

    pc_raw = sum_raw("pitch_class_raw")
    int_raw = sum_raw("interval_raw")
    dur_raw = sum_raw("duration_raw")
    gap_raw_sum = sum_raw("gap_raw")
    vh_raw = sum_raw("vel_hist_raw")

    vel_merged: dict[str, list[int]] = defaultdict(list)
    for e in entries:
        for bp in sorted(e["vel_sums"], key=float):
            if bp not in vel_merged:
                vel_merged[bp] = [0, 0]
            vel_merged[bp][0] += e["vel_sums"][bp]
            vel_merged[bp][1] += e["vel_counts"][bp]
    vel_avg = {
        bp: round(vel_merged[bp][0] / max(1, vel_merged[bp][1]))
        for bp in sorted(vel_merged, key=float)
    }

    wavg_npb = sum(e["notes_per_bar"] * e["num_notes"] for e in entries) / max(1, total_notes)

    phrase_starts = [e["phrase_shape"]["start_avg"] for e in entries if e.get("phrase_shape", {}).get("start_avg") is not None]
    phrase_mids = [e["phrase_shape"]["mid_avg"] for e in entries if e.get("phrase_shape", {}).get("mid_avg") is not None]
    phrase_ends = [e["phrase_shape"]["end_avg"] for e in entries if e.get("phrase_shape", {}).get("end_avg") is not None]

    return {
        "file_count": n,
        "total_notes": total_notes,
        "notes_per_bar": round(wavg_npb, 2),
        "pitch_class_pct": percentage(pc_raw, total_notes),
        "interval_pct": percentage(int_raw, max(1, sum(int_raw.values()))),
        "vel_profile": vel_avg,
        "vel_hist_pct": percentage(vh_raw, total_notes),
        "duration_pct": percentage(dur_raw, total_notes),
        "gap_pct": percentage(gap_raw_sum, max(1, sum(gap_raw_sum.values()))),
        "phrase_start_avg": round(statistics.mean(phrase_starts), 1) if phrase_starts else None,
        "phrase_mid_avg": round(statistics.mean(phrase_mids), 1) if phrase_mids else None,
        "phrase_end_avg": round(statistics.mean(phrase_ends), 1) if phrase_ends else None,
    }


def _is_num(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def print_summary(stats: dict):
    agg = stats.get("aggregates", {})
    overall = agg.get("overall", {})

    total_files = len(stats.get("files", {}))
    type_counts = Counter()
    all_tags: Counter[str] = Counter()
    for fdata in stats.get("files", {}).values():
        type_counts[fdata.get("type", "?")] += 1
        for t in fdata.get("tags", []):
            all_tags[t] += 1

    print("=" * 60)
    print("  MIDI Analysis Summary")
    print("=" * 60)
    print(f"  Total files  : {total_files}")
    print(f"  Melodies     : {type_counts.get('melody', 0)}")
    print(f"  Basslines    : {type_counts.get('bass', 0)}")
    print(f"  Chords       : {type_counts.get('chords', 0)}")
    print(f"  Unknown      : {type_counts.get('unknown', 0)}")

    if all_tags:
        top_tags = [t for t, _ in all_tags.most_common(10) if all_tags[t] >= MIN_TAG_GROUP]
        if top_tags:
            print(f"\n  Top tags (≥{MIN_TAG_GROUP} files):")
            for t in top_tags:
                print(f"    {t}: {all_tags[t]} files")

    def print_stats(label: str, data: dict, indent: str = "    "):
        print(f"\n  {label}")
        print(f"{indent}Files        : {data.get('file_count', '?')}")
        print(f"{indent}Total notes  : {data.get('total_notes', '?')}")
        print(f"{indent}Notes/bar    : {data.get('notes_per_bar', '?')}")
        pc = data.get("pitch_class_pct", {})
        if pc:
            top_pc = sorted(pc.items(), key=lambda x: -x[1])[:5]
            print(f"{indent}Top PCs      : {', '.join(f'{k}({v}%)' for k, v in top_pc)}")
        ints = data.get("interval_pct", {})
        if ints:
            top_int = sorted(ints.items(), key=lambda x: -x[1])[:5]
            print(f"{indent}Top intervals: {', '.join(f'{k}({v}%)' for k, v in top_int)}")
        vp = data.get("vel_profile", {})
        if vp:
            print(f"{indent}Vel profile  : {dict(list(vp.items())[:8])}")
        dur = data.get("duration_pct", {})
        if dur:
            top_dur = sorted(dur.items(), key=lambda x: -x[1])[:4]
            print(f"{indent}Top durations: {', '.join(f'{k}beats({v}%)' for k, v in top_dur)}")
        gap = data.get("gap_pct", {})
        if gap:
            top_gap = sorted(gap.items(), key=lambda x: -x[1])[:4]
            has_gap = any(float(k) > 0 for k, _ in top_gap if _is_num(k))
            print(f"{indent}Top gaps     : {', '.join(f'{k}beats({v}%)' for k, v in top_gap)} {'(has rests)' if has_gap else '(no rests)'}")
        ps = data.get("phrase_start_avg")
        pm_val = data.get("phrase_mid_avg")
        pe = data.get("phrase_end_avg")
        if ps is not None:
            print(f"{indent}Phrase shape : start={ps}  mid={pm_val}  end={pe}")

    if overall:
        print_stats("=== Overall ===", overall)

    for tag, tdata in sorted(agg.get("by_tag", {}).items()):
        print_stats(f"=== Tag: {tag} ===", tdata)

    for tname, tdata in sorted(agg.get("by_type", {}).items()):
        print_stats(f"=== Type: {tname} ===", tdata)

    print("\n" + "=" * 60)
    print("  Full data written to data/analysis/stats.json")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Analyze MIDI files for generator rework")
    parser.add_argument(
        "--data-dir", type=str, default=str(DEFAULT_DATA_DIR),
        help=f"Root data directory (default: {DEFAULT_DATA_DIR})"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Re-scan all files regardless of cache"
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"Error: data directory not found: {data_dir}")
        sys.exit(1)

    midi_files = find_midi_files(data_dir)
    if not midi_files:
        print(f"No MIDI files found in {data_dir}")
        return

    cache = {} if args.force else load_cache()
    results: dict = {"files": {}}

    # Restore previous analysis for cached files
    stats_path = CACHE_FILE.parent / "stats.json"
    if not args.force and stats_path.exists():
        try:
            prev = json.loads(stats_path.read_text(encoding="utf-8"))
            results["files"] = prev.get("files", {})
        except (json.JSONDecodeError, OSError):
            pass

    total = len(midi_files)
    known_paths = {str(p) for p in midi_files}
    new_or_changed = 0
    skipped = 0

    for idx, mpath in enumerate(midi_files, 1):
        rel = str(mpath)
        parsed = parse_filename(mpath)
        tags = parsed["tags"]
        name = parsed["name"]

        try:
            mtime = mpath.stat().st_mtime
        except OSError:
            mtime = 0

        cached_mtime = cache.get(rel)
        if cached_mtime == mtime:
            skipped += 1
            continue

        print(f"  [{idx}/{total}] {mpath.name}")
        stats = analyze_file(mpath)
        if stats is None:
            continue

        cache[rel] = mtime
        new_or_changed += 1

        entry = {
            "name": name,
            "tags": tags,
            **stats,
        }
        results["files"][rel] = entry

    # Clean stale cache entries (deleted files)
    stale_cache = [k for k in cache if k not in known_paths]
    for k in stale_cache:
        del cache[k]
    save_cache(cache)

    # Remove stale entries for deleted files
    stale = [k for k in results["files"] if k not in known_paths]
    for k in stale:
        del results["files"][k]

    file_entries = [v for v in results["files"].values() if v.get("type") != "unknown"]
    if not file_entries:
        print("No valid MIDI files to analyze.")
        return

    print(f"\nScanned: {new_or_changed} new/changed, {skipped} cached, {total} total files")

    # Build aggregates
    aggregates: dict = {}

    # Overall
    aggregates["overall"] = merge_stats(file_entries)

    # By tag
    tag_groups: dict[str, list[dict]] = defaultdict(list)
    for fentry in file_entries:
        for tag in fentry["tags"]:
            tag_groups[tag].append(fentry)
    by_tag = {}
    for tag, group in sorted(tag_groups.items()):
        if len(group) >= MIN_TAG_GROUP:
            by_tag[tag] = merge_stats(group)
    aggregates["by_tag"] = by_tag

    # By type
    type_groups: dict[str, list[dict]] = defaultdict(list)
    for fentry in file_entries:
        type_groups[fentry["type"]].append(fentry)
    by_type = {}
    for tname, group in sorted(type_groups.items()):
        if len(group) >= MIN_TAG_GROUP:
            by_type[tname] = merge_stats(group)
    aggregates["by_type"] = by_type

    # By tag x type (combo)
    combo_groups: dict[str, list[dict]] = defaultdict(list)
    for fentry in file_entries:
        for tag in fentry["tags"]:
            key = f"{tag}_{fentry['type']}"
            combo_groups[key].append(fentry)
    by_combo = {}
    for key, group in sorted(combo_groups.items()):
        if len(group) >= MIN_TAG_GROUP:
            by_combo[key] = merge_stats(group)
    aggregates["by_tag_type"] = by_combo

    results["aggregates"] = aggregates
    results["scan_stats"] = {
        "total_found": total,
        "new_or_changed": new_or_changed,
        "cached_skipped": skipped,
        "valid_analyzed": len(file_entries),
    }

    out_dir = CACHE_FILE.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "stats.json"
    out_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print_summary(results)


if __name__ == "__main__":
    main()
