import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QuoteDisplay } from './QuoteDisplay';
import { FocusTimer } from './FocusTimer';
import { apiClient } from '../../lib/api';
import { formatDate, formatDuration, getToday, getTomorrow } from '../../lib/utils';
import type { DashboardData, DailyGoal, StudySession } from '@study-buddy/shared';
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  Plus,
  ArrowRight,
  Timer,
  BookOpen,
  RotateCcw,
  Sparkles,
  BarChart3,
  Calendar,
  Flame,
  Check,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tomorrowGoals, setTomorrowGoals] = useState<DailyGoal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTimerOpen, setIsTimerOpen] = useState<boolean>(false);

  const todayStr = getToday();
  const tomorrowStr = getTomorrow();

  // Greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboard = useCallback(async () => {
    try {
      const [dash, tmrGoals] = await Promise.all([
        apiClient.dashboard.get(),
        apiClient.goals.list(tomorrowStr),
      ]);
      setData(dash);
      setTomorrowGoals(tmrGoals);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tomorrowStr]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Goal status quick updates
  const handleUpdateGoalStatus = async (
    goalId: string,
    status: DailyGoal['status']
  ) => {
    try {
      await apiClient.goals.update(goalId, { status });
      await loadDashboard();
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const todayGoals = data?.todayGoals || [];
  const todaySessions = data?.todaySessions || [];
  const weeklyStats = data?.weeklyStats || {
    totalMinutes: 0,
    totalQuestions: 0,
    daysStudied: 0,
    accuracy: null,
  };

  const completedGoalsCount = todayGoals.filter((g) => g.status === 'completed').length;
  const totalGoalsCount = todayGoals.length;
  const goalProgressPercent =
    totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

  const totalTodayMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalTodayQuestions = todaySessions.reduce((acc, s) => acc + (s.questionsAttempted || 0), 0);
  const totalTodayCorrect = todaySessions.reduce((acc, s) => acc + (s.correct || 0), 0);

  const getStatusBadge = (status: DailyGoal['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="accent">In Progress</Badge>;
      case 'deferred':
        return <Badge variant="warning">Deferred</Badge>;
      case 'overdue':
        return <Badge variant="error">Overdue</Badge>;
      default:
        return <Badge variant="default">Planned</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Area */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              {getGreeting()}, ready to study?
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {formatDate(todayStr, 'full')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Timer className="w-4 h-4 text-accent" />}
              onClick={() => setIsTimerOpen(true)}
            >
              Focus Sprint
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/tracker')}
            >
              Log Study
            </Button>
          </div>
        </div>

        {/* Motivational Quote */}
        <QuoteDisplay />
      </section>

      {/* 4. Quick Actions Banner */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setIsTimerOpen(true)}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-surface-card border border-surface-border hover:border-accent/40 hover:bg-surface-elevated transition-all group text-center cursor-pointer shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent mb-2 group-hover:scale-105 transition-transform">
              <Timer className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-text">Focus Session</span>
            <span className="text-[11px] text-text-muted mt-0.5 hidden sm:inline">25m Pomodoro</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tracker')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-surface-card border border-surface-border hover:border-accent/40 hover:bg-surface-elevated transition-all group text-center cursor-pointer shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-text">Log Study</span>
            <span className="text-[11px] text-text-muted mt-0.5 hidden sm:inline">Track time & questions</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/practice')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-surface-card border border-surface-border hover:border-accent/40 hover:bg-surface-elevated transition-all group text-center cursor-pointer shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-text">Practice Qs</span>
            <span className="text-[11px] text-text-muted mt-0.5 hidden sm:inline">Question tests</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/revision')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl bg-surface-card border border-surface-border hover:border-accent/40 hover:bg-surface-elevated transition-all group text-center cursor-pointer shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-text">Review Mistakes</span>
            <span className="text-[11px] text-text-muted mt-0.5 hidden sm:inline">
              {data?.dueRevisionCount || 0} due today
            </span>
          </button>
        </div>
      </section>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 2. Today's Plan Card */}
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Today's Plan
                </span>
                {totalGoalsCount > 0 && (
                  <span className="text-xs font-normal text-text-secondary">
                    {completedGoalsCount} of {totalGoalsCount} completed
                  </span>
                )}
              </div>
            }
            subtitle={
              totalGoalsCount > 0
                ? `${goalProgressPercent}% finished`
                : 'Set measurable targets to stay on track'
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/goals')}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Manage
              </Button>
            }
          >
            {/* Progress bar if goals exist */}
            {totalGoalsCount > 0 && (
              <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden mb-4 border border-surface-border/40">
                <div
                  className="bg-accent h-full transition-all duration-300 rounded-full"
                  style={{ width: `${goalProgressPercent}%` }}
                />
              </div>
            )}

            {todayGoals.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-surface/40 rounded-xl border border-dashed border-surface-border">
                <p className="text-sm text-text-secondary">
                  No targets scheduled for today yet.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/goals')}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Today's Goals
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayGoals.map((goal) => {
                  const isDone = goal.status === 'completed';
                  const isInProgress = goal.status === 'in_progress';
                  return (
                    <div
                      key={goal.id}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-surface/30 border-surface-border/40 opacity-75'
                          : isInProgress
                          ? 'bg-surface-elevated border-accent/40 shadow-sm'
                          : 'bg-surface-elevated/70 border-surface-border/80'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="accent" size="sm">
                            {goal.subject}
                          </Badge>
                          <span className="text-xs font-semibold text-text truncate">
                            {goal.topic}
                          </span>
                          {getStatusBadge(goal.status)}
                        </div>
                        <p
                          className={`text-xs sm:text-sm text-text-secondary ${
                            isDone ? 'line-through text-text-muted' : ''
                          }`}
                        >
                          {goal.targetDescription}
                        </p>
                        {(goal.targetQuantity || goal.targetDurationMinutes) && (
                          <div className="flex items-center gap-3 text-[11px] text-text-muted pt-0.5">
                            {goal.targetQuantity && (
                              <span>Target: {goal.targetQuantity} questions</span>
                            )}
                            {goal.targetDurationMinutes && (
                              <span>Target: {formatDuration(goal.targetDurationMinutes)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Goal Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {!isDone && !isInProgress && (
                          <button
                            type="button"
                            onClick={() => handleUpdateGoalStatus(goal.id, 'in_progress')}
                            title="Mark In-Progress"
                            className="p-1.5 text-text-muted hover:text-accent hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                          >
                            <PlayCircle className="w-4 h-4" />
                          </button>
                        )}
                        {!isDone ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}
                            title="Mark Complete"
                            className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateGoalStatus(goal.id, 'planned')}
                            title="Mark as Planned"
                            className="p-1.5 text-emerald-400 hover:text-text-muted hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 3. Study Sessions Card */}
          <Card
            title="Today's Study Sessions"
            subtitle={
              totalTodayMinutes > 0
                ? `${formatDuration(totalTodayMinutes)} logged today • ${totalTodayQuestions} questions`
                : 'No study logged today yet'
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/tracker')}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Log Session
              </Button>
            }
          >
            {todaySessions.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-surface/40 rounded-xl border border-dashed border-surface-border">
                <p className="text-sm text-text-secondary">
                  No sessions recorded for today.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/tracker')}
                  icon={<Clock className="w-3.5 h-3.5" />}
                >
                  Record Your First Session
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" size="sm">
                          {session.subject}
                        </Badge>
                        <span className="text-xs sm:text-sm font-semibold text-text truncate">
                          {session.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="text-text font-medium">
                          {formatDuration(session.durationMinutes)}
                        </span>
                        {session.questionsAttempted > 0 && (
                          <span>
                            {session.correct}/{session.questionsAttempted} Qs (
                            {Math.round((session.correct / session.questionsAttempted) * 100)}%)
                          </span>
                        )}
                        <span className="capitalize text-text-muted">
                          {session.confidence} confidence
                        </span>
                      </div>
                      {session.reflection && (
                        <p className="text-xs text-text-muted italic truncate">
                          "{session.reflection}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 7. Weekly Snapshot Card */}
          <Card
            title="Weekly Snapshot"
            subtitle="Your consistency over the last 7 days"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/progress')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Stats
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border/60">
                <span className="text-xs text-text-muted block">Days Studied</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-text">
                    {weeklyStats.daysStudied}
                  </span>
                  <span className="text-xs text-text-muted">/ 7 days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border/60">
                <span className="text-xs text-text-muted block">Total Time</span>
                <span className="text-2xl font-bold text-accent mt-1 block">
                  {formatDuration(weeklyStats.totalMinutes)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border/60">
                <span className="text-xs text-text-muted block">Questions Solved</span>
                <span className="text-2xl font-bold text-text mt-1 block">
                  {weeklyStats.totalQuestions}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border/60">
                <span className="text-xs text-text-muted block">Avg Accuracy</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {weeklyStats.accuracy !== null ? `${weeklyStats.accuracy}%` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* 5. Due Revisions Card */}
          <Card
            title="Due Revisions"
            subtitle="Spaced repetition recall items"
          >
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated border border-surface-border/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-text">
                    {data?.dueRevisionCount || 0}
                  </div>
                  <div className="text-xs text-text-muted">
                    Topics due for spaced review
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/revision')}
              >
                Review
              </Button>
            </div>
          </Card>

          {/* 6. Tomorrow's Goals Mini-Section */}
          <Card
            title="Tomorrow's Plan"
            subtitle={formatDate(tomorrowStr, 'short')}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/goals?date=${tomorrowStr}`)}
                icon={<Calendar className="w-3.5 h-3.5" />}
              >
                Plan
              </Button>
            }
          >
            {tomorrowGoals.length === 0 ? (
              <div className="py-4 text-center space-y-2 bg-surface/30 rounded-xl border border-dashed border-surface-border">
                <p className="text-xs text-text-muted">
                  No targets pre-planned for tomorrow.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/goals?date=${tomorrowStr}`)}
                >
                  Pre-plan Tomorrow
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {tomorrowGoals.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-lg bg-surface-elevated/70 border border-surface-border/60 text-xs flex items-center justify-between"
                  >
                    <div className="truncate min-w-0 pr-2">
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
        </div>
      </div>

      {/* Focus Timer Modal */}
      <FocusTimer
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        onSessionLogged={() => {
          loadDashboard();
        }}
      />
    </div>
  );
};
