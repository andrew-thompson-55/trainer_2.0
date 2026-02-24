import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@infra/theme';
import { pkg } from '@infra/package';

const { strings } = pkg;

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
      }}>

      {/* 1. HOME (The New Dashboard) */}
      <Tabs.Screen
        name="index"
        options={{
          title: strings['tabs.home'],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />

      {/* 2. PLAN (Training Plan) */}
      <Tabs.Screen
        name="plan"
        options={{
          title: strings['tabs.plan'],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'list' : 'list-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: strings['tabs.calendar'],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="coach"
        options={{
          title: strings['tabs.coach'],
          href: Platform.OS === 'web' ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: strings['tabs.checkIn'],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: strings['tabs.settings'],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
