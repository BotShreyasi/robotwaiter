// src/screens/hooks/useOrientation.ts
import { useState, useEffect } from 'react';
import Orientation, { LANDSCAPE_LEFT, LANDSCAPE_RIGHT } from 'react-native-orientation-locker';
import { OrientationString } from '../utils';

export const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const lockOrientation = () => {
      try {
        Orientation.lockToLandscape();

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
    Orientation.addOrientationListener(handleOrientationChange);

    return () => {
      Orientation.removeOrientationListener(handleOrientationChange);
    };
  }, []);

  return { isLandscape };
};
