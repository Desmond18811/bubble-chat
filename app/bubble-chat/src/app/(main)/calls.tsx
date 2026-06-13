import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Phone, Video, Users, User, MicOff, PhoneOff, Volume2, Calendar, ChevronLeft, ChevronRight, Clock, Plus, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { searchUsers, fetchTasks, createTaskFull, getSecureMediaUrl } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOutgoingCall } from '../../lib/callManager';
import { Image } from 'expo-image';
import { Avatar } from '../../components/Avatar';

// Calendar cells generator
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
  if (!name) return 'UC';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getGroupInitials(name: string) {
  if (!name) return 'UC';
  const clean = name.trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function CallsScreen() {
  const [callsTab, setCallsTab] = useState<'meet' | 'calendar'>('meet');

  // Live collaborative spaces (mock rooms for meeting coordination)
  const [activeRooms] = useState([
    { id: '1', title: 'Design Sync', members: 4, callers: ['A', 'B', 'C'] },
    { id: '2', title: 'Engineering Standup', members: 12, callers: ['D', 'E', 'F'] }
  ]);

  const [coworkers, setCoworkers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Calling states

  // Calendar agenda states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Event form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTimeText, setStartTimeText] = useState('10:00');
  const [endTimeText, setEndTimeText] = useState('11:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [type, setType] = useState<'meeting' | 'task' | 'event'>('meeting');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const loadCache = async () => {
    try {
      const cachedTasks = await AsyncStorage.getItem('bubble_cached_tasks');
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
      }
      const cachedCoworkers = await AsyncStorage.getItem('bubble_cached_coworkers');
      if (cachedCoworkers) {
        setCoworkers(JSON.parse(cachedCoworkers));
      }
    } catch (err) {
      console.warn("Failed to load cached calls screen data:", err);
    }
  };

  const syncData = async () => {
    try {
      // Fetch coworkers
      const coworkersRes = await searchUsers('');
      const coworkersList = coworkersRes?.users || [];
      setCoworkers(coworkersList);
      await AsyncStorage.setItem('bubble_cached_coworkers', JSON.stringify(coworkersList));

      // Fetch tasks/agenda
      const tasksRes = await fetchTasks();
      const tasksList = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.data || []);
      setTasks(tasksList);
      await AsyncStorage.setItem('bubble_cached_tasks', JSON.stringify(tasksList));
    } catch (err) {
      console.warn("Failed to sync calls screen data:", err);
    }
  };

  useEffect(() => {
    loadCache();
    syncData();
  }, []);

  useEffect(() => {
    const interval = setInterval(syncData, 6000);
    return () => clearInterval(interval);
  }, []);



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
      await syncData();

      if ((payload.priority === 'high' || payload.priority === 'urgent') && payload.type === 'meeting') {
        Alert.alert(
          'Priority Meeting Scheduled',
          'Everybody in the group is notified to come online for this call.',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Start Call Now', 
              onPress: () => {
                startOutgoingCall({ name: payload.title, avatar: null }, 'voice');
              } 
            }
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event.');
    }
  };

  // Calendar Helpers
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const cells = getCalendarCells(currentDate);
  const selectedDayTasks = tasks.filter(t => new Date(t.start_time).toDateString() === selectedDate.toDateString());

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-5 pb-3">
        <View>
          <Svg height="36" width="160">
            <Defs>
              <LinearGradient id="callsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#6c5ce7" />
                <Stop offset="100%" stopColor="rgba(108,92,231,0.6)" />
              </LinearGradient>
            </Defs>
            <SvgText
              fill="url(#callsGrad)"
              fontSize="26"
              fontFamily="SpaceGrotesk_700Bold"
              x="0"
              y="26"
              letterSpacing="-0.5"
            >
              {callsTab === 'meet' ? "Calls" : "Calendar"}
            </SvgText>
          </Svg>
          <Text className="text-xs text-ink-soft mt-0.5 font-sans">
            {callsTab === 'meet' ? "Experience seamless communication" : "Organize team meetings & agendas"}
          </Text>
        </View>

        {callsTab === 'meet' ? (
          <TouchableOpacity 
            onPress={() => {
              startOutgoingCall({ name: 'Quick Meet Room', avatar: null }, 'video');
            }}
            className="bg-purple px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Text className="text-white text-xs font-bold font-sans">New Meet</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            className="flex-row items-center bg-purple px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Plus color="#fff" size={15} />
            <Text className="text-white text-xs font-bold font-sans ml-1">Add Event</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View className="flex-row px-6 pb-2 border-b border-black/5">
        <TouchableOpacity
          onPress={() => setCallsTab('meet')}
          className={`mr-6 pb-3 pt-1 border-b-2 ${
            callsTab === 'meet' ? 'border-purple' : 'border-transparent'
          }`}
        >
          <Text className={`text-sm font-bold font-sans ${
            callsTab === 'meet' ? 'text-purple' : 'text-ink-soft'
          }`}>
            Live Meetings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCallsTab('calendar')}
          className={`mr-6 pb-3 pt-1 border-b-2 ${
            callsTab === 'calendar' ? 'border-purple' : 'border-transparent'
          }`}
        >
          <Text className={`text-sm font-bold font-sans ${
            callsTab === 'calendar' ? 'text-purple' : 'text-ink-soft'
          }`}>
            Business Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {callsTab === 'meet' ? (
        <ScrollView className="flex-1 px-4 pt-4 bg-purple-soft/5" showsVerticalScrollIndicator={false}>
          {/* Live Collaborative Spaces (Active Rooms) */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic font-sans">Live Collaborative Spaces</Text>
              <View className="flex-row items-center bg-emerald-500/10 px-3 py-1 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-[10px] font-bold text-emerald-600 font-sans">{activeRooms.length} ACTIVE ROOMS</Text>
              </View>
            </View>

            <View className="space-y-4">
              {activeRooms.map(room => (
                <TouchableOpacity 
                  key={room.id} 
                  onPress={() => {
                    startOutgoingCall({ name: room.title, avatar: null }, 'voice');
                  }}
                  className="w-full bg-purple-soft/40 p-5 rounded-[28px] border border-purple/5 shadow-sm mb-3"
                >
                  <Text className="text-[17px] font-bold text-ink font-sans">{room.title}</Text>
                  <Text className="text-[11px] text-ink-soft font-medium uppercase font-sans mt-1">{room.members} members joined</Text>
                  
                  <View className="flex-row items-end justify-between mt-6">
                    <View className="flex-row -space-x-3">
                      {room.callers.map((c, i) => (
                        <View key={i} className="w-10 h-10 rounded-full border-2 border-white bg-purple items-center justify-center shadow-sm">
                          <Text className="text-white text-[12px] font-bold font-sans">{c}</Text>
                        </View>
                      ))}
                    </View>
                    <View className="w-12 h-12 rounded-2xl bg-purple items-center justify-center shadow-lg shadow-purple/20">
                      <Video color="#fff" size={20} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* People in the Office */}
          <View className="mb-24">
            <View className="flex-row items-center justify-between mb-4 px-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic font-sans">People in the office</Text>
              <View className="bg-purple/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-purple uppercase font-sans">All Active Staff</Text>
              </View>
            </View>

            {coworkers.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Text className="text-xs text-ink-soft font-sans">No staff online currently</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {coworkers.map(worker => {
                  const displayName = worker.full_name || worker.name || worker.username || 'Unknown staff';
                  return (
                    <View key={worker.id} style={{ width: '48%' }} className="bg-white border border-black/5 rounded-[32px] p-5 mb-4 items-center shadow-sm relative overflow-hidden">
                      <View className="relative">
                        <Avatar
                          url={worker.avatar}
                          name={worker.organization || displayName}
                          size={80}
                          isGroup={!!worker.organization}
                          style={{ borderRadius: 24 }}
                          imageStyle={{ borderRadius: 24 }}
                        />
                        {worker.isOnline && (
                          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white bg-green-500 shadow-sm" />
                        )}
                      </View>
                      <Text className="text-[15px] font-bold text-ink mt-4 text-center w-full font-sans" numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text className="text-[10px] font-bold text-purple uppercase italic mt-1 text-center w-full font-sans" numberOfLines={1}>
                        {worker.org_role || 'Staff Member'}
                      </Text>
                      <Text className="text-[9px] text-ink-soft font-medium text-center mt-0.5 w-full font-sans" numberOfLines={1}>
                        {worker.organization || 'Bubble Chat'}
                      </Text>

                      <View className="flex-row items-center justify-center gap-2 mt-5">
                        <TouchableOpacity 
                          onPress={() => startOutgoingCall(worker, 'voice')}
                          className="w-10 h-10 rounded-xl bg-purple-soft items-center justify-center"
                        >
                          <Phone color="#6c5ce7" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => startOutgoingCall(worker, 'video')}
                          className="w-10 h-10 rounded-xl bg-purple-soft items-center justify-center"
                        >
                          <Video color="#6c5ce7" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 bg-purple-soft/5" showsVerticalScrollIndicator={false}>
          {/* Calendar Widget */}
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
                            const dotColor = t.priority === 'urgent' || t.priority === 'high' ? 'bg-red-500' : 'bg-emerald-500';
                            return (
                              <View key={t._id} className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : dotColor}`} />
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

          {/* Agenda view */}
          <View className="p-6 mb-24">
            <Text className="text-xs font-bold uppercase tracking-wider text-black/30 italic mb-1 font-sans">Agenda for</Text>
            <Text className="text-lg font-bold text-ink mb-4 font-sans">{selectedDate.toLocaleDateString('en-US', { dateStyle: 'medium' })}</Text>

            {selectedDayTasks.length === 0 ? (
              <View className="py-10 border-2 border-dashed border-black/5 rounded-[24px] bg-white/50 items-center justify-center">
                <Calendar color="#6c5ce7" size={20} opacity={0.3} className="mb-2" />
                <Text className="text-sm text-ink-soft font-medium font-sans">No events scheduled.</Text>
              </View>
            ) : (
              selectedDayTasks.map(task => {
                const labelColor = task.type === 'meeting' ? 'bg-emerald-100 text-emerald-600' : task.type === 'event' ? 'bg-purple/10 text-purple' : 'bg-blue-100 text-blue-600';
                const pColor = task.priority === 'urgent' || task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600';
                return (
                  <View key={task._id} className="p-4 rounded-2xl bg-white border border-black/5 mb-3 shadow-sm">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-sans ${labelColor}`}>
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
                            startOutgoingCall({ name: task.title, avatar: null }, 'voice');
                          }}
                          className="bg-purple/10 px-2.5 py-1 rounded-lg"
                        >
                          <Text className="text-[10px] font-bold text-purple font-sans">Call room</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

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

    </SafeAreaView>
  );
}
