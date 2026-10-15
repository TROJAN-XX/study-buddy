import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-elevated text-text-secondary border border-surface-border',
    accent: 'bg-accent/15 text-accent-light border border-accent/25',
    success: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40',
    warning: 'bg-amber-950/60 text-amber-400 border border-amber-800/40',
    error: 'bg-rose-950/60 text-rose-400 border border-rose-800/40',
    info: 'bg-sky-950/60 text-sky-400 border border-sky-800/40',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full tracking-wide transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
