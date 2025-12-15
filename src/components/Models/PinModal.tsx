// src/components/Modals/PinModal.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, TouchableOpacity, Dimensions } from 'react-native';
import { PinModalProps } from '../../types';
import { styles } from '../SharedStyles';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

const PinModal: React.FC<PinModalProps> = ({ isVisible, onClose, onPinSuccess }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const pinRefs = [React.createRef<TextInput>(), React.createRef<TextInput>(), React.createRef<TextInput>(), React.createRef<TextInput>()];

  const handlePinChange = (val: string, index: number) => {
    const updatedPin = [...pin];
    if (/^\d$/.test(val)) {
      updatedPin[index] = val;
      setPin(updatedPin);
      if (index < pinRefs.length - 1 && pinRefs[index + 1].current) {
        pinRefs[index + 1].current?.focus();
      }
    } else if (val === '') {
      updatedPin[index] = '';
      setPin(updatedPin);
      if (index > 0 && pinRefs[index - 1].current) {
        pinRefs[index - 1].current?.focus();
      }
    }
    setPinError('');
  };

  const handleSubmit = () => {
    const entered = pin.join('');
    if (pin.some((digit) => digit === '')) {
      setPinError('Please enter all 4 digits');
    } else if (entered !== '1234') { // Hardcoded PIN check
      setPinError('Incorrect PIN');
    } else {
      setPinError('');
      setPinSuccess(true);
    }
  };

  const handleContinue = () => {
    onPinSuccess();
    setPinSuccess(false);
    setPin(['', '', '', '']);
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
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            {!pinSuccess ? (
              <>
                <Text style={[styles.modalTitleProfessional, isLandscape && styles.modalTitleProfessionalLandscape, isTablet && styles.modalTitleProfessionalTablet]}>
                  Robot Setup PIN
                </Text>

                <View style={[styles.otpContainer, isLandscape && styles.otpContainerLandscape, isTablet && styles.otpContainerTablet]}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      maxLength={1}
                      keyboardType="number-pad"
                      secureTextEntry
                      style={[styles.otpInput, isLandscape && styles.otpInputLandscape, isTablet && styles.otpInputTablet]}
                      value={digit}
                      onChangeText={(val) => handlePinChange(val, index)}
                    />
                  ))}
                </View>

                {pinError && (<Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>{pinError}</Text>)}

                <Pressable
                  style={[styles.submitButton, isLandscape && styles.submitButtonLandscape, isTablet && styles.submitButtonTablet]}
                  onPress={handleSubmit}
                >
                  <Text style={[styles.buttonText, isLandscape && styles.buttonTextLandscape, isTablet && styles.buttonTextTablet]}>
                    Submit
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconWrapper}>
                  <Text style={styles.successIconText}>✔</Text>
                </View>
                <Text style={styles.successText}>PIN Verified Successfully!</Text>
                <Pressable
                  style={[styles.continueButton, isLandscape && styles.continueButtonLandscape, isTablet && styles.continueButtonTablet]}
                  onPress={handleContinue}
                >
                  <Text style={[styles.continueButtonText, isTablet && styles.continueButtonTextTablet]}>
                    Continue
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PinModal;