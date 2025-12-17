// src/screens/hooks/usePayment.ts
import { useState, useRef } from 'react';
import { PaymentData } from '../../types';
import { PAYMENT_TIMEOUT_MS } from '../constants';

export const usePayment = () => {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [billSummary, setBillSummary] = useState<string | null>(null);
  const [qrHtml, setQrHtml] = useState<string | null>(null);
  const [isBillVisible, setIsBillVisible] = useState(false);
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearPaymentTimeout = () => {
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
  };

  const setPaymentTimeout = (callback: () => void) => {
    clearPaymentTimeout();
    paymentTimeoutRef.current = setTimeout(callback, PAYMENT_TIMEOUT_MS);
  };

  const closePayment = () => {
    clearPaymentTimeout();
    setShowPayment(false);
    setBillSummary(null);
    setIsBillVisible(false);
    setPaymentData(null);
    setQrHtml(null);
  };

  return {
    showPayment,
    setShowPayment,
    paymentData,
    setPaymentData,
    billSummary,
    setBillSummary,
    qrHtml,
    setQrHtml,
    isBillVisible,
    setIsBillVisible,
    paymentTimeoutRef,
    clearPaymentTimeout,
    setPaymentTimeout,
    closePayment,
  };
};
