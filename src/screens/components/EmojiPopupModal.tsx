// src/screens/components/EmojiPopupModal.tsx
import React from 'react';
import { Modal, View, Text } from 'react-native';

interface EmojiPopupModalProps {
  visible: boolean;
  emojis: string;
  inline?: boolean; // when true render without Modal so it can be placed inside main panel
}

const Inner = ({ emojis }: { emojis: string }) => (
  <View style={{
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  }}>
    <Text style={{
      fontSize: 80,
      marginBottom: 15,
      textAlign: 'center',
      lineHeight: 90,
    }}>
      {emojis}
    </Text>
    <Text style={{
      color: '#fbbf24',
      fontSize: 12,
      fontStyle: 'italic',
      opacity: 0.8
    }}>
        .....
      {/* Bot's response */}
    </Text>
  </View>
);

export default function EmojiPopupModal({ visible, emojis, inline = false }: EmojiPopupModalProps) {
  if (inline) {
    if (!visible) return null;
    return (
      <View style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}>
        <Inner emojis={emojis} />
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.5)' 
      }}>
        <Inner emojis={emojis} />
      </View>
    </Modal>
  );
}
