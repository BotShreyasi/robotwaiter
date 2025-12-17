// src/screens/hooks/useEmojiPopup.ts
import { useState, useRef } from 'react';
import { EMOJI_POPUP_TIMEOUT_MS } from '../constants';

export const useEmojiPopup = () => {
  const [showEmojiPopup, setShowEmojiPopup] = useState(false);
  const [displayEmojis, setDisplayEmojis] = useState<string>('');
  const emojiPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showEmoji = (emojis: string) => {
    setDisplayEmojis(emojis);
    setShowEmojiPopup(true);
    if (emojiPopupTimeoutRef.current) {
      clearTimeout(emojiPopupTimeoutRef.current);
    }
    emojiPopupTimeoutRef.current = setTimeout(() => {
      setShowEmojiPopup(false);
    }, EMOJI_POPUP_TIMEOUT_MS);
  };

  const clearEmojiPopup = () => {
    if (emojiPopupTimeoutRef.current) {
      clearTimeout(emojiPopupTimeoutRef.current);
      emojiPopupTimeoutRef.current = null;
    }
    setShowEmojiPopup(false);
    setDisplayEmojis('');
  };

  return {
    showEmojiPopup,
    displayEmojis,
    emojiPopupTimeoutRef,
    showEmoji,
    clearEmojiPopup,
  };
};
