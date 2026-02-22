import { useState, useEffect } from 'react';
import { VirtualJoystick } from '@/components/VirtualJoystick';
import { CameraViewer } from '@/components/CameraViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { MessagePanel } from '@/components/MessagePanel';
import { StatusBar } from '@/components/StatusBar';
import { RoomSelect, type Room } from '@/components/RoomSelect';
import { RoomParticipants } from '@/components/RoomParticipants';

interface JoystickData {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

export type JsonCmdLookUp = Record<string, string | Record<string, number> | boolean>;

const Index = () => {
  const [isRobotConnected, setIsRobotConnected] = useState(true);
  const [joystickData, setJoystickData] = useState<JoystickData>({ x: 0, y: 0, distance: 0, angle: 0 });
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>();
  const [protocolsData, setProtocolsData] = useState<Record<string, JsonCmdLookUp>>({});
  const [selectedProtocol, setSelectedProtocol] = useState<string>('');

  const jsonCmdLookUp: JsonCmdLookUp | null = selectedProtocol ? protocolsData[selectedProtocol] ?? null : null;

  useEffect(() => {
    fetch('/jsonprotocols.json')
      .then(res => res.json())
      .then(data => setProtocolsData(data))
      .catch(err => console.error('Failed to load protocols:', err));
  }, []);

  const handleJoystickMove = (data: JoystickData) => {
    setJoystickData(data);
    // In a real application, you would send this data to your robot control API
    console.log('Joystick moved:', data);
  };

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar */}
      <StatusBar isConnected={isRobotConnected} />
      
      {/* Main Content */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-64px)]">
        {/* Left Column - Control Panel */}
        <div className="space-y-4">
          <ControlPanel
            protocolNames={Object.keys(protocolsData)}
            selectedProtocol={selectedProtocol}
            onProtocolChange={setSelectedProtocol}
            jsonCmdLookUp={jsonCmdLookUp}
          />
          <MessagePanel />
        </div>
        
        {/* Middle Column - Camera Feed & Movement Control */}
        <div className="space-y-4">
          <CameraViewer 
            title="Main Camera Feed"
          />
          <VirtualJoystick onMove={handleJoystickMove} size={180} jsonCmdLookUp={jsonCmdLookUp} />
        </div>
        
        {/* Right Column - Console & Room Management */}
        <div className="space-y-4">         
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

      {/* Debug Info (can be removed in production) */}
      <div className="fixed bottom-4 left-4 bg-card border border-border rounded-lg p-2 text-xs font-mono opacity-75">
        <div>X: {joystickData.x.toFixed(2)}</div>
        <div>Y: {joystickData.y.toFixed(2)}</div>
        <div>Distance: {joystickData.distance.toFixed(2)}</div>
        <div>Angle: {joystickData.angle.toFixed(0)}°</div>
      </div>
    </div>
  );
};

export default Index;