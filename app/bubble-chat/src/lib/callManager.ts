import { getSocket } from './socket';
import { RingtonePlayer } from './ringtone';
import { createMeeting, endMeeting } from './api';
import { authStorage } from './authStorage';

export type CallState =
  | { status: 'idle' }
  | { status: 'calling_out'; user: any; type: 'voice' | 'video'; roomId: string }
  | { status: 'calling_in'; callerId: string; callerName: string; callerAvatar?: string; type: 'voice' | 'video'; roomId: string }
  | { status: 'in_call'; user: any; type: 'voice' | 'video'; roomId: string; duration: number; meetingDbId: string | null };

let currentCallState: CallState = { status: 'idle' };
let listeners: ((state: CallState) => void)[] = [];
let ringtonePlayer: RingtonePlayer | null = null;
let durationInterval: any = null;
let callTimeout: any = null;

export const subscribeCallState = (listener: (state: CallState) => void) => {
  listeners.push(listener);
  listener(currentCallState);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notify = () => {
  listeners.forEach(l => {
    try { l(currentCallState); } catch (e) {}
  });
};

export const setCallState = (newState: CallState) => {
  currentCallState = newState;
  notify();
};

export const getCallState = () => currentCallState;

export const startRingtone = (type: 'incoming' | 'outgoing') => {
  if (!ringtonePlayer) {
    ringtonePlayer = new RingtonePlayer();
  }
  ringtonePlayer.startRinging(type);
};

export const stopRingtone = () => {
  if (ringtonePlayer) {
    ringtonePlayer.stop();
    ringtonePlayer = null;
  }
};

export const startOutgoingCall = async (user: any, type: 'voice' | 'video') => {
  const roomId = `bubble-${Math.random().toString(36).slice(2, 11)}`;
  
  // Update state immediately to open calling overlay for the host
  setCallState({
    status: 'calling_out',
    user,
    type,
    roomId
  });

  startRingtone('outgoing');

  const socket = getSocket();
  const currentUser = await authStorage.getUser();
  const callerName = currentUser?.full_name || currentUser?.username || 'Bubble User';
  const callerAvatar = currentUser?.avatar || null;

  if (socket) {
    // Emit call offer to backend with authentic caller details
    socket.emit('call_offer', {
      toUserId: user.id || user._id || user.otherUserId,
      roomId,
      callerName,
      callerAvatar,
      type
    });
  } else {
    console.warn("Socket not initialized. Attempting call on disconnected socket.");
  }

  // Timeout if no answer after 30 seconds
  if (callTimeout) clearTimeout(callTimeout);
  callTimeout = setTimeout(() => {
    if (socket) {
      socket.emit('call_reject', { toUserId: user.id || user._id || user.otherUserId });
    }
    hangUpCall();
  }, 30000);
};

export const acceptIncomingCall = async () => {
  const socket = getSocket();
  const state = currentCallState;
  if (!socket || state.status !== 'calling_in') return;

  if (callTimeout) clearTimeout(callTimeout);
  stopRingtone();

  // Emit call answer
  socket.emit('call_answer', {
    toUserId: state.callerId,
    roomId: state.roomId
  });

  // Create meeting in database
  let dbId: string | null = null;
  try {
    const res = await createMeeting({
      roomId: state.roomId,
      title: `${state.type === 'video' ? 'Video' : 'Voice'} Call`,
      type: state.type
    });
    dbId = res?.meeting?._id || res?._id || null;
    if (dbId) {
      socket.emit('meeting_started', { roomId: state.roomId, meetingId: dbId });
    }
  } catch (err) {
    console.warn('Failed to create meeting record:', err);
  }

  setCallState({
    status: 'in_call',
    user: { name: state.callerName, avatar: state.callerAvatar, id: state.callerId },
    type: state.type,
    roomId: state.roomId,
    duration: 0,
    meetingDbId: dbId
  });

  startDurationTimer();
};

export const declineIncomingCall = () => {
  const socket = getSocket();
  const state = currentCallState;
  if (!socket || state.status !== 'calling_in') return;

  if (callTimeout) clearTimeout(callTimeout);
  stopRingtone();

  socket.emit('call_reject', { toUserId: state.callerId });
  setCallState({ status: 'idle' });
};

export const hangUpCall = async () => {
  const socket = getSocket();
  const state = currentCallState;
  if (callTimeout) clearTimeout(callTimeout);
  stopRingtone();
  stopDurationTimer();

  if (state.status === 'calling_out') {
    const targetUserId = state.user?.id || state.user?._id || state.user?.otherUserId;
    if (socket) {
      socket.emit('call_reject', { toUserId: targetUserId, roomId: state.roomId });
      socket.emit('call_end', { toUserId: targetUserId, roomId: state.roomId });
    }
  } else if (state.status === 'calling_in') {
    // Tearing down an unanswered incoming call — tell the caller so their side resets too.
    if (socket) {
      socket.emit('call_reject', { toUserId: state.callerId, roomId: state.roomId });
    }
  } else if (state.status === 'in_call') {
    const targetUserId = state.user.id || state.user._id || state.user.otherUserId;
    if (socket) {
      socket.emit('call_end', { toUserId: targetUserId, roomId: state.roomId });
      socket.emit('meeting_ended', { roomId: state.roomId });
    }

    // Call endMeeting API
    if (state.meetingDbId) {
      try {
        await endMeeting(state.meetingDbId, { saveToStorage: true, sendEmail: true });
      } catch (err) {
        console.warn('Failed to end meeting on server:', err);
      }
    }
  }

  setCallState({ status: 'idle' });
};

const startDurationTimer = () => {
  if (durationInterval) clearInterval(durationInterval);
  durationInterval = setInterval(() => {
    const prev = getCallState();
    if (prev.status === 'in_call') {
      setCallState({ ...prev, duration: prev.duration + 1 });
    }
  }, 1000);
};

const stopDurationTimer = () => {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
};

// Setup Socket Listeners
export const setupCallSocketListeners = (socket: any) => {
  if (!socket) return;

  // Remove duplicate listeners if any
  socket.off('incoming_call');
  socket.off('call_accepted');
  socket.off('call_rejected');
  socket.off('call_ended');
  socket.off('meeting_ended');

  socket.on('incoming_call', (data: { fromUserId: string; roomId: string; callerName?: string; callerAvatar?: string; type?: 'voice' | 'video' }) => {
    if (currentCallState.status !== 'idle') {
      // Busy, reject immediately
      socket.emit('call_reject', { toUserId: data.fromUserId });
      return;
    }

    setCallState({
      status: 'calling_in',
      callerId: data.fromUserId,
      callerName: data.callerName || 'Bubble User',
      callerAvatar: data.callerAvatar,
      roomId: data.roomId,
      type: data.type || 'voice'
    });

    startRingtone('incoming');

    if (callTimeout) clearTimeout(callTimeout);
    callTimeout = setTimeout(() => {
      declineIncomingCall();
    }, 30000);
  });

  socket.on('call_accepted', async (data: { byUserId: string; roomId: string }) => {
    if (currentCallState.status !== 'calling_out') return;
    if (callTimeout) clearTimeout(callTimeout);
    stopRingtone();

    // Host also creates/updates meeting DB record on accept
    let dbId: string | null = null;
    try {
      const user = currentCallState.user || {};
      const chatId = user.chatId || user.id || user._id || user.otherChatId;
      const otherUserId = user.otherUserId || user.id || user._id;
      const res = await createMeeting({
        roomId: data.roomId,
        title: `${currentCallState.type === 'video' ? 'Video' : 'Voice'} Call`,
        type: currentCallState.type,
        chatId,
        attendees: otherUserId ? [otherUserId] : [],
      });
      dbId = res?.meeting?._id || res?._id || null;
      if (dbId) {
        socket.emit('meeting_started', { roomId: data.roomId, meetingId: dbId });
      }
    } catch (err) {
      console.warn('Failed to create meeting record:', err);
    }

    setCallState({
      status: 'in_call',
      user: currentCallState.user,
      type: currentCallState.type,
      roomId: data.roomId,
      duration: 0,
      meetingDbId: dbId
    });

    startDurationTimer();
  });

  socket.on('call_rejected', () => {
    if (currentCallState.status === 'calling_out' || currentCallState.status === 'in_call') {
      hangUpCall();
    }
  });

  socket.on('meeting_ended', (data: { roomId: string }) => {
    if (currentCallState.status === 'in_call' && currentCallState.roomId === data.roomId) {
      hangUpCall();
    }
  });

  // Server emits 'call_ended' from either reject, explicit hangup, or timeout.
  // Reaches both sides regardless of join state — this is the authoritative end signal.
  socket.on('call_ended', (data: { roomId?: string; byUserId?: string }) => {
    const status = currentCallState.status;
    if (status === 'idle') return;
    // Match by room when present; otherwise fall back to "any active call".
    if (!data?.roomId || data.roomId === currentCallState.roomId) {
      hangUpCall();
    }
  });
};
