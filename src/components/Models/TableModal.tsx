// src/components/Modals/TableModal.tsx

import React from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { TableModalProps, Table } from '../../types';
import { styles } from '../SharedStyles';

interface TableModalPropsExtended extends TableModalProps {
  inline?: boolean;
}

const TableModal: React.FC<TableModalPropsExtended> = ({ isVisible, onClose, onBack, tables, navigateToTable, tableError, inline = false }) => {
  const handleNavigate = (tableName: string) => {
    navigateToTable(tableName);
  };
  
  const isLandscape = Dimensions.get('window').height < Dimensions.get('window').width;
  const isTablet = Dimensions.get('window').width >= 600;

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
        Select Table
      </Text>

      <ScrollView
        contentContainerStyle={styles.posesScrollContainer}
        style={{ width: '100%', maxHeight: '75%' }}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.posesGridContainer}>
          {tables.map((table) => (
            <Pressable
              key={table.name}
              style={styles.poseGridButton}
              onPress={() => handleNavigate(table.name)}
            >
              <Text style={styles.buttonTextProfessional}>
                {table.description || table.name}
              </Text>
            </Pressable>
          ))}
        </View>
        {tableError && (
          <Text style={[styles.errorText, isTablet && styles.errorTextTablet]}>
            {tableError}
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

export default TableModal;