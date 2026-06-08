import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import ChatListScreen from './screens/ChatListScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import CallScreen from './screens/CallScreen';
import UpdatesScreen from './screens/UpdatesScreen';
import ProfileScreen from './screens/ProfileScreen';

// Icons
import { Feather } from '@expo/vector-icons';

export type RootStackParamList = {
  ChatList: undefined;
  ChatDetail: { chat: any };
};

export type TabParamList = {
  ChatsTab: undefined;
  Call: undefined;
  Updates: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function ChatsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{
          animationEnabled: true,
        } as any}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'message-circle';

          if (route.name === 'ChatsTab') {
            iconName = 'message-circle';
          } else if (route.name === 'Call') {
            iconName = 'phone';
          } else if (route.name === 'Updates') {
            iconName = 'bell';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066FF',
        tabBarInactiveTintColor: '#888888',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatsStackNavigator}
        options={{
          tabBarLabel: 'Chats',
        }}
      />
      <Tab.Screen
        name="Call"
        component={CallScreen}
        options={{
          tabBarLabel: 'Call',
        }}
      />
      <Tab.Screen
        name="Updates"
        component={UpdatesScreen}
        options={{
          tabBarLabel: 'Updates',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
