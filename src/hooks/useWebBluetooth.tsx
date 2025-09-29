import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface WebBluetoothContextType {
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
      //const server = await device.gatt.connect();

      device.gatt.connect()
      .then(server => {
        console.log(2)
        setGattServer(server);
        return server.getPrimaryServices();
      })
      .then(services => {
        console.log(3)
        console.log(services);
        //return service.getCharacteristic('battery_level');
        return services[0].getCharacteristics();
      })
       .then(characteristics => {
        console.log(4)
        console.log(characteristics);
        return characteristics[0].readValue()
      })
      .then(value => {
        console.log(5)
        console.log(value.getUint8(0))
      })
      .catch(error => { 
         console.log('error: ', error) 
      })

      // setGattServer(server);
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
    if (!characteristic) return false;

    try {
      await characteristic.writeValue(value);
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
  };

  return (
    <WebBluetoothContext.Provider value={value}>
      {children}
    </WebBluetoothContext.Provider>
  );
};