// src/components/CartDisplay.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
// Using simple text/emoji icons to avoid native icon dependency
import { CartDisplayProps } from '../types';
import { styles } from './SharedStyles'; // Shared styles file

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

const formatItemName = (str: string) => {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const CartDisplay: React.FC<CartDisplayProps> = ({ cart, paymentData, increaseQuantity, decreaseQuantity, onDeleteItem, isTalking, onScanPay, payDisabledReason }) => {
  if (Object.keys(cart).length === 0 || !isTalking) {
    // Show welcome text if cart is empty or robot is not talking
    const isLandscape = Dimensions.get('window').height < Dimensions.get('window').width;
    return (
      <Text
        style={[
          styles.welcomeText,
          isLandscape && styles.welcomeTextLandscape,
          isTablet && styles.welcomeTextTablet,
        ]}
        numberOfLines={3}
      >
        WELCOME TO THE{"\n"}FUTURE OF THE{"\n"}DINING
      </Text>
    );
  }

  const getSubtotal = () => {
    return Object.entries(cart).reduce(
      (total, [_, { price, quantity }]) => total + price * quantity,
      0
    );
  };

  const getTotal = () => {
    const subTotal = getSubtotal();
    const robotCharge = parseFloat(paymentData?.robot_charge?.toString() || '0');
    const gstTotal = parseFloat(paymentData?.gst_total?.toString() || '0');
    return subTotal + robotCharge + gstTotal;
  };

  return (
    <View style={styles.cartWrapper}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartTitle}>
          🛒 Your Cart ({Object.keys(cart).length} items)
        </Text>
      </View>
      <View style={styles.cartContainer}>
        <ScrollView style={[styles.cartScroll, isTablet && styles.cartScrollTablet]}>
          {Object.entries(cart).map(([item, { price, quantity }]) => (
            <View key={item} style={styles.cartItem}>
              <View style={styles.itemDetails}>
                <Text style={[styles.cartItemName, isTablet && styles.cartItemNameTablet]}>{formatItemName(item)}</Text>
                <Text style={[styles.cartItemPrice, isTablet && styles.cartItemPriceTablet]}>₹{price}</Text>
              </View>
              <View style={styles.itemControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => decreaseQuantity(item)}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.quantityText, isTablet && styles.quantityTextTablet]}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => increaseQuantity(item)}
                >
                  <Text style={styles.quantityButtonText}>＋</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => onDeleteItem(item)}
                >
                  <Text style={[styles.quantityButtonText, { color: '#00eaff' }]}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.totalContainer}>
            {/* Subtotal */}
            <Text style={[styles.subTotalText, isTablet && styles.subTotalTextTablet]}>
              Subtotal: ₹{getSubtotal()}
            </Text>

            {/* Robot Charges */}
            <Text style={[styles.chargeText, isTablet && styles.chargeTextTablet]}>
              Robot Charges: ₹{paymentData?.robot_charge || 0}
            </Text>

            {/* GST */}
            <Text style={[styles.chargeText, isTablet && styles.chargeTextTablet]}>
              GST: ₹{paymentData?.gst_total || 0}
            </Text>

            {/* Grand Total */}
            <Text
              style={[
                styles.totalText,
                isTablet && styles.totalTextTablet,
                { fontWeight: 'bold', color: '#00eaff', marginTop: 5 },
              ]}
            >
              Total: ₹{getTotal().toFixed(2)}
            </Text>

            {/* Manual payment button (in addition to auto-payment flow) */}
            <View style={styles.payButtonRow}>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!onScanPay || !!payDisabledReason) && styles.payButtonDisabled,
                ]}
                onPress={onScanPay}
                disabled={!onScanPay || !!payDisabledReason}
              >
                <Text style={styles.payButtonText}>Scan & Pay</Text>
              </TouchableOpacity>
            </View>
            {!!payDisabledReason && (
              <Text style={styles.payHintText}>{payDisabledReason}</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default CartDisplay;