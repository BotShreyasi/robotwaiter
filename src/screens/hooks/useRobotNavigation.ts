// src/screens/hooks/useRobotNavigation.ts
import { useState } from 'react';
import { fetchPosesApi, navigateToPoseApi, fetchTablesApi, navigateToTableApi } from '../../api/RobotApi';
import { Pose, Table } from '../../types';

export const useRobotNavigation = () => {
  const [isPoseButtonModalVisible, setPoseButtonModalVisible] = useState(false);
  const [isPoseModalVisible, setIsPoseModalVisible] = useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [poseError, setPoseError] = useState('');
  const [tableError, setTableError] = useState('');

  const handleFetchPoses = async () => {
    try {
      const fetchedPoses = await fetchPosesApi();
      // "Set Initial Pose" should primarily show initial/dock options (if present)
      // const hasInitialOrDock = fetchedPoses.some((p) => p.name === 'initial_pose' || p.name === 'dock');
      // setPoses(hasInitialOrDock ? fetchedPoses.filter((p) => p.name === 'initial_pose' || p.name === 'dock') : fetchedPoses);
      setPoses(fetchedPoses);
      setPoseError('');
      setPoseButtonModalVisible(false);
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
        z: parseFloat(pose.z),
        w: parseFloat(pose.w),
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
      setPoseButtonModalVisible(false);
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
  return {
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
  };
};
