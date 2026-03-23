import { useState, useRef, useCallback, useEffect } from 'react';
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
  isViewing: boolean;
  error: string | null;
  selectedDeviceId: string | null;
  availableCameras: MediaDeviceInfo[];
}

export const useKinesisWebRTC = () => {
  const [state, setState] = useState<KinesisState>({
    isStreaming: false,
    isViewing: false,
    error: null,
    selectedDeviceId: null,
    availableCameras: [],
  });

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const viewerSignalingClientRef = useRef<SignalingClient | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Sync local stream to video element whenever it mounts
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  });

  // Sync remote stream to video element whenever it mounts
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  });

  const enumerateCameras = useCallback(async () => {
    try {
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

  /** Helper: get channel ARN, endpoints, and ICE servers */
  const getKvsInfrastructure = useCallback(async (role: 'MASTER' | 'VIEWER') => {
    const kinesisVideoClient = new KinesisVideoClient({
      region: KVS_CONFIG.region,
      credentials: {
        accessKeyId: KVS_CONFIG.accessKeyId,
        secretAccessKey: KVS_CONFIG.secretAccessKey,
      },
    });

    const describeResponse = await kinesisVideoClient.send(
      new DescribeSignalingChannelCommand({ ChannelName: KVS_CONFIG.channelName })
    );
    const channelARN = describeResponse.ChannelInfo?.ChannelARN;
    if (!channelARN) throw new Error('Channel ARN not found');

    const endpointResponse = await kinesisVideoClient.send(
      new GetSignalingChannelEndpointCommand({
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
          Protocols: ['WSS', 'HTTPS'],
          Role: role,
        },
      })
    );

    const endpointsByProtocol: Record<string, string> = {};
    for (const ep of endpointResponse.ResourceEndpointList || []) {
      if (ep.Protocol && ep.ResourceEndpoint) {
        endpointsByProtocol[ep.Protocol] = ep.ResourceEndpoint;
      }
    }

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

    return { channelARN, endpointsByProtocol, iceServers };
  }, []);

  // ─── MASTER: stream local webcam ───────────────────────────────────

  const startStreaming = useCallback(async (deviceId?: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      const cameraId = deviceId || state.selectedDeviceId;

      const constraints: MediaStreamConstraints = {
        video: cameraId
          ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = localStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const { channelARN, endpointsByProtocol, iceServers } = await getKvsInfrastructure('MASTER');

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

      const client = signalingClient as any;

      client.on('open', () => {
        console.log('[KVS Master] Signaling client connected');
      });

      client.on('sdpOffer', async (offer: RTCSessionDescriptionInit, remoteClientId: string) => {
        console.log('[KVS Master] Received SDP offer from:', remoteClientId);
        const peerConnection = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = peerConnection;

        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        peerConnection.addEventListener('icecandidate', ({ candidate }) => {
          if (candidate) {
            signalingClient.sendIceCandidate(candidate, remoteClientId);
          }
        });

        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingClient.sendSdpAnswer(peerConnection.localDescription!, remoteClientId);
      });

      client.on('iceCandidate', async (candidate: RTCIceCandidate, remoteClientId: string) => {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
      });

      client.on('close', () => console.log('[KVS Master] Signaling disconnected'));
      client.on('error', (error: Error) => {
        console.error('[KVS Master] Error:', error);
        setState((prev) => ({ ...prev, error: error.message }));
      });

      signalingClient.open();
      setState((prev) => ({ ...prev, isStreaming: true }));
    } catch (err: any) {
      console.error('[KVS Master] Failed to start streaming:', err);
      setState((prev) => ({ ...prev, error: err.message || 'Failed to start streaming' }));
    }
  }, [state.selectedDeviceId, getKvsInfrastructure]);

  const stopStreaming = useCallback(() => {
    if (signalingClientRef.current) {
      signalingClientRef.current.close();
      signalingClientRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setState((prev) => ({ ...prev, isStreaming: false, error: null }));
  }, []);

  // ─── VIEWER: receive remote stream ─────────────────────────────────

  const startViewing = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      const { channelARN, endpointsByProtocol, iceServers } = await getKvsInfrastructure('VIEWER');

      const clientId = `viewer-${Date.now()}`;

      const signalingClient = new SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        role: Role.VIEWER,
        clientId,
        region: KVS_CONFIG.region,
        credentials: {
          accessKeyId: KVS_CONFIG.accessKeyId,
          secretAccessKey: KVS_CONFIG.secretAccessKey,
        },
      });
      viewerSignalingClientRef.current = signalingClient;

      const peerConnection = new RTCPeerConnection({ iceServers });
      viewerPeerConnectionRef.current = peerConnection;

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      peerConnection.addEventListener('track', (event) => {
        console.log('[KVS Viewer] Received remote track');
        remoteStream.addTrack(event.track);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peerConnection.addEventListener('icecandidate', ({ candidate }) => {
        if (candidate) {
          signalingClient.sendIceCandidate(candidate);
        }
      });

      const client = signalingClient as any;

      client.on('open', async () => {
        console.log('[KVS Viewer] Signaling connected, creating offer');
        // Add a transceiver to receive video
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingClient.sendSdpOffer(peerConnection.localDescription!);
      });

      client.on('sdpAnswer', async (answer: RTCSessionDescriptionInit) => {
        console.log('[KVS Viewer] Received SDP answer');
        await peerConnection.setRemoteDescription(answer);
      });

      client.on('iceCandidate', async (candidate: RTCIceCandidate) => {
        console.log('[KVS Viewer] Received ICE candidate');
        await peerConnection.addIceCandidate(candidate);
      });

      client.on('close', () => console.log('[KVS Viewer] Signaling disconnected'));
      client.on('error', (error: Error) => {
        console.error('[KVS Viewer] Error:', error);
        setState((prev) => ({ ...prev, error: error.message }));
      });

      signalingClient.open();
      setState((prev) => ({ ...prev, isViewing: true }));
    } catch (err: any) {
      console.error('[KVS Viewer] Failed to start viewing:', err);
      setState((prev) => ({ ...prev, error: err.message || 'Failed to start viewing' }));
    }
  }, [getKvsInfrastructure]);

  const stopViewing = useCallback(() => {
    if (viewerSignalingClientRef.current) {
      viewerSignalingClientRef.current.close();
      viewerSignalingClientRef.current = null;
    }
    if (viewerPeerConnectionRef.current) {
      viewerPeerConnectionRef.current.close();
      viewerPeerConnectionRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setState((prev) => ({ ...prev, isViewing: false, error: null }));
  }, []);

  return {
    ...state,
    localVideoRef,
    remoteVideoRef,
    enumerateCameras,
    selectCamera,
    startStreaming,
    stopStreaming,
    startViewing,
    stopViewing,
  };
};
