import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LiveKitRoom, VideoTrack, AudioSession } from '@livekit/react-native';
import {
  useTracks,
  useLocalParticipant,
  isTrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Headless bridge: keeps the LiveKit local participant's mic/camera in sync with the
 * overlay's toggle state. Lives inside <LiveKitRoom> so it can use the room context.
 */
function LocalDeviceBridge({ micEnabled, cameraEnabled }: { micEnabled: boolean; cameraEnabled: boolean }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    localParticipant?.setMicrophoneEnabled(micEnabled).catch(() => {});
  }, [micEnabled, localParticipant]);

  useEffect(() => {
    localParticipant?.setCameraEnabled(cameraEnabled).catch(() => {});
  }, [cameraEnabled, localParticipant]);

  return null;
}

/**
 * Renders the remote participant's camera full-bleed, with the local camera as a
 * picture-in-picture tile. Falls back to `fallback` (avatar) until a remote video
 * track arrives or for voice-only calls.
 */
function VideoArea({ isVideo, fallback }: { isVideo: boolean; fallback: React.ReactNode }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  const remote = tracks.find(
    (t) => isTrackReference(t) && t.participant && !t.participant.isLocal
  );
  const local = tracks.find(
    (t) => isTrackReference(t) && t.participant?.isLocal
  );

  if (!isVideo) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.fill}>
      {remote ? (
        <VideoTrack trackRef={remote as any} style={styles.fill} objectFit="cover" zOrder={0} />
      ) : (
        <View style={styles.fillCenter}>{fallback}</View>
      )}
      {local && (
        <View style={styles.pip} pointerEvents="none">
          <VideoTrack trackRef={local as any} style={styles.fill} objectFit="cover" mirror zOrder={1} />
        </View>
      )}
    </View>
  );
}

export interface LiveKitCallRoomProps {
  serverUrl: string;
  token: string;
  isVideo: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  /** Avatar/placeholder shown before remote video or on voice calls. */
  fallback: React.ReactNode;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Connects to a LiveKit room and renders the in-call media area. The call control
 * buttons stay in the parent overlay; their state flows in via micEnabled/cameraEnabled.
 */
export default function LiveKitCallRoom({
  serverUrl,
  token,
  isVideo,
  micEnabled,
  cameraEnabled,
  speakerEnabled,
  fallback,
  onConnected,
  onDisconnected,
  onError,
}: LiveKitCallRoomProps) {
  // Start the platform audio session for the lifetime of the room.
  useEffect(() => {
    let active = true;
    AudioSession.startAudioSession().catch((e) => console.warn('[LiveKit] audio session start failed:', e));
    return () => {
      active = false;
      AudioSession.stopAudioSession().catch(() => {});
      void active;
    };
  }, []);

  // Route audio to speaker or earpiece in response to the overlay toggle.
  useEffect(() => {
    const out = Platform.OS === 'ios'
      ? (speakerEnabled ? 'force_speaker' : 'default')
      : (speakerEnabled ? 'speaker' : 'earpiece');
    AudioSession.selectAudioOutput(out).catch(() => {});
  }, [speakerEnabled]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={isVideo}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
    >
      <LocalDeviceBridge micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
      <VideoArea isVideo={isVideo} fallback={fallback} />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%', height: '100%' },
  fillCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  pip: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 104,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
