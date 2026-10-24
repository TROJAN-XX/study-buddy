import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { getPendingSyncCount } from '../lib/sync';
import { isApiConfigured } from '../lib/http';
import { cn } from '../lib/utils';

/**
 * Small, unobtrusive status pill:
 *  - offline → amber notice that writes are queued locally
 *  - online with a backlog → "syncing" indicator
 * Renders nothing when everything is in sync.
 */
export const NetworkStatus: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;

    let cancelled = false;

    const refresh = async () => {
      const count = await getPendingSyncCount();
      if (!cancelled) setPending(count);
    };

    void refresh();
    const interval = window.setInterval(refresh, 10_000);

    const handleSync = () => {
      void refresh();
    };
    window.addEventListener('studybuddy:sync', handleSync);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('studybuddy:sync', handleSync);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    setIsFlushing(pending > 0);
  }, [isOnline, pending]);

  if (isOnline && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed z-50 bottom-20 md:bottom-5 right-4 md:right-5 flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-medium shadow-lg backdrop-blur-md',
        isOnline
          ? 'bg-accent/15 border-accent/40 text-accent'
          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className={cn('w-3.5 h-3.5', isFlushing && 'animate-spin')} />
          <span>
            Syncing {pending} change{pending === 1 ? '' : 's'}…
          </span>
        </>
      ) : (
        <>
          <CloudOff className="w-3.5 h-3.5" />
          <span>Offline · saved on this device</span>
        </>
      )}
    </div>
  );
};
