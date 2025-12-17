// src/components/Modals/PoseModal.tsx

import React from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { PoseModalProps, Pose } from '../../types';
import { styles } from '../SharedStyles';

interface PoseModalPropsExtended extends PoseModalProps {
  inline?: boolean;
}

const PoseModal: React.FC<PoseModalPropsExtended> = ({ isVisible, onClose, onBack, poses, navigateToPose, poseError, inline = false }) => {
  const handleNavigate = (pose: Pose) => {
    navigateToPose(pose);
  };

  const isLandscape = Dimensions.get('window').height < Dimensions.get('window').width;
  const isTablet = Dimensions.get('window').width >= 600;

  const formatPoseName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const Inner = (
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
        style={{ width: '100%'}}
        showsVerticalScrollIndicator={true}
      >
        {poses.length === 0 && !poseError && (
          <Text style={[styles.buttonTextProfessional, { opacity: 0.8, textAlign: 'center', marginTop: 12 }]}>
            No poses found. Please check robot config / API response.
          </Text>
        )}
        <View style={styles.posesGridContainer}>
          {poses.map((p) => (
            <Pressable
              key={p.name}
              style={styles.poseGridButton}
              onPress={() => handleNavigate(p)}
            >
              <Text style={styles.buttonTextProfessional}>
                {p.description || formatPoseName(p.name)}
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
  );

  if (inline) {
    if (!isVisible) return null;
    return (
      <View style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}>
        {Inner}
      </View>
    );
  }

  return <View style={styles.modalContainer}>{Inner}</View>;
};

export default PoseModal;