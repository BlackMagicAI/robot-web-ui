import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SFS2X from "sfs2x-api";
import { SFSRoom } from 'sfs2x-api';
import { WebBluetoothContextType } from './useWebBluetooth';

interface Room {
  Room: string;
  Id: number;
  "Group Id": string;
}

interface GameServerContextType {
  isGameServerConnected: boolean;
  isGameServerConnecting: boolean;
  isBuddyConnected: boolean;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string, data?: any) => void;
  //loginGuest: () => void;
  rooms: SFSRoom[];
  joinRoom: (id: number) => void;
  userList: SFS2X.SFSUser[];
  connectToTargetParticipant: (id: number, name: string) => void;
  sendBuddyCommand: (command: string, data?: any) => void;
}

interface Config {
  host: string;
  port: number;
  debug: boolean;
  useSSL: boolean;
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
  webBluetooth: WebBluetoothContextType;
}

export const GameServerProvider: React.FC<GameServerProviderProps> = ({ children, webBluetooth }) => {
  const [isGameServerConnected, setIsGameServerConnected] = useState(false);
  const [isGameServerConnecting, setIsGameServerConnecting] = useState(false);
  const [isBuddyConnected, setIsBuddyConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sfs, setSfs] = useState<SFS2X.SmartFox | null>(null);
  const [rooms, setRooms] = useState<SFSRoom[] | null>(null);
  const [userList, setUserList] = useState<SFS2X.SFSUser[] | null>(null);
  const [currentPrivateChat, setCurrentPrivateChat] = useState<number | -1>(-1);
  const [messageValue, setMessageValue] = useState<Uint8Array>();

  // Set connection parameters
  const config: Config = {
    host: "127.0.0.1",
    port: 8080,
    debug: true,
    useSSL: false
  };

  // Auto-connect on login
  useEffect(() => {
    // Initialize SFS2X client
    if (!sfs) {
      const smartFox = new SFS2X.SmartFox(config);
      setSfs(smartFox);
    }
  }, [sfs]);

  useEffect(() => {

    if (webBluetooth.isConnected) {
      webBluetooth.writeCharacteristic("4fafc201-1fb5-459e-8fcc-c5c9c331914b", "beb5483e-36e1-4688-b7f5-ea07361b26a8", messageValue)
        .then(() => {
          console.log("Value written to LEDcharacteristic:", messageValue);
        })
        .catch(error => {
          console.error("Error writing to the LED characteristic: ", messageValue);
        });
    }
  }, [messageValue]);

  console.log("Start GameServerProvider");

  const connect = async () => {
    // console.log("+++++++++++:" + userRole);
    // console.log("+++++++++++:" + guestName);
    if (isGameServerConnecting || isGameServerConnected) return;

    setIsGameServerConnected(false);
    setIsGameServerConnecting(true);
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

    sfs.addEventListener(SFS2X.SFSBuddyEvent.BUDDY_MESSAGE, onBuddyMessage, this);

    // Add buddy-related event listeners during the SmartFox instance setup
    sfs.addEventListener(SFS2X.SFSBuddyEvent.BUDDY_ADD, onBuddyAdded, this);
    sfs.addEventListener(SFS2X.SFSBuddyEvent.BUDDY_REMOVE, onBuddyRemoved, this);
    sfs.addEventListener(SFS2X.SFSBuddyEvent.BUDDY_ERROR, onBuddyError, this);
    sfs.addEventListener(SFS2X.SFSBuddyEvent.BUDDY_LIST_INIT, onBuddyListInitialized, this);

    // Connect to SFS2X
    sfs.connect();

  };

  // Connection event handler
  const onConnection = (event) => {
    if (event.success) {
      console.log("Connected to SmartFoxServer 2X!");
      console.log("SFS2X API version: " + sfs.version);

      setIsGameServerConnected(true);
      setIsGameServerConnecting(false);

      // login
      loginGuest();
    }
    else {
      setConnectionError('Failed to connect to game server');
      setIsGameServerConnecting(false);
      console.warn("Connection failed: " + (event.errorMessage ? event.errorMessage + " (" + event.errorCode + ")" : "Is the server running at all?"));
    }

  }

  // Disconnection event handler
  function onConnectionLost(event) {
    if (sfs) {
      sfs.disconnect;
      setSfs(null);
    }
    //setIsConnected(false);
    console.warn("Disconnection occurred; reason is: " + event.reason);
  }

  const getRoomList = (): SFSRoom[] => {
    if (sfs) {
      var rooms = sfs.roomManager.getRoomList();
      return rooms;
    }

  }

  const getRoomUserList = (): SFS2X.SFSUser[] => {
    if (sfs) {
      var users = sfs.userManager.getUserList();
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

  const onBuddyAdded = (evt) => {
    console.log("Buddy added: " + evt.buddy.name);
    setIsBuddyConnected(true);
  }

  const onBuddyRemoved = (evt) => {
    console.log("Buddy removed: " + evt.buddy.name);
    setIsBuddyConnected(false);
  }

  const onBuddyError = (evt) => {
    console.warn("BuddyList error: " + evt.errorMessage);
  }


  // Connect then login as guest
  const loginGuest = () => {
    if (sfs) {
      var sent = sfs.send(new SFS2X.LoginRequest("", "", null, "RobotBuddy"));
    }
  };

  /*
   * Logout from server
   */
  function onLogoutBtn() {
    var isSent = sfs.send(new SFS2X.LogoutRequest());

    // if (isSent){
    // 	//enableLoginBtn(true);
    // }
  }

  const onLogin = (evt) => {
    console.log("Login successful; username is " + evt.user.name);
    var rmList = getRoomList();
    setRooms(rmList);
  }

  function onLoginError(evt) {
    console.warn("Login failed: " + evt.errorMessage);
  }

  const disconnect = () => {
    if (sfs) {
      sfs.disconnect;
      setSfs(null);
      setIsGameServerConnected(false);
    }
  };

  const sendCommand = (command: string, data?: any) => {
    if (sfs && isGameServerConnected) {
      const message = JSON.stringify({ command, data });
      sfs.send(message);
      console.log('Sent to game server:', { command, data });
    } else {
      console.warn('Cannot send command: not connected to game server');
    }
  };

  const connectToTargetParticipant = (id: number, name: string) => {
    setCurrentPrivateChat(id);
    sfs.send(new SFS2X.AddBuddyRequest(name));
  }

  /*
   * Send command messages to currently selected robot buddy
   */
  const sendBuddyCommand = (cmd, value) => {
    var params = new SFS2X.SFSObject();
    params.putUtfString("cmd", cmd);
    params.putInt("targetid", currentPrivateChat);
    params.putInt("value", value);
    console.log("Sending command");
    if (sfs) {
      // Get the recipient of the message, in this case my buddy
      var buddy = sfs.buddyManager.getBuddyById(Number(currentPrivateChat));
      if (typeof (buddy) !== "undefined") {//only send if connected to server
        var isSent = sfs.send(new SFS2X.BuddyMessageRequest("buddycmd", buddy, params));
      }
    }
  }

  /*
   * Buddy message event handler
   */
  const onBuddyMessage = (event) => {

    var isItMe = event.isItMe;
    var sender = event.buddy;
    var message = event.message;
    var customParams = event.data; // SFSObject
    console.log("Buddy Msg recieved:");
    console.log(isItMe);
    console.log(sender);
    console.log(message);
    console.log(event);
    //
    console.log(customParams.getUtfString("cmd"));
    console.log(customParams.getInt("targetid"));
    console.log(customParams.getInt("value"));

    var value = customParams.getInt("value");

    const data = new Uint8Array([value]);
    // update message data variable to activate write to device charactereistic
    setMessageValue(data);
  }

  const joinRoom = (roomId: number) => {
    // After the successful login, send the join Room request
    sfs.send(new SFS2X.JoinRoomRequest(roomId));
  }

  const onRoomJoin = (evt) => {
    const users: string[] = evt.room._userManager._usersByName;
    //
    sfs.send(new SFS2X.InitBuddyListRequest());
  }

  const onRoomJoinError = (evt) => {
    console.warn("Room join failed: " + evt.errorMessage);
  }

  const onBuddyListInitialized = (...params: any[]) => {
    // Retrieve my buddies list
    var buddies = sfs.buddyManager.getBuddyList();
    console.log("onBuddyListInitialized - Function not implemented.");
  }

  const value: GameServerContextType = {
    isGameServerConnected,
    isGameServerConnecting,
    isBuddyConnected,
    connectionError,
    connect,
    disconnect,
    sendCommand,
    rooms,
    joinRoom,
    userList,
    connectToTargetParticipant,
    sendBuddyCommand
  };

  return (
    <GameServerContext.Provider value={value}>
      {children}
    </GameServerContext.Provider>
  );
};