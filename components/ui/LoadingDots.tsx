import React from 'react';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { dot: 'w-1.5 h-1.5', gap: 'gap-1', text: 'text-xs' },
  md: { dot: 'w-2 h-2', gap: 'gap-1.5', text: 'text-sm' },
  lg: { dot: 'w-3 h-3', gap: 'gap-2', text: 'text-base' },
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  label,
  className = ''
}) => {
  const { dot, gap, text } = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex items-center ${gap}`}>
        {/* Cyan dot - left */}
        <div
          className={`${dot} rounded-full bg-cyan-400 animate-pulse`}
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        {/* Gradient center dot - slightly larger */}
        <div
          className={`${dot} rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 animate-pulse scale-110`}
          style={{ animationDelay: '150ms', animationDuration: '1s' }}
        />
        {/* Violet dot - right */}
        <div
          className={`${dot} rounded-full bg-violet-400 animate-pulse`}
          style={{ animationDelay: '300ms', animationDuration: '1s' }}
        />
      </div>
      {label && (
        <span className={`${text} text-slate-500`}>{label}</span>
      )}
    </div>
  );
};

export default LoadingDots;
