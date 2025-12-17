// src/screens/components/PoseButtonModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../../components/SharedStyles';

interface PoseButtonModalProps {
  visible: boolean;
  onFetchPoses: () => void;
  onFetchTables: () => void;
  onClose: () => void;
  errorMessage?: string;
  inline?: boolean;
}

const Inner = ({ onFetchPoses, onFetchTables, onClose, errorMessage }: Omit<PoseButtonModalProps, 'visible' | 'inline'>) => (
  <View style={[styles.modalSmallBox, styles.poseModalBox]}>
    <Text style={styles.modalTitleProfessional}>Robot Configuration</Text>
    <TouchableOpacity onPress={onFetchPoses} style={styles.submitButtonProfessional}>
      <Text style={styles.buttonTextProfessional}>Set Initial Pose</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onFetchTables} style={styles.submitButtonProfessional}>
      <Text style={styles.buttonTextProfessional}>Set Table</Text>
    </TouchableOpacity>
    {!!errorMessage && (
      <Text style={[styles.errorText, { marginTop: 10, textAlign: 'center' }]}>
        {errorMessage}
      </Text>
    )}
    <TouchableOpacity onPress={onClose} style={{ marginTop: 15, padding: 10 }}>
      <Text style={{ color: '#aaa' }}>Close</Text>
    </TouchableOpacity>
  </View>
);

export default function PoseButtonModal({
  visible,
  onFetchPoses,
  onFetchTables,
  onClose,
  errorMessage,
  inline = false,
}: PoseButtonModalProps) {
  if (inline) {
    if (!visible) return null;
    return (
      <View style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}>
        <Inner onFetchPoses={onFetchPoses} onFetchTables={onFetchTables} onClose={onClose} errorMessage={errorMessage} />
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <Inner onFetchPoses={onFetchPoses} onFetchTables={onFetchTables} onClose={onClose} errorMessage={errorMessage} />
      </View>
    </Modal>
  );
}
