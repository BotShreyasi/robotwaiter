// src/api/RobotApi.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pose, Table, RobotStatus } from '../types';

const getRobotIp = async (): Promise<string> => {
  const ip = await AsyncStorage.getItem('robot_ip');
  if (!ip) {
    throw new Error('Robot IP not found in storage. Please set it via the modal.');
  }
  return ip;
};

const robotUrl = (ip: string, path: string) => `http://${ip}:8080/api/robot/${path}`;

export async function checkRobotStatus(ip: string): Promise<RobotStatus> {
  const response = await fetch(robotUrl(ip, 'status'));
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  return response.json();
}

export async function startSpeakingApi(): Promise<void> {
  const ip = await getRobotIp();
  const res = await fetch(robotUrl(ip, 'stt_start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_speaking: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to start STT: ${res.statusText}`);
  }
}

export async function stopSpeakingApi(): Promise<void> {
  const ip = await getRobotIp();
  const res = await fetch(robotUrl(ip, 'stt_stop'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_speaking: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to stop STT: ${res.statusText}`);
  }
}

export async function fetchPosesApi(): Promise<Pose[]> {
  debugger;
  const ip = await getRobotIp();
  const response = await fetch(robotUrl(ip, 'set_poses'));
  if (!response.ok) {
    throw new Error('Failed to fetch poses');
  }
  const data = await response.json();
  if (!data || !data.set_poses) {
    throw new Error('Invalid poses response format');
  }
  // Convert API data to Pose array
  return data.set_poses.map((p: any) => ({
    name: p.name,
    description: p.description,
    x: String(p.x),
    y: String(p.y),
    yaw: String(p.yaw),
  }));
}

export async function navigateToPoseApi(pose: { x: number; y: number; yaw: number }): Promise<void> {
  const ip = await getRobotIp();
  const response = await fetch(robotUrl(ip, 'set_pose'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pose),
  });
  if (!response.ok) {
    throw new Error('Pose navigation failed');
  }
}

export async function fetchTablesApi(): Promise<Table[]> {
  const ip = await getRobotIp();
  const res = await fetch(robotUrl(ip, 'tables'));
  if (!res.ok) {
    throw new Error('Failed to fetch tables');
  }
  const data = await res.json();
  if (!data || !data.success || !data.tables) {
    throw new Error('Invalid tables response format');
  }
  return data.tables;
}

export async function navigateToTableApi(tableName: string): Promise<void> {
  const ip = await getRobotIp();
  const res = await fetch(robotUrl(ip, 'navigate_table'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_name: tableName }),
  });
  if (!res.ok) {
    throw new Error('Failed to navigate to table');
  }
}

export async function updateStatusApi(currentTable: string, robotId: string, status: 'reached' | 'completed'): Promise<void> {
  const ip = await getRobotIp();
  const res = await fetch(robotUrl(ip, 'update-status/'), {
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