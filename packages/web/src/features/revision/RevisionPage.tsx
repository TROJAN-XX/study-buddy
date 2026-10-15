import React, { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { RevisionQueue } from './RevisionQueue';
import { MistakeBook } from './MistakeBook';
import { RotateCcw, AlertTriangle, Brain, Sparkles } from 'lucide-react';

export const RevisionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'mistakes'>('queue');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Spaced Revision & Mistake Book
            </h1>
            <Badge variant="accent">SM-2 Algorithm</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Diagnose error root causes and reinforce retention through mathematically spaced review intervals.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-surface-card border border-surface-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-accent text-surface shadow-sm font-bold'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Spaced Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mistakes'
                ? 'bg-accent text-surface shadow-sm font-bold'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Mistake Book
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'queue' ? <RevisionQueue /> : <MistakeBook />}

      {/* Explanatory footer card */}
      <Card
        title="Spaced Repetition & Error Diagnosis Framework"
        subtitle="Scientifically proven retention cycles"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-secondary">
          <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-surface-border space-y-1">
            <span className="font-bold text-accent block">Cycle 1 • Day 1 (Immediate Recall)</span>
            <p className="text-text-muted leading-relaxed">
              Review errors within 24 hours of completing a test while reasoning is fresh in working memory.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-surface-border space-y-1">
            <span className="font-bold text-emerald-400 block">Cycle 2 • Day 3 & 7 (Consolidation)</span>
            <p className="text-text-muted leading-relaxed">
              Second and third recalls to move problem-solving shortcuts and formulas into long-term memory.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-surface-border space-y-1">
            <span className="font-bold text-amber-400 block">Cycle 3 • Day 21+ (Mastery Check)</span>
            <p className="text-text-muted leading-relaxed">
              Long-term retention checks ensure zero speed decay or hesitation during actual competitive mock exams.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RevisionPage;
