import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import DetailScreen from '../screens/DetailScreen'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  return (
    <NavigationContainer>
        <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: '#F0EBDC' },
        }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={DashboardScreen} />
          <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'Детали дисциплины',
            headerStyle: { backgroundColor: '#F0EBDC' },
            headerTintColor: '#0E141C',
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            animation: 'none',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
