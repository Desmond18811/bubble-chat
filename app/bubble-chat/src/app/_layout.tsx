import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import * as SplashScreen from "expo-splash-screen";
import Constants from 'expo-constants';
import { verifyInstallation } from "nativewind";
import "../global.css";
import { initApiFromStorage, getSecureMediaUrl } from "../lib/api";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Share } from "react-native";
import { Image } from "expo-image";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Video, VideoOff, Minimize2, Maximize2, UserPlus, Link2, X } from "lucide-react-native";
import { CameraView, Camera } from "expo-camera";
import { subscribeCallState, acceptIncomingCall, declineIncomingCall, hangUpCall, inviteToCall, getLinkJoinToken, CallState } from "../lib/callManager";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";
import { ThemeProvider } from "../lib/theme";
import { getLiveKitToken, createCallInviteLink } from "../lib/api";
import { chatCache } from "../lib/chatCache";
import { ensureLiveKitRegistered } from "../lib/liveKitInit";
import type { LiveKitCallRoomProps } from "../components/liveKitCall";

// LiveKit pulls in native WebRTC, which doesn't exist in Expo Go. Register once at
// module load (no-ops in Expo Go) and only require the call component when available,
// so importing this layout never crashes the Expo Go client.
const liveKitReady = ensureLiveKitRegistered();
let LiveKitCallRoom: React.ComponentType<LiveKitCallRoomProps> | null = null;
if (liveKitReady) {
  try {
    LiveKitCallRoom = require("../components/liveKitCall").default;
  } catch (e) {
    console.warn("[LiveKit] failed to load call component:", e);
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Call UI palette (light theme)
const WHITE = '#ffffff';
const INK = '#13141f';
const INK_SOFT = '#6b6f86';
const PURPLE = '#6c5ce7';
const PURPLE_SOFT = '#f1eefe';
const SURFACE = '#f5f4fb';
const BORDER = '#ece9f7';
const GREEN = '#10b981';
const RED = '#ef4444';

function GlobalCallOverlay() {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkUrl, setLkUrl] = useState<string | null>(null);

  // Add-people / invite sheet
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const openAddPeople = async () => {
    setShowAddPeople(true);
    if (contacts.length) return;
    try {
      const list = await chatCache.getCachedContacts();
      setContacts(Array.isArray(list) ? list : []);
    } catch {
      /* non-fatal: the share-link path still works */
    }
  };

  const handleInvite = (c: any) => {
    const cid = c.id || c._id || c.otherUserId;
    if (!cid) return;
    inviteToCall(c);
    setInvitedIds((prev) => (prev.includes(cid) ? prev : [...prev, cid]));
  };

  const handleShareLink = async () => {
    if (callState.status !== 'in_call') return;
    try {
      const { url } = await createCallInviteLink(callState.roomId);
      await Share.share({ message: `Join my Bubble call: ${url}`, url });
    } catch {
      /* user dismissed or link failed */
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeCallState((state) => {
      setCallState(state);
      if (state.status === 'calling_out' || state.status === 'calling_in') {
        setIsMuted(false);
        setIsSpeaker(false);
        setIsCameraActive(state.type === 'video');
        setIsMinimized(false);
      }
      if (state.status === 'idle') {
        setLkToken(null);
        setLkUrl(null);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch a LiveKit token once the call is connected. The component renders only
  // in a dev/release build (LiveKitCallRoom is null in Expo Go), so the avatar UI
  // remains the fallback everywhere else.
  useEffect(() => {
    if (!LiveKitCallRoom) return;
    if (callState.status !== 'in_call') return;
    if (lkToken) return;
    let cancelled = false;
    getLiveKitToken(callState.roomId, getLinkJoinToken() || undefined)
      .then((res: { token?: string; url?: string }) => {
        if (cancelled) return;
        if (res?.token && res?.url) {
          setLkToken(res.token);
          setLkUrl(res.url);
        } else {
          console.warn('[LiveKit] token endpoint returned no token/url');
        }
      })
      .catch((err) => console.warn('[LiveKit] token fetch failed:', err));
    return () => { cancelled = true; };
  }, [callState.status, (callState as any).roomId, lkToken]);

  useEffect(() => {
    if (callState.status === 'in_call' && isCameraActive && hasPermission === null) {
      Camera.requestCameraPermissionsAsync().then(({ status }) => {
        setHasPermission(status === 'granted');
      });
    }
  }, [callState.status, isCameraActive]);

  if (callState.status === 'idle') return null;

  const isIncoming = callState.status === 'calling_in';
  const isOutgoing = callState.status === 'calling_out';
  const isVideo = callState.type === 'video';

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getGroupInitials = (n: string) => {
    if (!n) return 'BC';
    const clean = n.trim().replace(/\s+/g, ' ');
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getAvatarUri = () => {
    if (callState.status === 'calling_out') {
      return getSecureMediaUrl(callState.user?.avatar || callState.user?.groupIcon);
    }
    if (callState.status === 'calling_in') {
      return getSecureMediaUrl(callState.callerAvatar);
    }
    if (callState.status === 'in_call') {
      return getSecureMediaUrl(callState.user?.avatar || callState.user?.groupIcon);
    }
    return null;
  };

  const getName = () => {
    if (callState.status === 'calling_out') {
      return callState.user?.name || callState.user?.full_name || callState.user?.chatName || 'Bubble User';
    }
    if (callState.status === 'calling_in') {
      return callState.callerName || 'Bubble User';
    }
    if (callState.status === 'in_call') {
      return callState.user?.name || callState.user?.full_name || callState.user?.chatName || 'Bubble User';
    }
    return 'Bubble User';
  };

  const name = getName();
  const avatarUri = getAvatarUri();

  const statusLabel = isOutgoing
    ? 'Calling…'
    : isIncoming
      ? `Incoming ${isVideo ? 'video' : 'voice'} call`
      : `Connected · ${formatDuration((callState as any).duration)}`;

  const renderAvatar = (size: number) => (
    avatarUri ? (
      <Image source={{ uri: avatarUri || undefined }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: size * 0.32, fontFamily: 'SpaceGrotesk_700Bold' }}>{getGroupInitials(name)}</Text>
      </View>
    )
  );

  if (isMinimized) {
    return (
      <View style={styles.minimizedContainer}>
        <View style={styles.miniHeader}>
          <TouchableOpacity onPress={() => setIsMinimized(false)} style={styles.miniOptionButton}>
            <Maximize2 color={PURPLE} size={16} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', width: '100%', marginTop: 4 }}>
          {renderAvatar(46)}
          <Text numberOfLines={1} style={styles.miniNameText}>{name}</Text>
          <Text style={styles.miniDurationText}>
            {callState.status === 'in_call' ? formatDuration(callState.duration) : 'Calling…'}
          </Text>
        </View>

        <View style={styles.miniButtonsRow}>
          <TouchableOpacity
            onPress={() => setIsMuted(!isMuted)}
            style={[styles.miniOptionsButton, isMuted && styles.activeMiniOptionsButton]}
          >
            {isMuted ? <MicOff color="#ffffff" size={14} /> : <Mic color={INK_SOFT} size={14} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => hangUpCall()}
            style={[styles.miniOptionsButton, { backgroundColor: RED }]}
          >
            <PhoneOff color="#ffffff" size={14} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <View style={styles.callContainer}>
        {/* Minimize Button (not while an incoming call is ringing) */}
        {!isIncoming && (
          <TouchableOpacity
            onPress={() => setIsMinimized(true)}
            style={styles.minimizeButton}
          >
            <Minimize2 color={INK_SOFT} size={18} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.callHeader}>
          <Text style={styles.callTypeTitle}>
            BUBBLE {isVideo ? 'VIDEO CALL' : 'VOICE CALL'}
          </Text>
          <Text style={styles.callerNameText} numberOfLines={2}>{name}</Text>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        {/* Media / Video Stream area */}
        <View style={styles.mediaContainer}>
          {callState.status === 'in_call' && LiveKitCallRoom && lkToken && lkUrl ? (
            <View style={isVideo ? styles.videoPreviewFrame : styles.avatarOuterRing}>
              <LiveKitCallRoom
                serverUrl={lkUrl}
                token={lkToken}
                isVideo={isVideo}
                micEnabled={!isMuted}
                cameraEnabled={isCameraActive}
                speakerEnabled={isSpeaker}
                roomId={(callState as any).roomId}
                fallback={renderAvatar(156)}
                onError={(err) => console.warn('[LiveKit] room error:', err)}
                onDisconnected={() => {
                  // When the LiveKit room ends (peer left, network drop, or normal
                  // hangup) reset the call state so the user can place/receive another
                  // call. Without this the overlay stayed stuck in 'in_call' and every
                  // subsequent call was blocked.
                  hangUpCall();
                }}
              />
            </View>
          ) : callState.status === 'in_call' && isCameraActive && hasPermission ? (
            <View style={styles.videoPreviewFrame}>
              <CameraView style={StyleSheet.absoluteFill} facing="front" />
              <View style={styles.remoteVideoPreviewOverlay}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri || undefined }} style={styles.remoteAvatarImage} />
                ) : (
                  <View style={styles.remoteInitialsPlaceholder}>
                    <Text style={styles.remoteInitialsText}>{getGroupInitials(name)}</Text>
                  </View>
                )}
                <Text style={styles.remoteLabel}>You</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.avatarOuterRing, isIncoming && styles.avatarOuterRingIncoming]}>
              <View style={styles.avatarInnerRing}>
                <View style={styles.avatarPlaceholderContainer}>
                  {renderAvatar(156)}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Add-people sheet */}
        <Modal visible={showAddPeople} transparent animationType="slide" onRequestClose={() => setShowAddPeople(false)}>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetCard}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add people</Text>
                <TouchableOpacity onPress={() => setShowAddPeople(false)} style={styles.sheetClose}>
                  <X color={INK_SOFT} size={20} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleShareLink} style={styles.shareLinkBtn}>
                <Link2 color={PURPLE} size={18} />
                <Text style={styles.shareLinkText}>Share invite link</Text>
              </TouchableOpacity>

              <Text style={styles.sheetSection}>RING A CONTACT</Text>
              <ScrollView style={{ maxHeight: 320 }}>
                {contacts.length === 0 ? (
                  <Text style={styles.sheetEmpty}>No contacts to ring</Text>
                ) : (
                  contacts.map((c: any) => {
                    const cid = c.id || c._id || c.otherUserId;
                    const invited = invitedIds.includes(cid);
                    const cname = c.full_name || c.name || c.username || 'Contact';
                    const avatarUrl = c.avatar ? getSecureMediaUrl(c.avatar) : null;
                    return (
                      <TouchableOpacity key={cid} disabled={invited} onPress={() => handleInvite(c)} style={styles.contactRow}>
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={styles.contactAvatar} />
                        ) : (
                          <View style={[styles.contactAvatar, styles.contactAvatarFallback]}>
                            <Text style={styles.contactInitials}>{getGroupInitials(cname)}</Text>
                          </View>
                        )}
                        <Text style={styles.contactName} numberOfLines={1}>{cname}</Text>
                        <Text style={[styles.contactAction, invited && { color: INK_SOFT }]}>{invited ? 'Ringing…' : 'Invite'}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          {isIncoming ? (
            <View style={styles.incomingButtonsRow}>
              {/* Decline */}
              <View style={styles.incomingActionGroup}>
                <TouchableOpacity
                  onPress={() => declineIncomingCall()}
                  style={[styles.actionButton, styles.declineButton]}
                >
                  <PhoneOff color="#ffffff" size={26} />
                </TouchableOpacity>
                <Text style={styles.actionLabel}>Decline</Text>
              </View>

              {/* Accept */}
              <View style={styles.incomingActionGroup}>
                <TouchableOpacity
                  onPress={() => acceptIncomingCall()}
                  style={[styles.actionButton, styles.acceptButton]}
                >
                  {isVideo ? <Video color="#ffffff" size={26} /> : <Phone color="#ffffff" size={26} />}
                </TouchableOpacity>
                <Text style={styles.actionLabel}>Accept</Text>
              </View>
            </View>
          ) : (
            <View style={styles.glassActionPanel}>
              <View style={styles.buttonsRow}>
                {/* Mute Toggle */}
                <TouchableOpacity
                  onPress={() => setIsMuted(!isMuted)}
                  style={[styles.optionsButton, isMuted && styles.activeOptionsButton]}
                >
                  {isMuted ? <MicOff color="#ffffff" size={20} /> : <Mic color={INK} size={20} />}
                </TouchableOpacity>

                {/* End Call */}
                <TouchableOpacity
                  onPress={() => hangUpCall()}
                  style={[styles.actionButton, styles.declineButton]}
                >
                  <PhoneOff color="#ffffff" size={24} />
                </TouchableOpacity>

                {/* Speaker Toggle */}
                <TouchableOpacity
                  onPress={() => setIsSpeaker(!isSpeaker)}
                  style={[styles.optionsButton, isSpeaker && styles.activeOptionsButton]}
                >
                  <Volume2 color={isSpeaker ? '#ffffff' : INK} size={20} />
                </TouchableOpacity>

                {/* Video Toggle (only in active calls) */}
                {callState.status === 'in_call' && (
                  <TouchableOpacity
                    onPress={() => setIsCameraActive(!isCameraActive)}
                    style={[styles.optionsButton, isCameraActive && styles.activeOptionsButton]}
                  >
                    {isCameraActive ? <Video color="#ffffff" size={20} /> : <VideoOff color={INK} size={20} />}
                  </TouchableOpacity>
                )}

                {/* Add people (only in active calls) */}
                {callState.status === 'in_call' && (
                  <TouchableOpacity
                    onPress={openAddPeople}
                    style={styles.optionsButton}
                  >
                    <UserPlus color={INK} size={20} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

async function checkAndTriggerAutoBackup() {
  try {
    const isAutoBackupEnabled = await AsyncStorage.getItem("bubble_auto_backup");
    if (isAutoBackupEnabled === "false") return;

    const now = new Date();
    if (now.getHours() === 2) {
      const todayStr = now.toDateString();
      const lastBackupDate = await AsyncStorage.getItem("bubble_last_auto_backup_date");
      if (lastBackupDate === todayStr) return;

      console.log("Auto-backup starting at 2:00 AM...");
      const { chatCache } = await import("../lib/chatCache");
      const success = await chatCache.performCloudBackup();
      if (success) {
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const fullTime = `${dateStr} at ${timeStr}`;
        await AsyncStorage.multiSet([
          ["bubble_last_auto_backup_date", todayStr],
          ["bubble_last_backup_time", fullTime]
        ]);
        console.log("Auto-backup successfully completed at 2:00 AM!");
      }
    }
  } catch (err) {
    console.warn("Failed in checkAndTriggerAutoBackup:", err);
  }
}

export default function RootLayout() {
  verifyInstallation();
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    // Pre-load stored token into in-memory cache for synchronous getAuthHeaders()
    initApiFromStorage().then(() => {
      const { chatCache } = require("../lib/chatCache");
      chatCache.initAvatarCache().then(() => {
        chatCache.syncAvatarsWithBackend().catch(() => {});
      });
    }).catch(() => {});

    // Configure Google Sign-In
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!isExpoGo) {
      try {
        const { GoogleSignin } = require("@react-native-google-signin/google-signin");
        if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
          GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
            offlineAccess: true,
          });
        } else {
          console.warn("⚠️ EXPO_PUBLIC_GOOGLE_CLIENT_ID is not configured. Google Sign-In may fail.");
        }
      } catch (e) {
        console.log("Google Sign-In native module is not available.");
      }
    } else {
      console.log("Running in Expo Go. Google Sign-In native module is disabled. Using Web fallback.");
    }
    
    // Check auto backup status on launch and schedule every 15 minutes
    checkAndTriggerAutoBackup();
    const interval = setInterval(checkAndTriggerAutoBackup, 15 * 60 * 1000);

    // Register Push Notifications on launch
    registerForPushNotificationsAsync().catch((err) => {
      console.warn("Failed to register push notifications on mount:", err);
    });

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalCallOverlay />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  minimizedContainer: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: 142,
    height: 184,
    backgroundColor: WHITE,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    shadowColor: '#6c5ce7',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  miniOptionButton: {
    padding: 4,
  },
  miniNameText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: INK,
    textAlign: 'center',
    width: 110,
    marginTop: 6,
  },
  miniDurationText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: INK_SOFT,
    marginTop: 2,
  },
  miniButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  miniOptionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMiniOptionsButton: {
    backgroundColor: PURPLE,
  },
  callContainer: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  minimizeButton: {
    position: 'absolute',
    top: 54,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  callHeader: {
    alignItems: 'center',
    marginTop: 28,
  },
  callTypeTitle: {
    color: PURPLE,
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  callerNameText: {
    color: INK,
    fontSize: 30,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 4,
    textAlign: 'center',
  },
  statusText: {
    color: INK_SOFT,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
  mediaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    width: '100%',
  },
  avatarOuterRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOuterRingIncoming: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.18)',
  },
  avatarInnerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6c5ce7',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  videoPreviewFrame: {
    width: 280,
    height: 400,
    borderRadius: 32,
    backgroundColor: '#0b0b12',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  remoteVideoPreviewOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 80,
    height: 110,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  remoteAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  remoteInitialsPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteInitialsText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  remoteLabel: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    color: INK_SOFT,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  incomingActionGroup: {
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: INK_SOFT,
  },
  glassActionPanel: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  declineButton: {
    backgroundColor: RED,
  },
  acceptButton: {
    backgroundColor: GREEN,
  },
  optionsButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOptionsButton: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },

  // Add-people sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: INK,
  },
  sheetClose: {
    padding: 4,
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PURPLE_SOFT,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  shareLinkText: {
    color: PURPLE,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  sheetSection: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: INK_SOFT,
    letterSpacing: 1,
    marginBottom: 6,
  },
  sheetEmpty: {
    color: INK_SOFT,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactAvatarFallback: {
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitials: {
    color: WHITE,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  contactName: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: INK,
  },
  contactAction: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: PURPLE,
  },
});
