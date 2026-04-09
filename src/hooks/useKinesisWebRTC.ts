import { useState, useRef, useCallback, useEffect } from 'react';
import { SignalingClient, Role, SigV4RequestSigner } from 'amazon-kinesis-video-streams-webrtc';
import { KinesisVideoClient, GetSignalingChannelEndpointCommand, ResourceEndpointListItem } from "@aws-sdk/client-kinesis-video";
import { KinesisVideoSignalingClient, GetIceServerConfigCommand } from "@aws-sdk/client-kinesis-video-signaling";

export interface KvsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  channelName: string;
  channelARN: string;
}

interface KvsInfrastructure {
  channelARN: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

interface KinesisState {
  isStreaming: boolean;
  isViewing: boolean;
  error: string | null;
  selectedDeviceId: string | null;
  availableCameras: MediaDeviceInfo[];
  signedUrl: string | null;
}

export const useKinesisWebRTC = (kvsConfig: KvsConfig) => {
  const [state, setState] = useState<KinesisState>({
    isStreaming: false,
    isViewing: false,
    error: null,
    selectedDeviceId: null,
    availableCameras: [],
    signedUrl: null,
  });

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const viewerSignalingClientRef = useRef<SignalingClient | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  });

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

  /** Build KVS infrastructure object from form config */
  const getKvsInfrastructure = useCallback((): KvsInfrastructure => {
    if (!kvsConfig.region || !kvsConfig.accessKeyId || !kvsConfig.secretAccessKey || !kvsConfig.channelARN) {
      throw new Error('Please fill in all KVS config fields (region, access key, secret key, channel ARN)');
    }
    return {
      channelARN: kvsConfig.channelARN,
      region: kvsConfig.region,
      credentials: {
        accessKeyId: kvsConfig.accessKeyId,
        secretAccessKey: kvsConfig.secretAccessKey,
      },
    };
  }, [kvsConfig]);

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

      const infra = getKvsInfrastructure();

      const client1 = new KinesisVideoClient({ 
        region: infra.region,
        credentials: {
          secretAccessKey: infra.credentials.secretAccessKey,
          accessKeyId:infra.credentials.accessKeyId
        }
       });

      const getEndpoints = async (infra, role) => {
        const command = new GetSignalingChannelEndpointCommand({
          ChannelARN: infra.channelARN,
          SingleMasterChannelEndpointConfiguration: {
            Protocols: ["WSS", "HTTPS"], // Request both websocket and HTTPS endpoints
            Role: role,             // Use "VIEWER" if connecting as a viewer
          },
        });
      
        try {

          const response = await client1.send(command);
          
          // Map the list into a cleaner object
          const endpoints = response.ResourceEndpointList.reduce((acc, item) => {
            acc[item.Protocol] = item.ResourceEndpoint;
            return acc;
          }, {});
          return endpoints;
        } catch (error) {
          console.error("Error fetching endpoints:", error);
        }
      };

      const signalingChannelEndpoints = await getEndpoints(infra, Role.MASTER);
      console.log("WSS signalingChannelEndpoints*****:", signalingChannelEndpoints["WSS"]);

      // Generate signed URL using SigV4RequestSigner
      const signer = new SigV4RequestSigner(infra.region, infra.credentials);
      const queryParams: Record<string, string> = {
        'X-Amz-ChannelARN': infra.channelARN,
      };

      const signedUrl = await signer.getSignedURL(signalingChannelEndpoints["WSS"], queryParams);
      console.log('[KVS Master] Signed URL generated');
      setState((prev) => ({ ...prev, signedUrl }));

      const signalingClient = new SignalingClient({
        channelARN: infra.channelARN,
        channelEndpoint: signalingChannelEndpoints["WSS"],
        role: Role.MASTER,
        region: infra.region,
        credentials: {
          accessKeyId: infra.credentials.accessKeyId,
          secretAccessKey: infra.credentials.secretAccessKey,
        },
      });
      
      signalingClientRef.current = signalingClient;

      const client = signalingClient as any;
      infra.channelARN
      client.on('open', () => {
        console.log('[KVS Master] Signaling client connected');
      });

      client.on('sdpOffer', async (offer: RTCSessionDescriptionInit, remoteClientId: string) => {
        const rTCIceServers: RTCIceServer[] = await getIceServers(infra, signalingChannelEndpoints);
        const peerConnection = new RTCPeerConnection({ iceServers:  rTCIceServers });
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
    setState((prev) => ({ ...prev, isStreaming: false, error: null, signedUrl: null }));
  }, []);

  // ─── VIEWER: receive remote stream ─────────────────────────────────

  const startViewing = useCallback(async (preSignedUrl?: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      const infra = getKvsInfrastructure();
      const client1 = new KinesisVideoClient({ 
        region: infra.region,
        credentials: {
          secretAccessKey: infra.credentials.secretAccessKey,
          accessKeyId:infra.credentials.accessKeyId
        }
       });

      const getEndpoints = async (infra, role) => {
        const command = new GetSignalingChannelEndpointCommand({
          ChannelARN: infra.channelARN,
          SingleMasterChannelEndpointConfiguration: {
            Protocols: ["WSS", "HTTPS"], // Request both websocket and HTTPS endpoints
            Role: role,             // Use "VIEWER" if connecting as a viewer
          },
        });
      
        try {
          const response = await client1.send(command);
          
          // Map the list into a cleaner object
          const endpoints = response.ResourceEndpointList.reduce((acc, item) => {
            acc[item.Protocol] = item.ResourceEndpoint;
            return acc;
          }, {});

          return endpoints;
        } catch (error) {
          console.error("Error fetching endpoints:", error);
        }
      };

      const signalingChannelEndpointsViewer = await getEndpoints(infra, Role.VIEWER);

      const clientId = `viewer-${Date.now()}`;

      // If a pre-signed URL is provided, connect directly via URL
      const signalingClientConfig: any = preSignedUrl
        ? {
            channelARN: infra.channelARN,
            channelEndpoint: preSignedUrl,
            role: Role.VIEWER,
            clientId,
          }
        : {
            channelARN: infra.channelARN,
            channelEndpoint: signalingChannelEndpointsViewer["WSS"],
            role: Role.VIEWER,
            clientId,
            region: infra.region,
            credentials: {
              accessKeyId: infra.credentials.accessKeyId,
              secretAccessKey: infra.credentials.secretAccessKey,
            },
          };

      const signalingClient = new SignalingClient(signalingClientConfig);
      viewerSignalingClientRef.current = signalingClient;
     
      const iceServers = await getIceServers(infra, signalingChannelEndpointsViewer);
      const peerConnection = new RTCPeerConnection({ iceServers: iceServers });
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

  const getIceServers = async (infra, endpoints: ResourceEndpointListItem) => { //TODO add caching logic
    const signalingChannelsClientX = new KinesisVideoSignalingClient({ region: infra.region,
      credentials: infra.credentials,
      endpoint: endpoints['HTTPS'],
      });

      const params = {
        ChannelARN: infra.channelARN, // required
      };

    const commandx = new GetIceServerConfigCommand(params);
    const response = await signalingChannelsClientX.send(commandx);
    // 2. Map the response to the standard WebRTC iceServers format
    const iceServers = response.IceServerList.map(server => ({
      urls: server.Uris,
      username: server.Username,
      credential: server.Password
    }));
    return iceServers;
  }

  const setSignedUrl = useCallback((url: string) => {
    setState((prev) => ({ ...prev, signedUrl: url || null }));
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
    setSignedUrl,
  };
};