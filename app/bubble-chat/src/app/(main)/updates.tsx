import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Share, ActivityIndicator } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, X, Check, MicOff, PhoneOff, Volume2, Video, FileText, Users, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { subscribeToPlusButton } from '../../lib/mockData';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTasks, createTaskFull, uploadMeetingRecording } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import * as DocumentPicker from 'expo-document-picker';

// Helper to get calendar cells
const getCalendarCells = (currentDate: Date) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  // Previous month overflow
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }
  // Next month overflow
  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }
  return cells;
};

function getInitials(name: string) {
  if (!name) return 'ME';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Type-based calendar dot colors
const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: '#3b82f6',  // blue
  event: '#22c55e',   // green
  task: '#eab308',    // yellow
};

export default function UpdatesScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Event creation states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTimeText, setStartTimeText] = useState('10:00');
  const [endTimeText, setEndTimeText] = useState('11:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [type, setType] = useState<'meeting' | 'task' | 'event'>('meeting');

  // Calling states
  const [activeCall, setActiveCall] = useState<{ user: any; type: 'voice' | 'video' } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Transcript notification state
  const [transcriptModal, setTranscriptModal] = useState<{
    visible: boolean;
    title: string;
    summary: string;
    actionItems: { text: string; assignedToName?: string }[];
    rawTranscript?: string;
    meetingId?: string;
  }>({
    visible: false,
    title: '',
    summary: '',
    actionItems: [],
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadRecording = async (task: any) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];
      const fileToUpload = {
        uri: fileAsset.uri,
        name: fileAsset.name || 'recording.mp3',
        type: fileAsset.mimeType || 'audio/mpeg',
      } as any;

      setIsUploading(true);
      const res = await uploadMeetingRecording(task._id, fileToUpload);
      setIsUploading(false);

      if (res && res.message) {
        Alert.alert(
          '✨ Audio Transcribed',
          'Aida has successfully processed the audio recording. Check your updates for the summary and action items.',
          [
            {
              text: 'View Transcript',
              onPress: () => {
                setTranscriptModal({
                  visible: true,
                  title: task.title || 'Meeting Transcript',
                  summary: res.summary || 'AI Summary is processing in the background...',
                  actionItems: res.actionItems || [],
                  rawTranscript: res.transcriptRaw || '',
                  meetingId: task._id,
                });
              }
            },
            { text: 'OK' }
          ]
        );
      }
      await syncTasks();
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload Failed', err.message || 'Could not upload audio file.');
    }
  };

  const navigation = useNavigation();
  const [isFocused, setIsFocused] = useState(navigation.isFocused());

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsFocused(false);
    });
    setIsFocused(navigation.isFocused());

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    if (!isFocused) return;

    const unsubscribePlus = subscribeToPlusButton(() => {
      setIsModalOpen(true);
    });

    return () => {
      unsubscribePlus();
    };
  }, [isFocused]);

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);

  const loadCache = async () => {
    try {
      const raw = await AsyncStorage.getItem('bubble_cached_tasks');
      if (raw) {
        setTasks(JSON.parse(raw));
      }
    } catch (err) {
      console.warn("Failed to load cached tasks in updates.tsx:", err);
    }
  };

  const syncTasks = async () => {
    try {
      const response = await fetchTasks();
      const list = Array.isArray(response) ? response : (response?.data || []);
      setTasks(list);
      await AsyncStorage.setItem('bubble_cached_tasks', JSON.stringify(list));
    } catch (err) {
      console.warn("Failed to sync tasks silently in updates.tsx:", err);
    }
  };

  useEffect(() => {
    loadCache();
    syncTasks();
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const interval = setInterval(syncTasks, 7000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // Listen for meeting_ended socket event to show transcript notification
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMeetingEnded = async (data: {
      roomId: string;
      meetingId?: string;
      title?: string;
      summary?: string;
      actionItems?: { text: string; assignedToName?: string }[];
      rawTranscript?: string;
    }) => {
      // Fetch full meeting details if we have meetingId
      let summary = data.summary || '';
      let actionItems = data.actionItems || [];
      let rawTranscript = data.rawTranscript || '';

      if (data.meetingId) {
        try {
          const { fetchMeetingById } = await import('../../lib/api');
          const res = await fetchMeetingById(data.meetingId);
          const m = res?.meeting;
          if (m) {
            summary = m.summary || '';
            actionItems = m.actionItems || [];
            rawTranscript = m.transcriptRaw || '';
          }
        } catch (_) {}
      }

      Alert.alert(
        '📋 Meeting Ended',
        `"${data.title || 'The meeting'}" has finished. Tap to view transcript & minutes.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'View Transcript',
            onPress: () => {
              setTranscriptModal({
                visible: true,
                title: data.title || 'Meeting Transcript',
                summary,
                actionItems,
                rawTranscript,
                meetingId: data.meetingId,
              });
            },
          },
        ]
      );

      // Refresh tasks since new ones may have been created from action items
      await syncTasks();
    };

    socket.on('meeting_ended', onMeetingEnded);
    return () => {
      socket.off('meeting_ended', onMeetingEnded);
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (activeCall) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const cells = getCalendarCells(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const selectedDayTasks = tasks.filter(t => new Date(t.start_time).toDateString() === selectedDate.toDateString());

  // Check if any high priority meeting is happening right now to show as a quick join option
  const activeNowMeeting = tasks.find(t => {
    if (t.type !== 'meeting' || (t.priority !== 'high' && t.priority !== 'urgent')) return false;
    const start = new Date(t.start_time).getTime();
    const end = new Date(t.end_time).getTime();
    const now = Date.now();
    return now >= start && now <= end;
  });

  const handleCreateEvent = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for the event.');
      return;
    }

    try {
      const start = new Date(selectedDate);
      const [sH, sM] = startTimeText.split(':').map(Number);
      start.setHours(sH || 10, sM || 0, 0, 0);

      const end = new Date(selectedDate);
      const [eH, eM] = endTimeText.split(':').map(Number);
      end.setHours(eH || 11, eM || 0, 0, 0);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        priority,
        type,
      };

      await createTaskFull(payload);
      
      // Reset form
      setTitle('');
      setDescription('');
      setStartTimeText('10:00');
      setEndTimeText('11:00');
      setPriority('medium');
      setType('meeting');
      
      setIsModalOpen(false);
      await syncTasks();

      // If urgent meeting scheduled immediately, prompt trigger
      if ((payload.priority === 'high' || payload.priority === 'urgent') && payload.type === 'meeting') {
        Alert.alert(
          'Priority Meeting Scheduled',
          'Everybody in the group is notified to come online for this call.',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Start Call Now', 
              onPress: () => {
                setActiveCall({
                  user: { name: payload.title, avatar: null },
                  type: 'voice'
                });
              } 
            }
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-black/5">
        <View>
          <Svg height="36" width="140">
            <Defs>
              <LinearGradient id="updatesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#6c5ce7" />
                <Stop offset="100%" stopColor="rgba(108,92,231,0.6)" />
              </LinearGradient>
            </Defs>
            <SvgText
              fill="url(#updatesGrad)"
              fontSize="26"
              fontFamily="SpaceGrotesk_700Bold"
              x="0"
              y="26"
              letterSpacing="-0.5"
            >
              Updates
            </SvgText>
          </Svg>
          <Text className="text-xs text-ink-soft font-sans mt-0.5">Plan and sync team agendas</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          className="flex-row items-center bg-purple px-4 py-2.5 rounded-xl shadow-sm"
        >
          <Plus color="#fff" size={16} />
          <Text className="text-white text-xs font-bold font-sans ml-1">Add Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Banner if priority meeting is live */}
        {activeNowMeeting && (
          <TouchableOpacity
            onPress={() => {
              setActiveCall({
                user: { name: activeNowMeeting.title, avatar: null },
                type: 'video'
              });
            }}
            className="mx-4 mt-4 bg-red-500 rounded-2xl p-4 flex-row items-center justify-between shadow-md shadow-red-500/20"
          >
            <View className="flex-1 mr-3">
              <Text className="text-white font-bold text-xs uppercase tracking-widest">🔴 LIVE TEAM CALL ACTIVE</Text>
              <Text className="text-white font-bold text-sm mt-1" numberOfLines={1}>{activeNowMeeting.title}</Text>
            </View>
            <View className="bg-white px-4 py-2 rounded-xl">
              <Text className="text-red-500 text-xs font-bold font-sans">JOIN NOW</Text>
            </View>
          </TouchableOpacity>
        )}

        <View className="bg-purple-soft/20 p-6 border-b border-black/5 w-full">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-ink font-sans">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={prevMonth} className="p-2 border border-black/5 rounded-xl bg-white">
                <ChevronLeft color="#6c5ce7" size={16} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentDate(new Date())} className="px-3 py-2 border border-black/5 rounded-xl bg-white">
                <Text className="text-xs font-bold text-ink font-sans">Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} className="p-2 border border-black/5 rounded-xl bg-white">
                <ChevronRight color="#6c5ce7" size={16} />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row justify-between mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} className="text-[10px] font-bold text-black/30 uppercase flex-1 text-center font-sans">{day}</Text>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {cells.map((cell, idx) => {
              const selected = isSelected(cell.date);
              const today = isToday(cell.date);
              const dayTasks = tasks.filter(t => new Date(t.start_time).toDateString() === cell.date.toDateString());
              const hasMeeting = dayTasks.length > 0;

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedDate(cell.date)}
                  className="w-[14.28%] aspect-square p-1"
                >
                  <View className={`flex-1 rounded-[14px] p-1.5 justify-between border ${
                    selected ? 'bg-purple border-purple' : 
                    today ? 'border-purple/50 bg-purple/5' : 
                    cell.isCurrentMonth ? 'bg-white border-black/5' : 'bg-slate-50 border-black/5 opacity-50'
                  }`}>
                    <Text className={`text-xs font-bold font-sans ${selected ? 'text-white' : 'text-ink'}`}>
                      {cell.date.getDate()}
                    </Text>
                    {hasMeeting && (
                      <View className="flex-row gap-0.5 mt-auto flex-wrap">
                        {dayTasks.map(t => {
                          const dotColor = EVENT_TYPE_COLORS[t.type] || '#6c5ce7';
                          return (
                            <View key={t._id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: selected ? '#ffffff' : dotColor, marginRight: 1 }} />
                          );
                        })}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="p-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic mb-1 font-sans">Agenda for</Text>
          <Text className="text-lg font-bold text-ink mb-4 font-sans">{selectedDate.toLocaleDateString('en-US', { dateStyle: 'medium' })}</Text>

          {selectedDayTasks.length === 0 ? (
            <View className="py-10 border-2 border-dashed border-black/5 rounded-[24px] bg-white/50 items-center justify-center">
              <Calendar color="#6c5ce7" size={20} opacity={0.3} className="mb-2" />
              <Text className="text-sm text-ink-soft font-medium font-sans">No events scheduled.</Text>
            </View>
          ) : (
            selectedDayTasks.map(task => {
              const typeLabel = task.type === 'meeting' ? { bg: '#eff6ff', text: '#3b82f6' } : task.type === 'event' ? { bg: '#f0fdf4', text: '#22c55e' } : { bg: '#fefce8', text: '#ca8a04' };
              const pColor = task.priority === 'urgent' || task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600';
              return (
                <View key={task._id} style={{ borderLeftWidth: 3, borderLeftColor: EVENT_TYPE_COLORS[task.type] || '#6c5ce7' }} className="p-4 rounded-2xl bg-white border border-black/5 mb-3 shadow-sm">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text style={{ backgroundColor: typeLabel.bg, color: typeLabel.text }} className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-sans">
                      {task.type || 'task'}
                    </Text>
                    <Text className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-sans ${pColor}`}>
                      {task.priority || 'medium'}
                    </Text>
                  </View>
                  <Text className="font-bold text-ink text-sm mb-2 font-sans">{task.title}</Text>
                  {task.description ? (
                    <Text className="text-[12px] text-ink-soft mb-2 font-sans" numberOfLines={2}>{task.description}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1.5">
                      <Clock color="#6c5ce7" size={14} />
                      <Text className="text-[11px] text-ink-soft font-medium font-sans">
                        {new Date(task.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(task.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </View>
                    {(task.type === 'meeting' || task.priority === 'high' || task.priority === 'urgent') && (
                      <TouchableOpacity 
                        onPress={() => {
                          setActiveCall({ user: { name: task.title, avatar: null }, type: 'voice' });
                        }}
                        className="bg-purple/10 px-2.5 py-1 rounded-lg"
                      >
                        <Text className="text-[10px] font-bold text-purple font-sans">Call room</Text>
                      </TouchableOpacity>
                    )}
                    {task.type === 'meeting' && (
                      <TouchableOpacity 
                        onPress={() => handleUploadRecording(task)}
                        className="bg-purple-soft/80 px-2.5 py-1 rounded-lg flex-row items-center"
                        style={{ gap: 4 }}
                      >
                        <FileText size={10} color="#6c5ce7" />
                        <Text className="text-[10px] font-bold text-purple font-sans">Upload Audio</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Transcript Viewer Modal ── */}
      <Modal visible={transcriptModal.visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: '#1f2030' }} numberOfLines={1}>{transcriptModal.title}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#9a9aab', marginTop: 1 }}>Meeting Minutes & Transcript</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={async () => {
                  const shareText = `Meeting: ${transcriptModal.title}\n\nSummary:\n${transcriptModal.summary}\n\nAction Items:\n${transcriptModal.actionItems.map(ai => `• ${ai.text}${ai.assignedToName ? ` (${ai.assignedToName})` : ''}`).join('\n')}\n\nFull Transcript:\n${transcriptModal.rawTranscript || ''}`;
                  try {
                    await Share.share({ message: shareText, title: transcriptModal.title });
                  } catch (_) {}
                }}
                style={{ padding: 6, backgroundColor: 'rgba(108,92,231,0.08)', borderRadius: 10 }}
              >
                <Share2 size={16} color="#6c5ce7" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTranscriptModal(prev => ({ ...prev, visible: false }))}
                style={{ padding: 6 }}
              >
                <X size={20} color="#6c5ce7" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
            {/* AI Summary */}
            {transcriptModal.summary ? (
              <View style={{ backgroundColor: 'rgba(108,92,231,0.06)', borderRadius: 20, padding: 18, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: '#6c5ce7' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <FileText size={16} color="#6c5ce7" />
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#6c5ce7', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aida's Meeting Intelligence</Text>
                </View>
                <Text style={{ fontSize: 13.5, fontFamily: 'Poppins_400Regular', color: '#1f2030', lineHeight: 22 }}>
                  {transcriptModal.summary}
                </Text>
              </View>
            ) : null}

            {/* Action Items */}
            {transcriptModal.actionItems.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Check size={15} color="#22c55e" />
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#1f2030', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Action Items ({transcriptModal.actionItems.length})</Text>
                </View>
                {transcriptModal.actionItems.map((ai, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' }}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', color: '#1f2030', lineHeight: 20 }}>{ai.text}</Text>
                      {ai.assignedToName && (
                        <Text style={{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#6c5ce7', marginTop: 3 }}>@ {ai.assignedToName}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Raw Transcript */}
            {transcriptModal.rawTranscript ? (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Users size={15} color="#9a9aab" />
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#9a9aab', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Full Transcript</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}>
                  <Text style={{ fontSize: 12.5, fontFamily: 'Poppins_400Regular', color: 'rgba(31,32,48,0.75)', lineHeight: 21 }}>
                    {transcriptModal.rawTranscript}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins_400Regular', color: '#9a9aab', fontStyle: 'italic' }}>No transcript available for this meeting.</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8, gap: 10 }}>
            <TouchableOpacity
              onPress={async () => {
                const shareText = `Meeting: ${transcriptModal.title}\n\nSummary:\n${transcriptModal.summary}\n\nAction Items:\n${transcriptModal.actionItems.map(ai => `• ${ai.text}${ai.assignedToName ? ` (${ai.assignedToName})` : ''}`).join('\n')}\n\nFull Transcript:\n${transcriptModal.rawTranscript || ''}`;
                try {
                  await Share.share({ message: shareText, title: transcriptModal.title });
                } catch (_) {}
              }}
              style={{ backgroundColor: 'rgba(108,92,231,0.1)', paddingVertical: 14, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              <Share2 size={16} color="#6c5ce7" />
              <Text style={{ color: '#6c5ce7', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>Share Minutes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTranscriptModal(prev => ({ ...prev, visible: false }))}
              style={{ backgroundColor: '#6c5ce7', paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowColor: '#6c5ce7', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
            >
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins_700Bold', fontSize: 14 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Advanced Create Event Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsModalOpen(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-6 pb-12 shadow-2xl">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text className="text-lg font-bold text-ink">Schedule Agenda</Text>
                <Text className="text-xs text-ink-soft">Plan for {selectedDate.toLocaleDateString('en-US', { dateStyle: 'short' })}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={{ padding: 4 }}>
                <X color="#6c5ce7" size={20} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text className="text-xs font-bold text-ink uppercase mb-1">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Design Sync Meeting"
                  className="bg-purple-soft/30 rounded-2xl p-4 text-ink border border-black/5"
                />
              </View>

              <View>
                <Text className="text-xs font-bold text-ink uppercase mb-1">Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Agenda notes..."
                  className="bg-purple-soft/30 rounded-2xl p-4 text-ink border border-black/5"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text className="text-xs font-bold text-ink uppercase mb-1">Start Time (HH:MM)</Text>
                  <TextInput
                    value={startTimeText}
                    onChangeText={setStartTimeText}
                    placeholder="10:00"
                    className="bg-purple-soft/30 rounded-2xl p-4 text-ink border border-black/5"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-xs font-bold text-ink uppercase mb-1">End Time (HH:MM)</Text>
                  <TextInput
                    value={endTimeText}
                    onChangeText={setEndTimeText}
                    placeholder="11:00"
                    className="bg-purple-soft/30 rounded-2xl p-4 text-ink border border-black/5"
                  />
                </View>
              </View>

              {/* Type Select Tabs */}
              <View>
                <Text className="text-xs font-bold text-ink uppercase mb-1.5">Event Type</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['meeting', 'task', 'event'].map(t => {
                    const active = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setType(t as any)}
                        style={{
                          flex: 1,
                          backgroundColor: active ? '#6c5ce7' : 'rgba(108,92,231,0.08)',
                          borderRadius: 12,
                          paddingVertical: 10,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: active ? '#fff' : '#9a9aab', fontSize: 12, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Priority Select Tabs */}
              <View>
                <Text className="text-xs font-bold text-ink uppercase mb-1.5">Priority</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['low', 'medium', 'high', 'urgent'].map(p => {
                    const active = priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p as any)}
                        style={{
                          flex: 1,
                          backgroundColor: active ? '#6c5ce7' : 'rgba(108,92,231,0.08)',
                          borderRadius: 12,
                          paddingVertical: 10,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: active ? '#fff' : '#9a9aab', fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' }}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleCreateEvent}
              className="bg-purple py-4 rounded-xl items-center flex-row justify-center mt-6 shadow-md"
            >
              <Check color="#fff" size={16} />
              <Text className="text-white font-bold ml-2">Create Agenda Event</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Call Overlay Modal ── */}
      <Modal visible={activeCall !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#1f2030' }} className="items-center justify-between py-16 px-6">
          {/* Header */}
          <View className="items-center mt-8">
            <Text className="text-white/60 text-xs font-bold font-sans uppercase tracking-widest mb-2">
              BUBBLE {activeCall?.type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
            </Text>
            <Text className="text-white text-2xl font-bold font-sans mt-2">
              {activeCall?.user?.name || 'Meeting Room'}
            </Text>
            <Text className="text-[#6c5ce7] text-sm font-semibold font-sans mt-2">
              {callDuration === 0 ? 'Ringing Teammates...' : `Connected • ${formatDuration(callDuration)}`}
            </Text>
          </View>

          {/* Avatar / Video Preview area */}
          <View className="items-center justify-center my-8">
            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(108,92,231,0.15)', borderWidth: 4, borderColor: '#6c5ce7' }} className="items-center justify-center shadow-lg">
              <Text className="text-white text-4xl font-bold font-sans">
                {getInitials(activeCall?.user?.name)}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View className="w-full flex-row justify-around items-center px-4 mb-4">
            <TouchableOpacity 
              onPress={() => setIsCallMuted(!isCallMuted)}
              style={{ backgroundColor: isCallMuted ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <MicOff color={isCallMuted ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveCall(null)}
              className="w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg shadow-red-500/30"
            >
              <PhoneOff color="#fff" size={24} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              style={{ backgroundColor: isSpeakerOn ? '#6c5ce7' : 'rgba(255,255,255,0.08)' }} 
              className="w-14 h-14 rounded-full items-center justify-center"
            >
              <Volume2 color={isSpeakerOn ? '#fff' : '#9a9aab'} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isUploading && (
        <Modal transparent animationType="fade" visible={isUploading}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center' }} className="gap-3 shadow-xl">
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#1f2030', fontSize: 14 }}>Transcribing Audio...</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', color: '#9a9aab', fontSize: 11 }}>Aida is processing your recording</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
