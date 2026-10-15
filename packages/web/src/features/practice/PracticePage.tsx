import React from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { BookOpen, Sparkles, CheckCircle2, Layers, Clock, Zap } from 'lucide-react';

export const PracticePage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Practice & Tests
          </h1>
          <Badge variant="accent">Phase 2</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Topic-wise questions, custom mock examinations, and real-time performance analytics.
        </p>
      </div>

      {/* Main EmptyState */}
      <EmptyState
        icon={<BookOpen className="w-6 h-6 text-accent" />}
        title="Practice Engine Under Construction"
        description="Question library and practice tests coming in Phase 2. Import your question packs and practice topic-wise or take full mocks."
      />

      {/* Feature Previews */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="w-4 h-4 text-accent" />
              Topic-Wise Drills
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Target specific weaknesses by filtering questions by exam (SSC CGL, TNPSC, Banking), subject, and topic depth.
          </p>
        </Card>

        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="w-4 h-4 text-emerald-400" />
              Timed Full Mocks
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Simulate real exam pressure with sectional countdowns, negative marking logic, and instant scoring breakdown.
          </p>
        </Card>

        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-4 h-4 text-amber-400" />
              Mistake Notebook
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Every incorrect response automatically feeds into the spaced repetition queue so you never repeat the same error.
          </p>
        </Card>
      </div>
    </div>
  );
};
