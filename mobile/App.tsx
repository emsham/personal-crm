import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LLMSettingsProvider } from './src/contexts/LLMSettingsContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { DataProvider } from './src/contexts/DataContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { CalendarProvider } from './src/contexts/CalendarContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LLMSettingsProvider>
          <CalendarProvider>
            <NotificationProvider>
              <DataProvider>
                <ChatProvider>
                  <StatusBar style="light" />
                  <AppNavigator />
                </ChatProvider>
              </DataProvider>
            </NotificationProvider>
          </CalendarProvider>
        </LLMSettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
