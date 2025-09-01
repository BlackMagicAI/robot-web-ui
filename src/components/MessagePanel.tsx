import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Terminal, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  type: 'info' | 'warning' | 'error' | 'command' | 'response';
  content: string;
  timestamp: Date;
}

export const MessagePanel = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'info',
      content: 'Robot control interface initialized',
      timestamp: new Date(Date.now() - 60000)
    },
    {
      id: '2',
      type: 'warning',
      content: 'Camera connection unstable',
      timestamp: new Date(Date.now() - 45000)
    },
    {
      id: '3',
      type: 'command',
      content: 'move_forward speed=50',
      timestamp: new Date(Date.now() - 30000)
    },
    {
      id: '4',
      type: 'response',
      content: 'Movement command executed successfully',
      timestamp: new Date(Date.now() - 25000)
    },
    {
      id: '5',
      type: 'error',
      content: 'Battery level below 20%',
      timestamp: new Date(Date.now() - 10000)
    }
  ]);
  
  const [command, setCommand] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const addMessage = (type: Message['type'], content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendCommand = () => {
    if (!command.trim()) return;
    
    addMessage('command', command);
    setCommand('');
    
    // Simulate response
    setTimeout(() => {
      addMessage('response', `Command "${command}" processed`);
    }, 500);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getMessageColor = (type: Message['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-warning';
      case 'command':
        return 'text-primary';
      case 'response':
        return 'text-success';
      case 'info':
      default:
        return 'text-foreground';
    }
  };

  const getMessageBadge = (type: Message['type']) => {
    switch (type) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">ERR</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="text-xs bg-warning text-warning-foreground">WARN</Badge>;
      case 'command':
        return <Badge variant="default" className="text-xs">CMD</Badge>;
      case 'response':
        return <Badge variant="secondary" className="text-xs bg-success text-success-foreground">RESP</Badge>;
      case 'info':
      default:
        return <Badge variant="secondary" className="text-xs">INFO</Badge>;
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <Card className="p-4 h-fit-content flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <h3 className="font-medium">Console</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          className="text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 mb-4">
        <div className="space-y-2 pr-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start gap-2 text-sm">
              <div className="flex-shrink-0 mt-0.5">
                {getMessageBadge(message.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className={`${getMessageColor(message.type)} font-mono text-xs break-words`}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command..."
          className="font-mono text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
        />
        <Button onClick={handleSendCommand} size="sm">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};