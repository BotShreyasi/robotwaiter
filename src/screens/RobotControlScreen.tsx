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
import { saveOrderApi, startPaymentApi, paymentSuccessApi, generateQRHtml } from '../api/OrderApi';

// Types Import
import { CartItem, PaymentData, RobotStatus, Pose, Table, OrderMap } from '../types';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;

// The final menu URL (can be externalized to a config file)
const FINAL_MENU_URL = 'https://dinein.petpooja.com/qr/c2kj7v4m/D6';

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
        const botData = await sendUserText(activeSession, userText);
        const { response, control = {}, dish_mapping } = botData as any;

        await speak(response, (control as any).language || 'hi-IN');

        // 1. Order Confirmation and Payment Flow
        const orderMap: OrderMap = (control as any).order || {};
        if ((control as any).is_order === 1 && Object.keys(orderMap).length > 0) {
          try {
            // Save Order to Kitchen/Backend
            await saveOrderApi(control, dish_mapping, orderMap);

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

        // 3. Update Cart
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
    , { onSilence: handleSilence, silenceMs: 6000 });

  // --- Utility Handlers ---
  const handleIpSubmit = async (ipStr: string) => {
    try {
      const status = await checkRobotStatus(ipStr);
      await AsyncStorage.setItem('robot_ip', ipStr);
      setEnteredIp(ipStr);
      setIpModalVisible(false);
      setIpError('');
    } catch (err: any) {
      setIpError('Connection error: ' + err.message);
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
    try {
      await paymentSuccessApi(payment_response, paymentData);
      setIsTalking(false);
      setIsBillVisible(true);
      stopRecognition();
      setTimeout(() => {
        setShowPayment(false);
        setBillSummary(null);
        setIsBillVisible(false);
      }, 15000); // Show bill for 15 seconds
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
          const testRes = await checkRobotStatus(savedIp);
          if (testRes) {
            setEnteredIp(savedIp);
            setIpModalVisible(false);
            return;
          }
        }
      } catch (err) {
        console.error('Stored IP invalid, showing modal:', err);
      }
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
        const isSameAsPrevious = JSON.stringify(data) === JSON.stringify(prevData);

        const conditionsMet =
          data.movement_status !== 'moving' &&
          data.navigation_status === 'success' &&
          data.current_table !== 'initial_pose' &&
          (data.target_distance === null || data.target_distance < 0.2) &&
          data.is_stt_active === false;

        if (!isSameAsPrevious) {
          if (conditionsMet && !isTalking && !showPayment) {
            await handleStartTalking();
          }
        }
        setPrevData(data);
      } catch (err) {
        console.error('Error fetching real-time status:', err);
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