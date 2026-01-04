import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LLMSettingsProvider } from './src/contexts/LLMSettingsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LLMSettingsProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </LLMSettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
