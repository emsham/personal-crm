import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LLMSettingsProvider } from './src/contexts/LLMSettingsContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LLMSettingsProvider>
          <NotificationProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </NotificationProvider>
        </LLMSettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
