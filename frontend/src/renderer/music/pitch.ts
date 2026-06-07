import type { Note, ProgressionChord } from '../types';

export const PITCH_CLASSES: Record<string, number> = {
  "C":0, "C#":1, "Db":1, "D":2, "D#":3, "Eb":3,
  "E":4, "F":5, "F#":6, "Gb":6, "G":7, "G#":8,
  "Ab":8, "A":9, "A#":10, "Bb":10, "B":11,
};

export const SEMITONE_TO_NOTE: Record<number, string> = {
  0:"C", 1:"C#", 2:"D", 3:"Eb", 4:"E", 5:"F",
  6:"F#", 7:"G", 8:"Ab", 9:"A", 10:"Bb", 11:"B",
};

export function midiPitchToName(pitch: number): string {
  return `${SEMITONE_TO_NOTE[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

export function chordNotesToMidi(chords: ProgressionChord[], startBeat: number): Note[] {
  const notes: Note[] = [];
  chords.forEach((chord, i) => {
    chord.notes.forEach((noteStr) => {
      const cleanNote = noteStr.replace(/\d+$/, '');
      const pitch = 60 + (PITCH_CLASSES[cleanNote] ?? 0);
      notes.push({ pitch, velocity: 100, start_beat: startBeat + i * 4, duration_in_beats: 4 });
    });
  });
  return notes;
}
