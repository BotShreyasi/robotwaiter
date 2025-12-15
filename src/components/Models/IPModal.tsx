// src/components/Modals/IPModal.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, StyleSheet, Dimensions } from 'react-native';
import { IPModalProps } from '../../types';
import { styles } from '../SharedStyles'; // Shared styles file

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

const IPModal: React.FC<IPModalProps> = ({ isVisible, onIpSubmit, ipError, setIpError }) => {
  const [ipParts, setIpParts] = useState(['', '', '', '']);
  const ipRefs = [React.createRef<TextInput>(), React.createRef<TextInput>(), React.createRef<TextInput>(), React.createRef<TextInput>()];

  const handleIpChange = (val: string, index: number) => {
    const newVal = val.replace(/[^0-9]/g, '');
    if (newVal.length > 3) return;
    const updated = [...ipParts];
    updated[index] = newVal;
    setIpParts(updated);

    if (newVal.length === 3 && index < 3 && ipRefs[index + 1].current) {
      ipRefs[index + 1].current?.focus();
    }
    if (newVal.length === 0 && index > 0 && ipRefs[index - 1].current) {
      ipRefs[index - 1].current?.focus();
    }
    setIpError('');
  };

  const handleSubmit = () => {
    if (ipParts.some((part) => part === '')) {
      
      setIpError('All parts of the IP are required');
      return;
    }
    const valid = ipParts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    if (!valid) {
      setIpError('Each part must be between 0 and 255');
      return;
    }
    const ipStr = ipParts.join('.');
    onIpSubmit(ipStr);
  };

  const isLandscape = Dimensions.get('window').height < Dimensions.get('window').width;

  return (
    <View style={styles.modalContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modalSmallBox, isLandscape && styles.modalSmallBoxLandscape, isTablet && styles.modalSmallBoxTablet]}>
            <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
              <Text style={[styles.modalTitle, isLandscape && styles.modalTitleLandscape, isTablet && styles.modalTitleTablet]}>
                Enter Backend IP Address
              </Text>
              <View style={[styles.otpContainer, isLandscape && styles.otpContainerLandscape, isTablet && styles.otpContainerTablet]}>
                {ipParts.map((part, index) => (
                  <TextInput
                    key={index}
                    ref={ipRefs[index]}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[styles.otpInput, isLandscape && styles.otpInputLandscape, isTablet && styles.otpInputTablet]}
                    value={part}
                    onChangeText={(val) => handleIpChange(val, index)}
                  />
                ))}
              </View>
              {ipError ? <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>{ipError}</Text> : null}
              <Pressable
                style={[styles.submitButton, isLandscape && styles.submitButtonLandscape, isTablet && styles.submitButtonTablet]}
                onPress={handleSubmit}
              >
                <Text style={[styles.buttonText, isLandscape && styles.buttonTextLandscape, isTablet && styles.buttonTextTablet]}>
                  Submit
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default IPModal;