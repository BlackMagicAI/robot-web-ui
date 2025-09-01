import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Crown, Shield, Zap } from 'lucide-react';
import type { Room } from './RoomSelect';

interface Participant {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  role: 'owner' | 'moderator' | 'member';
  level: number;
  isReady: boolean;
}

interface RoomParticipantsProps {
  room: Room;
}

const mockParticipants: Record<string, Participant[]> = {
  'room-1': [
    {
      id: '1',
      username: 'RobotMaster99',
      avatar: undefined,
      status: 'online',
      role: 'owner',
      level: 15,
      isReady: true
    },
    {
      id: '2', 
      username: 'TechPilot_Alpha',
      avatar: undefined,
      status: 'online',
      role: 'member',
      level: 8,
      isReady: true
    },
    {
      id: '3',
      username: 'NewbieExplorer',
      avatar: undefined,
      status: 'away',
      role: 'member', 
      level: 2,
      isReady: false
    }
  ],
  'room-2': [
    {
      id: '4',
      username: 'BattleCommander',
      avatar: undefined,
      status: 'online',
      role: 'owner',
      level: 42,
      isReady: true
    },
    {
      id: '5',
      username: 'WarMachine_X',
      avatar: undefined,
      status: 'online',
      role: 'moderator',
      level: 38,
      isReady: true
    },
    {
      id: '6',
      username: 'EliteStriker',
      avatar: undefined,
      status: 'busy',
      role: 'member',
      level: 35,
      isReady: false
    },
    {
      id: '7',
      username: 'CyberWarrior21',
      avatar: undefined,
      status: 'online',
      role: 'member',
      level: 29,
      isReady: true
    }
  ],
  'room-3': [
    {
      id: '8',
      username: 'ExplorerLeader',
      avatar: undefined,
      status: 'online',
      role: 'owner',
      level: 28,
      isReady: true
    },
    {
      id: '9',
      username: 'ScoutDrone_Beta',
      avatar: undefined,
      status: 'online',
      role: 'member',
      level: 22,
      isReady: true
    }
  ]
};

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
    case 'owner':
      return <Crown className="h-3 w-3 text-amber-500" />;
    case 'moderator':
      return <Shield className="h-3 w-3 text-blue-500" />;
    default:
      return null;
  }
};

export const RoomParticipants = ({ room }: RoomParticipantsProps) => {
  const participants = mockParticipants[room.id] || [];
  
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
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
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
                      {participant.username}
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