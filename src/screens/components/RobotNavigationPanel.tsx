// src/screens/components/RobotNavigationPanel.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { RobotStatus } from '../../types';
import { FEATURE_FLAGS } from '../../config/Config';

interface RobotNavigationPanelProps {
  status: RobotStatus;
}

export default function RobotNavigationPanel({ status }: RobotNavigationPanelProps) {
  if (!FEATURE_FLAGS.SHOW_ROBOT_NAVIGATION) return null;

  return (
    <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
      <Text style={{ color: '#93c5fd', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
        ◆ Navigation
      </Text>
      {status.target_table ? (
        <>
          <Text style={{ color: '#dbeafe', fontSize: 9, marginBottom: 2 }}>
            🎯 Target: <Text style={{ fontWeight: '500' }}>{status.target_table}</Text>
          </Text>
          {status.target_distance !== null && (
            <Text style={{ color: '#dbeafe', fontSize: 9, marginBottom: 3 }}>
              📏 Distance: <Text style={{ fontWeight: '500' }}>{status.target_distance.toFixed(2)}m</Text>
            </Text>
          )}
        </>
      ) : (
        <Text style={{ color: '#93c5fd', fontSize: 9 }}>
          ⊘ No active navigation
        </Text>
      )}
      <Text style={{ 
        color: status.navigation_status === 'failed' ? '#fca5a5' : 
               status.navigation_status === 'success' ? '#86efac' : '#fbbf24',
        fontSize: 8.5, 
        marginTop: 3,
        fontStyle: 'italic'
      }}>
        {status.goal_status_text}
      </Text>
    </View>
  );
}
