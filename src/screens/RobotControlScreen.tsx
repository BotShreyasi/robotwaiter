// src/screens/RobotControlScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Dimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Orientation, {
  LANDSCAPE_LEFT,
  LANDSCAPE_RIGHT,
} from 'react-native-orientation-locker';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';

// Custom Components & Hooks
import { useSTT } from '../azure/STTService'; // assuming this is a custom hook
import { speak } from '../azure/TTSService'; // assuming this is a custom function
import { startSession, sendUserText } from '../services/api'; // assuming this is for chatbot session
import { styles } from '../components/SharedStyles'; // Import shared styles
import IPModal from '../components/Models/IPModal';
import PinModal from '../components/Models/PinModal';
import PoseModal from '../components/Models/PoseModal';
import TableModal from '../components/Models/TableModal';
import ConfirmModal from '../components/Models/ConfirmModal';
import CartDisplay from '../components/CartDisplay';

// API Imports
import {
  startSpeakingApi, stopSpeakingApi, checkRobotStatus,
  fetchPosesApi, navigateToPoseApi, fetchTablesApi,
  navigateToTableApi
} from '../api/RobotApi';
import { saveOrderApi, startPaymentApi, paymentSuccessApi, generateQRHtml, matchMenuApi } from '../api/OrderApi';

// Config Imports
import { FEATURE_FLAGS } from '../config/Config';

// Types Import
import { CartItem, PaymentData, RobotStatus, Pose, Table, OrderMap } from '../types';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

// The final menu URL (can be externalized to a config file)
const FINAL_MENU_URL = 'https://dinein.petpooja.com/qr/c2kj7v4m/D6';

// Utility function to extract emojis from text
const extractEmojis = (text: string): string => {
  const emojiRegex = /(\u00d83c\u00de00-\u00d83c\u00de9f)|(\u00d83d\u00de00-\u00d83d\u00deff)|(\u00d83e\u00de00-\u00d83e\u00deff)|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2000-\u206F]|[\u2700-\u27BF]|[\u{1F000}-\u{1F9FF}]/gu;
  const emojis = text.match(emojiRegex);
  return emojis ? emojis.join(' ') : '';
};

type OrientationString =
  | 'PORTRAIT'
  | 'LANDSCAPE-LEFT'
  | 'LANDSCAPE-RIGHT'
  | 'PORTRAIT-UPSIDEDOWN'
  | 'UNKNOWN'
  | 'FACE-UP'
  | 'FACE-DOWN';

export default function RobotControlScreen() {
  // --- IP/Auth State ---
  const [enteredIp, setEnteredIp] = useState<string | null>(null);
  const [isIpModalVisible, setIpModalVisible] = useState(false);
  const [ipError, setIpError] = useState('');
  const [isPinModalVisible, setPinModalVisible] = useState(false);

  // --- Robot Control State ---
  const [isTalking, setIsTalking] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const [prevData, setPrevData] = useState<RobotStatus | null>(null);
  const [currentStatus, setCurrentStatus] = useState<RobotStatus | null>(null);
  const [sttFullText, setSttFullText] = useState<string>('');
  const [sttPartialText, setSttPartialText] = useState<string>('');
  const [showEmojiPopup, setShowEmojiPopup] = useState(false);
  const [displayEmojis, setDisplayEmojis] = useState<string>('');
  const emojiPopupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const silenceFallbackCount = React.useRef(0);
  const isSilenceHandling = React.useRef(false);

  // --- Navigation/Pose State ---
  const [isPoseButtonModalVisible, setPoseButtonModalVisible] = useState(false);
  const [isPoseModalVisible, setIsPoseModalVisible] = useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [poseError, setPoseError] = useState('');
  const [tableError, setTableError] = useState('');

  // --- Order/Payment State ---
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [showMenu, setShowMenu] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [billSummary, setBillSummary] = useState<string | null>(null);
  const [qrHtml, setQrHtml] = useState<string | null>(null);
  const [isBillVisible, setIsBillVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const paymentTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastControlRef = React.useRef<any>(null);
  const lastDishMappingRef = React.useRef<any>(null);
  const lastOrderMapRef = React.useRef<OrderMap | null>(null);

  const clearPaymentTimeout = () => {
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
  };

  const goToDock = async () => {
    try {
      await navigateToTableApi('initial_pose');
    } catch (err: any) {
      console.error('[Dock] navigation error:', err.message);
    }
  };

  // --- STT Hook ---
  const resetSilenceFallbacks = () => {
    silenceFallbackCount.current = 0;
    isSilenceHandling.current = false;
  };

  const handleSilence = async () => {
    if (isSilenceHandling.current) return;
    isSilenceHandling.current = true;
    const nextCount = silenceFallbackCount.current + 1;
    silenceFallbackCount.current = nextCount;

    try {
      await speak('मुझे आपकी आवाज़ नहीं आ रही है, कृपया दुबारा बोलें।', 'hi-IN');
      if (nextCount >= 3) {
        await handleEndTalking();
        resetSilenceFallbacks();
      } else {
        allowRecognition();
        startRecognition();
      }
    } catch (err: any) {
      console.error('[STT] Silence fallback error:', err.message);
    } finally {
      if (nextCount < 3) {
        isSilenceHandling.current = false;
      }
    }
  };

  const { recognizing, startRecognition, stopRecognition, allowRecognition } = useSTT(
    // The complex STT-to-Chatbot-to-Order-Processing logic
    async (userText) => {
      resetSilenceFallbacks();
      const activeSession = sessionIdRef.current;
      if (!activeSession) {
        console.error('[STT] Session ID missing.');
        stopRecognition();
        return;
      }
      try {
        console.log('[STT] Text:', userText);
        if (FEATURE_FLAGS.SHOW_STT_FULL_TEXT) {
          setSttFullText(userText);
        }
        const botData = await sendUserText(activeSession, userText);
        const { response, control = {}, dish_mapping } = botData as any;
        lastControlRef.current = control;
        lastDishMappingRef.current = dish_mapping;

        // Extract and show emojis from bot response
        if (FEATURE_FLAGS.SHOW_EMOJI_POPUP) {
          const emojis = extractEmojis(response);
          if (emojis) {
            setDisplayEmojis(emojis);
            setShowEmojiPopup(true);
            if (emojiPopupTimeoutRef.current) {
              clearTimeout(emojiPopupTimeoutRef.current);
            }
            emojiPopupTimeoutRef.current = setTimeout(() => {
              setShowEmojiPopup(false);
            }, 3000); // Show for 3 seconds
          }
        }

        await speak(response, (control as any).language || 'hi-IN');

        // 1. Order Confirmation and Payment Flow
        const orderMap: OrderMap = (control as any).order || {};
        if ((control as any).is_order === 1 && Object.keys(orderMap).length > 0) {
          try {
            lastOrderMapRef.current = orderMap;

            // Match menu to normalize items and update cart
            try {
              const matchRes = await matchMenuApi(orderMap);
              const matchedItems = matchRes?.matched_items || [];
              const dishMapping = matchRes?.dish_mapping || dish_mapping || {};
              const variationMapping = matchRes?.variation_mapping || {};
              lastDishMappingRef.current = dishMapping;

              const getQty = (itemName: string) => {
                let qty = 1;
                Object.entries(orderMap).forEach(([key]) => {
                  const m = key.match(/^(.*?)\((\d+)\)$/);
                  if (m) {
                    const name = m[1];
                    const q = parseInt(m[2], 10);
                    if (name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
                      qty = q;
                    }
                  }
                });
                return qty;
              };

              if (Array.isArray(matchedItems) && matchedItems.length > 0) {
                const matchedCart: { [key: string]: CartItem } = {};
                matchedItems.forEach((item: any) => {
                  if (!item?.itemname) return;
                  let displayName = item.itemname;
                  let price = Number(item.price) || 0;
                  if (item.has_variation && Array.isArray(item.variations) && item.variations.length > 0) {
                    const v = item.variations[0];
                    const vName = v?.variation_name || variationMapping?.[v?.variationid] || '';
                    if (vName) displayName = `${displayName} - ${vName}`;
                    price = Number(v?.price) || price;
                  }
                  const quantity = getQty(item.itemname);
                  matchedCart[displayName] = {
                    price: price,
                    quantity: quantity,
                  };
                });
                setCart(matchedCart);
              } else {
                // fallback to raw order map
                const newCart: { [key: string]: CartItem } = {};
                Object.entries(orderMap).forEach(([key, totalPrice]) => {
                  const match = key.match(/^(.*?)\((\d+)\)$/);
                  if (match) {
                    const itemName = match[1];
                    const quantity = parseInt(match[2], 10);
                    const unitPrice = totalPrice / quantity;
                    newCart[itemName] = { price: unitPrice, quantity };
                  }
                });
                setCart(newCart);
              }
            } catch (e: any) {
              console.error('[MatchMenu] error:', e.message);
              // fallback to raw order map
              const newCart: { [key: string]: CartItem } = {};
              Object.entries(orderMap).forEach(([key, totalPrice]) => {
                const match = key.match(/^(.*?)\((\d+)\)$/);
                if (match) {
                  const itemName = match[1];
                  const quantity = parseInt(match[2], 10);
                  const unitPrice = totalPrice / quantity;
                  newCart[itemName] = { price: unitPrice, quantity };
                }
              });
              setCart(newCart);
            }

            // Start Payment
            const { paymentData: newPaymentData, html: qrHtmlRes, billHtml } = await startPaymentApi(control, orderMap);

            setPaymentData(newPaymentData);
            // Use every fallback we have so the bill/QR never renders blank
            const safeBillHtml = billHtml || newPaymentData?.bill_html || '<html><body style="background:#000;color:#fff;"><h2>Bill data unavailable</h2></body></html>';
            const safeQrHtml = qrHtmlRes || safeBillHtml;
            setBillSummary(safeBillHtml);
            setQrHtml(safeQrHtml);
            setIsBillVisible(true);
            setShowPayment(true);
            clearPaymentTimeout();
            paymentTimeoutRef.current = setTimeout(async () => {
              try {
                await speak('Payment timeout. Returning to dock.', (control as any).language || 'hi-IN');
              } catch (e) { }
              setShowPayment(false);
              setBillSummary(null);
              setIsBillVisible(false);
              setPaymentData(null);
              await stopSpeakingApi();
              await goToDock();
              setIsTalking(false);
              stopRecognition();
            }, 120000); // 2 minutes
            stopRecognition(); // Stop STT for payment screen
            return;
          } catch (e: any) {
            console.error('[ERROR] Order/Payment Flow:', e.message);
            await speak('Sorry, there was an issue processing the order or payment. Please try again.');
            // Continue recognition if failed
          }
        }

        // 2. Session Disconnect/End
        if ((control as any).disconnect === '1') {
          await handleEndTalking();
          await speak('Session ended. Goodbye!', (control as any).language || 'hi-IN-KavyaNeural');
          return;
        }

        // 3. Update Cart (non-order context)
        if (Object.keys(orderMap).length > 0) {
          const newCart: { [key: string]: CartItem } = {};
          Object.entries(orderMap).forEach(([key, totalPrice]) => {
            const match = key.match(/^(.*?)\((\d+)\)$/);
            if (match) {
              const itemName = match[1];
              const quantity = parseInt(match[2], 10);
              const unitPrice = totalPrice / quantity;
              newCart[itemName] = { price: unitPrice, quantity };
            }
          });
          setCart(newCart);
        }

        // 4. Show Menu
        if ((control as any).show_menu === 1) {
          setShowMenu(true);
        }

        // 5. Restart STT
        startRecognition();
      } catch (err: any) {
        console.error('[STT] Error in STT cycle:', err.message);
        setIsTalking(false);
        stopRecognition();
        await stopSpeakingApi();
        // Network errors handled here:
        if (err.message.includes('network') || err.message.includes('timeout')) {
          setIpModalVisible(true);
          AsyncStorage.removeItem('robot_ip');
        }
      }
    }
    , { 
      onSilence: handleSilence, 
      silenceMs: 6000,
      onPartial: (partialText: string) => {
        if (FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT) {
          setSttPartialText(partialText);
        }
      }
    });

  // Clear STT texts when talking ends
  useEffect(() => {
    if (!isTalking) {
      setSttFullText('');
      setSttPartialText('');
    }
  }, [isTalking]);

  // --- Utility Handlers ---
  const handleIpSubmit = async (ipStr: string) => {
    try {
      setIpError(''); // Clear previous errors
      console.log('[IP] Testing connection to:', ipStr);
      
      // Test the connection with a longer timeout for initial connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for initial test
      
      const response = await fetch(`http://${ipStr}:8081/api/robot/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      
      // Connection successful
      const data = await response.json();
      console.log('[IP] Connected successfully to robot at', ipStr);
      await AsyncStorage.setItem('robot_ip', ipStr);
      setEnteredIp(ipStr);
      setIpModalVisible(false);
    } catch (err: any) {
      console.error('[IP] Connection test error:', err.message);
      
      // Provide specific error messages based on error type
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

  const handleStartTalking = async () => {
    try {
      resetSilenceFallbacks();
      setCart({});
      const session = await startSession();
      setSessionId(session.session_id);
      sessionIdRef.current = session.session_id;
      console.log('[Session] Started with ID:', session.session_id);

      setIsTalking(true);
      await startSpeakingApi();

      allowRecognition();
      await speak(session.response, session.control.language || 'hi-IN');
      startRecognition();
    } catch (err: any) {
      console.error('[ERROR] Start talking error:', err.message);
      // ... error handling
    }
  };

  const handleEndTalking = async () => {
    try {
      setIsTalking(false);
      clearPaymentTimeout();
      setSessionId(null);
      sessionIdRef.current = null;
      resetSilenceFallbacks();
      stopRecognition();
      await stopSpeakingApi();
      await speak('Session ended. Goodbye!', 'hi-IN-KavyaNeural');
    } catch (err: any) {
      console.error('[ERROR] End talking error:', err.message);
    }
  };

  const handlePaymentSuccess = async (payment_response: any) => {
    if (!paymentData) return;
    clearPaymentTimeout();
    try {
      await paymentSuccessApi(payment_response, paymentData);
      if (lastControlRef.current && lastDishMappingRef.current && lastOrderMapRef.current) {
        await saveOrderApi(lastControlRef.current, lastDishMappingRef.current, lastOrderMapRef.current);
      }
      setIsTalking(false);
      setIsBillVisible(true);
      stopRecognition();
      setTimeout(() => {
        setShowPayment(false);
        setBillSummary(null);
        setIsBillVisible(false);
      }, 15000); // Show bill for 15 seconds
      try {
        await speak('Payment received. Returning to dock.', 'hi-IN');
      } catch (e) { }
      await stopSpeakingApi();
      await goToDock();
    } catch (e: any) {
      console.error('[ERROR] Payment success API error:', e.message);
    } finally {
      setShowPayment(false);
    }
  };

  // --- Robot Navigation Handlers ---
  const handleFetchPoses = async () => {
    try {
      const fetchedPoses = await fetchPosesApi();
      setPoses(fetchedPoses);
      setPoseError('');
      setPoseButtonModalVisible(false); // Close configuration modal before opening pose modal
      setIsPoseModalVisible(true);
    } catch (e: any) {
      setPoseError(e.message);
    }
  };

  const handleNavigateToPose = async (pose: Pose) => {
    try {
      const payload = {
        x: parseFloat(pose.x),
        y: parseFloat(pose.y),
        yaw: parseFloat(pose.yaw),
      };
      await navigateToPoseApi(payload);
      setPoseError('');
      setIsPoseModalVisible(false);
    } catch (e: any) {
      setPoseError(e.message);
    }
  };

  const handleFetchTables = async () => {
    try {
      const fetchedTables = await fetchTablesApi();
      setTables(fetchedTables);
      setTableError('');
      setPoseButtonModalVisible(false); // Close configuration modal before opening table modal
      setIsTableModalVisible(true);
    } catch (e: any) {
      setTableError(e.message);
    }
  };

  const handleNavigateToTable = async (tableName: string) => {
    try {
      await navigateToTableApi(tableName);
      setTableError('');
      setIsTableModalVisible(false);
    } catch (e: any) {
      setTableError(e.message);
    }
  };


  // --- Cart Handlers ---
  const increaseQuantity = (item: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [item]: { ...prevCart[item], quantity: prevCart[item].quantity + 1 },
    }));
  };

  const decreaseQuantity = (item: string) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      if (newCart[item].quantity > 1) {
        newCart[item].quantity -= 1;
      } else {
        delete newCart[item];
      }
      return newCart;
    });
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      setCart((prevCart) => {
        const newCart = { ...prevCart };
        delete newCart[itemToDelete];
        return newCart;
      });
      setItemToDelete(null);
    }
    setShowConfirmDelete(false);
  };


  // --- useEffects ---

  // 1. Initial Load and Orientation Lock
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

    const lockOrientation = () => {
      try {
        // Landscape lock
        Orientation.lockToLandscape();

        // Current orientation leke isLandscape set karo
        Orientation.getDeviceOrientation((orientation: OrientationString) => {
          const landscape =
            orientation === 'LANDSCAPE-LEFT' || orientation === 'LANDSCAPE-RIGHT';
          setIsLandscape(landscape);
        });
      } catch (error) {
        console.error('[Orientation] Error:', error);
      }
    };

    const handleOrientationChange = (orientation: OrientationString) => {
      const landscape =
        orientation === 'LANDSCAPE-LEFT' || orientation === 'LANDSCAPE-RIGHT';
      setIsLandscape(landscape);
    };

    lockOrientation();
    loadStoredIp();

    // listener add
    Orientation.addOrientationListener(handleOrientationChange);

    // cleanup
    return () => {
      Orientation.removeOrientationListener(handleOrientationChange);
    };
  }, []);

  // 2. Robot Status Polling
  useEffect(() => {
    const pollRobotStatus = async () => {
      if (!enteredIp) return;
      try {
        const data: RobotStatus = await checkRobotStatus(enteredIp);
        setCurrentStatus(data);
        
        const isSameAsPrevious = JSON.stringify(data) === JSON.stringify(prevData);

        // Robot has reached table and is ready for STT
        const conditionsMet =
          data.movement_status !== 'moving' &&
          data.navigation_status === 'success' &&
          data.current_table !== 'initial_pose' &&
          (data.target_distance === null || data.target_distance < 0.2) &&
          data.waiting_at_table === true;

        console.log('[Status Poll] Movement:', data.movement_status, 'Nav:', data.navigation_status, 'Table:', data.current_table, 'Waiting:', data.waiting_at_table, 'STT Active:', data.is_stt_active);
        console.log('[Status Poll] Conditions met:', conditionsMet, 'Same as previous:', isSameAsPrevious, 'IsTalking:', isTalking);

        if (!isSameAsPrevious && conditionsMet && !isTalking && !showPayment) {
          console.log('[Status Poll] Starting talking...');
          await handleStartTalking();
        }
        setPrevData(data);
      } catch (err: any) {
        console.error('[Status Poll] Error fetching real-time status:', err.message);
      }
    };

    const intervalId = setInterval(pollRobotStatus, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enteredIp, isTalking, prevData, showPayment]); // Dependencies for polling

  // --- Rendered UI ---
  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape, isTablet && styles.containerTablet]}>

      {/* --- Models --- */}
      <Modal visible={showPayment && paymentData !== null} animationType="slide">
        {paymentData && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <WebView
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              source={{ html: generateQRHtml(paymentData) }}

              style={[styles.paymentWebView, isTablet && styles.paymentWebViewTablet]}
              onShouldStartLoadWithRequest={(event) => {
                const url = event?.url || '';
                if (url.startsWith('upi:') || url.startsWith('intent:')) {
                  Linking.openURL(url).catch(() => {});
                  return false;
                }
                return true; // allow Razorpay flows to stay in-WebView
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'open_url' && data.url) {
                  Linking.openURL(data.url).catch(() => {});
                } else if (data.type === 'payment_closed') {
                  console.log('[WebView] Payment closed by user');
                } else if (data.type === 'payment_done') {
                    handlePaymentSuccess(data.payment_response);
                  } else if (data.type === 'payment_error') {
                    console.error('[WebView] payment error:', data.error);
                  }
                } catch (error) {
                  console.error('[ERROR] WebView message error:', error);
                }
              }}
              onError={(event) => {
                console.error('[WebView] Load error:', event.nativeEvent);
              }}
            />
          </View>
        )}
      </Modal>

      <Modal visible={isIpModalVisible} transparent animationType="slide">
        <IPModal
          isVisible={isIpModalVisible}
          onClose={() => setIpModalVisible(false)}
          onIpSubmit={handleIpSubmit}
          ipError={ipError}
          setIpError={setIpError}
        />
      </Modal>

      <Modal visible={isPinModalVisible} transparent animationType="slide">
        <PinModal
          isVisible={isPinModalVisible}
          onClose={() => setPinModalVisible(false)}
          onPinSuccess={() => {
            setPinModalVisible(false);
            setPoseButtonModalVisible(true);
          }}
        />
      </Modal>

      {/* Emoji Popup Modal */}
      <Modal visible={showEmojiPopup} transparent animationType="fade">
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.5)' 
        }}>
          <View style={{
            backgroundColor: '#1a1a2e',
            borderRadius: 20,
            padding: 30,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#fbbf24',
            shadowColor: '#fbbf24',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 20,
          }}>
            <Text style={{
              fontSize: 80,
              marginBottom: 15,
              textAlign: 'center',
              lineHeight: 90,
            }}>
              {displayEmojis}
            </Text>
            <Text style={{
              color: '#fbbf24',
              fontSize: 12,
              fontStyle: 'italic',
              opacity: 0.8
            }}>
              Bot's response
            </Text>
          </View>
        </View>
      </Modal>

      {/* Pose/Table Select Button Modal */}
      <Modal visible={isPoseButtonModalVisible} transparent animationType="fade">
        {/* ... (Implement the simple modal with two buttons: Set Initial Pose and Set Table) ... */}
        {/* For now, linking to the functions directly in the button: */}
        <View style={styles.modalContainer}>
          <View style={[styles.modalSmallBox, styles.poseModalBox]}>
            <Text style={styles.modalTitleProfessional}>Robot Configuration</Text>
            <TouchableOpacity onPress={handleFetchPoses} style={styles.submitButtonProfessional}>
              <Text style={styles.buttonTextProfessional}>Set Initial Pose</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFetchTables} style={styles.submitButtonProfessional}>
              <Text style={styles.buttonTextProfessional}>Set Table</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPoseButtonModalVisible(false)} style={{ marginTop: 15, padding: 10 }}>
              <Text style={{ color: '#aaa' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal visible={isPoseModalVisible} transparent animationType="fade">
        <PoseModal
          isVisible={isPoseModalVisible}
          onClose={() => setIsPoseModalVisible(false)}
          onBack={() => { setIsPoseModalVisible(false); setPoseButtonModalVisible(true); }}
          poses={poses}
          navigateToPose={handleNavigateToPose}
          poseError={poseError}
        />
      </Modal>

      <Modal visible={isTableModalVisible} transparent animationType="fade">
        <TableModal
          isVisible={isTableModalVisible}
          onClose={() => setIsTableModalVisible(false)}
          onBack={() => { setIsTableModalVisible(false); setPoseButtonModalVisible(true); }}
          tables={tables}
          navigateToTable={handleNavigateToTable}
          tableError={tableError}
        />
      </Modal>

      <Modal visible={showMenu} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          <TouchableOpacity
            onPress={() => setShowMenu(false)}
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 10 }}
          >
            <Text style={{ fontSize: 24 }}>×</Text>
          </TouchableOpacity>

          <WebView
            source={{ uri: FINAL_MENU_URL }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        </View>
      </Modal>

      <ConfirmModal
        isVisible={showConfirmDelete}
        message="Are you sure you want to delete this item?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {/* --- Sidebar (Left) --- */}
      <LinearGradient
        colors={['#4e6b73ff', '#2c2c4e']}
        style={[
          styles.sidebar,
          isLandscape && styles.sidebarLandscape,
          isTablet && styles.sidebarTablet,
          !billSummary ? { justifyContent: 'space-between' } : { justifyContent: 'flex-start' },
        ]}
      >
        <Image
          source={require('../assets/the-robot-restaurant.jpeg')}
          style={[styles.logo, isLandscape && styles.logoLandscape, isTablet && styles.logoTablet]}
          resizeMode="contain"
        />

        {(billSummary || paymentData?.bill_html) && isBillVisible ? (
          <View style={[styles.billBox, isLandscape && styles.billBoxLandscape, isTablet && styles.billBoxTablet]}>
            <WebView
              originWhitelist={['*']}
              source={{ html: billSummary || paymentData?.bill_html || '' }}
              style={{ alignSelf: 'center', flex: 1, width: '100%', borderRadius: 10, backgroundColor: 'transparent' }}
              scrollEnabled={true}
              containerStyle={{ backgroundColor: 'transparent' }}
            />
          </View>
        ) : (
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.button, isLandscape && styles.buttonLandscape, isTablet && styles.buttonTablet]}
              onPress={isTalking ? handleEndTalking : handleStartTalking}
            >
              <Text style={[styles.buttonText, isLandscape && styles.buttonTextLandscape, isTablet && styles.buttonTextTablet]}>
                {isTalking ? 'End Talking' : 'Start Talking'}
              </Text>
            </TouchableOpacity>
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.buttonText, { textAlign: 'center' }]}>
                {recognizing ? '🎙️ Listening' : '🎤 Stopped'}
              </Text>
            </View>

            {/* Robot Status Display */}
            {currentStatus && FEATURE_FLAGS.SHOW_ROBOT_STATUS && (
              <View style={{ marginTop: 16, padding: 11, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#22c55e' }}>
                <Text style={{ color: '#86efac', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
                  ● Robot Status
                </Text>
                <Text style={{ color: '#d1fae5', fontSize: 9, marginBottom: 3 }}>
                  📍 Table: <Text style={{ fontWeight: '500' }}>{currentStatus.current_table}</Text>
                </Text>
                <Text style={{ 
                  color: currentStatus.movement_status === 'stopped' ? '#86efac' : '#fbbf24', 
                  fontSize: 9, 
                  marginBottom: 3 
                }}>
                  🚀 Movement: <Text style={{ fontWeight: '500' }}>{currentStatus.movement_status}</Text>
                </Text>
                <Text style={{ 
                  color: currentStatus.waiting_at_table ? '#86efac' : '#fca5a5', 
                  fontSize: 9, 
                  marginBottom: 3 
                }}>
                  ⏳ Waiting: <Text style={{ fontWeight: '500' }}>{currentStatus.waiting_at_table ? 'Yes ✓' : 'No'}</Text>
                </Text>
                <Text style={{ 
                  color: currentStatus.navigation_status === 'success' ? '#86efac' : '#fca5a5', 
                  fontSize: 9, 
                  marginBottom: 3 
                }}>
                  🗺️ Nav: <Text style={{ fontWeight: '500' }}>{currentStatus.navigation_status}</Text>
                </Text>
                <Text style={{ 
                  color: currentStatus.is_stt_active ? '#fbbf24' : '#9ca3af', 
                  fontSize: 9 
                }}>
                  🎤 STT: <Text style={{ fontWeight: '500' }}>{currentStatus.is_stt_active ? 'Active' : 'Inactive'}</Text>
                </Text>
              </View>
            )}

            {/* Robot Navigation Display */}
            {currentStatus && FEATURE_FLAGS.SHOW_ROBOT_NAVIGATION && (
              <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
                <Text style={{ color: '#93c5fd', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
                  ◆ Navigation
                </Text>
                {currentStatus.target_table ? (
                  <>
                    <Text style={{ color: '#dbeafe', fontSize: 9, marginBottom: 2 }}>
                      🎯 Target: <Text style={{ fontWeight: '500' }}>{currentStatus.target_table}</Text>
                    </Text>
                    {currentStatus.target_distance !== null && (
                      <Text style={{ color: '#dbeafe', fontSize: 9, marginBottom: 3 }}>
                        📏 Distance: <Text style={{ fontWeight: '500' }}>{currentStatus.target_distance.toFixed(2)}m</Text>
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{ color: '#93c5fd', fontSize: 9 }}>
                    ⊘ No active navigation
                  </Text>
                )}
                <Text style={{ 
                  color: currentStatus.navigation_status === 'failed' ? '#fca5a5' : 
                         currentStatus.navigation_status === 'success' ? '#86efac' : '#fbbf24',
                  fontSize: 8.5, 
                  marginTop: 3,
                  fontStyle: 'italic'
                }}>
                  {currentStatus.goal_status_text}
                </Text>
              </View>
            )}

            {/* Robot Pose Display */}
            {currentStatus && FEATURE_FLAGS.SHOW_ROBOT_POSE && currentStatus.current_pose && (
              <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#a855f7' }}>
                <Text style={{ color: '#d8b4fe', fontSize: 11, marginBottom: 5, fontWeight: '600' }}>
                  ◆ Position
                </Text>
                <Text style={{ color: '#ede9fe', fontSize: 8.5, marginBottom: 1.5 }}>
                  X: {currentStatus.current_pose.position.x.toFixed(2)} | Y: {currentStatus.current_pose.position.y.toFixed(2)}
                </Text>
                <Text style={{ color: '#ede9fe', fontSize: 8.5 }}>
                  Yaw: {currentStatus.current_pose.yaw.toFixed(2)} rad
                </Text>
              </View>
            )}

            {/* STT Text Display */}
            {isTalking && (FEATURE_FLAGS.SHOW_STT_FULL_TEXT || FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT) && (
              <View style={{ marginTop: 12, padding: 11, backgroundColor: 'rgba(100,150,200,0.15)', borderRadius: 7, borderLeftWidth: 3, borderLeftColor: '#60a5fa' }}>
                <Text style={{ color: '#60a5fa', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
                  🎤 Your Voice
                </Text>
                {FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT && sttPartialText && (
                  <Text style={{ color: '#93c5fd', fontSize: 9, marginBottom: 4, fontStyle: 'italic', lineHeight: 14 }}>
                    ✎ (typing...) {sttPartialText}
                  </Text>
                )}
                {FEATURE_FLAGS.SHOW_STT_FULL_TEXT && sttFullText && (
                  <Text style={{ color: '#dbeafe', fontSize: 9, fontWeight: '500', lineHeight: 14 }}>
                    ✓ {sttFullText}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      {/* --- Main Panel (Right) --- */}
      <LinearGradient
        colors={['#0b0b3b', '#000']}
        style={[styles.mainPanel, isLandscape && styles.mainPanelLandscape, isTablet && styles.mainPanelTablet]}
      >
        <TouchableOpacity
          style={[styles.menuButton, isLandscape && styles.menuButtonLandscape, isTablet && styles.menuButtonTablet]}
          onPress={() => setShowMenu(true)}
        >
          <Text style={[styles.menuButtonText, isLandscape && styles.menuButtonTextLandscape, isTablet && styles.menuButtonTextTablet]}>
            Show Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleIcon, isLandscape && styles.toggleIconLandscape, isTablet && styles.toggleIconTablet]}
          onPress={() => setPinModalVisible(true)}
        >
          <Text style={[styles.toggleIconText, isLandscape && styles.toggleIconTextLandscape, isTablet && styles.toggleIconTextTablet]}>☰</Text>
        </TouchableOpacity>

        <View style={styles.contentWrapper}>
          {showPayment && (qrHtml || paymentData?.bill_html || paymentData?.upi_string) ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <WebView
                originWhitelist={['*']}
                source={{
                  html:
                    qrHtml ||
                    paymentData?.bill_html ||
                    billSummary ||
                    '<html><body style="background:#000;color:#fff;"><h2>Waiting for payment page...</h2></body></html>',
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mixedContentMode={'always'}
                startInLoadingState={true}
                style={[styles.mainLogo, isLandscape && styles.mainLogoLandscape, isTablet && styles.mainLogoTablet]}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'payment_done') {
                      handlePaymentSuccess(data.payment_response);
                    } else if (data.type === 'payment_error') {
                      console.error('[WebView] Payment error:', data.error);
                    }
                  } catch (e) {
                    console.error('[WebView] message parse error', e);
                  }
                }}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('[WebView] error: ', nativeEvent);
                }}
              />
            </View>
          ) : (
            <Image
              source={require('../assets/the-robot-restaurant.jpeg')}
              style={[styles.mainLogo, isLandscape && styles.mainLogoLandscape, isTablet && styles.mainLogoTablet]}
              resizeMode="contain"
            />
          )}

          <View style={styles.middlePanel}>
            <CartDisplay
              cart={cart}
              paymentData={paymentData}
              increaseQuantity={increaseQuantity}
              decreaseQuantity={decreaseQuantity}
              onDeleteItem={(item) => {
                setItemToDelete(item);
                setShowConfirmDelete(true);
              }}
              isTalking={isTalking}
            />
          </View>

          <View style={[styles.bottomRow, isLandscape && styles.bottomRowLandscape, isTablet && styles.bottomRowTablet]}>
            <Image
              source={require('../assets/the-robot-restaurant.jpeg')}
              style={[styles.icon, isLandscape && styles.iconLandscape, isTablet && styles.iconTablet]}
              resizeMode="contain"
            />
            <Text style={[styles.experienceText, isLandscape && styles.experienceTextLandscape, isTablet && styles.experienceTextTablet]}>
              Dining Experience
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}