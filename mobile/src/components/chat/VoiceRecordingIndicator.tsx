import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NUM_BARS = 5;

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
}

// Individual animated bar component
const WaveBar: React.FC<{ delay: number; isActive: boolean }> = ({ delay, isActive }) => {
  const heightAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(heightAnim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 150 + Math.random() * 100,
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(heightAnim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: 150 + Math.random() * 100,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      Animated.timing(heightAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, heightAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          transform: [{ scaleY: heightAnim }],
        },
      ]}
    />
  );
};

export const VoiceRecordingIndicator: React.FC<VoiceRecordingIndicatorProps> = ({
  isRecording,
  isProcessing,
  duration,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording || isProcessing) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (isProcessing) {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      }
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRecording, isProcessing, opacityAnim, scaleAnim, pulseAnim]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording && !isProcessing) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isRecording && (
          <>
            {/* Waveform visualization */}
            <View style={styles.waveformContainer}>
              {Array.from({ length: NUM_BARS }).map((_, i) => (
                <WaveBar key={i} delay={i * 50} isActive={isRecording} />
              ))}
            </View>

            {/* Duration */}
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
              <View style={styles.recordingDot} />
              <Text style={styles.instructionText}>Release to send</Text>
            </View>
          </>
        )}

        {isProcessing && !isRecording && (
          <>
            <Animated.View
              style={[
                styles.processingIconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Ionicons name="mic" size={48} color="#a78bfa" />
            </Animated.View>
            <Text style={styles.processingText}>Transcribing...</Text>
            <View style={styles.processingDotsContainer}>
              <ProcessingDots />
            </View>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
};

// Animated processing dots
const ProcessingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.processingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.processingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.processingDot, { opacity: dot3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    gap: 8,
    marginBottom: 32,
  },
  waveBar: {
    width: 6,
    height: 60,
    backgroundColor: '#ef4444',
    borderRadius: 3,
  },
  durationText: {
    fontSize: 64,
    fontWeight: '200',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginBottom: 24,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  instructionText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  processingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 16,
  },
  processingDotsContainer: {
    height: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
});
