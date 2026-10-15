import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import { formatDuration, formatDate } from '../../lib/utils';
import type { StudySession } from '@study-buddy/shared';
import { BarChart3, Clock, CheckCircle2, TrendingUp, Calendar, BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DayStat {
  date: string;
  dayLabel: string;
  minutes: number;
  questions: number;
}

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await apiClient.sessions.list();
        setSessions(all);
      } catch (err) {
        console.error('Failed to load sessions for progress:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // All-time Metrics
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correct, 0);
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  // Last 7 Days Daily Breakdown
  const last7Days: DayStat[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    const daySessions = sessions.filter((s) => s.date === dateStr);
    const minutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const questions = daySessions.reduce((acc, s) => acc + s.questionsAttempted, 0);

    last7Days.push({
      date: dateStr,
      dayLabel,
      minutes,
      questions,
    });
  }

  const maxMinutesInWeek = Math.max(...last7Days.map((d) => d.minutes), 60);

  // Subject Breakdown
  const subjectMap = new Map<string, { minutes: number; questions: number; correct: number }>();
  sessions.forEach((s) => {
    const existing = subjectMap.get(s.subject) || { minutes: 0, questions: 0, correct: 0 };
    existing.minutes += s.durationMinutes;
    existing.questions += s.questionsAttempted;
    existing.correct += s.correct;
    subjectMap.set(s.subject, existing);
  });

  const subjectStats = Array.from(subjectMap.entries()).map(([name, data]) => ({
    name,
    ...data,
    accuracy: data.questions > 0 ? Math.round((data.correct / data.questions) * 100) : null,
  })).sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Study Analytics & Progress
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Evaluate your study hours, consistency trends, and subject-wise effort distribution.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/tracker')}
          icon={<Plus className="w-4 h-4" />}
        >
          Log Study Session
        </Button>
      </div>

      {totalSessions === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6 text-accent" />}
          title="No Study History Yet"
          description="Log study sessions and complete goals to start building your consistency graph and performance analytics."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/tracker')}
              icon={<Plus className="w-4 h-4" />}
            >
              Log First Session
            </Button>
          }
        />
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <Clock className="w-4 h-4 text-accent" />
                <span>All-Time Study</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-accent mt-2">
                {formatDuration(totalMinutes)}
              </p>
              <span className="text-[11px] text-text-muted mt-1 block">
                Across {totalSessions} session(s)
              </span>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Questions Solved</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text mt-2">
                {totalQuestions}
              </p>
              <span className="text-[11px] text-text-muted mt-1 block">
                {totalCorrect} answered correctly
              </span>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Overall Accuracy</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2">
                {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
              </p>
              <span className="text-[11px] text-text-muted mt-1 block">
                Based on practice logs
              </span>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Active Days</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-text mt-2">
                {new Set(sessions.map((s) => s.date)).size}
              </p>
              <span className="text-[11px] text-text-muted mt-1 block">
                Unique study days recorded
              </span>
            </Card>
          </div>

          {/* 7-Day Consistency Visualization */}
          <Card
            title="Last 7 Days Study Distribution"
            subtitle="Daily study time in hours"
          >
            <div className="pt-6 pb-2">
              <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {last7Days.map((day) => {
                  const heightPercent =
                    day.minutes > 0
                      ? Math.max(Math.round((day.minutes / maxMinutesInWeek) * 100), 12)
                      : 4;
                  const isToday = day.date === last7Days[last7Days.length - 1].date;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-surface-elevated border border-surface-border text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                        <span className="font-semibold text-text">{formatDuration(day.minutes)}</span>
                        {day.questions > 0 && (
                          <span className="text-text-muted"> • {day.questions} Qs</span>
                        )}
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[42px] bg-surface-elevated rounded-t-lg overflow-hidden flex items-end justify-center transition-all h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            day.minutes > 0
                              ? isToday
                                ? 'bg-gradient-to-t from-accent to-accent-light shadow-glow-subtle'
                                : 'bg-accent/70 hover:bg-accent'
                              : 'bg-surface-border/40'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <div className="text-center mt-3">
                        <span
                          className={`text-xs block ${
                            isToday ? 'font-bold text-accent' : 'text-text-muted'
                          }`}
                        >
                          {day.dayLabel}
                        </span>
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          {day.minutes > 0 ? `${(day.minutes / 60).toFixed(1)}h` : '0h'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Subject Breakdown Card */}
          <Card
            title="Subject-Wise Effort Distribution"
            subtitle="Time and question volume logged per subject"
          >
            <div className="space-y-4">
              {subjectStats.map((sub) => {
                const percentOfTotal =
                  totalMinutes > 0 ? Math.round((sub.minutes / totalMinutes) * 100) : 0;

                return (
                  <div key={sub.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{sub.name}</span>
                        <span className="text-xs text-text-muted">
                          ({percentOfTotal}% of total)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="font-medium text-text">{formatDuration(sub.minutes)}</span>
                        {sub.questions > 0 && (
                          <span>
                            {sub.questions} Qs
                            {sub.accuracy !== null && ` (${sub.accuracy}%)`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden border border-surface-border/50">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentOfTotal}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
