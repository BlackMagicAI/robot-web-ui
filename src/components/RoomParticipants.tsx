import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Zap, Bot, PersonStanding } from 'lucide-react';
import type { Room } from './RoomSelect';
import { useGameServer } from '@/hooks/useGameServer';
import { useEffect, useState } from 'react';

interface Participant {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  role: 'operator' | 'ai' | 'agent';
  level: number;
  isReady: boolean;
  isItMe: boolean;
}

interface RoomParticipantsProps {
  room: Room;
}

const getStatusColor = (status: Participant['status']) => {
  switch (status) {
    case 'online':
      return 'bg-emerald-500';
    case 'away':
      return 'bg-amber-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
};

const getRoleIcon = (role: Participant['role']) => {
  switch (role) {
    case 'operator':
      return <PersonStanding className="h-3 w-3 text-amber-500" />;
    case 'ai':
      return <Bot className="h-3 w-3 text-blue-500" />;
    default:
      return null;
  }
};

export const RoomParticipants = ({ room }: RoomParticipantsProps) => {
  
  const [participants, setParticipants] = useState<Participant[] | []>([]);
  const { isGameServerConnected, userList, connectToTargetParticipant } = useGameServer();
  
  useEffect(() => {
    if (isGameServerConnected) { // Check if myObject is not null before using it
      var roomParticipants: Participant[] = [];
      for(var u in userList){        
        const obj: Participant = {
          id: userList[u].id.toString(),
          username: userList[u].name,
          avatar: undefined,
          status: 'online',
          role: 'operator',
          level: 15,
          isReady: true,
          isItMe: userList[u].isItMe
        }
        //if(!obj.isItMe){
          roomParticipants.push(obj);
        //}        
      }
      setParticipants(roomParticipants);      
    }
    }, [userList]); // Dependency array: runs when myObject changes


  const handleParticipantSelect = (participant: Participant): void => {
    console.log("Participant selected:" );
    console.log(participant);
    connectToTargetParticipant(Number(participant.id), participant.username);
  }

  return (
    <Card className="h-fit-content">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Room Participants
          <Badge variant="secondary" className="ml-auto">
            {participants.length}/{room.maxPlayers}
          </Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {room.name}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px] px-6 pb-6">
          <div className="space-y-3">
            {participants.map((participant) => (
              <div
                key={participant.id}                
                className={`flex items-center gap-3 p-3 rounded-lg border border-border transition-colors ${participant.isItMe
                  ? 'hover:bg-red-500'
                  : 'hover:bg-accent'
                  }`}
                onClick={() => participant.isItMe ? null: handleParticipantSelect(participant)}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback className="text-xs">
                      {participant.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(participant.status)}`}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {getRoleIcon(participant.role)}
                    <span className="font-medium text-sm truncate">
                      {participant.isItMe ? participant.username + " (You)" : participant.username}
                    </span>
                    {participant.isReady && (
                      <Zap className="h-3 w-3 text-emerald-500 ml-auto" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs py-0 px-1">
                      Lv.{participant.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {participant.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {participants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No participants in this room yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};