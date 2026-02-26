import React from 'react';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';
import ImageViewScreen from './src/screens/ImageViewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcon = {
  HomeTab: { default: '🏠', focused: '🏠' },
  SearchTab: { default: '🔍', focused: '🔍' },
  MessagesTab: { default: '💬', focused: '💬' },
  NotificationsTab: { default: '🔔', focused: '🔔' },
  ProfileTab: { default: '👤', focused: '👤' },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.obsidian,
          borderTopColor: colors.white10,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.white50,
        tabBarIcon: ({ focused }) => {
          const { default: def, focused: foc } = tabIcon[route.name] || {};
          return <Text style={{ fontSize: 22 }}>{focused ? foc : def}</Text>;
        },
        tabBarLabel: () => null,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="SearchTab" component={SearchScreen} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.black },
      headerTintColor: colors.gold,
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ title: 'Creator' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen}
        options={({ route }) => ({ title: route.params?.otherUserName || 'Chat' })} />
      <Stack.Screen name="ImageView" component={ImageViewScreen}
        options={{ headerShown: false, presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <Navigation />
    </AuthProvider>
  );
}
