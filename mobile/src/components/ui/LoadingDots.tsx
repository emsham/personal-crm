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

  // Create animated values for each dot (opacity and vertical position)
  const pulse1 = useRef(new Animated.Value(0.6)).current;
  const pulse2 = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(0.6)).current;
  const bounce1 = useRef(new Animated.Value(0)).current;
  const bounce2 = useRef(new Animated.Value(0)).current;
  const bounce3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounceAnimation = (
      opacity: Animated.Value,
      translate: Animated.Value,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          // Jump up with fade in
          Animated.parallel([
            Animated.timing(translate, {
              toValue: -8,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          // Fall down with fade out
          Animated.parallel([
            Animated.timing(translate, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          // Wait before next bounce
          Animated.delay(400),
        ])
      );
    };

    const animation1 = createBounceAnimation(pulse1, bounce1, 0);
    const animation2 = createBounceAnimation(pulse2, bounce2, 150);
    const animation3 = createBounceAnimation(pulse3, bounce3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [pulse1, pulse2, pulse3, bounce1, bounce2, bounce3]);

  const dotStyle = (
    opacity: Animated.Value,
    translateY: Animated.Value,
    color: string,
    scale?: number
  ) => ({
    width: dotSize * (scale || 1),
    height: dotSize * (scale || 1),
    borderRadius: (dotSize * (scale || 1)) / 2,
    backgroundColor: color,
    opacity,
    transform: [{ translateY }],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dotsContainer, { gap }]}>
        {/* Cyan dot - left */}
        <Animated.View style={dotStyle(pulse1, bounce1, '#22d3ee')} />
        {/* Gradient center dot - slightly larger (simulated with mix of cyan/violet) */}
        <Animated.View style={dotStyle(pulse2, bounce2, '#a78bfa', 1.1)} />
        {/* Violet dot - right */}
        <Animated.View style={dotStyle(pulse3, bounce3, '#a78bfa')} />
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
