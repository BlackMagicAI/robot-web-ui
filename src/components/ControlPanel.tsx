import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Power,
  Square,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Settings,
  Shield,
  Gauge,
  Bluetooth
} from 'lucide-react';
import { useGameServer } from '@/hooks/useGameServer';
import { useWebBluetooth } from '@/hooks/useWebBluetooth';
import { useAuth } from '@/hooks/useAuth';

export const ControlPanel = () => {
  const [speed, setSpeed] = useState([50]);
  const [power, setPower] = useState([75]);
  const [sensitivity, setSensitivity] = useState([60]);
  const [isSwitch1, setIsSwitch1] = useState(false);
  const [isSwitch2, setIsSwitch2] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { isGameServerConnected, sendBuddyCommand } = useGameServer();
  const { isConnected: isBleConnected, scanForDevices, connectToDevice } = useWebBluetooth();
  const { guestRole } = useAuth();

  const handleBleConnect = async () => {
    let options = {
      filters: [
        { services: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"] }
      ]
    };
    const device = await scanForDevices(options);
    if (device) {
      await connectToDevice(device);
    }

  };

  const handleSwitch1 = (value) => {
    setIsSwitch1(value);
    if (isGameServerConnected && value) {
      console.log("switch1-on");
      sendBuddyCommand("switch1", 1);
    } else if (value === false) {
      console.log("switch1-off");
      sendBuddyCommand("switch1", 0);
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
        </div>

        {/* Emergency Controls */}
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

        {/* Connectivity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Connectivity</h4>
          <Button
            variant={isBleConnected ? "secondary" : "outline"}
            className="w-full"
            onClick={handleBleConnect}
            disabled={guestRole !== 'robot'}
          >
            <Bluetooth className="w-4 h-4 mr-2" />
            {isBleConnected ? "BLE Connected" : "BLE Connect"}
          </Button>
        </div>

        {/* Main Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">System Status</h4>
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "ACTIVE" : "STANDBY"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isRunning ? "secondary" : "default"}
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Pause" : "Start"}
            </Button>

            <Button variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

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
              onCheckedChange={setIsSwitch2}
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