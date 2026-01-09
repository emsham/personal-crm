import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Platform,
  Keyboard,
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

// Constants for height calculation
const MIN_HEIGHT = 44;
const MAX_HEIGHT = 120;
const LINE_HEIGHT = 20; // Approximate line height for fontSize 15
const VERTICAL_PADDING = 24; // paddingTop + paddingBottom (12 + 12)
const CHARS_PER_LINE = 32; // Approximate characters before text wraps

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
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const prevValueLengthRef = useRef(0);
  const currentHeightRef = useRef(MIN_HEIGHT);

  // Keep ref in sync with state (avoids stale closures)
  currentHeightRef.current = inputHeight;

  // Stable callback - no dependencies needed since we use refs
  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const newHeight = Math.min(
        Math.max(MIN_HEIGHT, e.nativeEvent.contentSize.height),
        MAX_HEIGHT
      );
      if (newHeight !== currentHeightRef.current) {
        setInputHeight(newHeight);
      }
    },
    []
  );

  // iOS workaround: onContentSizeChange doesn't reliably fire when content shrinks
  // Calculate estimated height when text is deleted
  useEffect(() => {
    const currentLength = value.length;
    const wasDeleted = currentLength < prevValueLengthRef.current;
    prevValueLengthRef.current = currentLength;

    if (!value || currentLength === 0) {
      // Text cleared completely
      setInputHeight(MIN_HEIGHT);
      return;
    }

    // Only recalculate on deletion (iOS doesn't fire onContentSizeChange reliably for shrinks)
    if (wasDeleted && Platform.OS === 'ios') {
      // Estimate wrapped lines based on text length between newlines
      const lines = value.split('\n');
      let totalLines = 0;
      for (const line of lines) {
        // Each line takes at least 1 line, plus additional lines for wrapping
        totalLines += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
      }

      const estimatedHeight = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, totalLines * LINE_HEIGHT + VERTICAL_PADDING)
      );

      // Only shrink, never grow (let onContentSizeChange handle growth)
      if (estimatedHeight < currentHeightRef.current) {
        setInputHeight(estimatedHeight);
      }
    }
  }, [value]); // Removed inputHeight dependency - use ref instead

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isLoading && !isStreaming) {
      Keyboard.dismiss(); // Dismiss keyboard when sending message
      onSend();
    }
  }, [value, isLoading, isStreaming, onSend]);

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
          style={[styles.input, { minHeight: inputHeight }]}
          placeholder={
            isConfigured ? placeholder : "Configure AI provider to start..."
          }
          placeholderTextColor="#64748b"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          onContentSizeChange={handleContentSizeChange}
          multiline
          returnKeyType="default"
          editable={isConfigured}
          blurOnSubmit={false}
          autoCorrect={true}
          autoCapitalize="sentences"
          spellCheck={true}
          scrollEnabled={true}
          keyboardType="default"
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
    maxHeight: MAX_HEIGHT,
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
