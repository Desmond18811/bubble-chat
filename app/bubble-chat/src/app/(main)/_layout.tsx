import { Tabs } from "expo-router";
import { MessageSquare, User, Users, Plus, Share2 } from "lucide-react-native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { triggerPlusButton } from "../../lib/mockData";
import { useTheme } from "../../lib/theme";
import { NicknameProvider } from "../../lib/nicknames";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const currentRouteName = state.routes[state.index].name;
  if (currentRouteName === "chat/[id]") {
    return null;
  }

  return (
    <View style={styles.tabBarWrapper}>
      {/* Full-width native blur panel behind the tabs */}
      <BlurView intensity={75} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(15, 16, 24, 0.82)" : "rgba(248, 247, 255, 0.78)" }]} />

      {/* Row containing capsule tabs and FAB */}
      <View style={styles.container}>
        {/* Pill Container for the Main Tabs */}
        <View style={[styles.pillContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {state.routes.map((route: any, index: number) => {
            if (route.name === "calls" || route.name === "chat/[id]" || route.name === "brain" || route.name === "calendar") return null;

            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Icon and Label Mapping
            let displayName = label;
            let iconComponent = null;
            const iconSize = 20;
            const activeColor = colors.purple;
            const inactiveColor = colors.textSoft;
            const color = isFocused ? activeColor : inactiveColor;

            if (route.name === "messages") {
              displayName = "Chats";
              iconComponent = <MessageSquare color={color} size={iconSize} />;
            } else if (route.name === "people") {
              displayName = "People";
              iconComponent = <Users color={color} size={iconSize} />;
            } else if (route.name === "updates") {
              displayName = "Updates";
              iconComponent = <Share2 color={color} size={iconSize} />;
            } else if (route.name === "profile") {
              displayName = "Profile";
              iconComponent = <User color={color} size={iconSize} />;
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.75}
              >
                {iconComponent}
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color,
                      fontFamily: isFocused ? "Poppins_600SemiBold" : "Poppins_500Medium",
                    },
                  ]}
                >
                  {displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Floating Action Button (FAB) on the Right */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => {
            triggerPlusButton(); // Triggers the popup modal in messages.tsx
          }}
        >
          <Plus color={colors.text} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <NicknameProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="messages"
          options={{
            title: "Chats",
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: "People",
          }}
        />
        <Tabs.Screen
          name="updates"
          options={{
            title: "Updates",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
        <Tabs.Screen
          name="brain"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="calls"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </NicknameProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 105,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  pillContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.05)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.05)",
  },
});
