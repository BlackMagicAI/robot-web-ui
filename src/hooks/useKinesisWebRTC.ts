import { useState, useRef, useCallback } from 'react';
import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import {
  KinesisVideoClient,
  GetSignalingChannelEndpointCommand,
  DescribeSignalingChannelCommand,
} from '@aws-sdk/client-kinesis-video';
import {
  KinesisVideoSignalingClient,
  GetIceServerConfigCommand,
} from '@aws-sdk/client-kinesis-video-signaling';

// Hardcoded config for development — replace with dynamic values later
const KVS_CONFIG = {
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  channelName: 'YOUR_CHANNEL_NAME',
};

interface KinesisState {
  isStreaming: boolean;
  error: string | null;
  selectedDeviceId: string | null;
  availableCameras: MediaDeviceInfo[];
}

export const useKinesisWebRTC = () => {
  const [state, setState] = useState<KinesisState>({
    isStreaming: false,
    error: null,
    selectedDeviceId: null,
    availableCameras: [],
  });

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const enumerateCameras = useCallback(async () => {
    try {
      // Request permission first so labels are populated
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      setState((prev) => ({ ...prev, availableCameras: cameras }));
      return cameras;
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
      setState((prev) => ({ ...prev, error: 'Could not access cameras' }));
      return [];
    }
  }, []);

  const selectCamera = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedDeviceId: deviceId }));
  }, []);

  const startStreaming = useCallback(async (deviceId?: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      const cameraId = deviceId || state.selectedDeviceId;

      // 1. Get local webcam stream
      const constraints: MediaStreamConstraints = {
        video: cameraId
          ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = localStream;

      // Show local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // 2. Create KVS client
      const kinesisVideoClient = new KinesisVideoClient({
        region: KVS_CONFIG.region,
        credentials: {
          accessKeyId: KVS_CONFIG.accessKeyId,
          secretAccessKey: KVS_CONFIG.secretAccessKey,
        },
      });

      // 3. Describe signaling channel to get ARN
      const describeResponse = await kinesisVideoClient.send(
        new DescribeSignalingChannelCommand({ ChannelName: KVS_CONFIG.channelName })
      );
      const channelARN = describeResponse.ChannelInfo?.ChannelARN;
      if (!channelARN) throw new Error('Channel ARN not found');

      // 4. Get signaling channel endpoints
      const endpointResponse = await kinesisVideoClient.send(
        new GetSignalingChannelEndpointCommand({
          ChannelARN: channelARN,
          SingleMasterChannelEndpointConfiguration: {
            Protocols: ['WSS', 'HTTPS'],
            Role: 'MASTER',
          },
        })
      );

      const endpointsByProtocol: Record<string, string> = {};
      for (const ep of endpointResponse.ResourceEndpointList || []) {
        if (ep.Protocol && ep.ResourceEndpoint) {
          endpointsByProtocol[ep.Protocol] = ep.ResourceEndpoint;
        }
      }

      // 5. Get ICE server config
      const kinesisVideoSignalingClient = new KinesisVideoSignalingClient({
        region: KVS_CONFIG.region,
        credentials: {
          accessKeyId: KVS_CONFIG.accessKeyId,
          secretAccessKey: KVS_CONFIG.secretAccessKey,
        },
        endpoint: endpointsByProtocol.HTTPS,
      });

      const iceServerResponse = await kinesisVideoSignalingClient.send(
        new GetIceServerConfigCommand({ ChannelARN: channelARN })
      );

      const iceServers: RTCIceServer[] = [
        { urls: `stun:stun.kinesisvideo.${KVS_CONFIG.region}.amazonaws.com:443` },
      ];
      for (const iceServer of iceServerResponse.IceServerList || []) {
        iceServers.push({
          urls: iceServer.Uris || [],
          username: iceServer.Username,
          credential: iceServer.Password,
        });
      }

      // 6. Create signaling client as MASTER
      const signalingClient = new SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        role: Role.MASTER,
        region: KVS_CONFIG.region,
        credentials: {
          accessKeyId: KVS_CONFIG.accessKeyId,
          secretAccessKey: KVS_CONFIG.secretAccessKey,
        },
      });
      signalingClientRef.current = signalingClient;

      // 7. Set up signaling client event handlers
      // Cast to any because the EventEmitter types from the SDK don't resolve cleanly in browser TS
      const client = signalingClient as any;

      client.on('open', () => {
        console.log('[KVS] Signaling client connected');
      });

      client.on('sdpOffer', async (offer: RTCSessionDescriptionInit, remoteClientId: string) => {
        console.log('[KVS] Received SDP offer from:', remoteClientId);

        // Create peer connection for this viewer
        const peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = peerConnection;

        // Add local tracks to the peer connection
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        // Send ICE candidates to the viewer
        peerConnection.addEventListener('icecandidate', ({ candidate }) => {
          if (candidate) {
            signalingClient.sendIceCandidate(candidate, remoteClientId);
          }
        });

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        signalingClient.sendSdpAnswer(peerConnection.localDescription!, remoteClientId);
      });

      client.on('iceCandidate', async (candidate: RTCIceCandidate, remoteClientId: string) => {
        console.log('[KVS] Received ICE candidate from:', remoteClientId);
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
      });

      client.on('close', () => {
        console.log('[KVS] Signaling client disconnected');
      });

      client.on('error', (error: Error) => {
        console.error('[KVS] Signaling client error:', error);
        setState((prev) => ({ ...prev, error: error.message }));
      });

      // 8. Open signaling connection
      signalingClient.open();

      setState((prev) => ({ ...prev, isStreaming: true }));
    } catch (err: any) {
      console.error('[KVS] Failed to start streaming:', err);
      setState((prev) => ({ ...prev, error: err.message || 'Failed to start streaming' }));
    }
  }, [state.selectedDeviceId]);

  const stopStreaming = useCallback(() => {
    // Close signaling client
    if (signalingClientRef.current) {
      signalingClientRef.current.close();
      signalingClientRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setState((prev) => ({ ...prev, isStreaming: false, error: null }));
  }, []);

  return {
    ...state,
    localVideoRef,
    enumerateCameras,
    selectCamera,
    startStreaming,
    stopStreaming,
  };
};
