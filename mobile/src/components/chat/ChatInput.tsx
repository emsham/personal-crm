import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Text,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';

export interface ChatInputRef {
  clear: () => void;
  focus: () => void;
  getText: () => string;
  getRecordingState: () => { isRecording: boolean; isProcessing: boolean; duration: number };
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
}

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  isConfigured: boolean;
  placeholder?: string;
  providerName?: string;
  openaiApiKey?: string;
  onRecordingStateChange?: (state: RecordingState) => void;
}

const MAX_HEIGHT = 120;

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      onSend,
      onStop,
      isLoading,
      isStreaming,
      isConfigured,
      placeholder = "Ask about your contacts...",
      providerName,
      openaiApiKey,
      onRecordingStateChange,
    },
    ref
  ) => {
    const [text, setText] = useState("");
    const inputRef = useRef<TextInput>(null);
    const insets = useSafeAreaInsets();

    // Voice recording hook
    const {
      state: recordingState,
      duration: recordingDuration,
      startRecording,
      stopRecording,
    } = useVoiceRecording({
      apiKey: openaiApiKey,
      onTranscriptionComplete: (transcribedText) => {
        if (transcribedText.trim()) {
          onSend(transcribedText.trim());
        }
      },
      onError: (error) => {
        Alert.alert('Voice Input Error', error);
      },
    });

    const isRecording = recordingState === 'recording';
    const isProcessing = recordingState === 'processing';
    const voiceEnabled = Boolean(openaiApiKey) && isConfigured;

    // Notify parent of recording state changes
    useEffect(() => {
      onRecordingStateChange?.({
        isRecording,
        isProcessing,
        duration: recordingDuration,
      });
    }, [isRecording, isProcessing, recordingDuration, onRecordingStateChange]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setText("");
      },
      focus: () => {
        inputRef.current?.focus();
      },
      getText: () => text,
      getRecordingState: () => ({
        isRecording,
        isProcessing,
        duration: recordingDuration,
      }),
    }));

    // Manually handle sentence capitalization since autoCapitalize is buggy on iOS
    const handleChangeText = useCallback((newText: string) => {
      if (newText.length === 0) {
        setText("");
        return;
      }

      let result = newText;

      // Capitalize first character of input
      if (result.charAt(0).match(/[a-z]/)) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
      }

      // Check if we just typed a letter after sentence-ending punctuation + space
      if (result.length >= 3) {
        const lastChar = result.slice(-1);
        const beforeLast = result.slice(-3, -1);

        // Patterns like ". a" or "! b" or "? c" or ".\na"
        if (lastChar.match(/[a-z]/) &&
            (beforeLast.match(/[.!?]\s/) || beforeLast.match(/[.!?]\n/))) {
          result = result.slice(0, -1) + lastChar.toUpperCase();
        }
      }

      setText(result);
    }, []);

    const handleSubmit = useCallback(() => {
      const trimmedText = text.trim();
      if (trimmedText && !isLoading && !isStreaming) {
        Keyboard.dismiss();
        onSend(trimmedText);
        setText("");
      }
    }, [text, isLoading, isStreaming, onSend]);

    // Handle mic button press
    const handleMicPressIn = useCallback(() => {
      if (!voiceEnabled) {
        Alert.alert(
          'Voice Input Unavailable',
          'Please configure your OpenAI API key in settings to use voice input.'
        );
        return;
      }
      if (!isLoading && !isStreaming) {
        startRecording();
      }
    }, [voiceEnabled, isLoading, isStreaming, startRecording]);

    const handleMicPressOut = useCallback(() => {
      if (isRecording) {
        stopRecording();
      }
    }, [isRecording, stopRecording]);

    const canSend = text.trim().length > 0 && isConfigured && !isLoading && !isStreaming;
    const showStop = isStreaming && onStop;
    const showMic = !showStop && !isLoading && text.trim().length === 0 && voiceEnabled && !isProcessing;

    // Minimal bottom padding - just enough for safe area
    const bottomPadding = Math.max(insets.bottom, 4);

    return (
      <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
        {/* Provider indicator - more compact */}
        {isConfigured && providerName && (
          <View style={styles.providerIndicator}>
            <View style={styles.providerDot} />
            <Text style={styles.providerText}>{providerName}</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <View style={[
            styles.inputContainer,
            isRecording && styles.inputContainerRecording
          ]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={handleChangeText}
              placeholder={
                isRecording
                  ? "Recording..."
                  : isProcessing
                  ? "Transcribing..."
                  : isConfigured
                  ? placeholder
                  : "Configure AI provider to start..."
              }
              placeholderTextColor={isRecording ? "#ef4444" : "#64748b"}
              multiline
              editable={isConfigured && !isRecording && !isProcessing}
              autoCapitalize="sentences"
              autoCorrect={true}
              spellCheck={true}
            />
          </View>

          {/* Mic Button (when text is empty and voice is enabled) */}
          {showMic && (
            <Pressable
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
            >
              <Ionicons
                name={isRecording ? "radio" : "mic"}
                size={20}
                color="#fff"
              />
            </Pressable>
          )}

          {/* Processing indicator button */}
          {isProcessing && (
            <View style={styles.processingButton}>
              <Ionicons name="hourglass" size={20} color="#fff" />
            </View>
          )}

          {/* Stop Button */}
          {showStop && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={onStop}
              activeOpacity={0.7}
            >
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          )}

          {/* Send Button (when text has content or mic is not shown) */}
          {!showStop && !showMic && !isProcessing && (
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <View style={styles.loadingDots}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, styles.loadingDot2]} />
                  <View style={[styles.loadingDot, styles.loadingDot3]} />
                </View>
              ) : (
                <Text style={[styles.sendIcon, !canSend && styles.sendIconDisabled]}>
                  ↑
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#0f172a",
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  providerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 8,
  },
  providerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  providerText: {
    fontSize: 10,
    color: "#64748b",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 8,
    maxHeight: MAX_HEIGHT,
  },
  inputContainerRecording: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  input: {
    fontSize: 16,
    color: "#fff",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    maxHeight: MAX_HEIGHT - 2,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#334155",
  },
  sendIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  sendIconDisabled: {
    color: "#64748b",
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
  },
  processingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: "row",
    gap: 2,
  },
  loadingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
    opacity: 0.4,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 0.9,
  },
});
