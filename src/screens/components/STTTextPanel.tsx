// src/screens/components/STTTextPanel.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { FEATURE_FLAGS } from '../../config/Config';

interface STTTextPanelProps {
  isTalking: boolean;
  partialText: string;
  fullText: string;
}

export default function STTTextPanel({ isTalking, partialText, fullText }: STTTextPanelProps) {
  if (!isTalking || (!FEATURE_FLAGS.SHOW_STT_FULL_TEXT && !FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT)) {
    return null;
  }

  return (
    <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(100,150,200,0.15)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#60a5fa' }}>
      <Text style={{ color: '#60a5fa', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
        🎤 Your Voice
      </Text>
      {FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT && partialText && (
        <Text style={{ color: '#93c5fd', fontSize: 9, marginBottom: 4, fontStyle: 'italic', lineHeight: 14 }}>
          ✎ (typing...) {partialText}
        </Text>
      )}
      {FEATURE_FLAGS.SHOW_STT_FULL_TEXT && fullText && (
        <Text style={{ color: '#dbeafe', fontSize: 9, fontWeight: '500', lineHeight: 14 }}>
          ✓ {fullText}
        </Text>
      )}
    </View>
  );
}
