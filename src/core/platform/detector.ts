import { Platform } from 'react-native';
import type { Platform as PlatformType } from '../../types';

/**
 * Detects the current platform
 */
export const getCurrentPlatform = (): PlatformType => {
  return Platform.OS as PlatformType;
};

/**
 * Platform capability checks
 */
export const platformCapabilities = {
  supportsBLECentral: (): boolean => {
    const platform = getCurrentPlatform();
    return ['ios', 'android', 'windows', 'macos'].includes(platform);
  },

  supportsBLEPeripheral: (): boolean => {
    const platform = getCurrentPlatform();
    // Note: Windows and Android peripheral support requires custom native modules
    return ['ios', 'macos'].includes(platform);
  },

  supportsBackgroundBLE: (): boolean => {
    const platform = getCurrentPlatform();
    return ['ios', 'android'].includes(platform);
  },

  requiresLocationPermission: (): boolean => {
    const platform = getCurrentPlatform();
    return platform === 'android';
  },

  supportsBluetoothPermissions: (): boolean => {
    const platform = getCurrentPlatform();
    return ['ios', 'android', 'windows', 'macos'].includes(platform);
  },
};

/**
 * Get platform-specific configuration
 */
export const getPlatformConfig = () => {
  const platform = getCurrentPlatform();

  const configs = {
    ios: {
      blePermissionKey: 'NSBluetoothAlwaysUsageDescription',
      backgroundModes: ['bluetooth-central', 'bluetooth-peripheral'],
      maxConnections: 8,
      scanTimeout: 10000,
    },
    android: {
      permissions: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_ADVERTISE',
      ],
      maxConnections: 8,
      scanTimeout: 10000,
    },
    windows: {
      capabilities: ['bluetooth'],
      maxConnections: 8,
      scanTimeout: 10000,
    },
    macos: {
      blePermissionKey: 'NSBluetoothAlwaysUsageDescription',
      maxConnections: 8,
      scanTimeout: 10000,
    },
  };

  return configs[platform] || configs.ios;
};