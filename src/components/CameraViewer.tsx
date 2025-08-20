import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface CameraViewerProps {
  isConnected?: boolean;
  title?: string;
}

export const CameraViewer = ({ isConnected = false, title = "Robot Camera" }: CameraViewerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => setZoom(1);

  return (
    <Card className="p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            className={isRecording ? "text-destructive" : ""}
          >
            {isRecording ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetView}>
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
        {isConnected ? (
          <div
            className="w-full h-full bg-gradient-to-br from-background to-muted flex items-center justify-center relative"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Camera feed placeholder - in real app this would be video stream */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
              {/* Grid overlay for realistic effect */}
              <div className="absolute inset-0 opacity-20">
                <div className="w-full h-full" style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,195,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,195,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              {/* Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-8 h-px bg-primary opacity-60" />
                  <div className="w-px h-8 bg-primary opacity-60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              
              {/* Status overlay */}
              <div className="absolute top-2 left-2 text-xs text-primary font-mono">
                {isRecording && <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  REC
                </div>}
              </div>
              
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground font-mono">
                ZOOM: {zoom.toFixed(1)}x
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera Offline</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};