// src/azure/TTSEvents.ts
// Simple shared event emitter for TTS start/end events
// Keeps TTS <-> STT communication free of circular imports
type SpeakEvent = { type: 'start' | 'end'; durationMillis?: number | null };

const listeners = new Set<(e: SpeakEvent) => void>();

export const onSpeakEvent = (cb: (e: SpeakEvent) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const emitSpeakEvent = (e: SpeakEvent) => {
  for (const cb of Array.from(listeners)) {
    try { cb(e); } catch {}
  }
};

export default { onSpeakEvent, emitSpeakEvent };
