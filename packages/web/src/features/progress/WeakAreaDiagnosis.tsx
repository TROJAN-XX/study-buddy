import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import type { PracticeAttempt, Question } from '@study-buddy/shared';
import {
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Brain,
  ShieldAlert,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopicDiagnosis {
  subject: string;
  topic: string;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  avgSeconds: number;
  quadrant: 'concept_deficiency' | 'pace_deficiency' | 'high_mastery' | 'developing' | 'low_sample';
  recommendation: string;
}

const MINIMUM_SAMPLE_SIZE = 15;

export const WeakAreaDiagnosis: React.FC = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dismissedTopics, setDismissedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allQuestions, allAttempts] = await Promise.all([
          apiClient.questions.list(),
          Promise.resolve(storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS)),
        ]);
        setQuestions(allQuestions);
        setAttempts(allAttempts);
      } catch (err) {
        console.error('Failed to load diagnosis data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const diagnoses: TopicDiagnosis[] = useMemo(() => {
    if (questions.length === 0 || attempts.length === 0) return [];

    const qMap = new Map(questions.map((q) => [q.id, q]));
    const topicStats = new Map<
      string,
      { subject: string; topic: string; total: number; correct: number; totalSeconds: number }
    >();

    attempts.forEach((att) => {
      const q = qMap.get(att.questionId);
      if (!q) return;

      const key = `${q.subject}::${q.topic}`;
      const existing = topicStats.get(key) || {
        subject: q.subject,
        topic: q.topic,
        total: 0,
        correct: 0,
        totalSeconds: 0,
      };

      existing.total += 1;
      if (att.isCorrect) existing.correct += 1;
      existing.totalSeconds += att.timeSeconds || 0;
      topicStats.set(key, existing);
    });

    const result: TopicDiagnosis[] = [];

    topicStats.forEach((stat) => {
      const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      const avgSeconds = stat.total > 0 ? Math.round(stat.totalSeconds / stat.total) : 0;

      let quadrant: TopicDiagnosis['quadrant'] = 'developing';
      let recommendation = '';

      if (stat.total < MINIMUM_SAMPLE_SIZE) {
        quadrant = 'low_sample';
        recommendation = `Attempt ${MINIMUM_SAMPLE_SIZE - stat.total} more questions to generate a confident diagnosis.`;
      } else if (accuracy < 55) {
        quadrant = 'concept_deficiency';
        recommendation = 'Concept gap detected. Review theory notes and step-by-step solutions in your Mistake Book.';
      } else if (accuracy >= 80 && avgSeconds > 90) {
        quadrant = 'pace_deficiency';
        recommendation = 'Strong accuracy but high time per question (>90s). Run 60-second timed sprints to build speed.';
      } else if (accuracy >= 85 && avgSeconds <= 90) {
        quadrant = 'high_mastery';
        recommendation = 'Solid mastery and exam-ready speed. Maintain with spaced review every 2 weeks.';
      } else {
        quadrant = 'developing';
        recommendation = 'Moderate understanding. Focus on solving high-difficulty questions to bridge gaps.';
      }

      result.push({
        subject: stat.subject,
        topic: stat.topic,
        totalAttempts: stat.total,
        correctCount: stat.correct,
        accuracy,
        avgSeconds,
        quadrant,
        recommendation,
      });
    });

    // Sort priority: concept deficiencies first, then pace deficiencies, then developing, low_sample, mastery
    const priorityOrder = {
      concept_deficiency: 1,
      pace_deficiency: 2,
      developing: 3,
      low_sample: 4,
      high_mastery: 5,
    };

    return result.sort((a, b) => priorityOrder[a.quadrant] - priorityOrder[b.quadrant]);
  }, [questions, attempts]);

  const toggleDismiss = (key: string) => {
    setDismissedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activeDiagnoses = diagnoses.filter(
    (d) => !dismissedTopics.has(`${d.subject}::${d.topic}`)
  );

  return (
    <Card variant="elevated" className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            Topic Weak-Area Diagnosis & Safeguards
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Objective topic assessments with a strict 15-attempt sample safeguard to prevent false mastery or premature alarm.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="accent">Min {MINIMUM_SAMPLE_SIZE} Qs Guard</Badge>
          {dismissedTopics.size > 0 && (
            <button
              type="button"
              onClick={() => setDismissedTopics(new Set())}
              className="text-text-muted hover:text-accent underline text-xs cursor-pointer"
            >
              Reset {dismissedTopics.size} dismissed
            </button>
          )}
        </div>
      </div>

      {activeDiagnoses.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-muted">
          <Info className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-60" />
          No topic attempts recorded yet. Take practice tests to unlock diagnostic guidance!
        </div>
      ) : (
        <div className="space-y-3">
          {activeDiagnoses.map((diag) => {
            const key = `${diag.subject}::${diag.topic}`;
            const isLowSample = diag.quadrant === 'low_sample';

            let borderStyle = 'border-surface-border';
            let badgeComponent = null;

            if (diag.quadrant === 'concept_deficiency') {
              borderStyle = 'border-red-500/40 bg-red-950/10';
              badgeComponent = (
                <Badge variant="error" size="sm">
                  <TrendingDown className="w-3 h-3 mr-1 inline" /> Concept Deficiency
                </Badge>
              );
            } else if (diag.quadrant === 'pace_deficiency') {
              borderStyle = 'border-amber-500/40 bg-amber-950/10';
              badgeComponent = (
                <Badge variant="warning" size="sm">
                  <Clock className="w-3 h-3 mr-1 inline" /> Pace Deficiency
                </Badge>
              );
            } else if (diag.quadrant === 'high_mastery') {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/5';
              badgeComponent = (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="w-3 h-3 mr-1 inline" /> High Mastery
                </Badge>
              );
            } else if (isLowSample) {
              borderStyle = 'border-surface-border bg-surface-elevated/40';
              badgeComponent = (
                <Badge variant="default" size="sm">
                  Low Sample ({diag.totalAttempts}/{MINIMUM_SAMPLE_SIZE} Qs)
                </Badge>
              );
            } else {
              borderStyle = 'border-accent/30 bg-accent/5';
              badgeComponent = (
                <Badge variant="accent" size="sm">
                  Developing
                </Badge>
              );
            }

            return (
              <div
                key={key}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${borderStyle}`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {badgeComponent}
                    <span className="font-semibold text-sm text-text">{diag.topic}</span>
                    <span className="text-text-muted text-[11px]">({diag.subject})</span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {diag.recommendation}
                  </p>

                  <div className="flex items-center gap-3 pt-0.5 text-[11px] text-text-muted">
                    <span>
                      Accuracy:{' '}
                      <strong
                        className={
                          diag.accuracy >= 75
                            ? 'text-emerald-400'
                            : diag.accuracy >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }
                      >
                        {diag.accuracy}%
                      </strong>{' '}
                      ({diag.correctCount}/{diag.totalAttempts})
                    </span>
                    <span>•</span>
                    <span>
                      Pace: <strong>{diag.avgSeconds}s / Q</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/practice')}
                  >
                    Drill Topic
                  </Button>

                  <button
                    type="button"
                    onClick={() => toggleDismiss(key)}
                    title="Acknowledge / Dismiss recommendation"
                    className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
