import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleTagManager } from '../components/GoogleTagManager';
import { IntroSplash } from '../components/IntroSplash';
import { DateSyncNavigator } from '../components/DateSyncNavigator';
import { DateSyncProvider } from '../context/DateSyncContext';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  return (
    <SafeAreaProvider>
      <DateSyncProvider>
        <GoogleTagManager />
        <DateSyncNavigator />
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="movie/[id]"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="tv/[id]"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="player"
              options={{
                animation: 'fade',
                presentation: 'fullScreenModal',
                gestureEnabled: false,
              }}
            />
          </Stack>
          {showIntro ? <IntroSplash onFinish={finishIntro} /> : null}
        </GestureHandlerRootView>
      </DateSyncProvider>
    </SafeAreaProvider>
  );
}
