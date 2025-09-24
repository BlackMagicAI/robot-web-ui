import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import ReactPlayer from 'react-player'

interface CameraViewerProps {
  title?: string;
}

export const CameraViewer = ({title = "Robot Camera" }: CameraViewerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const src = 'http://192.168.1.226:81/stream';//'https://youtu.be/Vy_RPd0rblI?si=ofdeyjginEt6keJp&t=15'; // TODO replace with dynamically update value from server

  const initialState = {
    src: undefined,
    pip: false,
    playing: false,
    controls: false,
    light: false,
    volume: 1,
    muted: false,
    played: 0,
    loaded: 0,
    duration: 0,
    playbackRate: 1.0,
    loop: false,
    seeking: false,
    loadedSeconds: 0,
    playedSeconds: 0,
  };


  const [state, setState] = useState(initialState);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => setZoom(1);

  const changeSource = () => {
    setState(prevState => ({ ...prevState, 
      src: prevState.src == undefined ? src : undefined})); // Update the URL
  };

  const handlePlay = () => {
    changeSource();
    setState(prevState => ({ ...prevState, playing : !prevState.playing}));
    setIsRecording(!isRecording);
    setIsConnected(!isConnected);
  };  

  return (
    <Card className="p-4 h-fit-content">
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
            onClick={() => handlePlay()}
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
              {/* <ReactPlayer
                slot="media"
                src={state.src}
                playing={state.playing}
                controls={true}
                style={{
                  width: "100%",
                  height: "100%"
                }}
              ></ReactPlayer> */}
              <img id="stream" src="http://192.168.1.226:81/stream"></img>
              {/* Grid overlay for realistic effect */}
              {/* <div className="absolute inset-0 opacity-20">
                <div className="w-full h-full" style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,195,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,195,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px'
                }} />
              </div> */}

              {/* Crosshair */}
              {/* <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-8 h-px bg-primary opacity-60" />
                  <div className="w-px h-8 bg-primary opacity-60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div> */}

              {/* Status overlay */}
              <div className="absolute top-2 left-2 text-xs text-primary font-mono">
                {isRecording && <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  Streaming
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