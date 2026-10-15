import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  BarChart3,
  Calendar,
  RotateCcw,
  FileText,
  Settings,
  Sparkles,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Sidebar: React.FC = () => {
  const primaryNav = [
    { label: 'Today', path: '/', icon: LayoutDashboard },
    { label: 'Practice', path: '/practice', icon: BookOpen },
    { label: 'Library', path: '/library', icon: FolderOpen },
    { label: 'Progress', path: '/progress', icon: BarChart3 },
  ];

  const secondaryNav = [
    { label: 'Daily Tracker', path: '/tracker', icon: Clock },
    { label: 'Goals', path: '/goals', icon: Target },
    { label: 'Planner', path: '/planner', icon: Calendar },
    { label: 'Revision', path: '/revision', icon: RotateCcw },
    { label: 'Notes', path: '/notes', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface-card border-r border-surface-border flex flex-col z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-surface-border/60">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-light to-accent flex items-center justify-center text-surface shadow-glow-subtle">
          <Sparkles className="w-4 h-4 text-white fill-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-text to-text-secondary bg-clip-text text-transparent">
            Study Buddy
          </span>
          <span className="text-[10px] text-accent font-medium uppercase tracking-wider -mt-0.5">
            Phase 1 • Focus
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Nav */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Overview
          </p>
          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                        : 'text-text-secondary hover:text-text hover:bg-surface-elevated/80'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-surface-border/60 mx-3" />

        {/* Tools & Planning */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Workspace
          </p>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                        : 'text-text-secondary hover:text-text hover:bg-surface-elevated/80'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User / Exam Card Footer */}
      <div className="p-4 border-t border-surface-border/60 bg-surface-card/60">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-elevated/70 border border-surface-border/60">
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-bold">
            SSC
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text truncate">
              SSC CGL Prep
            </p>
            <p className="text-[11px] text-text-muted truncate">
              Target: 2026 Season
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
