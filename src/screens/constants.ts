// src/screens/constants.ts
import { Dimensions } from 'react-native';

export const FINAL_MENU_URL = 'https://dinein.petpooja.com/qr/c2kj7v4m/D6';
export const PAYMENT_TIMEOUT_MS = 120000; // 2 minutes
export const BILL_DISPLAY_TIMEOUT_MS = 15000; // 15 seconds
export const EMOJI_POPUP_TIMEOUT_MS = 3000; // 3 seconds
export const SILENCE_FALLBACK_LIMIT = 3;
export const SILENCE_THRESHOLD_MS = 6000; // 6 seconds
export const ROBOT_STATUS_POLL_INTERVAL = 3000; // 3 seconds
export const IP_CONNECTION_TIMEOUT = 8000; // 8 seconds

export const { width } = Dimensions.get('window');
export const IS_TABLET = width >= 600;

export const DEFAULT_LANGUAGE = 'hi-IN';
export const SILENCE_FALLBACK_MESSAGE = 'मुझे आपकी आवाज़ नहीं आ रही है, कृपया दुबारा बोलें।';
export const SESSION_END_MESSAGE = 'Session ended. Goodbye!';
export const PAYMENT_TIMEOUT_MESSAGE = 'Payment timeout. Returning to dock.';
export const ORDER_ERROR_MESSAGE = 'Sorry, there was an issue processing the order or payment. Please try again.';
export const PAYMENT_SUCCESS_MESSAGE = 'Payment received. Returning to dock.';
