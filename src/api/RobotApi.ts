// src/api/RobotApi.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pose, Table, RobotStatus } from '../types';
import { NETWORK_CONFIG } from '../config/Config';

const getRobotIp = async (): Promise<string> => {
  const ip = await AsyncStorage.getItem('robot_ip');
  if (!ip) {
    throw new Error('Robot IP not found in storage. Please set it via the modal.');
  }
  return ip;
};

const robotUrl = (ip: string, path: string) => `http://${ip}:8082/api/robot/${path}`;

const robotUrlold = (ip: string, path: string) => `http://${ip}:8080/api/robot/${path}`;

// Ensure we always send string/null for current_table to avoid backend type errors
const normalizeTableName = (table: unknown): string | null => {
  if (table === undefined || table === null) return null;
  if (typeof table === 'string' || typeof table === 'number') return String(table);
  if (typeof table === 'object' && (table as any).name && typeof (table as any).name === 'string') {
    return (table as any).name;
  }
  return String(table);
};

// Helper function to make requests with timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = NETWORK_CONFIG.robotApiTimeout
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[RobotApi] Fetching: ${url} (timeout: ${timeoutMs}ms)`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log(`[RobotApi] Response status: ${response.status} from ${url}`);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[RobotApi] Network error for ${url}:`, error.message);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms - Robot may be unreachable or network issue`);
    }
    throw error;
  }
};

export async function checkRobotStatus(ip: string): Promise<RobotStatus> {
  try {
    const response = await fetchWithTimeout(robotUrl(ip, 'status'));
    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }
    return response.json();
  } catch (error: any) {
    console.error('[RobotApi] checkRobotStatus error:', error.message);
    throw error;
  }
}

export async function startSpeakingApi(currentTable?: string | null): Promise<void> {
  const ip = await getRobotIp();
  const tableName = normalizeTableName(currentTable);
  const res = await fetchWithTimeout(robotUrl(ip, 'stt_start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      is_speaking: true,
      current_table: tableName,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to start STT: ${res.statusText}`);
  }
}

export async function stopSpeakingApi(currentTable?: string | null): Promise<void> {
  const ip = await getRobotIp();
  const tableName = normalizeTableName(currentTable);
  const res = await fetchWithTimeout(robotUrl(ip, 'stt_stop'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      is_speaking: false,
      current_table: tableName,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to stop STT: ${res.statusText}`);
  }
}

// export async function fetchPosesApi(): Promise<Pose[]> {
//   const ip = await getRobotIp();
//   debugger;
//   const response = await fetchWithTimeout(robotUrl(ip, 'poses'));
//   // const response = await fetchWithTimeout(robotUrlold(ip, 'set_poses'));

//   if (!response.ok) {
//     throw new Error('Failed to fetch poses');
//   }
//   const data = await response.json();
//   // const data = res.data;

//   const rawPoses = Object.values(data.data);
//   debugger;
//   // Backends vary; accept a few common shapes:
//   // - [{...}, {...}]
//   // - { set_poses: [...] }
//   // - { set_poses: { key1: {...}, key2: {...} } }
//   // - { poses: [...] }
//   // - { poses: { key1: {...}, key2: {...} } }
//   // - { success: true, poses: [...] }
//   const rawPosess: any[] | undefined = Array.isArray(data)
//     ? data
//     : Array.isArray(data?.set_poses)
//       ? data.set_poses
//       : data?.set_poses && typeof data.set_poses === 'object'
//         ? Object.values(data.set_poses)
//         : Array.isArray(data?.poses)
//           ? data.poses
//           : data?.poses && typeof data.poses === 'object'
//             ? Object.values(data.poses)
//             : Array.isArray(data?.data?.poses)
//               ? data.data.poses
//               : data?.data?.poses && typeof data.data.poses === 'object'
//                 ? Object.values(data.data.poses)
//                 : undefined;
//   debugger;
//   if (!rawPoses) {
//     throw new Error('Invalid poses response format');
//   }
//   debugger;
//   // Convert API data to Pose array (be defensive about field names)
//   const poses = rawPoses.map((p: any, idx: number) => {
//     const z = p?.z ?? p?.orientation?.z;
//     const w = p?.w ?? p?.orientation?.w;
//     const computedYaw =
//       typeof z === 'number' && typeof w === 'number'
//         ? 2 * Math.atan2(z, w) // radians
//         : undefined;

//     return {
//       name: String(p?.name ?? p?.pose_name ?? p?.id ?? `Pose ${idx + 1}`),
//       description: p?.description ?? p?.label ?? '',
//       x: String(p?.x ?? p?.pos_x ?? p?.position?.x ?? 0),
//       y: String(p?.y ?? p?.pos_y ?? p?.position?.y ?? 0),
//       yaw: String(p?.yaw ?? p?.theta ?? p?.orientation?.yaw ?? computedYaw ?? 0),
//     };
//   });

//   if (poses.length === 0) {
//     console.warn('[RobotApi] fetchPosesApi: received 0 poses. Raw response keys:', data && typeof data === 'object' ? Object.keys(data) : typeof data);
//   }
//   debugger;
//   return poses;
// }
export async function fetchPosesApi(): Promise<Pose[]> {
  const ip = await getRobotIp();
  const response = await fetchWithTimeout(robotUrl(ip, 'poses'));

  if (!response.ok) {
    throw new Error('Failed to fetch poses');
  }

  const data = await response.json();

  // ---- Normalize backend response ----
  const rawPoses: any[] | undefined =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.set_poses)
        ? data.set_poses
        : data?.set_poses && typeof data.set_poses === 'object'
          ? Object.values(data.set_poses)
          : Array.isArray(data?.poses)
            ? data.poses
            : data?.poses && typeof data.poses === 'object'
              ? Object.values(data.poses)
              : Array.isArray(data?.data?.poses)
                ? data.data.poses
                : data?.data?.poses && typeof data.data.poses === 'object'
                  ? Object.values(data.data.poses)
                  : data?.data && typeof data.data === 'object'
                    ? Object.entries(data.data).map(([name, pose]) => ({
                      name,
                      ...pose,
                    }))
                    : undefined;

  if (!rawPoses || rawPoses.length === 0) {
    throw new Error('Invalid or empty poses response');
  }

  // ---- Quaternion → Yaw (ROS correct) ----
  const quaternionToYaw = (z: number, w: number) =>
    Math.atan2(2 * z * w, 1 - 2 * z * z);

  // ---- Convert to Pose[] ----
  const poses: Pose[] = rawPoses.map((p: any, idx: number) => {
    const z = p?.z ?? p?.orientation?.z ?? 0;
    const w = p?.w ?? p?.orientation?.w ?? 1;

    const yaw =
      typeof p?.yaw === 'number'
        ? p.yaw
        : quaternionToYaw(z, w);

    return {
      name: String(p?.name ?? p?.pose_name ?? p?.id ?? `pose_${idx + 1}`),
      description:
        p?.description ??
        `${String(p?.name ?? `Pose ${idx + 1}`)} Position`,
      x: Number(p?.x ?? p?.pos_x ?? p?.position?.x ?? 0),
      y: Number(p?.y ?? p?.pos_y ?? p?.position?.y ?? 0),
      z: Number(p?.z ?? p?.pos_z ?? p?.position?.w ?? 0),
      w: Number(p?.w ?? p?.pos_w ?? p?.position?.z ?? 0),
      yaw,
    };
  });
  debugger;
  return poses;
}

export async function navigateToPoseApi(pose: { x: number; y: number; yaw: number }): Promise<void> {
  const ip = await getRobotIp();
  const response = await fetchWithTimeout(robotUrl(ip, 'set_poses'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pose),
  });
  debugger;
  if (!response.ok) {
    throw new Error('Pose navigation failed');
  }
}

export async function fetchTablesApi(): Promise<Table[]> {
  const ip = await getRobotIp();
  const res = await fetchWithTimeout(robotUrl(ip, 'tables'));
  if (!res.ok) {
    throw new Error('Failed to fetch tables');
  }
  const data = await res.json();
  if (!data || !data.success || !data.data.tables) {
    throw new Error('Invalid tables response format');
  }
  return data.data.tables;
}

export async function navigateToTableApi(tableName: string): Promise<void> {
  const ip = await getRobotIp();
  debugger;
  const res = await fetchWithTimeout(robotUrl(ip, 'navigate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_name: tableName }),
  });
  debugger;
  if (!res.ok) {
    throw new Error('Failed to navigate to table');
  }
}

export async function updateStatusApi(currentTable: string, robotId: string, status: 'reached' | 'completed'): Promise<void> {
  const ip = await getRobotIp();
  const res = await fetchWithTimeout(robotUrl(ip, 'update-status/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_table: currentTable,
      robot_name: robotId,
      status: status,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to update robot status');
  }
}
