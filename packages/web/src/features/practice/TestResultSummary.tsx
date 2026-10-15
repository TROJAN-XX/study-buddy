import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDuration } from '../../lib/utils';
import type { Question, PracticeTest, PracticeAttempt } from '@study-buddy/shared';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Target,
  Trophy,
} from 'lucide-react';

interface TestResultSummaryProps {
  test: PracticeTest;
  questions: Question[];
  attempts: PracticeAttempt[];
  onRestart: () => void;
  onExit: () => void;
  onToggleBookmark: (questionId: string) => void;
  bookmarkedIds: Set<string>;
}

export const TestResultSummary: React.FC<TestResultSummaryProps> = ({
  test,
  questions,
  attempts,
  onRestart,
  onExit,
  onToggleBookmark,
  bookmarkedIds,
}) => {
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'uncertain' | 'correct'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalQuestions = questions.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const incorrectCount = attempts.filter((a) => !a.isCorrect && a.selectedAnswer.length > 0).length;
  const skippedCount = totalQuestions - (correctCount + incorrectCount);
  const uncertainCount = attempts.filter((a) => a.markedStatus === 'uncertain').length;

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalSeconds = attempts.reduce((acc, a) => acc + (a.timeSeconds || 0), 0);
  const avgSeconds = totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;

  // Filter review items
  const filteredQuestions = questions.filter((q) => {
    const att = attempts.find((a) => a.questionId === q.id);
    if (!att) return filter === 'all';
    if (filter === 'correct') return att.isCorrect;
    if (filter === 'incorrect') return !att.isCorrect;
    if (filter === 'uncertain') return att.markedStatus === 'uncertain';
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Score Header Card */}
      <Card variant="elevated" className="p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 text-accent mb-1">
          <Trophy className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Test Performance Summary
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {test.title} • Completed on {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
          <div className="p-3.5 rounded-xl bg-surface/50 border border-surface-border">
            <span className="text-xs text-text-muted block">Score</span>
            <div className="text-2xl font-bold text-text mt-0.5">
              {correctCount} <span className="text-sm text-text-muted font-normal">/ {totalQuestions}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface/50 border border-surface-border">
            <span className="text-xs text-text-muted block">Accuracy</span>
            <div
              className={`text-2xl font-bold mt-0.5 ${
                accuracy >= 75 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {accuracy}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface/50 border border-surface-border">
            <span className="text-xs text-text-muted block">Total Time</span>
            <div className="text-2xl font-bold text-accent mt-0.5">
              {formatDuration(Math.ceil(totalSeconds / 60)) || `${totalSeconds}s`}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface/50 border border-surface-border">
            <span className="text-xs text-text-muted block">Average Pace</span>
            <div className="text-2xl font-bold text-text mt-0.5">
              {avgSeconds}s <span className="text-xs text-text-muted font-normal">/ Q</span>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
            {correctCount} Correct
          </span>
          <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-medium">
            {incorrectCount} Incorrect
          </span>
          {skippedCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-surface-elevated border border-surface-border text-text-muted font-medium">
              {skippedCount} Skipped
            </span>
          )}
          {uncertainCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
              {uncertainCount} Marked Uncertain
            </span>
          )}
        </div>

        {/* Quick Nav Actions */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <Button variant="secondary" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={onRestart}>
            Retake Quiz
          </Button>
          <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />} onClick={onExit}>
            Back to Practice Hub
          </Button>
        </div>
      </Card>

      {/* Question-by-Question Review Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Detailed Question Review
          </h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'incorrect', 'uncertain', 'correct'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                  filter === mode
                    ? 'bg-accent/20 text-accent border border-accent/40 font-semibold'
                    : 'bg-surface-card text-text-muted hover:text-text border border-surface-border'
                }`}
              >
                {mode === 'all'
                  ? `All (${totalQuestions})`
                  : mode === 'incorrect'
                  ? `Wrong (${incorrectCount})`
                  : mode === 'uncertain'
                  ? `Uncertain (${uncertainCount})`
                  : `Correct (${correctCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Question Cards */}
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const att = attempts.find((a) => a.questionId === q.id);
            const isCorrect = att?.isCorrect ?? false;
            const userSelected = att?.selectedAnswer || [];
            const isBookmarked = bookmarkedIds.has(q.id);
            const isExpanded = expandedId === q.id;

            return (
              <Card
                key={q.id}
                className={`p-4 space-y-3 transition-all border ${
                  isCorrect
                    ? 'border-surface-border/80 hover:border-emerald-500/30'
                    : 'border-red-500/30 bg-red-950/5 hover:border-red-500/50'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono text-text-muted font-bold">Q{idx + 1}</span>
                    {isCorrect ? (
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        Correct
                      </Badge>
                    ) : (
                      <Badge variant="error" size="sm">
                        <XCircle className="w-3 h-3 mr-1 inline" />
                        Incorrect
                      </Badge>
                    )}
                    {att?.markedStatus === 'uncertain' && (
                      <Badge variant="warning" size="sm">
                        Uncertain
                      </Badge>
                    )}
                    <span className="text-text-muted text-[11px]">
                      Time: {att?.timeSeconds || 0}s
                    </span>
                    <span className="text-text-secondary text-[11px]">
                      {q.subject} → {q.topic}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(q.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isBookmarked
                        ? 'text-accent bg-accent/15'
                        : 'text-text-muted hover:text-text hover:bg-surface-elevated'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Prompt */}
                <div className="text-sm font-medium text-text whitespace-pre-line leading-relaxed">
                  {q.questionText}
                </div>

                {/* Options display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {q.options.map((opt) => {
                    const isOptionCorrect = q.answer.includes(opt.id);
                    const isUserPick = userSelected.includes(opt.id);

                    let style = 'bg-surface-elevated/70 border-surface-border text-text-secondary';
                    if (isOptionCorrect) {
                      style = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
                    } else if (isUserPick) {
                      style = 'bg-red-500/15 border-red-500/40 text-red-300 line-through';
                    }

                    return (
                      <div key={opt.id} className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${style}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center bg-surface/60">
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isOptionCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {isUserPick && !isOptionCorrect && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation accordion */}
                {q.explanation && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide Solution
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Step-by-Step Solution
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-xl bg-surface/60 border border-surface-border text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                        <div className="font-semibold text-text mb-1">Working & Reasoning:</div>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
