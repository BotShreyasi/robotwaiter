// src/types.ts

// --- API Types ---
export interface Pose {
  name: string;
  description?: string;
  x: string;
  y: string;
  yaw: string; // yaw (Z + W combined in your logic)
}

export interface Table {
  name: string;
  description?: string;
  // अन्य टेबल डेटा
}

export interface RobotStatus {
  movement_status: 'stopped' | 'moving';
  navigation_status: 'success' | 'failed' | 'in_progress';
  current_table: string;
  target_distance: number | null;
  is_stt_active: boolean;
  robot_id: string;
}

export interface PaymentData {
  key: string;
  amount: number; // in paise
  currency: string;
  table_number: string;
  order_id: string;
  payment_time: string;
  robot_charge: number;
  sub_total: number;
  gst_total: number;
  gst_number: string;
  total_amount: number;
  bill_html: string; // generated HTML for bill
  upi_string?: string;
}

export interface CartItem {
  price: number;
  quantity: number;
}

// Order from Bot Response: { "dish_name(quantity)": totalPrice }
export interface OrderMap {
  [key: string]: number;
}

// --- Component Props Types ---
export interface IPModalProps {
  isVisible: boolean;
  onClose: () => void;
  onIpSubmit: (ip: string) => void;
  ipError: string;
  setIpError: (error: string) => void;
}

export interface PinModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPinSuccess: () => void;
}

export interface PoseModalProps {
  isVisible: boolean;
  onClose: () => void;
  onBack: () => void;
  poses: Pose[];
  navigateToPose: (pose: Pose) => Promise<void>;
  poseError: string;
}

export interface TableModalProps {
  isVisible: boolean;
  onClose: () => void;
  onBack: () => void;
  tables: Table[];
  navigateToTable: (tableName: string) => Promise<void>;
  tableError: string;
}

export interface CartDisplayProps {
  cart: { [key: string]: CartItem };
  paymentData: PaymentData | null;
  increaseQuantity: (item: string) => void;
  decreaseQuantity: (item: string) => void;
  onDeleteItem: (item: string) => void;
  isTalking: boolean;
  onScanPay?: () => void;
  payDisabledReason?: string;
}