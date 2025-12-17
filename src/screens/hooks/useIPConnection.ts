// src/screens/hooks/useIPConnection.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkRobotStatus } from '../../api/RobotApi';

export const useIPConnection = () => {
  const [enteredIp, setEnteredIp] = useState<string | null>(null);
  const [isIpModalVisible, setIpModalVisible] = useState(false);
  const [ipError, setIpError] = useState('');

  const handleIpSubmit = async (ipStr: string) => {
    try {
      setIpError('');
      console.log('[IP] Testing connection to:', ipStr);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`http://${ipStr}:8081/api/robot/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      console.log('[IP] Connected successfully to robot at', ipStr);
      await AsyncStorage.setItem('robot_ip', ipStr);
      setEnteredIp(ipStr);
      setIpModalVisible(false);
    } catch (err: any) {
      console.error('[IP] Connection test error:', err.message);

      if (err.name === 'AbortError') {
        setIpError(`Connection timeout. Please verify:\n\n1. IP address is correct\n2. Robot server is running on port 8080\n3. Device is connected to same network\n4. No firewall blocking the connection`);
      } else if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
        setIpError(`Network connection failed. Check:\n\n1. IP format is valid (e.g., 192.168.1.100)\n2. Robot is powered on and connected\n3. API server is running at port 8080\n4. Network is reachable`);
      } else if (err.message.includes('404') || err.message.includes('500')) {
        setIpError('Server error at port 8080. Ensure robot API is running correctly.');
      } else {
        setIpError(`Connection failed: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Load stored IP on mount
  useEffect(() => {
    const loadStoredIp = async () => {
      try {
        const savedIp = await AsyncStorage.getItem('robot_ip');
        if (savedIp) {
          console.log('[Init] Testing stored IP:', savedIp);
          try {
            const testRes = await checkRobotStatus(savedIp);
            if (testRes) {
              console.log('[Init] Stored IP is valid, connecting...');
              setEnteredIp(savedIp);
              setIpModalVisible(false);
              return;
            }
          } catch (error: any) {
            console.error('[Init] Stored IP test failed:', error.message);
            await AsyncStorage.removeItem('robot_ip');
          }
        } else {
          console.log('[Init] No stored IP found');
        }
      } catch (err: any) {
        console.error('[Init] Error loading stored IP:', err.message);
      }
      console.log('[Init] Showing IP modal for user input');
      setIpModalVisible(true);
    };

    loadStoredIp();
  }, []);

  return {
    enteredIp,
    setEnteredIp,
    isIpModalVisible,
    setIpModalVisible,
    ipError,
    setIpError,
    handleIpSubmit,
  };
};
