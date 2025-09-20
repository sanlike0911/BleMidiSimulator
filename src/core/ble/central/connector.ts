import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { BluetoothDevice, BluetoothConnection, BluetoothService, BluetoothCharacteristic, ConnectionOptions, ConnectionEvent } from '../../../types/ble';
import { MIDI_SERVICE_UUID, MIDI_CHARACTERISTIC_UUID } from '../../../constants/midi';

export class BleConnector {
  private manager: BleManager;
  private connections: Map<string, BluetoothConnection> = new Map();
  private eventListeners: Map<ConnectionEvent, ((data: any) => void)[]> = new Map();

  constructor(manager: BleManager) {
    this.manager = manager;
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('connected', []);
    this.eventListeners.set('disconnected', []);
    this.eventListeners.set('error', []);
  }

  public addEventListener(event: ConnectionEvent, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  public removeEventListener(event: ConnectionEvent, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private emit(event: ConnectionEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  public async connect(device: BluetoothDevice, options?: ConnectionOptions): Promise<BluetoothConnection> {
    try {
      // Check if already connected
      if (this.connections.has(device.id)) {
        const existingConnection = this.connections.get(device.id)!;
        if (existingConnection.isConnected) {
          return existingConnection;
        }
      }

      console.log(`Connecting to device: ${device.name || device.id}`);

      // Connect to the device
      const connectedDevice = await this.manager.connectToDevice(device.id, {
        autoConnect: options?.autoConnect || false,
        requestMTU: options?.requestMTU || 185, // Optimal for MIDI
        timeout: options?.timeout || 10000,
      });

      // Discover services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Get services
      const services = await this.discoverServices(connectedDevice);

      // Create connection object
      const connection: BluetoothConnection = {
        deviceId: device.id,
        isConnected: true,
        services,
        onDisconnected: () => {
          this.handleDisconnection(device.id);
        },
      };

      // Set up disconnection monitoring
      connectedDevice.onDisconnected((error, disconnectedDevice) => {
        console.log(`Device disconnected: ${disconnectedDevice?.name || disconnectedDevice?.id}`);
        if (error) {
          console.error('Disconnection error:', error);
        }
        this.handleDisconnection(device.id);
      });

      this.connections.set(device.id, connection);
      this.emit('connected', { device, connection });

      console.log(`Successfully connected to: ${device.name || device.id}`);
      return connection;

    } catch (error) {
      console.error(`Failed to connect to device ${device.id}:`, error);
      this.emit('error', { device, error });
      throw error;
    }
  }

  public async disconnect(deviceId: string): Promise<void> {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        console.warn(`No connection found for device: ${deviceId}`);
        return;
      }

      await this.manager.cancelDeviceConnection(deviceId);
      this.handleDisconnection(deviceId);

    } catch (error) {
      console.error(`Failed to disconnect from device ${deviceId}:`, error);
      this.emit('error', { deviceId, error });
      throw error;
    }
  }

  public async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(deviceId =>
      this.disconnect(deviceId).catch(error => console.error(`Failed to disconnect ${deviceId}:`, error))
    );

    await Promise.all(disconnectPromises);
  }

  public isConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    return connection?.isConnected || false;
  }

  public getConnection(deviceId: string): BluetoothConnection | undefined {
    return this.connections.get(deviceId);
  }

  public getConnectedDevices(): BluetoothConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected);
  }

  public async readCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<ArrayBuffer> {
    try {
      const characteristic = await this.manager.readCharacteristicForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID
      );

      if (!characteristic.value) {
        throw new Error('No data received from characteristic');
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(characteristic.value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes.buffer;

    } catch (error) {
      console.error(`Failed to read characteristic ${characteristicUUID}:`, error);
      throw error;
    }
  }

  public async writeCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string, data: ArrayBuffer): Promise<void> {
    try {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(data);
      const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);

      await this.manager.writeCharacteristicWithResponseForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        base64Data
      );

    } catch (error) {
      console.error(`Failed to write characteristic ${characteristicUUID}:`, error);
      throw error;
    }
  }

  public async writeCharacteristicWithoutResponse(deviceId: string, serviceUUID: string, characteristicUUID: string, data: ArrayBuffer): Promise<void> {
    try {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(data);
      const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);

      await this.manager.writeCharacteristicWithoutResponseForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        base64Data
      );

    } catch (error) {
      console.error(`Failed to write characteristic without response ${characteristicUUID}:`, error);
      throw error;
    }
  }

  public async subscribeToCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string, callback: (data: ArrayBuffer) => void): Promise<void> {
    try {
      await this.manager.monitorCharacteristicForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error(`Characteristic monitoring error:`, error);
            return;
          }

          if (characteristic?.value) {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(characteristic.value);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            callback(bytes.buffer);
          }
        }
      );

    } catch (error) {
      console.error(`Failed to subscribe to characteristic ${characteristicUUID}:`, error);
      throw error;
    }
  }

  public async unsubscribeFromCharacteristic(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<void> {
    try {
      // In react-native-ble-plx, we need to cancel the monitoring subscription
      // This is typically handled by keeping track of subscription objects
      console.log(`Unsubscribing from characteristic: ${characteristicUUID}`);

    } catch (error) {
      console.error(`Failed to unsubscribe from characteristic ${characteristicUUID}:`, error);
      throw error;
    }
  }

  private async discoverServices(device: Device): Promise<BluetoothService[]> {
    try {
      const services = await device.services();
      const bluetoothServices: BluetoothService[] = [];

      for (const service of services) {
        const characteristics = await service.characteristics();
        const bluetoothCharacteristics: BluetoothCharacteristic[] = characteristics.map(char => ({
          uuid: char.uuid,
          serviceUUID: service.uuid,
          isReadable: char.isReadable,
          isWritable: char.isWritableWithResponse || char.isWritableWithoutResponse,
          isNotifiable: char.isNotifiable || char.isIndicatable,
        }));

        bluetoothServices.push({
          uuid: service.uuid,
          characteristics: bluetoothCharacteristics,
        });
      }

      return bluetoothServices;

    } catch (error) {
      console.error('Failed to discover services:', error);
      throw error;
    }
  }

  private handleDisconnection(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.isConnected = false;
      this.emit('disconnected', { deviceId, connection });
    }
  }

  public async getMidiCharacteristic(deviceId: string): Promise<BluetoothCharacteristic | undefined> {
    const connection = this.connections.get(deviceId);
    if (!connection) {
      return undefined;
    }

    for (const service of connection.services) {
      if (service.uuid.toLowerCase() === MIDI_SERVICE_UUID.toLowerCase()) {
        return service.characteristics.find(
          char => char.uuid.toLowerCase() === MIDI_CHARACTERISTIC_UUID.toLowerCase()
        );
      }
    }

    return undefined;
  }

  public destroy(): void {
    this.disconnectAll();
    this.connections.clear();
    this.eventListeners.clear();
  }
}