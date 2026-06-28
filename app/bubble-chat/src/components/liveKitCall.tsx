import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import { LiveKitRoom, VideoTrack, AudioSession } from '@livekit/react-native';
import {
  useTracks,
  useLocalParticipant,
  useParticipants,
  useChat,
  isTrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { MessageSquare, Users, FileText, X, Send } from 'lucide-react-native';
import { getSocket } from '../lib/socket';

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

type PanelTab = 'people' | 'chat' | 'transcript';

/**
 * In-call panel matching web: a People / Chat / Transcript popup opened from a
 * floating button over the video. Lives inside <LiveKitRoom> so it can use the
 * participant + chat (data-channel) hooks; transcript rides the same
 * `meeting_transcript_chunk` socket the web meeting modal uses.
 */
function CallPanel({ roomId }: { roomId?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>('chat');
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState<{ speaker?: string; text: string }[]>([]);
  const participants = useParticipants();
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const scrollRef = useRef<ScrollView>(null);

  // Live captions over socket (same event the web modal consumes).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onChunk = (data: any) => {
      if (roomId && data?.roomId && String(data.roomId) !== String(roomId)) return;
      setTranscript(prev => [...prev, { speaker: data?.speaker, text: data?.text }]);
    };
    socket.on('meeting_transcript_chunk', onChunk);
    return () => { socket.off('meeting_transcript_chunk', onChunk); };
  }, [roomId]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    try { await send(text); } catch { /* ignore */ }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <>
      {/* Floating open button (chat-as-popup) */}
      <TouchableOpacity onPress={() => { setTab('chat'); setOpen(true); }} style={styles.panelFab} activeOpacity={0.85}>
        <MessageSquare color="#fff" size={20} />
        {chatMessages.length > 0 && <View style={styles.panelFabDot} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.panelBackdrop}>
          <View style={styles.panelSheet}>
            {/* Tabs */}
            <View style={styles.panelTabs}>
              {(['people', 'chat', 'transcript'] as PanelTab[]).map(t => (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.panelTab, tab === t && styles.panelTabActive]}>
                  {t === 'people' ? <Users size={15} color={tab === t ? '#6c5ce7' : '#9a9aab'} />
                    : t === 'chat' ? <MessageSquare size={15} color={tab === t ? '#6c5ce7' : '#9a9aab'} />
                    : <FileText size={15} color={tab === t ? '#6c5ce7' : '#9a9aab'} />}
                  <Text style={[styles.panelTabText, tab === t && styles.panelTabTextActive]}>
                    {t === 'people' ? `People (${participants.length})` : t === 'chat' ? 'Chat' : 'Transcript'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.panelClose}><X size={18} color="#1f2030" /></TouchableOpacity>
            </View>

            {tab === 'people' && (
              <ScrollView style={styles.panelBody}>
                {participants.map((p, i) => (
                  <View key={p.identity || i} style={styles.personRow}>
                    <View style={styles.personDot} />
                    <Text style={styles.personName}>{p.name || p.identity || 'Participant'}{p.isLocal ? ' (You)' : ''}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {tab === 'chat' && (
              <View style={{ flex: 1 }}>
                <ScrollView ref={scrollRef} style={styles.panelBody} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
                  {chatMessages.length === 0 ? (
                    <Text style={styles.panelEmpty}>No messages yet. Say hello 👋</Text>
                  ) : chatMessages.map((m: any, i: number) => {
                    const mine = m.from?.identity === localParticipant?.identity;
                    return (
                      <View key={i} style={[styles.chatBubbleRow, mine && { alignItems: 'flex-end' }]}>
                        {!mine && <Text style={styles.chatFrom}>{m.from?.name || m.from?.identity || 'Guest'}</Text>}
                        <View style={[styles.chatBubble, mine ? styles.chatBubbleMine : styles.chatBubbleTheirs]}>
                          <Text style={[styles.chatText, mine && { color: '#fff' }]}>{m.message}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.chatComposer}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Message…"
                    placeholderTextColor="#9a9aab"
                    style={styles.chatInput}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={handleSend} disabled={!draft.trim() || isSending} style={styles.chatSend}>
                    <Send size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {tab === 'transcript' && (
              <ScrollView style={styles.panelBody}>
                {transcript.length === 0 ? (
                  <Text style={styles.panelEmpty}>Live transcript will appear here once speech is detected.</Text>
                ) : transcript.map((c, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    {c.speaker ? <Text style={styles.chatFrom}>{c.speaker}</Text> : null}
                    <Text style={styles.transcriptText}>{c.text}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export interface LiveKitCallRoomProps {
  serverUrl: string;
  token: string;
  isVideo: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  /** LiveKit room id — used to scope the in-call transcript socket. */
  roomId?: string;
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
  roomId,
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
      <CallPanel roomId={roomId} />
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
  // ── In-call panel (People / Chat / Transcript) ──
  panelFab: {
    position: 'absolute', bottom: 24, left: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(108,92,231,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  panelFabDot: { position: 'absolute', top: 10, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 1.5, borderColor: '#fff' },
  panelBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  panelSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '62%', paddingTop: 8 },
  panelTabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  panelTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  panelTabActive: { backgroundColor: 'rgba(108,92,231,0.08)' },
  panelTabText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#9a9aab' },
  panelTabTextActive: { color: '#6c5ce7' },
  panelClose: { marginLeft: 'auto', padding: 6 },
  panelBody: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  panelEmpty: { fontSize: 13, color: '#9a9aab', fontFamily: 'Poppins_400Regular', textAlign: 'center', marginTop: 24 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  personDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 10 },
  personName: { fontSize: 14, color: '#1f2030', fontFamily: 'Poppins_500Medium' },
  chatBubbleRow: { marginBottom: 8, alignItems: 'flex-start' },
  chatFrom: { fontSize: 10, color: '#6c5ce7', fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  chatBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  chatBubbleMine: { backgroundColor: '#6c5ce7', borderBottomRightRadius: 4 },
  chatBubbleTheirs: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  chatText: { fontSize: 13.5, color: '#1f2030', fontFamily: 'Poppins_400Regular' },
  chatComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  chatInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 14, fontFamily: 'Poppins_400Regular', color: '#1f2030' },
  chatSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6c5ce7', alignItems: 'center', justifyContent: 'center' },
  transcriptText: { fontSize: 13.5, color: '#1f2030', lineHeight: 19, fontFamily: 'Poppins_400Regular' },
});
