import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  Signal, 
  Clock,
  MapPin,
  Thermometer
} from 'lucide-react';
import { UserAccountMenu } from './UserAccountMenu';
import { useGameServer } from '@/hooks/useGameServer';

interface StatusBarProps {
  isConnected?: boolean;
}

export const StatusBar = ({ isConnected = true }: StatusBarProps) => {
  const { isGameServerConnected, isGameServerConnecting, isBuddyConnected } = useGameServer();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [battery] = useState(65);
  const [signal] = useState(85);
  const [temperature] = useState(42);
  const [position] = useState({ lat: 37.7749, lng: -122.4194 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-success';
    if (level > 20) return 'text-warning';
    return 'text-destructive';
  };

  const getSignalStrength = (strength: number) => {
    if (strength > 75) return 'text-success';
    if (strength > 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Robot Connection Status */}
          <div className="flex items-center gap-2">
            {isBuddyConnected ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <Badge variant={isBuddyConnected ? "default" : "destructive"} className="text-xs">
              ROBOT: {isBuddyConnected ? "CONNECTED" : "DISCONNECTED"}
            </Badge>
          </div>

          {/* Game Server Connection Status */}
          <div className="flex items-center gap-2">
            {isGameServerConnected ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : isGameServerConnecting ? (
              <Wifi className="w-4 h-4 text-warning animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <Badge 
              variant={isGameServerConnected ? "default" : isGameServerConnecting ? "secondary" : "destructive"} 
              className="text-xs"
            >
              SERVER: {isGameServerConnected ? "CONNECTED" : isGameServerConnecting ? "CONNECTING..." : "DISCONNECTED"}
            </Badge>
          </div>

          {/* Battery */}
          <div className="flex items-center gap-1">
            <Battery className={`w-4 h-4 ${getBatteryColor(battery)}`} />
            <span className={`text-sm font-mono ${getBatteryColor(battery)}`}>
              {battery}%
            </span>
          </div>

          {/* Signal Strength */}
          <div className="flex items-center gap-1">
            <Signal className={`w-4 h-4 ${getSignalStrength(signal)}`} />
            <span className={`text-sm font-mono ${getSignalStrength(signal)}`}>
              {signal}%
            </span>
          </div>

          {/* Temperature */}
          <div className="flex items-center gap-1">
            <Thermometer className="w-4 h-4 text-warning" />
            <span className="text-sm font-mono text-muted-foreground">
              {temperature}°C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Position */}
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono text-muted-foreground">
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono text-muted-foreground">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>

          {/* User Account Menu */}
          <UserAccountMenu />
        </div>
      </div>
    </div>
  );
};