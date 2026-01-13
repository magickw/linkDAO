import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import PortfolioScreen from '../screens/assets/PortfolioScreen';
import TransactionHistoryScreen from '../screens/assets/TransactionHistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SendScreen from '../screens/transaction/SendScreen';
import ReceiveScreen from '../screens/transaction/ReceiveScreen';
import SwapScreen from '../screens/transaction/SwapScreen';

const Tab = createBottomTabNavigator();
const AssetsStack = createStackNavigator();

function AssetsNavigator() {
  return (
    <AssetsStack.Navigator>
      <AssetsStack.Screen name="Portfolio" component={PortfolioScreen} />
      <AssetsStack.Screen name="Send" component={SendScreen} />
      <AssetsStack.Screen name="Receive" component={ReceiveScreen} />
      <AssetsStack.Screen name="Swap" component={SwapScreen} />
    </AssetsStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="AssetsTab" component={AssetsNavigator} options={{ title: 'Assets' }} />
      <Tab.Screen name="Activity" component={TransactionHistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
