import { useAppTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function DonorLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6', // Keep brand blue for active
        tabBarInactiveTintColor: colors.textSecondary, // Use theme secondary text
        tabBarHideOnKeyboard: true, // Hide on keyboard to prevent layout issues
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : '#FFFFFF', // Use surface color (lighter than bg)
          borderTopWidth: 0, // Remove top border for clean look
          elevation: 5, // Android shadow
          shadowColor: '#000', // iOS shadow
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 10,
          height: 60, // Taller for better touch targets
          position: 'absolute', // Floating effect
          bottom: 20, // Float from bottom
          left: 20, // Margin left
          right: 20, // Margin right
          borderRadius: 25, // Rounded corners
          paddingBottom: 0, // Center icons vertically
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 5, // Space between icon and text
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 5,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="donation-history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="availability-toggle"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}