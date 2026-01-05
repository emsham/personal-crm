import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LLMSettingsProvider } from './src/contexts/LLMSettingsContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LLMSettingsProvider>
          <NotificationProvider>
            <ChatProvider>
              <StatusBar style="light" />
              <AppNavigator />
            </ChatProvider>
          </NotificationProvider>
        </LLMSettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
