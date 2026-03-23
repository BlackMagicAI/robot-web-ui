import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, RotateCw, ZoomIn, ZoomOut, Webcam, Radio, Eye, Monitor, Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKinesisWebRTC } from '@/hooks/useKinesisWebRTC';

interface CameraViewerProps {
  title?: string;
}

type DeviceRole = 'robot' | 'consumer';
type CameraMode = 'robot' | 'webcam' | 'viewer';

export const CameraViewer = ({ title = "Robot Camera" }: CameraViewerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceRole, setDeviceRole] = useState<DeviceRole>('robot');
  const [cameraMode, setCameraMode] = useState<CameraMode>('robot');

    isStreaming,
    isViewing,
    error: kinesisError,
    availableCameras,
    selectedDeviceId,
    localVideoRef,
    remoteVideoRef,
    enumerateCameras,
    selectCamera,
    startStreaming,
    stopStreaming,
    startViewing,
    stopViewing,
  } = useKinesisWebRTC();

  useEffect(() => {
    if (cameraMode === 'webcam') {
      enumerateCameras();
    }
  }, [cameraMode, enumerateCameras]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => setZoom(1);

  const handleRobotPlay = () => {
    setIsRecording(!isRecording);
    setIsConnected(!isConnected);
  };

  const handleWebcamToggle = async () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      await startStreaming(selectedDeviceId || undefined);
    }
  };

  const handleViewerToggle = async () => {
    if (isViewing) {
      stopViewing();
    } else {
      await startViewing();
    }
  };

  const switchMode = (mode: CameraMode) => {
    // Clean up previous mode
    if (isStreaming) stopStreaming();
    if (isViewing) stopViewing();
    if (isConnected) { setIsConnected(false); setIsRecording(false); }
    setCameraMode(mode);
  };

  const isActive = cameraMode === 'robot' ? isConnected : cameraMode === 'webcam' ? isStreaming : isViewing;

  return (
    <Card className="p-4 h-fit-content">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
            {isActive ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {/* Mode toggles */}
          <Button variant={cameraMode === 'robot' ? 'default' : 'ghost'} size="sm" onClick={() => switchMode('robot')} title="Robot Camera">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant={cameraMode === 'webcam' ? 'default' : 'ghost'} size="sm" onClick={() => switchMode('webcam')} title="Webcam to Kinesis">
            <Webcam className="w-4 h-4" />
          </Button>
          <Button variant={cameraMode === 'viewer' ? 'default' : 'ghost'} size="sm" onClick={() => switchMode('viewer')} title="KVS Viewer">
            <Eye className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Action button per mode */}
          {cameraMode === 'robot' && (
            <Button variant="ghost" size="sm" onClick={handleRobotPlay} className={isRecording ? "text-destructive" : ""}>
              {isRecording ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>
          )}
          {cameraMode === 'webcam' && (
            <Button variant="ghost" size="sm" onClick={handleWebcamToggle} className={isStreaming ? "text-destructive" : ""}>
              <Radio className="w-4 h-4" />
            </Button>
          )}
          {cameraMode === 'viewer' && (
            <Button variant="ghost" size="sm" onClick={handleViewerToggle} className={isViewing ? "text-destructive" : ""}>
              <Eye className="w-4 h-4" />
            </Button>
          )}

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

      {/* Webcam camera selector */}
      {cameraMode === 'webcam' && availableCameras.length > 0 && (
        <div className="mb-3">
          <Select value={selectedDeviceId || ''} onValueChange={(val) => selectCamera(val)}>
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue placeholder="Select webcam..." />
            </SelectTrigger>
            <SelectContent>
              {availableCameras.map((cam) => (
                <SelectItem key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kinesis error */}
      {kinesisError && (cameraMode === 'webcam' || cameraMode === 'viewer') && (
        <div className="mb-3 text-xs text-destructive bg-destructive/10 rounded p-2">
          {kinesisError}
        </div>
      )}

      <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
        {/* ─── Viewer mode ─── */}
        {cameraMode === 'viewer' ? (
          isViewing ? (
            <div className="w-full h-full relative" style={{ transform: `scale(${zoom})` }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 text-xs text-primary font-mono">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Viewing KVS Stream
                </div>
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground font-mono">
                ZOOM: {zoom.toFixed(1)}x
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click the eye icon to connect as viewer</p>
              </div>
            </div>
          )
        ) : cameraMode === 'webcam' ? (
          /* ─── Webcam mode ─── */
          isStreaming ? (
            <div className="w-full h-full relative" style={{ transform: `scale(${zoom})` }}>
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 text-xs text-primary font-mono">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  Streaming to Kinesis
                </div>
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground font-mono">
                ZOOM: {zoom.toFixed(1)}x
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Webcam className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a camera and click stream</p>
              </div>
            </div>
          )
        ) : (
          /* ─── Robot camera mode ─── */
          isConnected ? (
            <div className="w-full h-full bg-gradient-to-br from-background to-muted flex items-center justify-center relative" style={{ transform: `scale(${zoom})` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
                <img id="stream" src="http://192.168.1.226:81/stream" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 text-xs text-primary font-mono">
                  {isRecording && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      Streaming
                    </div>
                  )}
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
          )
        )}
      </div>
    </Card>
  );
};
