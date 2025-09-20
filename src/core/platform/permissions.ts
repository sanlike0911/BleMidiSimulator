import { Platform, PermissionsAndroid, Permission } from 'react-native';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export interface BluetoothPermissions {
  bluetooth: PermissionStatus;
  bluetoothAdmin: PermissionStatus;
  location: PermissionStatus;
  bluetoothScan?: PermissionStatus;
  bluetoothAdvertise?: PermissionStatus;
  bluetoothConnect?: PermissionStatus;
}

export class PermissionManager {
  private static instance: PermissionManager;

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public async requestBluetoothPermissions(): Promise<BluetoothPermissions> {
    switch (Platform.OS) {
      case 'android':
        return await this.requestAndroidPermissions();
      case 'windows':
        return await this.requestWindowsPermissions();
      default:
        throw new Error(`Unsupported platform: ${Platform.OS}`);
    }
  }

  private async requestAndroidPermissions(): Promise<BluetoothPermissions> {
    const permissions: BluetoothPermissions = {
      bluetooth: { granted: false, canAskAgain: true },
      bluetoothAdmin: { granted: false, canAskAgain: true },
      location: { granted: false, canAskAgain: true },
    };

    try {
      // Check Android API level
      const apiLevel = Platform.Version as number;
      console.log(`Android API Level: ${apiLevel}`);

      if (apiLevel >= 31) {
        // Android 12+ (API 31+) requires new Bluetooth permissions
        await this.requestAndroid12Permissions(permissions);
      } else {
        // Android 11 and below
        await this.requestLegacyAndroidPermissions(permissions);
      }

      return permissions;

    } catch (error) {
      console.error('Failed to request Android permissions:', error);
      throw error;
    }
  }

  private async requestAndroid12Permissions(permissions: BluetoothPermissions): Promise<void> {
    // Android 12+ permissions
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    try {
      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      permissions.bluetoothScan = {
        granted: results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED,
        canAskAgain: results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      };

      permissions.bluetoothConnect = {
        granted: results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED,
        canAskAgain: results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      };

      permissions.location = {
        granted: results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED,
        canAskAgain: results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      };

      // Set legacy permissions as granted if new permissions are granted
      permissions.bluetooth.granted = permissions.bluetoothConnect?.granted || false;
      permissions.bluetoothAdmin.granted = permissions.bluetoothScan?.granted || false;

    } catch (error) {
      console.error('Failed to request Android 12+ permissions:', error);
      throw error;
    }
  }

  private async requestLegacyAndroidPermissions(permissions: BluetoothPermissions): Promise<void> {
    // Legacy Android permissions
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    try {
      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      permissions.location = {
        granted:
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
          results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED,
        canAskAgain:
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN &&
          results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      };

      // For legacy Android, Bluetooth permissions are granted by manifest
      permissions.bluetooth.granted = true;
      permissions.bluetoothAdmin.granted = true;

    } catch (error) {
      console.error('Failed to request legacy Android permissions:', error);
      throw error;
    }
  }

  private async requestWindowsPermissions(): Promise<BluetoothPermissions> {
    // Windows permissions are handled differently
    // This is a placeholder for Windows-specific permission handling
    const permissions: BluetoothPermissions = {
      bluetooth: { granted: true, canAskAgain: false, message: 'Windows Bluetooth permissions managed by system' },
      bluetoothAdmin: { granted: true, canAskAgain: false },
      location: { granted: true, canAskAgain: false },
    };

    try {
      // In a real Windows implementation, you might check:
      // - Windows.Devices.Radios.Radio.GetRadiosAsync()
      // - Windows.Devices.Bluetooth.BluetoothAdapter.GetDefaultAsync()
      console.log('Windows Bluetooth permissions - assumed granted');

      return permissions;

    } catch (error) {
      console.error('Failed to check Windows permissions:', error);
      permissions.bluetooth.granted = false;
      permissions.bluetoothAdmin.granted = false;
      return permissions;
    }
  }

  public async checkBluetoothPermissions(): Promise<BluetoothPermissions> {
    switch (Platform.OS) {
      case 'android':
        return await this.checkAndroidPermissions();
      case 'windows':
        return await this.checkWindowsPermissions();
      default:
        throw new Error(`Unsupported platform: ${Platform.OS}`);
    }
  }

  private async checkAndroidPermissions(): Promise<BluetoothPermissions> {
    const permissions: BluetoothPermissions = {
      bluetooth: { granted: false, canAskAgain: true },
      bluetoothAdmin: { granted: false, canAskAgain: true },
      location: { granted: false, canAskAgain: true },
    };

    try {
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 31) {
        // Check Android 12+ permissions
        permissions.bluetoothScan = {
          granted: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
          canAskAgain: true,
        };

        permissions.bluetoothConnect = {
          granted: await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT),
          canAskAgain: true,
        };

        permissions.bluetooth.granted = permissions.bluetoothConnect?.granted || false;
        permissions.bluetoothAdmin.granted = permissions.bluetoothScan?.granted || false;
      } else {
        // Legacy permissions are granted by manifest
        permissions.bluetooth.granted = true;
        permissions.bluetoothAdmin.granted = true;
      }

      // Check location permission (required for BLE scanning)
      permissions.location.granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

      return permissions;

    } catch (error) {
      console.error('Failed to check Android permissions:', error);
      return permissions;
    }
  }

  private async checkWindowsPermissions(): Promise<BluetoothPermissions> {
    // Windows permission checking placeholder
    return {
      bluetooth: { granted: true, canAskAgain: false },
      bluetoothAdmin: { granted: true, canAskAgain: false },
      location: { granted: true, canAskAgain: false },
    };
  }

  public getPermissionStatusMessage(permissions: BluetoothPermissions): string {
    const messages: string[] = [];

    if (!permissions.bluetooth.granted) {
      messages.push('Bluetooth permission is required');
    }

    if (!permissions.location.granted && Platform.OS === 'android') {
      messages.push('Location permission is required for BLE scanning on Android');
    }

    if (permissions.bluetoothScan && !permissions.bluetoothScan.granted) {
      messages.push('Bluetooth scan permission is required (Android 12+)');
    }

    if (permissions.bluetoothConnect && !permissions.bluetoothConnect.granted) {
      messages.push('Bluetooth connect permission is required (Android 12+)');
    }

    if (messages.length === 0) {
      return 'All required permissions are granted';
    }

    return messages.join(', ');
  }

  public areAllPermissionsGranted(permissions: BluetoothPermissions): boolean {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 31) {
        // Android 12+
        return (
          (permissions.bluetoothScan?.granted || false) &&
          (permissions.bluetoothConnect?.granted || false) &&
          permissions.location.granted
        );
      } else {
        // Legacy Android
        return permissions.location.granted;
      }
    }

    // Windows and other platforms
    return permissions.bluetooth.granted;
  }

  public canRequestPermissions(permissions: BluetoothPermissions): boolean {
    return (
      permissions.bluetooth.canAskAgain ||
      permissions.location.canAskAgain ||
      (permissions.bluetoothScan?.canAskAgain || false) ||
      (permissions.bluetoothConnect?.canAskAgain || false)
    );
  }
}