// src/screens/components/RobotPosePanel.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { RobotStatus } from '../../types';
import { FEATURE_FLAGS } from '../../config/Config';

interface RobotPosePanelProps {
  status: RobotStatus;
}

export default function RobotPosePanel({ status }: RobotPosePanelProps) {
  if (!FEATURE_FLAGS.SHOW_ROBOT_POSE || !status.current_pose) return null;

  return (
    <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#a855f7' }}>
      <Text style={{ color: '#d8b4fe', fontSize: 11, marginBottom: 5, fontWeight: '600' }}>
        ◆ Position
      </Text>
      <Text style={{ color: '#ede9fe', fontSize: 8.5, marginBottom: 1.5 }}>
        X: {status.current_pose.position.x.toFixed(2)} | Y: {status.current_pose.position.y.toFixed(2)}
      </Text>
      <Text style={{ color: '#ede9fe', fontSize: 8.5 }}>
        Yaw: {status.current_pose.yaw.toFixed(2)} rad
      </Text>
    </View>
  );
}
