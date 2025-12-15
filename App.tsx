import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import RobotControlScreen from './src/screens/RobotControlScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <RobotControlScreen />
    </SafeAreaView>
  );
}
