import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, LayoutDashboard } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Compass className="w-7 h-7 text-accent" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Error 404</p>
          <h1 className="text-2xl font-bold text-text">Page not found</h1>
          <p className="text-sm text-text-secondary">
            That route does not exist. Head back to your dashboard to keep studying.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface text-sm font-semibold hover:bg-accent-light transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Today
        </Link>
      </div>
    </div>
  );
};
