// src/azure/STTService.ts
// @ts-nocheck

import 'react-native-get-random-values';
import { useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, Linking } from 'react-native';
import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION } from '../config/Config';
import { onSpeakEvent } from './TTSEvents';

const { AzureSTT } = NativeModules;

// Ensure the native module has the listener API; if not, shim it to avoid warnings
let sttEmitter: NativeEventEmitter | null = null;
if (AzureSTT) {
  const safeModule = {
    ...AzureSTT,
    addListener:
      typeof AzureSTT.addListener === 'function'
        ? AzureSTT.addListener.bind(AzureSTT)
        : () => ({ remove: () => { } }),
    removeListeners:
      typeof AzureSTT.removeListeners === 'function'
        ? AzureSTT.removeListeners.bind(AzureSTT)
        : () => { },
  };
  sttEmitter = new NativeEventEmitter(safeModule);
}
const sttHookSubscribers = new Set<(evt: any) => void>();
let sttNativeListener: any = null;

type UseSttOptions = {
  onSilence?: () => void;
  silenceMs?: number;
};

export function useSTT(onResult: (text: string) => void, options: UseSttOptions = {}) {
  const [recognizing, setRecognizing] = useState(false);
  const shouldListen = useRef(false);
  const isSpeaking = useRef(false);
  const micDeniedPermanently = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const ttsResumeTimer = useRef<NodeJS.Timeout | null>(null);
  const silenceMs = options.silenceMs ?? 6000;

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const scheduleSilenceTimer = () => {
    clearSilenceTimer();
    if (!options.onSilence) return;
    silenceTimer.current = setTimeout(() => {
      options.onSilence?.();
    }, silenceMs);
  };

  console.log('[STT] useSTT initialized (native bridge)');
  const requestMicPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (already) return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Robot waiter needs access to your microphone for speech recognition.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
    if (!ok) {
      const never = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      console.log(
        `[STT] Microphone permission NOT granted${never ? ' (never ask again)' : ''}`,
      );
      micDeniedPermanently.current = never;
      if (never) {
        try {
          await Linking.openSettings();
        } catch { }
      }
    }
    return ok;
  };

  const startRecognition = async () => {
    console.log('[STT] startRecognition, shouldListen=', shouldListen.current);
    if (!AzureSTT) {
      console.log('[STT] Native AzureSTT module not found');
      return;
    }
    if (!shouldListen.current || isSpeaking.current) return;

    const micOk = await requestMicPermission();
    if (!micOk) {
      shouldListen.current = false;
      setRecognizing(false);
      return;
    }

    try {
      await AzureSTT.start(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, 'hi-IN');
      setRecognizing(true);
      scheduleSilenceTimer();
    } catch (err: any) {
      console.log('[STT] Start error:', err?.message || err);
      shouldListen.current = false;
      setRecognizing(false);
    }
  };

  const stopRecognition = async (resetListen = true) => {
    console.log('[STT] stopRecognition');
    if (resetListen) shouldListen.current = false;
    clearSilenceTimer();
    setRecognizing(false);
    if (AzureSTT) {
      try {
        await AzureSTT.stop();
      } catch (err) {
        console.log('[STT] Stop error:', err);
      }
    }
  };

  const allowRecognition = () => {
    console.log('[STT] allowRecognition');
    shouldListen.current = true;
    if (!isSpeaking.current) {
      startRecognition();
    }
  };

  useEffect(() => {
    const speakUnsub = onSpeakEvent((evt: any) => {
      if (evt.type === 'start') {
        console.log('[STT] TTS start: pausing STT');
        isSpeaking.current = true;
        stopRecognition(false);
        if (ttsResumeTimer.current) {
          clearTimeout(ttsResumeTimer.current);
          ttsResumeTimer.current = null;
        }
      } else if (evt.type === 'preend') {
        // Do not resume early to avoid capturing TTS echo
        console.log('[STT] TTS pre-end: keeping STT paused to avoid echo');
      } else if (evt.type === 'end') {
        console.log('[STT] TTS end: resume STT');
        isSpeaking.current = false;
        if (shouldListen.current) {
          clearSilenceTimer();
          if (ttsResumeTimer.current) {
            clearTimeout(ttsResumeTimer.current);
          }
          // small delay so device audio settles
          ttsResumeTimer.current = setTimeout(() => {
            startRecognition();
            ttsResumeTimer.current = null;
          }, 600);
        }
      }
    });

    const subscriber = (evt: any) => {
      if (!evt) return;
      if (evt.type === 'partial') {
        if (evt.text) console.log('[STT] Partial:', evt.text);
        scheduleSilenceTimer();
      } else if (evt.type === 'final') {
        const text = evt.text;

        console.log('[STT] Final event:', text);
        if (!text || !text.trim()) return;
        if (isSpeaking.current) {
          console.log('[STT] Final ignored because TTS speaking');
          return;
        }
        console.log('[STT] TTS start: pausing STT');
        isSpeaking.current = true;
        stopRecognition(false);
        clearSilenceTimer();
        onResult(text);
      } else if (evt.type === 'status') {
        if (evt.text === 'started') {
          setRecognizing(true);
          scheduleSilenceTimer();
        }
        if (evt.text === 'stopped') {
          setRecognizing(false);
          clearSilenceTimer();
        }
      } else if (evt.type === 'error') {
        console.log('[STT] Error event:', evt.extra || evt.text);
        setRecognizing(false);
        clearSilenceTimer();
      }
    };

    sttHookSubscribers.add(subscriber);

    if (sttEmitter && !sttNativeListener) {
      sttNativeListener = sttEmitter.addListener('AzureSTTEvent', (evt: any) => {
        sttHookSubscribers.forEach((cb) => {
          try { cb(evt); } catch (err) { console.log('[STT] subscriber error', err); }
        });
      });
    }

    return () => {
      try { speakUnsub(); } catch { }
      sttHookSubscribers.delete(subscriber);
      if (sttHookSubscribers.size === 0) {
        try { sttNativeListener?.remove(); } catch { }
        sttNativeListener = null;
      }
      if (ttsResumeTimer.current) {
        clearTimeout(ttsResumeTimer.current);
        ttsResumeTimer.current = null;
      }
      stopRecognition();
    };
  }, []);

  return { recognizing, startRecognition, stopRecognition, allowRecognition };
}
