import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { apiClient } from '../../lib/api';
import { getToday, getTomorrow, formatDate, formatDuration } from '../../lib/utils';
import { SUBJECTS, TOPICS } from '@study-buddy/shared';
import type { DailyGoal, GoalPriority, GoalStatus } from '@study-buddy/shared';
import {
  Target,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Play,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<string>(dateParam || getToday());
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [tomorrowGoals, setTomorrowGoals] = useState<DailyGoal[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form states
  const [subject, setSubject] = useState<string>(SUBJECTS[0].name);
  const [topic, setTopic] = useState<string>('');
  const [targetDescription, setTargetDescription] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<string>('');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState<string>('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [formError, setFormError] = useState<string | null>(null);

  const today = getToday();
  const tomorrow = getTomorrow();

  // Filter topics
  const currentSubjectObj = SUBJECTS.find((s) => s.name === subject);
  const availableTopics = currentSubjectObj
    ? TOPICS.filter((t) => t.subjectId === currentSubjectObj.id)
    : [];

  useEffect(() => {
    if (availableTopics.length > 0 && (!topic || !availableTopics.some((t) => t.name === topic))) {
      setTopic(availableTopics[0].name);
    }
  }, [subject, availableTopics, topic]);

  // Load goals
  const loadGoals = useCallback(async () => {
    try {
      const [currentGoals, tmr] = await Promise.all([
        apiClient.goals.list(selectedDate),
        apiClient.goals.list(tomorrow),
      ]);
      setGoals(currentGoals);
      setTomorrowGoals(tmr);
    } catch (err) {
      console.error('Failed to load goals:', err);
    }
  }, [selectedDate, tomorrow]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Sync date change from param
  useEffect(() => {
    if (dateParam && dateParam !== selectedDate) {
      setSelectedDate(dateParam);
    }
  }, [dateParam]);

  const setDateAndParam = (date: string) => {
    setSelectedDate(date);
    setSearchParams({ date });
    setEditingGoalId(null);
  };

  const changeDateBy = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setDateAndParam(`${year}-${month}-${day}`);
  };

  const resetForm = () => {
    setEditingGoalId(null);
    setTargetDescription('');
    setTargetQuantity('');
    setTargetDurationMinutes('');
    setPriority('medium');
    setFormError(null);
  };

  const handleStartEdit = (goal: DailyGoal) => {
    setEditingGoalId(goal.id);
    setSubject(goal.subject);
    setTopic(goal.topic);
    setTargetDescription(goal.targetDescription);
    setTargetQuantity(goal.targetQuantity ? String(goal.targetQuantity) : '');
    setTargetDurationMinutes(
      goal.targetDurationMinutes ? String(goal.targetDurationMinutes) : ''
    );
    setPriority(goal.priority);
    setFormError(null);

    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Submit Goal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDescription.trim()) {
      setFormError('Please enter a target description.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        date: selectedDate,
        subject,
        topic: topic || 'General Study',
        targetDescription: targetDescription.trim(),
        targetQuantity: targetQuantity ? parseInt(targetQuantity, 10) : null,
        targetDurationMinutes: targetDurationMinutes
          ? parseInt(targetDurationMinutes, 10)
          : null,
        priority,
        status: 'planned' as GoalStatus,
      };

      if (editingGoalId) {
        await apiClient.goals.update(editingGoalId, payload);
      } else {
        await apiClient.goals.create(payload);
      }

      resetForm();
      await loadGoals();
    } catch (err) {
      console.error('Error saving goal:', err);
      setFormError('Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Goal actions
  const handleUpdateStatus = async (id: string, status: GoalStatus) => {
    await apiClient.goals.update(id, { status });
    await loadGoals();
  };

  const handleDeferToTomorrow = async (goal: DailyGoal) => {
    await apiClient.goals.update(goal.id, {
      date: tomorrow,
      status: 'deferred',
    });
    setFeedbackMessage(`Goal moved to tomorrow (${formatDate(tomorrow, 'short')})`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    await loadGoals();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this goal?')) {
      await apiClient.goals.delete(id);
      await loadGoals();
      if (editingGoalId === id) resetForm();
    }
  };

  // Carry Forward Action
  const handleCarryForward = async () => {
    try {
      const count = await apiClient.goals.carryForward();
      if (count > 0) {
        setFeedbackMessage(`Successfully carried forward ${count} overdue goal(s) to today!`);
        setDateAndParam(today);
        await loadGoals();
      } else {
        setFeedbackMessage('No past incomplete goals found to carry forward.');
      }
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Carry forward failed:', err);
    }
  };

  // Stats
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const inProgressCount = goals.filter((g) => g.status === 'in_progress').length;
  const plannedCount = goals.filter((g) => g.status === 'planned' || g.status === 'overdue').length;

  const getPriorityBadge = (p: GoalPriority) => {
    switch (p) {
      case 'high':
        return <Badge variant="error" size="sm">High Priority</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="default" size="sm">Low</Badge>;
    }
  };

  const getStatusBadge = (s: GoalStatus) => {
    switch (s) {
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="accent" size="sm">In Progress</Badge>;
      case 'deferred':
        return <Badge variant="warning" size="sm">Deferred</Badge>;
      case 'overdue':
        return <Badge variant="error" size="sm">Overdue</Badge>;
      default:
        return <Badge variant="default" size="sm">Planned</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Goals & Planning
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Organize daily syllabus targets, track task completion, and roll forward incomplete items.
          </p>
        </div>

        {/* Carry Forward Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCarryForward}
          icon={<RotateCw className="w-4 h-4 text-accent" />}
          title="Move overdue goals from past dates into today"
        >
          Carry Forward Overdue
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-accent-light text-xs sm:text-sm font-medium flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Date Bar & Quick Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateAndParam(today)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDate === today
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateAndParam(tomorrow)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDate === tomorrow
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
            }`}
          >
            Tomorrow
          </button>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeDateBy(-1)}
            aria-label="Previous day"
            className="p-1.5 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-text">
            <Calendar className="w-4 h-4 text-accent" />
            <span>{formatDate(selectedDate, 'medium')}</span>
          </div>
          <button
            type="button"
            onClick={() => changeDateBy(1)}
            aria-label="Next day"
            className="p-1.5 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border text-center">
          <span className="text-xs text-text-muted">Planned</span>
          <p className="text-xl font-bold text-text mt-0.5">{plannedCount}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border text-center">
          <span className="text-xs text-text-muted">In Progress</span>
          <p className="text-xl font-bold text-accent mt-0.5">{inProgressCount}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border text-center">
          <span className="text-xs text-text-muted">Completed</span>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{completedCount}</p>
        </div>
      </div>

      {/* Add / Edit Goal Card */}
      <Card
        title={editingGoalId ? 'Edit Study Goal' : 'Add New Goal'}
        subtitle={`Schedule a milestone for ${formatDate(selectedDate, 'medium')}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-rose-400 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Subject *"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.icon} {s.name}
                </option>
              ))}
            </Select>

            <Select
              label="Topic *"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {availableTopics.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Target Description *"
            placeholder="e.g. Solve 40 Syllogism questions and review error notes"
            value={targetDescription}
            onChange={(e) => setTargetDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              label="Target Quantity (Questions / Pages)"
              placeholder="e.g. 50"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              label="Target Duration (Minutes)"
              placeholder="e.g. 60"
              value={targetDurationMinutes}
              onChange={(e) => setTargetDurationMinutes(e.target.value)}
            />
          </div>

          {/* Priority selection */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Priority
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              {(['low', 'medium', 'high'] as GoalPriority[]).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                      isSelected
                        ? p === 'high'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-400'
                          : p === 'medium'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                          : 'bg-surface-elevated border-text-secondary text-text'
                        : 'bg-surface-elevated border-surface-border text-text-secondary hover:text-text'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60">
            {editingGoalId && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={editingGoalId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {editingGoalId ? 'Update Goal' : 'Save Goal'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Goals List for Selected Date */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">
          Goals for {formatDate(selectedDate, 'medium')} ({goals.length})
        </h2>

        {goals.length === 0 ? (
          <div className="p-8 text-center bg-surface-card rounded-2xl border border-dashed border-surface-border text-text-secondary space-y-2">
            <Target className="w-8 h-8 mx-auto text-text-muted" />
            <p className="text-sm font-medium text-text">No goals recorded for this date.</p>
            <p className="text-xs text-text-muted">Add your targets above to stay accountable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const isCompleted = g.status === 'completed';
              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-surface-card/40 border-surface-border/40 opacity-70'
                      : 'bg-surface-card border-surface-border hover:border-surface-border/90'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="accent">{g.subject}</Badge>
                      <span className="font-semibold text-sm text-text">
                        {g.topic}
                      </span>
                      {getPriorityBadge(g.priority)}
                      {getStatusBadge(g.status)}
                    </div>

                    <p
                      className={`text-sm text-text-secondary ${
                        isCompleted ? 'line-through text-text-muted' : ''
                      }`}
                    >
                      {g.targetDescription}
                    </p>

                    {(g.targetQuantity || g.targetDurationMinutes) && (
                      <div className="flex items-center gap-4 text-xs text-text-muted pt-0.5">
                        {g.targetQuantity && (
                          <span>Target: {g.targetQuantity} items</span>
                        )}
                        {g.targetDurationMinutes && (
                          <span>Estimated: {formatDuration(g.targetDurationMinutes)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                    {!isCompleted ? (
                      <>
                        {g.status !== 'in_progress' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateStatus(g.id, 'in_progress')}
                            icon={<Play className="w-3.5 h-3.5" />}
                          >
                            Start
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(g.id, 'completed')}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Complete
                        </Button>
                        {selectedDate <= today && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeferToTomorrow(g)}
                            icon={<CornerDownRight className="w-3.5 h-3.5" />}
                            title="Defer to tomorrow"
                          >
                            Defer
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(g.id, 'planned')}
                        icon={<RotateCw className="w-3.5 h-3.5" />}
                      >
                        Reopen
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(g)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(g.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tomorrow's Goals Pre-Planning Section */}
      {selectedDate !== tomorrow && (
        <Card
          title="Tomorrow's Roadmap"
          subtitle={formatDate(tomorrow, 'medium')}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDateAndParam(tomorrow)}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Go to Tomorrow
            </Button>
          }
        >
          {tomorrowGoals.length === 0 ? (
            <p className="text-xs text-text-muted py-2">
              No tasks queued for tomorrow yet. Click "Go to Tomorrow" or change date to plan ahead.
            </p>
          ) : (
            <div className="space-y-2">
              {tomorrowGoals.map((g) => (
                <div
                  key={g.id}
                  className="p-2.5 rounded-lg bg-surface-elevated/70 border border-surface-border/60 text-xs flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-text">{g.subject}: </span>
                    <span className="text-text-secondary">{g.targetDescription}</span>
                  </div>
                  <Badge variant="default" size="sm">
                    {g.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
