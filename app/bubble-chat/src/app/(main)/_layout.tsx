import { Tabs } from "expo-router";
import { MessageSquare, User, Calendar, Users, Plus, Share2 } from "lucide-react-native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.container}>
      {/* Pill Container for the Main Tabs */}
      <View style={styles.pillContainer}>
        {state.routes.map((route: any, index: number) => {
          // Exclude Calls tab and Chat detail sub-route from the navbar
          if (route.name === "calls" || route.name === "chat/[id]") return null;

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
          const activeColor = "#6c5ce7";
          const inactiveColor = "#9a9aab";
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
          } else {
            iconComponent = <MessageSquare color={color} size={iconSize} />;
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
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          // Quick navigation to search/add contacts in People screen
          navigation.navigate("people");
        }}
      >
        <Plus color="#1f2030" size={24} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  return (
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
      {/* Hide the calls tab completely from navigation */}
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
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
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
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.06)",
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
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(108,92,231,0.06)",
  },
});
