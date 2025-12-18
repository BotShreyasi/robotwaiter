// src/screens/RobotControlScreen.tsx (Refactored)

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Linking, Dimensions, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';

// Custom Hooks
import { useSTT } from '../azure/STTService';
import { speak } from '../azure/TTSService';
import { startSession, sendUserText } from '../services/api';
import {
  useCart,
  useRobotNavigation,
  usePayment,
  useIPConnection,
  useOrientation,
  useSilenceFallback,
  useEmojiPopup
} from './hooks';

// Components
import { styles } from '../components/SharedStyles';
import IPModal from '../components/Models/IPModal';
import PinModal from '../components/Models/PinModal';
import PoseModal from '../components/Models/PoseModal';
import TableModal from '../components/Models/TableModal';
import ConfirmModal from '../components/Models/ConfirmModal';
import CartDisplay from '../components/CartDisplay';
import EmojiPopupModal from './components/EmojiPopupModal';
import PoseButtonModal from './components/PoseButtonModal';
import RobotStatusPanel from './components/RobotStatusPanel';
import RobotNavigationPanel from './components/RobotNavigationPanel';
import RobotPosePanel from './components/RobotPosePanel';
import STTTextPanel from './components/STTTextPanel';

// APIs
import {
  startSpeakingApi, stopSpeakingApi, checkRobotStatus,
} from '../api/RobotApi';
import {
  saveOrderApi, startPaymentApi, paymentSuccessApi,
  generateQRHtml, matchMenuApi
} from '../api/OrderApi';

// Config & Types
import { FEATURE_FLAGS } from '../config/Config';
import { CartItem, PaymentData, RobotStatus, OrderMap } from '../types';

// Constants & Utils
import {
  FINAL_MENU_URL,
  PAYMENT_TIMEOUT_MS,
  BILL_DISPLAY_TIMEOUT_MS,
  IS_TABLET,
  DEFAULT_LANGUAGE,
  SESSION_END_MESSAGE,
  PAYMENT_TIMEOUT_MESSAGE,
  ORDER_ERROR_MESSAGE,
  PAYMENT_SUCCESS_MESSAGE,
  ROBOT_STATUS_POLL_INTERVAL,
  SILENCE_THRESHOLD_MS,
} from './constants';
import {
  extractEmojis,
  getQuantityFromOrderMap,
  parseOrderMapToCart,
} from './utils';

const { width } = Dimensions.get('window');

export default function RobotControlScreen() {
  // --- Hooks ---
  const { isLandscape } = useOrientation();
  const {
    enteredIp,
    isIpModalVisible,
    ipError,
    handleIpSubmit,
    setIpModalVisible,
    setIpError
  } = useIPConnection();

  const {
    cart,
    setCart,
    itemToDelete,
    setItemToDelete,
    showConfirmDelete,
    setShowConfirmDelete,
    increaseQuantity,
    decreaseQuantity,
    handleConfirmDelete,
  } = useCart();

  const {
    isPoseButtonModalVisible,
    setPoseButtonModalVisible,
    isPoseModalVisible,
    setIsPoseModalVisible,
    isTableModalVisible,
    setIsTableModalVisible,
    poses,
    tables,
    poseError,
    tableError,
    handleFetchPoses,
    handleNavigateToPose,
    handleFetchTables,
    handleNavigateToTable,
  } = useRobotNavigation();

  const {
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
    clearPaymentTimeout,
    setPaymentTimeout,
    closePayment,
  } = usePayment();

  const {
    showEmojiPopup,
    displayEmojis,
    showEmoji,
    clearEmojiPopup,
  } = useEmojiPopup();

  const {
    resetSilenceFallbacks,
    handleSilence,
  } = useSilenceFallback();

  // --- Local State ---
  const [isTalking, setIsTalking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<RobotStatus | null>(null);
  const [prevData, setPrevData] = useState<RobotStatus | null>(null);
  const [sttFullText, setSttFullText] = useState<string>('');
  const [sttPartialText, setSttPartialText] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const [isPinModalVisible, setPinModalVisible] = useState(false);

  // --- Refs ---
  const sessionIdRef = React.useRef<string | null>(null);
  const lastControlRef = React.useRef<any>(null);
  const lastDishMappingRef = React.useRef<any>(null);
  const lastOrderMapRef = React.useRef<OrderMap | null>(null);

  // --- Utility Functions ---
  const goToDock = async () => {
    try {
      const { navigateToTableApi } = await import('../api/RobotApi');
      await navigateToTableApi('initial_pose');
    } catch (err: any) {
      console.error('[Dock] navigation error:', err.message);
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
      await speak(session.response, session.control.language || DEFAULT_LANGUAGE);
      startRecognition();
    } catch (err: any) {
      console.error('[ERROR] Start talking error:', err.message);
      setIsTalking(false);
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
      await speak(SESSION_END_MESSAGE, DEFAULT_LANGUAGE);
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
        closePayment();
      }, BILL_DISPLAY_TIMEOUT_MS);
      try {
        await speak(PAYMENT_SUCCESS_MESSAGE, DEFAULT_LANGUAGE);
      } catch (e) { }
      await stopSpeakingApi();
      await goToDock();
    } catch (e: any) {
      console.error('[ERROR] Payment success API error:', e.message);
    } finally {
      setShowPayment(false);
    }
  };

  const handleManualScanPay = async () => {
    debugger;
    try {
      if (!lastControlRef.current || !lastOrderMapRef.current) {
        return;
      }
      const control = lastControlRef.current;
      const orderMap = lastOrderMapRef.current;

      const { paymentData: newPaymentData, html: qrHtmlRes, billHtml } = await startPaymentApi(control, orderMap);
      setPaymentData(newPaymentData);
      const safeBillHtml =
        billHtml ||
        newPaymentData?.bill_html ||
        '<html><body style="background:#000;color:#fff;"><h2>Bill data unavailable</h2></body></html>';
      const safeQrHtml = qrHtmlRes || safeBillHtml;
      debugger;

      setBillSummary(safeBillHtml);
      setQrHtml(safeQrHtml);
      setIsBillVisible(true);
      setShowPayment(true);
      debugger;
      // clearPaymentTimeout();
      setPaymentTimeout(() => {
        closePayment();
      });

      // Pause STT while payment is open
      stopRecognition();
    } catch (e: any) {
      console.error('[ManualPay] start payment error:', e.message);
    }
  };

  // --- STT Hook ---
  const { recognizing, startRecognition, stopRecognition, allowRecognition } = useSTT(
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

        // Extract and show emojis
        if (FEATURE_FLAGS.SHOW_EMOJI_POPUP) {
          const emojis = extractEmojis(response);
          if (emojis) {
            showEmoji(emojis);
          }
        }

        await speak(response, (control as any).language || DEFAULT_LANGUAGE);

        // 1. Order Confirmation and Payment Flow
        const orderMap: OrderMap = (control as any).order || {};
        if ((control as any).is_order === 1 && Object.keys(orderMap).length > 0) {
          try {
            lastOrderMapRef.current = orderMap;

            // Match menu to normalize items
            try {
              const matchRes = await matchMenuApi(orderMap);
              const matchedItems = matchRes?.matched_items || [];
              const dishMapping = matchRes?.dish_mapping || dish_mapping || {};
              const variationMapping = matchRes?.variation_mapping || {};
              lastDishMappingRef.current = dishMapping;

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
                  const quantity = getQuantityFromOrderMap(orderMap, item.itemname);
                  matchedCart[displayName] = {
                    price: price,
                    quantity: quantity,
                  };
                });
                setCart(matchedCart);
              } else {
                setCart(parseOrderMapToCart(orderMap));
              }
            } catch (e: any) {
              console.error('[MatchMenu] error:', e.message);
              setCart(parseOrderMapToCart(orderMap));
            }

            // Start Payment
            const { paymentData: newPaymentData, html: qrHtmlRes, billHtml } = await startPaymentApi(control, orderMap);

            setPaymentData(newPaymentData);
            const safeBillHtml = billHtml || newPaymentData?.bill_html || '<html><body style="background:#000;color:#fff;"><h2>Bill data unavailable</h2></body></html>';
            const safeQrHtml = qrHtmlRes || safeBillHtml;
            setBillSummary(safeBillHtml);
            setQrHtml(safeQrHtml);
            setIsBillVisible(true);
            setShowPayment(true);
            clearPaymentTimeout();
            setPaymentTimeout(async () => {
              try {
                await speak(PAYMENT_TIMEOUT_MESSAGE, (control as any).language || DEFAULT_LANGUAGE);
              } catch (e) { }
              closePayment();
              await stopSpeakingApi();
              await goToDock();
              setIsTalking(false);
              stopRecognition();
            });
            stopRecognition();
            return;
          } catch (e: any) {
            console.error('[ERROR] Order/Payment Flow:', e.message);
            await speak(ORDER_ERROR_MESSAGE);
          }
        }

        // 2. Session Disconnect/End
        if ((control as any).disconnect === '1') {
          await handleEndTalking();
          await speak(SESSION_END_MESSAGE, (control as any).language || DEFAULT_LANGUAGE);
          return;
        }

        // 3. Update Cart (non-order context)
        if (Object.keys(orderMap).length > 0) {
          setCart(parseOrderMapToCart(orderMap));
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
        if (err.message.includes('network') || err.message.includes('timeout')) {
          setIpModalVisible(true);
        }
      }
    },
    {
      onSilence: () => handleSilence(
        (shouldContinue) => {
          if (!shouldContinue) {
            setIsTalking(false);
          }
        },
        startRecognition,
        allowRecognition,
        handleEndTalking
      ),
      silenceMs: SILENCE_THRESHOLD_MS,
      onPartial: (partialText: string) => {
        if (FEATURE_FLAGS.SHOW_STT_PARTIAL_TEXT) {
          setSttPartialText(partialText);
        }
      }
    }
  );

  // Clear STT texts when talking ends
  useEffect(() => {
    if (!isTalking) {
      setSttFullText('');
      setSttPartialText('');
    }
  }, [isTalking]);

  // Robot Status Polling
  useEffect(() => {
    const pollRobotStatus = async () => {
      if (!enteredIp) return;
      try {
        const data: RobotStatus = await checkRobotStatus(enteredIp);
        setCurrentStatus(data);

        const isSameAsPrevious = JSON.stringify(data) === JSON.stringify(prevData);
        const conditionsMet =
          data.movement_status !== 'moving' &&
          data.navigation_status === 'success' &&
          data.current_table !== 'initial_pose' &&
          data.current_table !== 'dock' &&
          (data.target_distance === null || data.target_distance < 0.2) &&
          data.waiting_at_table === true;

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

    const intervalId = setInterval(pollRobotStatus, ROBOT_STATUS_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [enteredIp, isTalking, prevData, showPayment]);

  // --- Rendered UI ---
  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape, IS_TABLET && styles.containerTablet]}>

      {/* --- Modals --- */}
      {/* Payment UI is rendered only inside the right main panel (not as a full-screen Modal)
          so the left panel can continue showing the bill. */}

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

      {/* Emoji & Pose button modals will render inline inside main panel to avoid covering the whole screen */}

      {/* Pose and Table modals will render inline inside main panel (so they overlay only that area) */}

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
      <View
        style={[
          styles.sidebar,
          isLandscape && styles.sidebarLandscape,
          IS_TABLET && styles.sidebarTablet,
          { backgroundColor: '#2c2c4e' },
          !billSummary ? { justifyContent: 'space-between' } : { justifyContent: 'flex-start' },
        ]}
      >
        <Image
          source={require('../assets/the-robot-restaurant.jpeg')}
          style={[styles.logo, isLandscape && styles.logoLandscape, IS_TABLET && styles.logoTablet]}
          resizeMode="contain"
        />

        {(billSummary || paymentData?.bill_html) && isBillVisible ? (
          <View style={[styles.billBox, isLandscape && styles.billBoxLandscape, IS_TABLET && styles.billBoxTablet]}>
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
              style={[styles.button, isLandscape && styles.buttonLandscape, IS_TABLET && styles.buttonTablet]}
              onPress={isTalking ? handleEndTalking : handleStartTalking}
            >
              <Text style={[styles.buttonText, isLandscape && styles.buttonTextLandscape, IS_TABLET && styles.buttonTextTablet]}>
                {isTalking ? 'End Talking' : 'Start Talking'}
              </Text>
            </TouchableOpacity>
            <View style={{ marginTop: 0 }}>
              <Text style={[styles.buttonText, { textAlign: 'center' }]}>
                {recognizing ? '🎙️ Listening...' : '🎤 Stopped'}
              </Text>
            </View>

            <View style={{ width: '100%', paddingHorizontal: 12, marginTop: 0 }}>
              <STTTextPanel
                isTalking={isTalking}
                partialText={sttPartialText}
                fullText={sttFullText}
              />
            </View>
            {/* status panels moved to the main panel bottom area */}
          </View>
        )}
      </View>

      {/* --- Main Panel (Right) --- */}
      <View
        style={[
          styles.mainPanel,
          isLandscape && styles.mainPanelLandscape,
          IS_TABLET && styles.mainPanelTablet,
          { backgroundColor: '#0b0b3b' },
        ]}
      >
        <TouchableOpacity
          style={[styles.menuButton, isLandscape && styles.menuButtonLandscape, IS_TABLET && styles.menuButtonTablet]}
          onPress={() => setShowMenu(true)}
        >
          <Text style={[styles.menuButtonText, isLandscape && styles.menuButtonTextLandscape, IS_TABLET && styles.menuButtonTextTablet]}>
            Show Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleIcon, isLandscape && styles.toggleIconLandscape, IS_TABLET && styles.toggleIconTablet]}
          onPress={() => setPinModalVisible(true)}
        >
          <Text style={[styles.toggleIconText, isLandscape && styles.toggleIconTextLandscape, IS_TABLET && styles.toggleIconTextTablet]}>☰</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.contentWrapper} keyboardShouldPersistTaps="handled">
          {showPayment && (qrHtml || paymentData?.bill_html || paymentData?.upi_string) ? (
            <View style={{ flex: 1, width: width * 1, maxWidth: '100%', alignSelf: 'center', borderRadius: 10,zIndex:999999, minHeight: 400, height: 400 }}>
              {/* <TouchableOpacity
                onPress={closePayment}
                style={{ alignSelf: 'flex-end', marginRight: 12, marginBottom: 8, padding: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 22 }}>×</Text>
              </TouchableOpacity> */}
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
                style={[styles.paymentWebView, IS_TABLET && styles.paymentWebViewTablet]}
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
              style={[styles.mainLogo, isLandscape && styles.mainLogoLandscape, IS_TABLET && styles.mainLogoTablet]}
              resizeMode="contain"
            />
          )}
{/* Cart Display */}
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
              onScanPay={handleManualScanPay}
              payDisabledReason={!lastOrderMapRef.current ? 'Pay will be enabled after an order is confirmed.' : ''}
            />
          </View>

          {/* Status panels row above bottom area (horizontal) */}
          {currentStatus && (
            <View style={{ width: '100%', alignSelf: 'center'}}>
              <View style={{ width: '90%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <RobotStatusPanel status={currentStatus} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 6 }}>
                  <RobotNavigationPanel status={currentStatus} />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <RobotPosePanel status={currentStatus} />
                </View>
              </View>

              {/* Full-width STT text panel below status row */}
              <View style={{ width: '100%', paddingHorizontal: 12, marginTop: 8 }}>
                <STTTextPanel
                  isTalking={isTalking}
                  partialText={sttPartialText}
                  fullText={sttFullText}
                />
              </View>



            </View>
          )}

          <View style={[styles.bottomRow, isLandscape && styles.bottomRowLandscape, IS_TABLET && styles.bottomRowTablet]}>
            <Image
              source={require('../assets/the-robot-restaurant.jpeg')}
              style={[styles.icon, isLandscape && styles.iconLandscape, IS_TABLET && styles.iconTablet]}
              resizeMode="contain"
            />      
            <Text style={[styles.experienceText, isLandscape && styles.experienceTextLandscape, IS_TABLET && styles.experienceTextTablet]}>
              Dining Experience
            </Text>
          </View>
        </ScrollView>

        {/* Overlay container so inline modals/popups only cover the main panel */}
        {(showEmojiPopup || isPoseButtonModalVisible || isPoseModalVisible || isTableModalVisible) && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
            {/* center inline elements */}
            <View style={{ width: '100%', alignItems: 'center' }}>
              <EmojiPopupModal visible={showEmojiPopup} emojis={displayEmojis} inline />
              <PoseButtonModal
                visible={isPoseButtonModalVisible}
                onFetchPoses={handleFetchPoses}
                onFetchTables={handleFetchTables}
                onClose={() => setPoseButtonModalVisible(false)}
                errorMessage={poseError || tableError}
                inline
              />
              {isPoseModalVisible && (
                <PoseModal
                  isVisible={isPoseModalVisible}
                  onClose={() => setIsPoseModalVisible(false)}
                  onBack={() => { setIsPoseModalVisible(false); setPoseButtonModalVisible(true); }}
                  poses={poses}
                  navigateToPose={handleNavigateToPose}
                  poseError={poseError}
                  inline
                />
              )}
              {isTableModalVisible && (
                <TableModal
                  isVisible={isTableModalVisible}
                  onClose={() => setIsTableModalVisible(false)}
                  onBack={() => { setIsTableModalVisible(false); setPoseButtonModalVisible(true); }}
                  tables={tables}
                  navigateToTable={handleNavigateToTable}
                  tableError={tableError}
                  inline
                />
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
