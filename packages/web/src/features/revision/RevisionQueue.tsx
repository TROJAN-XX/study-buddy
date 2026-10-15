import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { apiClient, type MistakeDetail } from '../../lib/api';
import { getToday } from '../../lib/utils';
import type { RevisionItem, Question, Mistake } from '@study-buddy/shared';
import {
  RotateCcw,
  Brain,
  Calendar,
  CheckCircle2,
  Flame,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Clock,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
  Shuffle,
  Coffee,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RevisionQueue: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [mistakes, setMistakes] = useState<Map<string, MistakeDetail>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'due' | 'all' | 'mastered'>('due');

  // Flashcard review sprint state
  const [isSprintActive, setIsSprintActive] = useState<boolean>(false);
  const [sprintIndex, setSprintIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [sprintItems, setSprintItems] = useState<RevisionItem[]>([]);
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);

  const today = getToday();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [revs, allMistakes] = await Promise.all([
        apiClient.revisions.list(),
        apiClient.mistakes.list(),
      ]);
      setItems(revs);
      const mMap = new Map(allMistakes.map((m) => [m.id, m]));
      setMistakes(mMap);
    } catch (err) {
      console.error('Failed to load revision items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter due items (nextReview <= today and status !== 'mastered')
  const dueItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.status !== 'mastered' &&
        item.status !== 'suspended' &&
        item.nextReview <= today
    );
  }, [items, today]);

  // Overdue backlog count
  const overdueCount = useMemo(() => {
    return dueItems.filter((i) => i.nextReview < today).length;
  }, [dueItems, today]);

  // Mastered items
  const masteredItems = useMemo(() => {
    return items.filter((item) => item.status === 'mastered');
  }, [items]);

  // Display items for current tab
  const displayedItems = useMemo(() => {
    if (activeTab === 'due') return dueItems;
    if (activeTab === 'mastered') return masteredItems;
    return items;
  }, [activeTab, dueItems, masteredItems, items]);

  // Reschedule backlog gently
  const handleReschedule = async (mode: 'spread_3_days' | 'defer_tomorrow') => {
    setIsRescheduling(true);
    try {
      await apiClient.revisions.reschedule(mode);
      await loadData();
    } catch (err) {
      console.error('Failed to reschedule:', err);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Start recall flashcard sprint
  const handleStartSprint = () => {
    if (dueItems.length === 0) return;
    setSprintItems([...dueItems]);
    setSprintIndex(0);
    setIsAnswerRevealed(false);
    setIsSprintActive(true);
  };

  // Handle grade selection in flashcard sprint
  const handleGrade = async (grade: 'easy' | 'difficult' | 'forgot') => {
    const currentItem = sprintItems[sprintIndex];
    if (!currentItem) return;

    try {
      const updated = await apiClient.revisions.review(currentItem.id, grade);
      if (updated) {
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
      }
    } catch (err) {
      console.error('Error submitting review grade:', err);
    }

    if (sprintIndex + 1 < sprintItems.length) {
      setSprintIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
    } else {
      // Completed sprint
      setIsSprintActive(false);
      loadData();
    }
  };

  const currentSprintItem = sprintItems[sprintIndex];
  const currentMistake = currentSprintItem?.sourceType === 'mistake'
    ? mistakes.get(currentSprintItem.sourceId)
    : null;
  const currentQuestion = currentMistake?.question;

  return (
    <div className="space-y-6">
      {/* Due Today Hero Card */}
      <Card variant="elevated" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/30 inline-flex">
                <RotateCcw className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-text">
                Daily Spaced Recall Sprint
              </h2>
            </div>
            <p className="text-sm text-text-secondary max-w-xl">
              SM-2 interval scheduling automatically surfaces questions at optimal retention intervals
              (1, 3, 7, and 14 days) before memory decays.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-text-muted block">Items Due Today</span>
                <span className="text-3xl font-bold text-accent">{dueItems.length}</span>
              </div>
              <Button
                variant="primary"
                size="md"
                disabled={dueItems.length === 0}
                icon={<Flame className="w-4 h-4 fill-current" />}
                onClick={handleStartSprint}
              >
                Start Due Sprint
              </Button>
            </div>
          </div>
        </div>

        {/* Overdue Backlog Forgiving Banner */}
        {overdueCount > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-300">
              <Coffee className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold block sm:inline mr-1">
                  {overdueCount} items from previous days are waiting.
                </span>
                <span className="text-amber-300/80">
                  No stress — competitive preparation is about consistency over perfection.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                variant="secondary"
                size="sm"
                loading={isRescheduling}
                onClick={() => handleReschedule('spread_3_days')}
              >
                Spread over 3 Days
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={isRescheduling}
                onClick={() => handleReschedule('defer_tomorrow')}
              >
                Defer to Tomorrow
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Queue Filter Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border ${
              activeTab === 'due'
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-surface-card border-surface-border text-text-muted hover:text-text'
            }`}
          >
            Due Today ({dueItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border ${
              activeTab === 'all'
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-surface-card border-surface-border text-text-muted hover:text-text'
            }`}
          >
            All Active Queue ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mastered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border ${
              activeTab === 'mastered'
                ? 'bg-accent/20 border-accent text-accent font-semibold'
                : 'bg-surface-card border-surface-border text-text-muted hover:text-text'
            }`}
          >
            Mastered ({masteredItems.length})
          </button>
        </div>

        <span className="text-xs text-text-muted">
          Showing {displayedItems.length} item{displayedItems.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Queue Items List */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="w-8 h-8 text-emerald-400" />}
          title={activeTab === 'due' ? 'All Due Reviews Completed!' : 'No Revision Items'}
          description={
            activeTab === 'due'
              ? 'Your memory retention intervals are up to date for today. Great job! Check back tomorrow or take a new practice test.'
              : 'Items from mistakes or practice test errors will populate here automatically.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/practice')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Take Practice Test
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {displayedItems.map((item) => {
            const isDue = item.nextReview <= today && item.status !== 'mastered';
            const m = item.sourceType === 'mistake' ? mistakes.get(item.sourceId) : null;
            const q = m?.question;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isDue
                    ? 'bg-surface-card border-accent/30'
                    : 'bg-surface-card/60 border-surface-border'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={isDue ? 'warning' : 'default'} size="sm">
                      {isDue ? 'Due Today' : `Due: ${item.nextReview}`}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      Cycle Interval: {item.intervalDays} day{item.intervalDays === 1 ? '' : 's'}
                    </span>
                    <span className="text-xs text-text-muted">
                      Ease: {item.easeFactor.toFixed(2)}x
                    </span>
                    {m && (
                      <Badge variant="accent" size="sm">
                        {m.errorType.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  {q ? (
                    <p className="text-sm font-medium text-text truncate">
                      {q.questionText}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-text">
                      {item.topic || 'Revision Item'}
                    </p>
                  )}

                  {q && (
                    <p className="text-xs text-text-muted">
                      {q.exam} • {q.subject} → {q.topic}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Badge
                    variant={
                      item.status === 'mastered'
                        ? 'success'
                        : item.status === 'reviewed'
                        ? 'accent'
                        : 'warning'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Spaced Recall Sprint Modal */}
      {isSprintActive && currentSprintItem && (
        <Modal
          isOpen={isSprintActive}
          onClose={() => setIsSprintActive(false)}
          title={`Spaced Recall Sprint (${sprintIndex + 1} of ${sprintItems.length})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-text-muted border-b border-surface-border pb-3">
              <span>
                {currentQuestion?.exam} • {currentQuestion?.subject} → {currentQuestion?.topic}
              </span>
              <span className="font-mono">
                Card {sprintIndex + 1} / {sprintItems.length}
              </span>
            </div>

            {/* Prompt */}
            {currentQuestion ? (
              <div className="text-base font-medium text-text leading-relaxed whitespace-pre-line">
                {currentQuestion.questionText}
              </div>
            ) : (
              <div className="text-base text-text">
                Recall Concept: {currentSprintItem.topic}
              </div>
            )}

            {/* Revealed Solution & Options */}
            {isAnswerRevealed && (
              <div className="space-y-3 pt-3 border-t border-surface-border animate-fadeIn">
                {currentQuestion?.options && currentQuestion.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {currentQuestion.options.map((opt) => {
                      const isCorrect = currentQuestion.answer.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                              : 'bg-surface-elevated border-surface-border text-text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center bg-surface/60">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion?.explanation && (
                  <div className="p-3.5 rounded-xl bg-surface/60 border border-surface-border text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                    <span className="font-semibold text-text block mb-1">Reasoning & Solution:</span>
                    {currentQuestion.explanation}
                  </div>
                )}

                {currentMistake?.notes && (
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-secondary">
                    <span className="font-semibold text-accent block mb-0.5">Learner's Reflection:</span>
                    <p className="italic text-text">"{currentMistake.notes}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons at bottom */}
            <div className="pt-4 border-t border-surface-border">
              {!isAnswerRevealed ? (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<Eye className="w-4 h-4" />}
                  onClick={() => setIsAnswerRevealed(true)}
                >
                  Reveal Solution & Working
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-text-muted text-center">
                    How easily did you recall this answer?
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleGrade('forgot')}
                      className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-all text-center cursor-pointer"
                    >
                      <div className="font-bold text-sm">Forgot</div>
                      <div className="text-[10px] text-text-muted mt-0.5">Reset to 1 Day</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrade('difficult')}
                      className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-all text-center cursor-pointer"
                    >
                      <div className="font-bold text-sm">Difficult</div>
                      <div className="text-[10px] text-text-muted mt-0.5">Review in ~2 Days</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrade('easy')}
                      className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all text-center cursor-pointer"
                    >
                      <div className="font-bold text-sm">Easy</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        +{Math.round(currentSprintItem.intervalDays * currentSprintItem.easeFactor)} Days
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
