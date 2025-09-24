import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SFS2X from "sfs2x-api";
import { SmartFox } from 'sfs2x-api';

interface GameServerContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string, data?: any) => void;
}

interface Config {
  host: string;
  port : number;
  debug : boolean;
  useSSL : boolean;
}

            // Load libraries
            // WebSocket = require("ws://localhost:8080"); // https://www.npmjs.com/package/ws
            // const SFS2X = require("sfs2x-api"); // https://www.npmjs.com/package/sfs2x-api
            
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
  const [socket, setSocket] = useState<SmartFox | null>(null);

  const connect = async () => {
    console.log("+++++++++++");
    if (isConnecting || isConnected) return;

    setIsConnected(false);
    setIsConnecting(true);
    setConnectionError(null);

    try {

      // Replace with your actual game server WebSocket URL
      // const ws = new WebSocket('ws://localhost:8080');
      
      // ws.onopen = () => {
      //   console.log('Connected to game server');
      //   setIsConnected(true);
      //   setIsConnecting(false);
      //   setSocket(ws);
      // };

      // ws.onclose = () => {
      //   console.log('Disconnected from game server');
      //   setIsConnected(false);
      //   setSocket(null);
      // };

      // ws.onerror = (error) => {
      //   console.error('Game server connection error:', error);
      //   setConnectionError('Failed to connect to game server');
      //   setIsConnecting(false);
      // };

      // ws.onmessage = (event) => {
      //   try {
      //     const data = JSON.parse(event.data);
      //     console.log('Received from game server:', data);
      //     // Handle incoming messages here
      //   } catch (error) {
      //     console.error('Error parsing message from game server:', error);
      //   }
      // };

      // Set connection parameters
      const config: Config = {
        host : "127.0.0.1",
        port : 8080,
        debug : true,
        useSSL : false
      };
   
    
 
    // Initialize SFS2X client
    const sfs = new SFS2X.SmartFox(config);
    setSocket(sfs);

    // Add event listeners
    sfs.addEventListener(SFS2X.SFSEvent.CONNECTION, onConnection, this);
    sfs.addEventListener(SFS2X.SFSEvent.CONNECTION_LOST, onConnectionLost, this);
 
    // Connect to SFS2X
    sfs.connect();

    } catch (error) {
      console.error('Error connecting to game server:', error);
      setConnectionError('Failed to establish connection');
      setIsConnecting(false);
    }
  };


  // Connection event handler
function onConnection(event)
{
    if (event.success)
    {
        console.log("Connected to SmartFoxServer 2X!");
        console.log("SFS2X API version: " + socket);
        setIsConnected(true);
        setIsConnecting(false);
    }
    else
    { 
      setConnectionError('Failed to connect to game server');
      setIsConnecting(false);
      console.warn("Connection failed: " + (event.errorMessage ? event.errorMessage + " (" + event.errorCode + ")" : "Is the server running at all?"));
    }
       
}
 
// Disconnection event handler
function onConnectionLost(event)
{
  if (socket) {
    socket.disconnect;
    setSocket(null);
    
  }
  setIsConnected(false);
  console.warn("Disconnection occurred; reason is: " + event.reason);
}

  const disconnect = () => {
    if (socket) {
      socket.disconnect;
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