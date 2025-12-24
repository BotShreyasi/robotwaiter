// src/azure/TTSService.ts
// @ts-nocheck
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import { Buffer } from 'buffer';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '../config/Config';
(global as any).Buffer = (global as any).Buffer || Buffer;

type SpeakEvent = { type: 'start' | 'preend' | 'end'; durationMillis?: number | null };
let emitSpeakEvent: (e: SpeakEvent) => void;
let onSpeakEventShared: (cb: (e: SpeakEvent) => void) => () => void;

try {
  // eslint-disable-next-line global-require
  const events = require('./TTSEvents');
  emitSpeakEvent = events.emitSpeakEvent;
  onSpeakEventShared = events.onSpeakEvent;
} catch (e) {
  // fallback local emitter if TTSEvents couldn't be required (metro cache / ordering issues)
  const listeners = new Set<(e: SpeakEvent) => void>();
  onSpeakEventShared = (cb: (e: SpeakEvent) => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  emitSpeakEvent = (e: SpeakEvent) => {
    for (const cb of Array.from(listeners)) {
      try { cb(e); } catch {}
    }
  };
}

export const onSpeakEvent = onSpeakEventShared;
const emit = (e: SpeakEvent) => emitSpeakEvent(e);

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/tts-cache/`;
const DEFAULT_LANG = 'hi-IN';
// const DEFAULT_VOICE = 'en-IN-Aarti:DragonHDV2Neural'; 
//hesisVoiceName = "en-IN-Meera:DragonHDLatestNeural  config.SpeechSynthesisVoiceName = "en-IN-NeerjaNeural";

const DEFAULT_VOICE = 'en-IN-Meera:DragonHDLatestNeural';
let currentSound: Sound | null = null;
let preEndTimer: NodeJS.Timeout | null = null;
type QueueItem = {
  text: string;
  lang: string;
  voice: string;
  resolve: () => void;
  reject: (e: any) => void;
};
const queue: QueueItem[] = [];
let isPlaying = false;

const enqueue = (item: Omit<QueueItem, 'resolve' | 'reject'>) => {
  return new Promise<void>((resolve, reject) => {
    queue.push({ ...item, resolve, reject });
    if (!isPlaying) {
      void processQueue();
    }
  });
};

const processQueue = async () => {
  if (isPlaying) return;
  const next = queue.shift();
  if (!next) return;
  isPlaying = true;
  try {
    await speakInternal(next.text, next.lang, next.voice);
    next.resolve();
  } catch (e) {
    next.reject(e);
  } finally {
    isPlaying = false;
    if (queue.length) {
      void processQueue();
    }
  }
};

const ensureDir = async () => {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    await RNFS.mkdir(CACHE_DIR);
  }
};

const hash = (s: string) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

const keyFor = async (text: string, voice: string) => {
  const tag = voice.replace(/[^a-z0-9-_]/gi, '_').slice(0, 50);
  return `${tag}_${hash(voice + ':' + text).slice(0, 16)}.mp3`;
};

const synthesizeWithAzure = async (text: string, voiceName = DEFAULT_VOICE) => {
  const endpoint = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `
    <speak version="1.0" xml:lang="${DEFAULT_LANG}">
      <voice xml:lang="${DEFAULT_LANG}" name="${voiceName}">
        ${text}
      </voice>
    </speak>
  `;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!res.ok) {
    const err = await res.text();
    console.log('[TTS] Azure error:', err);
    throw new Error(`Azure TTS ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  const fileName = await keyFor(text, voiceName);
  const filePath = CACHE_DIR + fileName;
  const base64 = Buffer.from(buf).toString('base64');
  await RNFS.writeFile(filePath, base64, 'base64');
  return filePath;
};

const playFromFile = async (filePath: string) => {
  await ensureDir();

  return new Promise<void>((resolve, reject) => {
    console.log('[TTS] About to play file:', filePath);
    if (preEndTimer) {
      clearTimeout(preEndTimer);
      preEndTimer = null;
    }
    const sound = new Sound(filePath, '', (error) => {
      if (error) {
        console.log('[TTS] Load error:', error);
        emit({ type: 'end' });
        return reject(error);
      }

      currentSound = sound;
      const durationMillis = sound.getDuration() * 1000;
      emit({ type: 'start', durationMillis });
      if (durationMillis > 2000) {
        preEndTimer = setTimeout(() => emit({ type: 'preend', durationMillis }), durationMillis - 2000);
      }

      sound.play((success) => {
        if (preEndTimer) {
          clearTimeout(preEndTimer);
          preEndTimer = null;
        }
        if (!success) {
          console.log('[TTS] Play failed');
          sound.release();
          currentSound = null;
          emit({ type: 'end' });
          return reject(new Error('Play failed'));
        }
        console.log('[TTS] Finished play:', { filePath, durationMillis });
        sound.release();
        currentSound = null;
        emit({ type: 'end' });
        resolve();
      });
    });
  });
};

export const stopSpeaking = async () => {
  try {
    if (currentSound) {
      currentSound.stop(() => {
        currentSound?.release();
        currentSound = null;
        if (preEndTimer) {
          clearTimeout(preEndTimer);
          preEndTimer = null;
        }
        emit({ type: 'end' });
      });
      return;
    }
  } catch {}
  if (preEndTimer) {
    clearTimeout(preEndTimer);
    preEndTimer = null;
  }
  emit({ type: 'end' });
};

const speakInternal = async (text: string, lang: string = DEFAULT_LANG, voiceName = DEFAULT_VOICE) => {
  if (!text || !text.trim()) return;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const est = Math.max(800, Math.round(text.length * 60));
      emit({ type: 'start', durationMillis: est });
      u.onend = () => emit({ type: 'end' });
      window.speechSynthesis.speak(u);
      return;
    }

    await ensureDir();
    const fileName = await keyFor(text, voiceName);
    const filePath = CACHE_DIR + fileName;
    const exists = await RNFS.exists(filePath);

    if (exists) {
      console.log('[TTS] Using cache for', text);
      await playFromFile(filePath);
      return;
    }

    console.log('[TTS] Calling Azure for', text);
    const newPath = await synthesizeWithAzure(text, voiceName);
    await playFromFile(newPath);
  } catch (e) {
    console.log('[TTS] speak error:', e);
      emit({ type: 'end' });
  }
};

export const speak = async (text: string, lang: string = DEFAULT_LANG, voiceName = DEFAULT_VOICE) => {
  return enqueue({ text, lang, voice: voiceName });
};
