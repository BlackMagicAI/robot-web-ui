import { useState } from 'react';
import { VirtualJoystick } from '@/components/VirtualJoystick';
import { CameraViewer } from '@/components/CameraViewer';
import { ControlPanel } from '@/components/ControlPanel';
import { MessagePanel } from '@/components/MessagePanel';
import { StatusBar } from '@/components/StatusBar';

interface JoystickData {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

const Index = () => {
  const [isRobotConnected, setIsRobotConnected] = useState(true);
  const [joystickData, setJoystickData] = useState<JoystickData>({ x: 0, y: 0, distance: 0, angle: 0 });

  const handleJoystickMove = (data: JoystickData) => {
    setJoystickData(data);
    // In a real application, you would send this data to your robot control API
    console.log('Joystick moved:', data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar */}
      <StatusBar isConnected={isRobotConnected} />
      
      {/* Main Content */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-[calc(100vh-64px)]">
        {/* Left Column - Joystick and Controls */}
        <div className="space-y-4">
          <VirtualJoystick onMove={handleJoystickMove} size={200} />
          <ControlPanel />
        </div>
        
        {/* Center Column - Camera Feed */}
        <div className="lg:col-span-2">
          <CameraViewer 
            isConnected={isRobotConnected} 
            title="Main Camera Feed" 
          />
        </div>
        
        {/* Right Column - Messages */}
        <div className="lg:col-span-1">
          <MessagePanel />
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