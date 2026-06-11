import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

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

export default function UpdatesScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  
  // Dummy Tasks (Since we are creating UI first)
  const [tasks, setTasks] = useState([
    {
      _id: '1',
      title: 'Weekly Alignment Meeting',
      type: 'meeting',
      priority: 'high',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
    }
  ]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const cells = getCalendarCells(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const selectedDayTasks = tasks.filter(t => new Date(t.start_time).toDateString() === selectedDate.toDateString());

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
              const hasMeeting = tasks.some(t => new Date(t.start_time).toDateString() === cell.date.toDateString());

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
                      <View className={`w-1.5 h-1.5 rounded-full mt-auto ${selected ? 'bg-white' : 'bg-emerald-500'}`} />
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
            selectedDayTasks.map(task => (
              <View key={task._id} className="p-4 rounded-2xl bg-white border border-black/5 mb-3 shadow-sm">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-600 uppercase font-sans">Meeting</Text>
                  <Text className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-yellow-50 text-yellow-600 font-sans">{task.priority}</Text>
                </View>
                <Text className="font-bold text-ink text-sm mb-2 font-sans">{task.title}</Text>
                <View className="flex-row items-center gap-1.5">
                  <Clock color="#6c5ce7" size={14} />
                  <Text className="text-[11px] text-ink-soft font-medium font-sans">
                    {new Date(task.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Mock */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-ink">Schedule Event</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X color="#6c5ce7" size={18} />
              </TouchableOpacity>
            </View>
            <View className="space-y-4">
              <View>
                <Text className="text-xs font-bold text-ink uppercase mb-1">Title</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Weekly Meeting"
                  className="bg-purple-soft/30 rounded-2xl p-4 text-ink"
                />
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                className="bg-purple py-4 rounded-xl items-center flex-row justify-center mt-4"
              >
                <Check color="#fff" size={16} />
                <Text className="text-white font-bold ml-2">Create Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
