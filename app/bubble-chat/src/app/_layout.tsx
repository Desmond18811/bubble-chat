import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import * as SplashScreen from "expo-splash-screen";
import { verifyInstallation } from "nativewind";
import "../global.css";
import { initApiFromStorage, getSecureMediaUrl } from "../lib/api";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { PhoneOff, Mic, MicOff, Volume2, Video, VideoOff, Check, Minimize2, Maximize2 } from "lucide-react-native";
import { CameraView, Camera } from "expo-camera";
import { subscribeCallState, acceptIncomingCall, declineIncomingCall, hangUpCall, CallState } from "../lib/callManager";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

function GlobalCallOverlay() {
  const [callState, setCallState] = useState<CallState>({ status: 'idle' });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeCallState((state) => {
      setCallState(state);
      if (state.status === 'calling_out' || state.status === 'calling_in') {
        setIsMuted(false);
        setIsSpeaker(false);
        setIsCameraActive(state.type === 'video');
        setIsMinimized(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (callState.status === 'in_call' && isCameraActive && hasPermission === null) {
      Camera.requestCameraPermissionsAsync().then(({ status }) => {
        setHasPermission(status === 'granted');
      });
    }
  }, [callState.status, isCameraActive]);

  if (callState.status === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    if (!name) return 'UC';
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getGroupInitials = (name: string) => {
    if (!name) return 'UC';
    const clean = name.trim().replace(/\s+/g, ' ');
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getAvatarUri = () => {
    if (callState.status === 'calling_out') return getSecureMediaUrl(callState.user?.avatar);
    if (callState.status === 'calling_in') return getSecureMediaUrl(callState.callerAvatar);
    if (callState.status === 'in_call') return getSecureMediaUrl(callState.user?.avatar);
    return null;
  };

  const getName = () => {
    if (callState.status === 'calling_out') return callState.user?.name || 'Colleague';
    if (callState.status === 'calling_in') return callState.callerName || 'Colleague';
    if (callState.status === 'in_call') return callState.user?.name || 'Colleague';
    return 'Colleague';
  };

  const name = getName();
  const avatarUri = getAvatarUri();

  if (isMinimized) {
    return (
      <View style={styles.minimizedContainer}>
        {/* Floating Mini Overlay Header */}
        <View style={styles.miniHeader}>
          <TouchableOpacity onPress={() => setIsMinimized(false)} style={styles.miniOptionButton}>
            <Maximize2 color="#6c5ce7" size={16} />
          </TouchableOpacity>
        </View>

        {/* Avatar/Initials and status */}
        <View style={{ alignItems: 'center', width: '100%' }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri || undefined }} style={styles.miniAvatarImage} />
          ) : (
            <View style={styles.miniInitialsPlaceholder}>
              <Text style={styles.miniInitialsText}>{getGroupInitials(name)}</Text>
            </View>
          )}
          <Text numberOfLines={1} style={styles.miniNameText}>{name}</Text>
          <Text style={styles.miniDurationText}>
            {callState.status === 'in_call' ? formatDuration(callState.duration) : 'Calling...'}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.miniButtonsRow}>
          <TouchableOpacity
            onPress={() => setIsMuted(!isMuted)}
            style={[styles.miniOptionsButton, isMuted && styles.activeMiniOptionsButton]}
          >
            {isMuted ? <MicOff color="#ffffff" size={14} /> : <Mic color="#6c5ce7" size={14} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => hangUpCall()}
            style={[styles.miniOptionsButton, { backgroundColor: '#ef4444' }]}
          >
            <PhoneOff color="#ffffff" size={14} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
        <View style={styles.callContainer}>
          {/* Minimize Button in top right of Full Screen */}
          {callState.status !== 'calling_in' && (
            <TouchableOpacity 
              onPress={() => setIsMinimized(true)}
              style={{
                position: 'absolute',
                top: 48,
                right: 24,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(108,92,231,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Minimize2 color="#6c5ce7" size={18} />
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.callHeader}>
            <Text style={styles.callTypeTitle}>
              BUBBLE {callState.type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
            </Text>
            <Text style={styles.callerNameText}>{name}</Text>
            <Text style={styles.statusText}>
              {callState.status === 'calling_out' && 'Calling...'}
              {callState.status === 'calling_in' && 'Incoming Call...'}
              {callState.status === 'in_call' && `Connected • ${formatDuration(callState.duration)}`}
            </Text>
          </View>

          {/* Media / Video Stream area */}
          <View style={styles.mediaContainer}>
            {callState.status === 'in_call' && isCameraActive && hasPermission ? (
              <View style={styles.videoPreviewFrame}>
                <CameraView style={StyleSheet.absoluteFill} facing="front" />
                {/* Remote simulated profile avatar overlay */}
                <View style={styles.remoteVideoPreviewOverlay}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri || undefined }} style={styles.remoteAvatarImage} />
                  ) : (
                    <View style={styles.remoteInitialsPlaceholder}>
                      <Text style={styles.remoteInitialsText}>{getGroupInitials(name)}</Text>
                    </View>
                  )}
                  <Text style={styles.remoteLabel}>Remote</Text>
                </View>
              </View>
            ) : (
              <View style={styles.avatarPlaceholderContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri || undefined }} style={styles.largeAvatarImage} />
                ) : (
                  <View style={styles.largeInitialsPlaceholder}>
                    <Text style={styles.largeInitialsText}>{getGroupInitials(name)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Call Actions */}
          <View style={styles.actionsContainer}>
            {callState.status === 'calling_in' ? (
              <View style={styles.buttonsRow}>
                {/* Decline Button */}
                <TouchableOpacity
                  onPress={() => declineIncomingCall()}
                  style={[styles.actionButton, styles.declineButton]}
                >
                  <PhoneOff color="#ffffff" size={24} style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
                
                {/* Accept Button */}
                <TouchableOpacity
                  onPress={() => acceptIncomingCall()}
                  style={[styles.actionButton, styles.acceptButton]}
                >
                  <Check color="#ffffff" size={24} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonsRow}>
                {/* Mute Toggle */}
                <TouchableOpacity
                  onPress={() => setIsMuted(!isMuted)}
                  style={[styles.optionsButton, isMuted && styles.activeOptionsButton]}
                >
                  {isMuted ? <MicOff color="#ffffff" size={22} /> : <Mic color="#6c5ce7" size={22} />}
                </TouchableOpacity>

                {/* End Call / Decline Button */}
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
                  <Volume2 color={isSpeaker ? '#ffffff' : '#6c5ce7'} size={22} />
                </TouchableOpacity>

                {/* Video Toggle (only available in active calls) */}
                {callState.status === 'in_call' && (
                  <TouchableOpacity
                    onPress={() => setIsCameraActive(!isCameraActive)}
                    style={[styles.optionsButton, isCameraActive && styles.activeOptionsButton]}
                  >
                    {isCameraActive ? <Video color="#ffffff" size={22} /> : <VideoOff color="#6c5ce7" size={22} />}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
  );
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
    initApiFromStorage().catch(() => {});
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
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalCallOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  minimizedContainer: {
    position: 'absolute',
    bottom: 96,
    right: 16,
    width: 140,
    height: 180,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(108,92,231,0.15)',
    padding: 10,
    shadowColor: '#6c5ce7',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
  miniAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 18,
    marginBottom: 6,
  },
  miniInitialsPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  miniInitialsText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  miniNameText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1f2030',
    textAlign: 'center',
    width: 110,
  },
  miniDurationText: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#6c5ce7',
    marginTop: 2,
  },
  miniButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  miniOptionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(108,92,231,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMiniOptionsButton: {
    backgroundColor: '#6c5ce7',
  },
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 99999,
  },
  callContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  callHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  callTypeTitle: {
    color: '#9a9aab',
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  callerNameText: {
    color: '#1f2030',
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 4,
    textAlign: 'center',
  },
  statusText: {
    color: '#6c5ce7',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 6,
  },
  mediaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    width: '100%',
  },
  avatarPlaceholderContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(108,92,231,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(108,92,231,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6c5ce7',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  largeAvatarImage: {
    width: 146,
    height: 146,
    borderRadius: 73,
  },
  largeInitialsPlaceholder: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeInitialsText: {
    color: '#ffffff',
    fontSize: 44,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  videoPreviewFrame: {
    width: 260,
    height: 380,
    borderRadius: 32,
    backgroundColor: '#f1f2f6',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  remoteVideoPreviewOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 80,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.15)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
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
    backgroundColor: '#000000',
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
    color: '#6c5ce7',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  optionsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(108,92,231,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOptionsButton: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
});
