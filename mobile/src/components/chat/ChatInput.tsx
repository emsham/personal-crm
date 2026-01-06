import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  isConfigured: boolean;
  placeholder?: string;
  providerName?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onStop,
  isLoading,
  isStreaming,
  isConfigured,
  placeholder = "Ask about your contacts...",
  providerName,
}) => {
  const [inputHeight, setInputHeight] = useState(44);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const handleContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const newHeight = Math.min(
      Math.max(44, e.nativeEvent.contentSize.height),
      120
    );
    setInputHeight(newHeight);
  };

  const handleSubmit = () => {
    if (value.trim() && !isLoading && !isStreaming) {
      onSend();
    }
  };

  const canSend =
    value.trim().length > 0 && isConfigured && !isLoading && !isStreaming;
  const showStop = isStreaming && onStop;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      {/* Provider indicator */}
      {isConfigured && providerName && (
        <View style={styles.providerIndicator}>
          <View style={styles.providerDot} />
          <Text style={styles.providerText}>{providerName}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { height: inputHeight }]}
          placeholder={
            isConfigured ? placeholder : "Configure AI provider to start..."
          }
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          onContentSizeChange={handleContentSizeChange}
          multiline
          returnKeyType="send"
          editable={isConfigured}
          blurOnSubmit={false}
        />

        {showStop ? (
          <TouchableOpacity style={styles.stopButton} onPress={onStop}>
            <View style={styles.stopIcon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSend}
          >
            {isLoading ? (
              <View style={styles.loadingDots}>
                <View style={styles.loadingDot} />
                <View style={[styles.loadingDot, styles.loadingDot2]} />
                <View style={[styles.loadingDot, styles.loadingDot3]} />
              </View>
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    padding: 12,
  },
  providerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  providerText: {
    fontSize: 11,
    color: "#64748b",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#334155",
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#334155",
  },
  sendIcon: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 14,
    height: 14,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 3,
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
