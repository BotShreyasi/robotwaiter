// Environment detection
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// --- Azure Speech Settings (both dev and prod) ---
export const AZURE_SPEECH_KEY = "FHKK4xC5rrPgkn7OrNzGdG98mUAOBdHsSLQxBS2xsLjijvm7SuSMJQQJ99BEACGhslBXJ3w3AAAYACOGzQ23";
export const AZURE_SPEECH_REGION = "centralindia";

// --- RAGFlow Settings (both dev and prod) ---
export const RAGFLOW_BASE_URL = 'https://flow.botshreyasi.com';
export const RAGFLOW_ACCESS_TOKEN = 'M4ZWJhYTE2ODU5NDExZjBiNTVjMDI0Mm';
export const RAGFLOW_BOT_ID = 'fa69cb34b58011f0810f0242ac180006';//'ac55c0ce99fb11f0b0650242ac180006';

// --- Payment Settings ---
export const RAZORPAY_KEY_ID = isDevelopment ? 'rzp_live_kfVvUd252jkHso' : 'rzp_live_kfVvUd252jkHso';

// --- Robot Server Settings (production default, dev uses local IP modal) ---
export const ROBOSERVER_IP = isDevelopment ? '98.70.32.248:5050' : '98.70.32.248:5050';

// --- Network Configuration for Development/Production ---
export const NETWORK_CONFIG = {
  isDevelopment,
  // Allow local IP connections in development
  allowLocalIPs: isDevelopment,
  // Timeout for robot API calls (5 seconds for local, 10 for production)
  robotApiTimeout: isDevelopment ? 15000 : 15000,
  // Timeout for cloud API calls
  cloudApiTimeout: isDevelopment ? 18000 : 15000,
};

// --- Feature Flags for UI/Display ---
export const FEATURE_FLAGS = {
  // Show STT (Speech-to-Text) full text as user speaks
  SHOW_STT_FULL_TEXT: true,
  // Show STT partial results (interim results while user is still speaking)
  SHOW_STT_PARTIAL_TEXT: true,
  // Show real-time robot status on sidebar
  SHOW_ROBOT_STATUS: true,
  // Show robot navigation/goal information
  SHOW_ROBOT_NAVIGATION: true,
  // Show current pose of robot
  SHOW_ROBOT_POSE: true,
  // Show emoji popup when bot response is received
  SHOW_EMOJI_POPUP: true,
  // Move dining experience to fixed footer
  DINING_EXPERIENCE_AS_FOOTER: true,
};

export default {
  AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION,
  RAGFLOW_BASE_URL,
  RAGFLOW_ACCESS_TOKEN,
  RAGFLOW_BOT_ID,
  RAZORPAY_KEY_ID,
  ROBOSERVER_IP,
  NETWORK_CONFIG,
  FEATURE_FLAGS,
};