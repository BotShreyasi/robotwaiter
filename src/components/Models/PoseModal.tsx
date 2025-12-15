// src/components/Modals/PoseModal.tsx

import React from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { PoseModalProps, Pose } from '../../types';
import { styles } from '../SharedStyles';

const PoseModal: React.FC<PoseModalProps> = ({ isVisible, onClose, onBack, poses, navigateToPose, poseError }) => {
  const handleNavigate = (pose: Pose) => {
    navigateToPose(pose);
  };

  const isLandscape = Dimensions.get('window').height < Dimensions.get('window').width;
  const isTablet = Dimensions.get('window').width >= 600;

  return (
    <View style={styles.modalContainer}>
      <View
        style={[
          styles.modalSmallBox,
          isLandscape && styles.modalSmallBoxLandscape,
          isTablet && styles.modalSmallBoxTablet,
          styles.poseModalBox,
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.modalTitleProfessional,
            isLandscape && styles.modalTitleProfessionalLandscape,
            isTablet && styles.modalTitleProfessionalTablet,
          ]}
        >
          Select Initial Pose
        </Text>

        <ScrollView
          contentContainerStyle={styles.posesScrollContainer}
          style={{ width: '100%', maxHeight: '75%' }}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.posesGridContainer}>
            {poses.map((p) => (
              <Pressable
                key={p.name}
                style={styles.poseGridButton}
                onPress={() => handleNavigate(p)}
              >
                <Text style={styles.buttonTextProfessional}>
                  {p.description || p.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {poseError && (
            <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
              {poseError}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default PoseModal;