import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  style?: ViewStyle;
}

const sizeConfig = {
  sm: { dot: 6, gap: 4, fontSize: 12 },
  md: { dot: 8, gap: 6, fontSize: 14 },
  lg: { dot: 12, gap: 8, fontSize: 16 },
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  label,
  style,
}) => {
  const { dot: dotSize, gap, fontSize } = sizeConfig[size];

  // Create animated values for each dot
  const pulse1 = useRef(new Animated.Value(0.4)).current;
  const pulse2 = useRef(new Animated.Value(0.4)).current;
  const pulse3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createPulseAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createPulseAnimation(pulse1, 0);
    const animation2 = createPulseAnimation(pulse2, 150);
    const animation3 = createPulseAnimation(pulse3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [pulse1, pulse2, pulse3]);

  const dotStyle = (opacity: Animated.Value, color: string, scale?: number) => ({
    width: dotSize * (scale || 1),
    height: dotSize * (scale || 1),
    borderRadius: (dotSize * (scale || 1)) / 2,
    backgroundColor: color,
    opacity,
  });

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dotsContainer, { gap }]}>
        {/* Cyan dot - left */}
        <Animated.View style={dotStyle(pulse1, '#22d3ee')} />
        {/* Gradient center dot - slightly larger (simulated with mix of cyan/violet) */}
        <Animated.View style={dotStyle(pulse2, '#a78bfa', 1.1)} />
        {/* Violet dot - right */}
        <Animated.View style={dotStyle(pulse3, '#a78bfa')} />
      </View>
      {label && (
        <Text style={[styles.label, { fontSize }]}>{label}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: '#64748b',
  },
});

export default LoadingDots;
