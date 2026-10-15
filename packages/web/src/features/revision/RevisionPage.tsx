import React, { useState, useEffect } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/api';
import { RotateCcw, Brain, Calendar, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import type { RevisionItem } from '@study-buddy/shared';
import { useNavigate } from 'react-router-dom';

export const RevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const revs = await apiClient.revisions.list();
        setItems(revs);
      } catch (err) {
        console.error('Failed to load revision items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Spaced Revision & Mistakes
          </h1>
          <Badge variant="accent">SM-2 Spaced Recall</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Reinforce weak areas and review questions flagged during tests and practice sessions.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="w-6 h-6 text-amber-400" />}
          title="No Revision Items Due"
          description="Your revision queue is clear! When you mark questions or take tests in Phase 2, missed concepts will automatically appear here based on optimal memory intervals."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/tracker')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Log Practice Session
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{item.sourceType}</Badge>
                  <span className="font-semibold text-sm text-text">
                    {item.topic || 'Revision Item'}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Next review due: {item.nextReview} • Interval: {item.intervalDays} days
                </p>
              </div>
              <Badge variant="default">{item.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Spaced repetition explanation card */}
      <Card
        title="How Study Buddy Spaced Revision Works"
        subtitle="Scientifically proven retention cycles"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-secondary">
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="font-bold text-accent block mb-1">Cycle 1 • Day 1</span>
            <p>Immediate review of errors within 24 hours of completing a practice test or study sprint.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="font-bold text-emerald-400 block mb-1">Cycle 2 • Day 3 & 7</span>
            <p>Second and third recalls to move facts and problem formulas into medium-term memory.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="font-bold text-amber-400 block mb-1">Cycle 3 • Day 21+</span>
            <p>Long-term mastery check right before full mock season to guarantee instant exam recall.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
