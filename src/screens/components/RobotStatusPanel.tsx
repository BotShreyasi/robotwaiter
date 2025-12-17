// src/screens/components/RobotStatusPanel.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { RobotStatus } from '../../types';
import { FEATURE_FLAGS } from '../../config/Config';

interface RobotStatusPanelProps {
  status: RobotStatus;
}

export default function RobotStatusPanel({ status }: RobotStatusPanelProps) {
  if (!FEATURE_FLAGS.SHOW_ROBOT_STATUS) return null;

  return (
    <View style={{ marginTop: 16, padding: 11, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#22c55e' }}>
      <Text style={{ color: '#86efac', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
        ● Robot Status
      </Text>
      <Text style={{ color: '#d1fae5', fontSize: 9, marginBottom: 3 }}>
        📍 Table: <Text style={{ fontWeight: '500' }}>{status.current_table}</Text>
      </Text>
      <Text style={{ 
        color: status.movement_status === 'stopped' ? '#86efac' : '#fbbf24', 
        fontSize: 9, 
        marginBottom: 3 
      }}>
        🚀 Movement: <Text style={{ fontWeight: '500' }}>{status.movement_status}</Text>
      </Text>
      <Text style={{ 
        color: status.waiting_at_table ? '#86efac' : '#fca5a5', 
        fontSize: 9, 
        marginBottom: 3 
      }}>
        ⏳ Waiting: <Text style={{ fontWeight: '500' }}>{status.waiting_at_table ? 'Yes ✓' : 'No'}</Text>
      </Text>
      <Text style={{ 
        color: status.navigation_status === 'success' ? '#86efac' : '#fca5a5', 
        fontSize: 9, 
        marginBottom: 3 
      }}>
        🗺️ Nav: <Text style={{ fontWeight: '500' }}>{status.navigation_status}</Text>
      </Text>
      <Text style={{ 
        color: status.is_stt_active ? '#fbbf24' : '#9ca3af', 
        fontSize: 9 
      }}>
        🎤 STT: <Text style={{ fontWeight: '500' }}>{status.is_stt_active ? 'Active' : 'Inactive'}</Text>
      </Text>
    </View>
  );
}
