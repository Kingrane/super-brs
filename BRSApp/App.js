import React from 'react'
import { StatusBar } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import DetailScreen from './src/screens/DetailScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F0EBDC" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
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
              animation: 'slide_from_right',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
