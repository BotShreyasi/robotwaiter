// src/components/Modals/ConfirmModal.tsx

import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { styles } from '../SharedStyles';

interface ConfirmModalProps {
  isVisible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isVisible, message, onConfirm, onCancel }) => {
  const isTablet = Dimensions.get('window').width >= 600;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalBox, isTablet && styles.modalBoxTablet]}>
          <Text style={[styles.modalMessage, isTablet && styles.modalMessageTablet]}>{message}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.confirmButton, isTablet && styles.confirmButtonTablet]} onPress={onConfirm}>
              <Text style={[styles.confirmText, isTablet && styles.confirmTextTablet]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelModalButton, isTablet && styles.cancelModalButtonTablet]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, isTablet && styles.cancelTextTablet]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmModal;