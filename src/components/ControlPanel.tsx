import { useState } from 'react';
import type { JsonCmdLookUp } from '@/pages/Index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Power,
  Square,
  Zap,
  Settings,
  Shield,
  Gauge,
  Bluetooth
} from 'lucide-react';
import { useGameServer } from '@/hooks/useGameServer';
import { useWebBluetooth } from '@/hooks/useWebBluetooth';
import { useAuth } from '@/hooks/useAuth';

interface ControlPanelProps {
  protocolNames: string[];
  selectedProtocol: string;
  onProtocolChange: (value: string) => void;
  jsonCmdLookUp: JsonCmdLookUp | null;
}

export const ControlPanel = ({ protocolNames, selectedProtocol, onProtocolChange, jsonCmdLookUp }: ControlPanelProps) => {
  const [speed, setSpeed] = useState([50]);
  const [power, setPower] = useState([75]);
  const [sensitivity, setSensitivity] = useState([60]);
  const [isSwitch1, setIsSwitch1] = useState(false);
  const [isSwitch2, setIsSwitch2] = useState(false);

  const { isGameServerConnected, sendBuddyCommand } = useGameServer();
  const { isConnected: isBleConnected, scanForDevices, connectToDevice, disconnect, writeCharacteristic } = useWebBluetooth();
  const { guestRole } = useAuth();
  const [isManual, setIsManual] = useState(false);

  const BLE_SERVICE_UUID = "0000dfb0-0000-1000-8000-00805f9b34fb";
  const BLE_CHAR_UUID = "0000dfb1-0000-1000-8000-00805f9b34fb";

  const sendManualCommand = async (key: string) => {
    if (!jsonCmdLookUp) {
      console.warn('No protocol selected, cannot send manual command');
      return;
    }
    const cmd = jsonCmdLookUp[key];
    if (typeof cmd !== 'string') {
      console.warn(`Manual command "${key}" not found in protocol`);
      return;
    }
    if (!isBleConnected) {
      console.warn('BLE not connected, cannot send manual command');
      return;
    }
    const bytes = new Uint8Array(cmd.length);
    for (let i = 0; i < cmd.length; i++) bytes[i] = cmd.charCodeAt(i) & 0xff;
    await writeCharacteristic(BLE_SERVICE_UUID, BLE_CHAR_UUID, bytes);
  };

  // goto: chrome://bluetooth-internals/#devices and select start scan to see list of devices and discover services
  const handleBleConnect = async () => {
    if (isBleConnected) {
      await disconnect();
      return;
    }
    let options = {
      // optionalServices: ["00001812-0000-1000-8000-00805f9b34fb", "0000dfb0-0000-1000-8000-00805f9b34fb"],
      acceptAllDevices: true
    };
    const device = await scanForDevices(options);
    if (device) {
      await connectToDevice(device);
    }
  };

  const handleSwitch1 = (value) => {
    setIsSwitch1(value);
    const key = value ? 'sw1On' : 'sw1Off';
    if (isManual) {
      console.log(`manual ${key}`);
      sendManualCommand(key);
      return;
    }
    if (isGameServerConnected && value) {
      console.log("switch1-on");
      sendBuddyCommand("sw1", "sw1On"); //TODO: make constans
    } else if (value === false) {
      console.log("switch1-off");
      sendBuddyCommand("sw1", "sw1Off");
    }
  }

  const handleSwitch2 = (value) => {
    setIsSwitch2(value);
    const key = value ? 'sw2On' : 'sw2Off';
    if (isManual) {
      console.log(`manual ${key}`);
      sendManualCommand(key);
      return;
    }
    if (isGameServerConnected && value) {
      console.log("switch2-on");
      sendBuddyCommand("sw2", "sw2On"); //TODO: make constans
    } else if (value === false) {
      console.log("switch2-off");
      sendBuddyCommand("sw2", "sw2Off");
    }
  }

  return (
    <Card className="p-4 h-fit-content">
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Control Panel
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">Manual</span>
            <Switch checked={isManual} onCheckedChange={setIsManual} />
          </div>
        </div>

        {/* Emergency Controls */}
        {guestRole !== 'operator' && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Emergency</h4>
          <Button
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <Square className="w-4 h-4 mr-2" />
            EMERGENCY STOP
          </Button>
        </div>
        )}

        {/* Connectivity */}
        {guestRole !== 'operator' && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Connectivity</h4>
          <Button
            variant={isBleConnected ? "secondary" : "outline"}
            className="w-full"
            onClick={handleBleConnect}
            disabled={guestRole !== 'robot' || !selectedProtocol}
          >
            <Bluetooth className="w-4 h-4 mr-2" />
            {isBleConnected ? "BLE Connected" : "BLE Connect"}
          </Button>
        </div>
        )}

        {/* Protocol Selection */}
        {guestRole !== 'operator' && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Protocol</h4>
          <Select value={selectedProtocol} onValueChange={onProtocolChange} disabled={guestRole !== 'robot'}>
            <SelectTrigger className="w-full" disabled={guestRole !== 'robot'}>
              <SelectValue placeholder="Select a protocol" />
            </SelectTrigger>
            <SelectContent>
              {protocolNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}

        {/* Mode Controls */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Operating Mode</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4" />
              <span className="text-sm">Switch 1</span>
            </div>
            <Switch
              checked={isSwitch1}
              onCheckedChange={handleSwitch1}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Switch 2</span>
            </div>
            <Switch
              checked={isSwitch2}
              onCheckedChange={handleSwitch2}
            />
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Parameters</h4>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm flex items-center gap-2">
                  <Gauge className="w-3 h-3" />
                  Speed
                </label>
                <span className="text-xs text-muted-foreground">{speed[0]}%</span>
              </div>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Power
                </label>
                <span className="text-xs text-muted-foreground">{power[0]}%</span>
              </div>
              <Slider
                value={power}
                onValueChange={setPower}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  Sensitivity
                </label>
                <span className="text-xs text-muted-foreground">{sensitivity[0]}%</span>
              </div>
              <Slider
                value={sensitivity}
                onValueChange={setSensitivity}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};