import { useState, useEffect } from 'react';
import { VirtualJoystick } from '@/components/VirtualJoystick';
import { CameraViewer } from '@/components/CameraViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { MessagePanel } from '@/components/MessagePanel';
import { StatusBar } from '@/components/StatusBar';
import { RoomSelect, type Room } from '@/components/RoomSelect';
import { RoomParticipants } from '@/components/RoomParticipants';
import { useGameServer } from '@/hooks/useGameServer';
import { useWebBluetooth } from '@/hooks/useWebBluetooth';

interface JoystickData {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

export type JsonCmdLookUp = Record<string, string | Record<string, number> | boolean>;

const Index = () => {
  const [isRobotConnected, setIsRobotConnected] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>();
  const [protocolsData, setProtocolsData] = useState<Record<string, JsonCmdLookUp>>({});
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');
  const [isManual, setIsManual] = useState(false);
  const { setJsonCmdLookUp, sendBuddyCommand, isGameServerConnected } = useGameServer();
  const { isConnected: isBleConnected, writeCharacteristic } = useWebBluetooth();

  const BLE_SERVICE_UUID = "0000dfb0-0000-1000-8000-00805f9b34fb";
  const BLE_CHAR_UUID = "0000dfb1-0000-1000-8000-00805f9b34fb";

  useEffect(() => {
    if (!isGameServerConnected) {
      setSelectedRoom(undefined);
    }
  }, [isGameServerConnected]);

  const jsonCmdLookUp: JsonCmdLookUp | null = selectedProtocol ? protocolsData[selectedProtocol] ?? null : null;

  useEffect(() => {
    setJsonCmdLookUp(jsonCmdLookUp);
  }, [jsonCmdLookUp, setJsonCmdLookUp]);

  useEffect(() => {
    fetch('/jsonprotocols.json')
      .then(res => res.json())
      .then(data => setProtocolsData(data))
      .catch(err => console.error('Failed to load protocols:', err));
  }, []);

  const handleJoystickMove = (data: JoystickData) => {
    let cmdKey = 'stop';
    if (data.angle >= 45 && data.angle <= 135 && data.distance > .75) cmdKey = 'forward';
    else if (data.angle < 225 && data.angle > 135 && data.distance > .75) cmdKey = 'left';
    else if ((data.angle < 45 || data.angle > 320) && data.distance > .75) cmdKey = 'right';
    else if (data.angle >= 225 && data.angle <= 320 && data.distance > .75) cmdKey = 'backwards';

    if (isManual) {
      if (!jsonCmdLookUp || !isBleConnected) return;
      const cmd = jsonCmdLookUp[cmdKey];
      if (typeof cmd !== 'string') return;
      const bytes = new Uint8Array(cmd.length);
      for (let i = 0; i < cmd.length; i++) bytes[i] = cmd.charCodeAt(i) & 0xff;
      writeCharacteristic(BLE_SERVICE_UUID, BLE_CHAR_UUID, bytes);
      return;
    }
    sendBuddyCommand(cmdKey, cmdKey);
  };

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Status Bar */}
      <StatusBar isConnected={isRobotConnected} />
      
      {/* Main Content */}
      <div className="grid h-auto min-h-[calc(100vh-64px)] w-full max-w-full grid-cols-1 gap-4 overflow-x-hidden p-3 sm:p-4 lg:h-[calc(100vh-64px)] lg:grid-cols-3">
        {/* Left Column - Control Panel */}
        <div className="space-y-4 min-w-0">
          <ControlPanel
            protocolNames={Object.keys(protocolsData)}
            selectedProtocol={selectedProtocol}
            onProtocolChange={setSelectedProtocol}
            jsonCmdLookUp={jsonCmdLookUp}
            isManual={isManual}
            onManualChange={setIsManual}
          />
          <MessagePanel />
        </div>
        
        {/* Middle Column - Camera Feed & Movement Control */}
        <div className="space-y-4 min-w-0">
          <CameraViewer 
            title="Main Camera Feed"
          />
          <VirtualJoystick onMove={handleJoystickMove} size={180} jsonCmdLookUp={jsonCmdLookUp} sendBuddyCommand={sendBuddyCommand} />
        </div>
        
        {/* Right Column - Console & Room Management */}
        <div className="space-y-4 min-w-0">
          <RoomSelect onRoomSelect={handleRoomSelect} selectedRoom={selectedRoom} />
          
          {selectedRoom ? (
            <RoomParticipants room={selectedRoom} />
          ) : (
            <div className="h-[250px] border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Select a room to see participants</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;