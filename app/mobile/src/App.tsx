import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import WalletScreen from './screens/WalletScreen';
import GovernanceScreen from './screens/GovernanceScreen';

// Types
export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Wallet: undefined;
  Governance: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'LinkDAO' }} 
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ title: 'Profile' }} 
          />
          <Stack.Screen 
            name="Wallet" 
            component={WalletScreen} 
            options={{ title: 'Wallet' }} 
          />
          <Stack.Screen 
            name="Governance" 
            component={GovernanceScreen} 
            options={{ title: 'Governance' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}