import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ToolCall } from '../../shared/ai/types';
import { ToolResult } from '../../services/toolExecutors';
import { Contact } from '../../types';
import { ToolResultCard } from './ToolResultCard';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  contacts: Contact[];
  isLastMessage?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  contacts,
  isLastMessage,
}) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // Tool results are rendered as cards
  if (isTool && message.toolResults) {
    return (
      <View style={styles.toolResultsContainer}>
        {message.toolResults.map((result, index) => (
          <ToolResultCard key={index} result={result} contacts={contacts} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {message.content ? (
          <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>
        ) : null}

        {/* Streaming indicator */}
        {message.isStreaming && isLastMessage && (
          <View style={styles.streamingIndicator}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#e2e8f0',
  },
  toolResultsContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  streamingIndicator: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
});
