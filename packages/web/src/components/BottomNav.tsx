import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FolderOpen, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

export const BottomNav: React.FC = () => {
  const items = [
    { label: 'Today', path: '/', icon: LayoutDashboard },
    { label: 'Practice', path: '/practice', icon: BookOpen },
    { label: 'Library', path: '/library', icon: FolderOpen },
    { label: 'Progress', path: '/progress', icon: BarChart3 },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 bg-surface-card/90 backdrop-blur-lg border-t border-surface-border/80 flex items-center justify-around px-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-colors duration-200 select-none',
                isActive
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </div>
                <span className={cn('text-[11px] mt-1 font-medium', isActive && 'font-semibold text-accent')}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
