import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Zap, Shield, Globe } from 'lucide-react';

export interface Room {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  maxPlayers: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'PvP' | 'PvE' | 'Exploration' | 'Training';
}

interface RoomSelectProps {
  onRoomSelect: (room: Room) => void;
  selectedRoom?: Room;
}

const mockRooms: Room[] = [
  {
    id: 'room-1',
    name: 'Training Ground Alpha',
    description: 'Perfect for beginners to learn robot control basics',
    playerCount: 3,
    maxPlayers: 8,
    difficulty: 'Easy',
    type: 'Training'
  },
  {
    id: 'room-2', 
    name: 'Combat Arena Beta',
    description: 'Intense PvP battles with advanced combat systems',
    playerCount: 12,
    maxPlayers: 16,
    difficulty: 'Hard',
    type: 'PvP'
  },
  {
    id: 'room-3',
    name: 'Exploration Zone Gamma',
    description: 'Cooperative exploration of unknown territories',
    playerCount: 6,
    maxPlayers: 10,
    difficulty: 'Medium',
    type: 'Exploration'
  },
  {
    id: 'room-4',
    name: 'Defense Station Delta',
    description: 'Team up to defend against AI-controlled enemies',
    playerCount: 8,
    maxPlayers: 12,
    difficulty: 'Medium',
    type: 'PvE'
  },
  {
    id: 'room-5',
    name: 'Elite Championship',
    description: 'High-stakes tournament for experienced pilots',
    playerCount: 15,
    maxPlayers: 20,
    difficulty: 'Hard',
    type: 'PvP'
  }
];

const getRoomIcon = (type: Room['type']) => {
  switch (type) {
    case 'PvP':
      return <Zap className="h-4 w-4" />;
    case 'PvE':
      return <Shield className="h-4 w-4" />;
    case 'Exploration':
      return <Globe className="h-4 w-4" />;
    case 'Training':
      return <Users className="h-4 w-4" />;
    default:
      return <Users className="h-4 w-4" />;
  }
};

const getDifficultyColor = (difficulty: Room['difficulty']) => {
  switch (difficulty) {
    case 'Easy':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Medium':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'Hard':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const RoomSelect = ({ onRoomSelect, selectedRoom }: RoomSelectProps) => {
  return (
    <Card className="h-fit-content">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Room
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6 pb-6">
          <div className="space-y-3">
            {mockRooms.map((room) => (
              <div
                key={room.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-accent ${
                  selectedRoom?.id === room.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
                onClick={() => onRoomSelect(room)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRoomIcon(room.type)}
                    <h3 className="font-semibold text-sm">{room.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getDifficultyColor(room.difficulty)}>
                      {room.difficulty}
                    </Badge>
                    <Badge variant="secondary">{room.type}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {room.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{room.playerCount}/{room.maxPlayers}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedRoom?.id === room.id ? "default" : "outline"}
                    className="h-6 text-xs px-3"
                  >
                    {selectedRoom?.id === room.id ? 'Selected' : 'Join'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};