import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'default' | 'elevated' | 'outlined';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      title,
      subtitle,
      action,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-surface-card border border-surface-border/80 shadow-md',
      elevated: 'bg-surface-elevated border border-surface-border shadow-xl',
      outlined: 'bg-surface/50 border border-surface-border/70 backdrop-blur-sm',
    };

    const hasHeader = Boolean(title || subtitle || action);

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'rounded-xl transition-all duration-200 overflow-hidden',
          variantStyles[variant],
          onClick && 'cursor-pointer hover:border-surface-border hover:shadow-glow-subtle',
          className
        )}
        {...props}
      >
        {hasHeader && (
          <div className="flex items-start justify-between p-4 sm:p-5 pb-0 sm:pb-0 gap-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-text tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {action}
              </div>
            )}
          </div>
        )}
        <div className={cn('p-4 sm:p-5', hasHeader && 'pt-3 sm:pt-4')}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';
