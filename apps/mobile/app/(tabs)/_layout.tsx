import { Tabs } from "expo-router";
import { CalendarDays, ChartLine, Dumbbell, Settings, Users } from "lucide-react-native";
import { Text } from "react-native";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? "#3DDC97" : "#F2EDE499", fontSize: 11, fontWeight: "600" }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1F17" },
        headerTintColor: "#F2EDE4",
        tabBarStyle: {
          backgroundColor: "#0B1F17",
          borderTopColor: "#1F6F4A55",
        },
        tabBarActiveTintColor: "#3DDC97",
        tabBarInactiveTintColor: "#F2EDE499",
      }}
    >
      <Tabs.Screen
        name="days"
        options={{
          title: "Days",
          tabBarLabel: ({ focused }) => <TabLabel label="Days" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarLabel: ({ focused }) => <TabLabel label="Sessions" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <Dumbbell color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarLabel: ({ focused }) => <TabLabel label="Progress" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <ChartLine color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: "Buddies",
          tabBarLabel: ({ focused }) => <TabLabel label="Buddies" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <Users color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: ({ focused }) => <TabLabel label="Settings" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <Settings color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
