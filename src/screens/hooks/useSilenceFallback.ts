// src/screens/hooks/useSilenceFallback.ts
import { useRef } from 'react';
import { speak } from '../../azure/TTSService';
import { SILENCE_FALLBACK_LIMIT, SILENCE_FALLBACK_MESSAGE, DEFAULT_LANGUAGE } from '../constants';

export const useSilenceFallback = () => {
  const silenceFallbackCount = useRef(0);
  const isSilenceHandling = useRef(false);

  const resetSilenceFallbacks = () => {
    silenceFallbackCount.current = 0;
    isSilenceHandling.current = false;
  };

  const handleSilence = async (
    onHandleSilenceComplete: (shouldContinue: boolean) => void,
    startRecognition: () => void,
    allowRecognition: () => void,
    handleEndTalking: () => Promise<void>
  ) => {
    if (isSilenceHandling.current) return;
    isSilenceHandling.current = true;
    const nextCount = silenceFallbackCount.current + 1;
    silenceFallbackCount.current = nextCount;

    try {
      await speak(SILENCE_FALLBACK_MESSAGE, DEFAULT_LANGUAGE);
      if (nextCount >= SILENCE_FALLBACK_LIMIT) {
        await handleEndTalking();
        resetSilenceFallbacks();
        onHandleSilenceComplete(false);
      } else {
        allowRecognition();
        startRecognition();
        onHandleSilenceComplete(true);
      }
    } catch (err: any) {
      console.error('[STT] Silence fallback error:', err.message);
      onHandleSilenceComplete(false);
    } finally {
      if (nextCount < SILENCE_FALLBACK_LIMIT) {
        isSilenceHandling.current = false;
      }
    }
  };

  return {
    silenceFallbackCount,
    isSilenceHandling,
    resetSilenceFallbacks,
    handleSilence,
  };
};
