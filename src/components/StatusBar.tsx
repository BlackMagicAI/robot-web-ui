import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Clock,
  MapPin,
  Thermometer,
  PlugZap
} from 'lucide-react';
import { UserAccountMenu } from './UserAccountMenu';
import { useGameServer } from '@/hooks/useGameServer';

interface StatusBarProps {
  isConnected?: boolean;
}

export const StatusBar = ({ isConnected = true }: StatusBarProps) => {
  const { isGameServerConnected, isGameServerConnecting, isBuddyConnected, connect } = useGameServer();
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

  const buddyStatus = isBuddyConnected ? "CONNECTED" : "DISCONNECTED";
  const serverStatus = isGameServerConnected ? "CONNECTED" : isGameServerConnecting ? "CONNECTING..." : "DISCONNECTED";

  return (
    <div className="w-full max-w-full overflow-hidden border-b border-border bg-card px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-4">
          {/* Robot Connection Status */}
          <div className="flex min-w-0 items-center gap-1.5">
            {isBuddyConnected ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <Badge variant={isBuddyConnected ? "default" : "destructive"} className="max-w-[4.7rem] truncate px-2 text-xs sm:max-w-none sm:px-2.5" title={`BUDDY: ${buddyStatus}`}>
              <span className="sm:hidden">BUDDY</span>
              <span className="hidden sm:inline">BUDDY: {buddyStatus}</span>
            </Badge>
          </div>

          {/* Game Server Connection Status */}
          <div className="flex min-w-0 items-center gap-1.5">
            {isGameServerConnected ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : isGameServerConnecting ? (
              <Wifi className="w-4 h-4 text-warning animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <Badge
              variant={isGameServerConnected ? "default" : isGameServerConnecting ? "secondary" : "destructive"}
              className="max-w-[5.2rem] truncate px-2 text-xs sm:max-w-none sm:px-2.5"
              title={`SERVER: ${serverStatus}`}
            >
              <span className="sm:hidden">SERVER</span>
              <span className="hidden sm:inline">SERVER: {serverStatus}</span>
            </Badge>
            {!isGameServerConnected && !isGameServerConnecting && (
              <button
                type="button"
                onClick={() => connect()}
                title="Reconnect to game server"
                aria-label="Reconnect to game server"
                className="inline-flex items-center justify-center rounded p-1 text-destructive hover:bg-muted hover:text-foreground transition-colors"
              >
                <PlugZap className="w-4 h-4" />
              </button>
            )}
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

        <div className="hidden min-w-0 items-center gap-3 sm:flex sm:gap-4">
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

        {/* User Account Menu - mobile only (position/time hidden on mobile) */}
        <div className="flex items-center sm:hidden">
          <UserAccountMenu />
        </div>
      </div>
    </div>
  );
};