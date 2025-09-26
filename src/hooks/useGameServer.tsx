import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  joinRoom: (id: number) => void;
  userList: SFS2X.SFSUser[];
}

interface Config {
  host: string;
  port : number;
  debug : boolean;
  useSSL : boolean;
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
  const [sfs, setSfs] = useState<SFS2X.SmartFox | null>(null);
  const [rooms, setRooms] = useState<SFSRoom[] | null>(null);
  const [userList, setUserList] = useState<SFS2X.SFSUser[] | null>(null);

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
  setSfs(smartFox);
  // return () => {
  //   disconnect();
  // };
}, []);
  console.log("------------");

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

    // Add room-related event listeners during the SmartFox instance setup
    sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN, onRoomJoin, this);
    sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN_ERROR, onRoomJoinError, this);

    sfs.addEventListener(SFS2X.SFSEvent.USER_COUNT_CHANGE, onUserCountChange, this);

    // Connect to SFS2X
    sfs.connect();
  };

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

const getRoomUserList = (): SFS2X.SFSUser[] =>{
  if (sfs) {
    console.log("In socket");
    var users = sfs.userManager.getUserList();
    console.log(users);
    return users;
   }
}

/*
 * Event handler for room user count change
 */
const onUserCountChange = (event) => {
	//update userlist
	var userList = getRoomUserList();
  setUserList(userList);
}

// Connect then login as guest
const loginGuest = () => {
  console.log("Login&&&&&&&&&&&& ");
  console.log(sfs);
  if (sfs) {
   var sent = sfs.send(new SFS2X.LoginRequest("", "", null, "RobotBuddy"));
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
    var rmList =  getRoomList();
    setRooms(rmList);
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

  const joinRoom = (roomId: number) =>{
    // After the successful login, send the join Room request
    sfs.send(new SFS2X.JoinRoomRequest(roomId));
  }

  const onRoomJoin = (evt) =>
  {
      const users: string[] = evt.room._userManager._usersByName;
  }
 
  const onRoomJoinError = (evt) =>
  {
      console.warn("Room join failed: " + evt.errorMessage);
  }

  const value: GameServerContextType = {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendCommand,
    rooms,
    joinRoom,
    userList
  };

  return (
    <GameServerContext.Provider value={value}>
      {children}
    </GameServerContext.Provider>
  );
};