import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NetworkStatus } from './NetworkStatus';
import { Sparkles, Clock, Target, Settings, Search } from 'lucide-react';

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface flex text-text">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Top Header (hidden on desktop) */}
        <header className="md:hidden sticky top-0 z-30 h-14 bg-surface-card/85 backdrop-blur-md border-b border-surface-border/70 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-sm tracking-tight text-text">
              Study Buddy
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              to="/search"
              aria-label="Search"
              className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              to="/tracker"
              aria-label="Tracker"
              className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
            </Link>
            <Link
              to="/goals"
              aria-label="Goals"
              className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <Target className="w-4 h-4" />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              className="p-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main
          key={location.pathname}
          className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-12"
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <BottomNav />
        <NetworkStatus />
      </div>
    </div>
  );
};
