import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLLMSettings, LLMProvider } from '../contexts/LLMSettingsContext';

interface LLMSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const providers: {
  id: LLMProvider;
  name: string;
  description: string;
  keyPlaceholder: string;
  docUrl: string;
}[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Fast and capable',
    keyPlaceholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o-mini',
    keyPlaceholder: 'sk-proj-...',
    docUrl: 'https://platform.openai.com/api-keys',
  },
];

const ProviderCard = memo(({
  provider,
  isActive,
  hasKey,
  onPress
}: {
  provider: typeof providers[0];
  isActive: boolean;
  hasKey: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.providerCard, isActive && styles.providerCardActive]}
    onPress={onPress}
  >
    {isActive && <View style={styles.activeIndicator} />}
    <Text style={styles.providerName}>{provider.name}</Text>
    <Text style={styles.providerDesc}>{provider.description}</Text>
    <View style={[styles.keyStatus, hasKey ? styles.keyConfigured : styles.keyMissing]}>
      <Text style={[styles.keyStatusText, hasKey ? styles.keyConfiguredText : styles.keyMissingText]}>
        {hasKey ? 'Key configured' : 'No key set'}
      </Text>
    </View>
  </Pressable>
));

const KeyInput = memo(({
  label,
  docUrl,
  value,
  onChangeText,
  placeholder,
  showKey,
  onToggleShow,
}: {
  label: string;
  docUrl: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  showKey: boolean;
  onToggleShow: () => void;
}) => (
  <View style={styles.keySection}>
    <View style={styles.keyHeader}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Pressable onPress={() => Linking.openURL(docUrl)}>
        <Text style={styles.getKeyLink}>Get API Key</Text>
      </Pressable>
    </View>
    <View style={styles.keyInputContainer}>
      <TextInput
        style={styles.keyInput}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showKey}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        spellCheck={false}
      />
      <Pressable style={styles.toggleButton} onPress={onToggleShow}>
        <Text style={styles.toggleButtonText}>{showKey ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  </View>
));

const LLMSettingsModalComponent: React.FC<LLMSettingsModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const {
    settings,
    setProvider,
    setGeminiApiKey,
    setOpenAIApiKey,
    clearApiKeys,
  } = useLLMSettings();

  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      setGeminiKey(settings.geminiApiKey || '');
      setOpenaiKey(settings.openaiApiKey || '');
    }
  }, [visible, settings.geminiApiKey, settings.openaiApiKey]);

  const handleSave = useCallback(() => {
    setGeminiApiKey(geminiKey);
    setOpenAIApiKey(openaiKey);
    onClose();
  }, [geminiKey, openaiKey, setGeminiApiKey, setOpenAIApiKey, onClose]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear API Keys',
      'This will disable AI features until you add new keys.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearApiKeys();
            setGeminiKey('');
            setOpenaiKey('');
          },
        },
      ]
    );
  }, [clearApiKeys]);

  const toggleGeminiKey = useCallback(() => setShowGeminiKey(v => !v), []);
  const toggleOpenaiKey = useCallback(() => setShowOpenaiKey(v => !v), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Settings</Text>
            <Text style={styles.subtitle}>Bring your own API keys</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Provider Selection */}
          <Text style={styles.sectionTitle}>Active Provider</Text>
          <View style={styles.providerGrid}>
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isActive={settings.provider === provider.id}
                hasKey={provider.id === 'gemini' ? !!geminiKey : !!openaiKey}
                onPress={() => setProvider(provider.id)}
              />
            ))}
          </View>

          {/* API Keys */}
          <Text style={styles.sectionTitle}>API Keys</Text>

          <KeyInput
            label="Google Gemini"
            docUrl="https://aistudio.google.com/app/apikey"
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="AIzaSy..."
            showKey={showGeminiKey}
            onToggleShow={toggleGeminiKey}
          />

          <KeyInput
            label="OpenAI"
            docUrl="https://platform.openai.com/api-keys"
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-proj-..."
            showKey={showOpenaiKey}
            onToggleShow={toggleOpenaiKey}
          />

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityText}>
              Your keys are stored locally on your device and never sent to our servers. API calls go directly to the provider.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearButtonText}>Clear all keys</Text>
          </Pressable>
          <View style={styles.footerButtons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const LLMSettingsModal = memo(LLMSettingsModalComponent);

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  providerGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  providerCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerCardActive: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  providerDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  keyStatus: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  keyConfigured: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  keyMissing: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  keyStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  keyConfiguredText: {
    color: '#22c55e',
  },
  keyMissingText: {
    color: '#eab308',
  },
  keySection: {
    marginBottom: 16,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  keyLabel: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  getKeyLink: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleButton: {
    marginLeft: 8,
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  toggleButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  securityNotice: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#ef4444',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LLMSettingsModal;
