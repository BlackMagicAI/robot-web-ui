import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
//import * as SFS2X from "sfs2x-api";
//import { SmartFox } from 'sfs2x-api';
//const SFS2X = require("sfs2x-api"); // https://www.npmjs.com/package/sfs2x-api
import * as SFS2X from "sfs2x-api";
import { SFSRoom } from 'sfs2x-api';

interface Room {
  Room: string;
  Id: number;
  "Group Id": string;
}

interface GameServerContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string, data?: any) => void;
  //loginGuest: () => void;
  rooms: SFSRoom[];
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
  const [sfs, setSfs] = useState<SFS2X.SmartFox | null>(null);
  const [rooms, setRooms] = useState<SFSRoom[] | null>(null);

   // Set connection parameters
   const config: Config = {
    host : "127.0.0.1",
    port : 8080,
    debug : true,
    useSSL : false
  };

 // Auto-connect on initialization
 useEffect(() => {
  //connect();
  console.log('useEffect#######');
  // Initialize SFS2X client
const smartFox = new SFS2X.SmartFox(config);
  //console.log(sfs);
  setSfs(smartFox);
  // return () => {
  //   disconnect();
  // };
}, []);
  console.log("------------");
  // useEffect(() => {
  //   console.log("222222222222");
  //   console.log(config);
 

  //   return () => {
  //     // Clean up event listeners on unmount
  //     if (smartFox) {
  //       smartFox.removeEventListener(SFS2X.SFSEvent.CONNECTION, onConnection);
  //       smartFox.removeEventListener(SFS2X.SFSEvent.LOGIN, onLogin);
  //       smartFox.disconnect();
  //     }
  //   };
  // }, []);

  // useEffect(() => {
  //   if (sfs) { // Check if myObject is not null before using it
  //     console.log('myObject updated:', sfs);
  //     // Perform actions with the updated myObject here
      
  //     //console.log(rooms);
  //   }
  // }, [sfs]); // Dependency array: runs when myObject changes

  const connect = async () => {
    console.log("+++++++++++");
    if (isConnecting || isConnected) return;

    setIsConnected(false);
    setIsConnecting(true);
    setConnectionError(null);


    // // Initialize SFS2X client
    // const smartFox = new SFS2X.SmartFox(config);

    // Add event listeners
    sfs.addEventListener(SFS2X.SFSEvent.CONNECTION, onConnection, this);
    sfs.addEventListener(SFS2X.SFSEvent.CONNECTION_LOST, onConnectionLost, this);

    // Add login-related event listeners during the SmartFox instance setup
    sfs.addEventListener(SFS2X.SFSEvent.LOGIN, onLogin, this);
    sfs.addEventListener(SFS2X.SFSEvent.LOGIN_ERROR, onLoginError, this);

    // Connect to SFS2X
    sfs.connect();

    //setSfs(smartFox);
    // try {

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

     

    

    // } catch (error) {
    //   console.error('Error connecting to game server:', error);
    //   setConnectionError('Failed to establish connection');
    //   setIsConnecting(false);
    // }
  };

  // useEffect(() => {
  //   if (sfs) { // Check if myObject is not null before using it
  //     console.log('myObject updated:', sfs);
  //     // Perform actions with the updated myObject here
      
  //     //console.log(rooms);
  //   }
  // }, [sfs]); // Dependency array: runs when myObject changes

  // Connection event handler
const onConnection = (event) =>
{
    if (event.success)
    {
        console.log("Connected to SmartFoxServer 2X!");
        console.log("SFS2X API version: " + sfs);
        
        setIsConnected(true);
        setIsConnecting(false);
        // login
        loginGuest();
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
  if (sfs) {
    sfs.disconnect;
    setSfs(null);    
  }
  setIsConnected(false);
  console.warn("Disconnection occurred; reason is: " + event.reason);
}


//function login(){		
	//console.log("login:" + state);
	//var isSent;

  // After the successful connection, send the login request
  //return socket.send(new SFS2X.LoginRequest("", "", null, "BasicExamples"));
	// if(state === AppStates.LOGIN_STATE){//account login		
	// 	//get form data
	// 	var form = $("#login-form")[0];
	// 	var formData = new FormData(form);
	// 	var username = formData.get("username");
	// 	var password = formData.get("password");
	// 	isSent = sfs.send(new SFS2X.LoginRequest(username, password));		

	// }else if (state === AppStates.LOGIN_GUEST_STATE){//anonymous guest login
	// 	isSent = sfs.send(new SFS2X.LoginRequest());
	// }else if (state ===  AppStates.LOGIN_SIGN_UP_STATE){
	// 	CURRENT_STATE = AppStates.LOGIN_GUEST_SIGN_UP_STATE;
	// 	isSent = sfs.send(new SFS2X.LoginRequest());//anonymous guest login		
	// 	//register();
	// }else if (state ===  AppStates.SUBMIT_SIGN_UP_STATE){
	// 	CURRENT_STATE = "";	
	// 	register();
	// }
	// Disable interface
	// if(isSent)
	// {
	// 	//enableLoginBtn(false);
	// }
	//console.log("login:" + username + "," + password);
//}

const getRoomList = (): SFSRoom[] => {
  if (sfs) {
    console.log("In socket");
    var rooms = sfs.roomManager.getRoomList();
    console.log(rooms);
    return rooms;
   }
 
}

// Connect then login as guest
const loginGuest = () => {
  console.log("Login&&&&&&&&&&&& ");
  console.log(sfs);
  if (sfs) {
   var sent = sfs.send(new SFS2X.LoginRequest("", "", null, "RobotBuddy"));
   console.log("Login " + sent);
  //  var rooms = sfs.getRoomListFromGroup("default");
  //  console.log(rooms);
  }
};

/*
 * Logout from server
 */
function onLogoutBtn()
{
	var isSent = sfs.send(new SFS2X.LogoutRequest());

	// if (isSent){
	// 	//enableLoginBtn(true);
	// }
}

const onLogin = (evt) =>
{
    console.log("Login successful; username is " + evt.user.name);
    //var rooms = getRoomList();
    // rooms = socket.roomManager.getRoomList();
    var rmList =  getRoomList();
    setRooms(rmList);
    console.log(typeof(rmList));
    console.log("Zone Room list: " + rmList);
    console.log(sfs);
}
 
function onLoginError(evt)
{
    console.warn("Login failed: " + evt.errorMessage);
}

  const disconnect = () => {
    if (sfs) {
      sfs.disconnect;
      setSfs(null);
      setIsConnected(false);
    }
  };

  const sendCommand = (command: string, data?: any) => {
    if (sfs && isConnected) {
      const message = JSON.stringify({ command, data });
      sfs.send(message);
      console.log('Sent to game server:', { command, data });
    } else {
      console.warn('Cannot send command: not connected to game server');
    }
  };

  const value: GameServerContextType = {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendCommand,
    rooms
  };

  return (
    <GameServerContext.Provider value={value}>
      {children}
    </GameServerContext.Provider>
  );
};