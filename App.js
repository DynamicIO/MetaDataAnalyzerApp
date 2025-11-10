import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import HomeScreen from './screens/HomeScreen';
import ImagePickerScreen from './screens/ImagePickerScreen';
import MetadataScreen from './screens/MetadataScreen';
import MapScreen from './screens/MapScreen';
import BatchResultsScreen from './screens/BatchResultsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ImagePicker" component={ImagePickerScreen} />
        <Stack.Screen name="Metadata" component={MetadataScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="BatchResults" component={BatchResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
