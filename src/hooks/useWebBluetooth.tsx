import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface WebBluetoothContextType {
  isConnected: boolean;
  isScanning: boolean;
  connectedDevice: BluetoothDevice | null;
  connectionError: string | null;
  scanForDevices: (options?: RequestDeviceOptions) => Promise<BluetoothDevice | null>;
  connectToDevice: (device: BluetoothDevice) => Promise<boolean>;
  disconnect: () => Promise<void>;
  writeCharacteristic: (serviceUuid: string, characteristicUuid: string, value: BufferSource) => Promise<boolean>;
  readCharacteristic: (serviceUuid: string, characteristicUuid: string) => Promise<DataView | null>;
  subscribeToNotifications: (
    serviceUuid: string,
    characteristicUuid: string,
    callback: (value: DataView) => void
  ) => Promise<boolean>;
  unsubscribeFromNotifications: (serviceUuid: string, characteristicUuid: string) => Promise<boolean>;
  getCharacteristic: (serviceUuid: string, characteristicUuid: string) => Promise<BluetoothRemoteGATTCharacteristic | null>;
}

const WebBluetoothContext = createContext<WebBluetoothContextType | undefined>(undefined);

export const useWebBluetooth = () => {
  const context = useContext(WebBluetoothContext);
  if (context === undefined) {
    throw new Error('useWebBluetooth must be used within a WebBluetoothProvider');
  }
  return context;
};

interface WebBluetoothProviderProps {
  children: ReactNode;
}

export const WebBluetoothProvider: React.FC<WebBluetoothProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [gattServer, setGattServer] = useState<BluetoothRemoteGATTServer | null>(null);
  const [characteristics, setCharacteristics] = useState<Map<string, BluetoothRemoteGATTCharacteristic>>(new Map());

  // Check if Web Bluetooth API is supported
  const isBluetoothSupported = (): boolean => {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  };

  const scanForDevices = useCallback(async (options?: RequestDeviceOptions): Promise<BluetoothDevice | null> => {
    if (!isBluetoothSupported()) {
      setConnectionError('Web Bluetooth API is not supported in this browser');
      return null;
    }

    setIsScanning(true);
    setConnectionError(null);

    try {
      const defaultOptions: RequestDeviceOptions = {
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'generic_attribute']
      };
console.log("Scan$$$$$$$$");
      const device = await navigator.bluetooth.requestDevice(options || defaultOptions);
      setIsScanning(false);
      return device as BluetoothDevice;
    } catch (error) {
      setIsScanning(false);
      setConnectionError(`Failed to scan for devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, []);

  const connectToDevice = useCallback(async (device: BluetoothDevice): Promise<boolean> => {

    if (!device.gatt) {
      setConnectionError('Device does not support GATT');
      return false;
    }

    try {
      setConnectionError(null);

      device.gatt.connect()
        .then(server => {
          setGattServer(server);
          return server.getPrimaryServices();
        })
        .catch(error => {
          console.log('error: ', error)
        })

      setConnectedDevice(device);
      setIsConnected(true);

      // Handle device disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setConnectedDevice(null);
        setGattServer(null);
        setCharacteristics(new Map());
        console.log('Device disconnected');
      });

      return true;
    } catch (error) {
      setConnectionError(`Failed to connect to device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    if (gattServer && gattServer.connected) {
      gattServer.disconnect();
    }
    setIsConnected(false);
    setConnectedDevice(null);
    setGattServer(null);
    setCharacteristics(new Map());
  }, [gattServer]);

  const getCharacteristic = async (serviceUuid: string, characteristicUuid: string): Promise<BluetoothRemoteGATTCharacteristic | null> => {
    if (!gattServer || !gattServer.connected) {
      setConnectionError('Not connected to any device');
      return null;
    }

    const key = `${serviceUuid}:${characteristicUuid}`;

    // Check if we already have this characteristic cached
    if (characteristics.has(key)) {
      return characteristics.get(key)!;
    }

    try {
      const service = await gattServer.getPrimaryService(serviceUuid);
      console.log("service^^^^^^");
      console.log(service);
      const characteristic = await service.getCharacteristic(characteristicUuid);

      // Cache the characteristic
      setCharacteristics(prev => new Map(prev.set(key, characteristic)));

      return characteristic;
    } catch (error) {
      setConnectionError(`Failed to get characteristic: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const writeCharacteristic = useCallback(async (
    serviceUuid: string,
    characteristicUuid: string,
    value: BufferSource
  ): Promise<boolean> => {
    const characteristic = await getCharacteristic(serviceUuid, characteristicUuid);
    //const characteristic = await getCharacteristic("0000dfb0-0000-1000-8000-00805f9b34fb", "0000dfb1-0000-1000-8000-00805f9b34fb");
    console.log("-------------");
    console.log(characteristic);
    if (!characteristic) return false;
    try {
      // var text = "l0,0\n"
      // const encoder = new TextEncoder();
      // const data = encoder.encode(text);
      // var resp = await characteristic.writeValueWithResponse(data);
      // console.log(resp);
      // await characteristic.writeValue(value);
      // characteristic.writeValueWithResponse(value)
      characteristic.writeValueWithoutResponse(value)
      .then(() => {
        console.log("Data written successfully: " + value);
      })
      .catch(error => {
        console.error("Error writing data: " + error);
      });
      return true;
    } catch (error) {
      setConnectionError(`Failed to write to characteristic: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [gattServer, characteristics]);

  const readCharacteristic = useCallback(async (
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<DataView | null> => {
    const characteristic = await getCharacteristic(serviceUuid, characteristicUuid);
    if (!characteristic) return null;

    try {
      const value = await characteristic.readValue();
      return value;
    } catch (error) {
      setConnectionError(`Failed to read from characteristic: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [gattServer, characteristics]);

  const subscribeToNotifications = useCallback(async (
    serviceUuid: string,
    characteristicUuid: string,
    callback: (value: DataView) => void
  ): Promise<boolean> => {
    const characteristic = await getCharacteristic(serviceUuid, characteristicUuid);
    if (!characteristic) return false;

    try {
      await characteristic.startNotifications();

      const handleNotification = (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          callback(target.value);
        }
      };

      characteristic.addEventListener('characteristicvaluechanged', handleNotification);
      return true;
    } catch (error) {
      setConnectionError(`Failed to subscribe to notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [gattServer, characteristics]);

  const unsubscribeFromNotifications = useCallback(async (
    serviceUuid: string,
    characteristicUuid: string
  ): Promise<boolean> => {
    const characteristic = await getCharacteristic(serviceUuid, characteristicUuid);
    if (!characteristic) return false;

    try {
      await characteristic.stopNotifications();
      return true;
    } catch (error) {
      setConnectionError(`Failed to unsubscribe from notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [gattServer, characteristics]);

  const value: WebBluetoothContextType = {
    isConnected,
    isScanning,
    connectedDevice,
    connectionError,
    scanForDevices,
    connectToDevice,
    disconnect,
    writeCharacteristic,
    readCharacteristic,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    getCharacteristic
  };

  return (
    <WebBluetoothContext.Provider value={value}>
      {children}
    </WebBluetoothContext.Provider>
  );
};