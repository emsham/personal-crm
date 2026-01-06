import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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

export const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ visible, onClose }) => {
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGeminiKey(settings.geminiApiKey || '');
    setOpenaiKey(settings.openaiApiKey || '');
  }, [settings]);

  const handleSave = () => {
    setGeminiApiKey(geminiKey);
    setOpenAIApiKey(openaiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleClearAll = () => {
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>AI Settings</Text>
              <Text style={styles.subtitle}>Bring your own API keys</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Provider Selection */}
            <Text style={styles.sectionTitle}>Active Provider</Text>
            <View style={styles.providerGrid}>
              {providers.map((provider) => {
                const isActive = settings.provider === provider.id;
                const hasKey = provider.id === 'gemini' ? !!geminiKey : !!openaiKey;

                return (
                  <TouchableOpacity
                    key={provider.id}
                    style={[styles.providerCard, isActive && styles.providerCardActive]}
                    onPress={() => setProvider(provider.id)}
                  >
                    {isActive && <View style={styles.activeIndicator} />}
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerDesc}>{provider.description}</Text>
                    <View style={[styles.keyStatus, hasKey ? styles.keyConfigured : styles.keyMissing]}>
                      <Text style={[styles.keyStatusText, hasKey ? styles.keyConfiguredText : styles.keyMissingText]}>
                        {hasKey ? 'Key configured' : 'No key set'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* API Keys */}
            <Text style={styles.sectionTitle}>API Keys</Text>

            {/* Gemini Key */}
            <View style={styles.keySection}>
              <View style={styles.keyHeader}>
                <Text style={styles.keyLabel}>Google Gemini</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}>
                  <Text style={styles.getKeyLink}>Get API Key</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  placeholder="AIzaSy..."
                  placeholderTextColor="#64748b"
                  value={geminiKey}
                  onChangeText={setGeminiKey}
                  secureTextEntry={!showGeminiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowGeminiKey(!showGeminiKey)}
                >
                  <Text style={styles.toggleButtonText}>{showGeminiKey ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* OpenAI Key */}
            <View style={styles.keySection}>
              <View style={styles.keyHeader}>
                <Text style={styles.keyLabel}>OpenAI</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://platform.openai.com/api-keys')}>
                  <Text style={styles.getKeyLink}>Get API Key</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  placeholder="sk-proj-..."
                  placeholderTextColor="#64748b"
                  value={openaiKey}
                  onChangeText={setOpenaiKey}
                  secureTextEntry={!showOpenaiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  <Text style={styles.toggleButtonText}>{showOpenaiKey ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Text style={styles.securityText}>
                Your keys are stored locally on your device and never sent to our servers. API calls go directly to the provider.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearButton}>Clear all keys</Text>
            </TouchableOpacity>
            <View style={styles.footerButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{saved ? 'Saved!' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  clearButton: {
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
