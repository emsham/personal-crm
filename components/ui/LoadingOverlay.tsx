import React, { useState, useEffect } from 'react';
import { LoadingDots } from './LoadingDots';

interface LoadingOverlayProps {
  isLoading: boolean;
  fadeOutDuration?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  fadeOutDuration = 400,
}) => {
  const [visible, setVisible] = useState(isLoading);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Show immediately when loading starts
      setVisible(true);
      setFadingOut(false);
    } else if (visible) {
      // Start fade out when loading ends
      setFadingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setFadingOut(false);
      }, fadeOutDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, visible, fadeOutDuration]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-[#0a0a0f] z-50 transition-opacity ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${fadeOutDuration}ms` }}
    >
      <LoadingDots size="lg" />
    </div>
  );
};

export default LoadingOverlay;
