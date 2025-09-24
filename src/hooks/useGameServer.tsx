import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface GameServerContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string, data?: any) => void;
}

const GameServerContext = createContext<GameServerContextType | undefined>(undefined);

export const useGameServer = () => {
  const context = useContext(GameServerContext);
  if (context === undefined) {
    throw new Error('useGameServer must be used within a GameServerProvider');
  }
  return context;
};

interface GameServerProviderProps {
  children: ReactNode;
}

export const GameServerProvider: React.FC<GameServerProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connect = async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Replace with your actual game server WebSocket URL
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('Connected to game server');
        setIsConnected(true);
        setIsConnecting(false);
        setSocket(ws);
      };

      ws.onclose = () => {
        console.log('Disconnected from game server');
        setIsConnected(false);
        setSocket(null);
      };

      ws.onerror = (error) => {
        console.error('Game server connection error:', error);
        setConnectionError('Failed to connect to game server');
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from game server:', data);
          // Handle incoming messages here
        } catch (error) {
          console.error('Error parsing message from game server:', error);
        }
      };

    } catch (error) {
      console.error('Error connecting to game server:', error);
      setConnectionError('Failed to establish connection');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const sendCommand = (command: string, data?: any) => {
    if (socket && isConnected) {
      const message = JSON.stringify({ command, data });
      socket.send(message);
      console.log('Sent to game server:', { command, data });
    } else {
      console.warn('Cannot send command: not connected to game server');
    }
  };

  // Auto-connect on initialization
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  const value: GameServerContextType = {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendCommand,
  };

  return (
    <GameServerContext.Provider value={value}>
      {children}
    </GameServerContext.Provider>
  );
};