import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { QuizConfigModal, QuizConfig } from './QuizConfigModal';
import { QuizRunner } from './QuizRunner';
import { TestResultSummary } from './TestResultSummary';
import { apiClient } from '../../lib/api';
import { formatDuration, formatDate } from '../../lib/utils';
import type { Question, PracticeTest, PracticeAttempt } from '@study-buddy/shared';
import {
  BookOpen,
  Play,
  Layers,
  Clock,
  Zap,
  CheckCircle2,
  Trophy,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const PracticePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<'hub' | 'running' | 'result'>('hub');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pastTests, setPastTests] = useState<PracticeTest[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Active quiz state
  const [activeConfig, setActiveConfig] = useState<QuizConfig | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [completedTest, setCompletedTest] = useState<PracticeTest | null>(null);
  const [completedAttempts, setCompletedAttempts] = useState<PracticeAttempt[]>([]);

  // Pre-selected parameters for modal
  const [presetSubject, setPresetSubject] = useState<string | undefined>(undefined);
  const [presetTopic, setPresetTopic] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      const [allQuestions, tests, bookmarks] = await Promise.all([
        apiClient.questions.list(),
        apiClient.practice.listTests(20),
        apiClient.bookmarks.list(),
      ]);
      setQuestions(allQuestions);
      setPastTests(tests);
      setBookmarkedIds(new Set(bookmarks.map((b) => b.targetId)));
    } catch (err) {
      console.error('Failed to load practice data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep link from the Current Affairs feed: open the quiz config pre-filtered.
  useEffect(() => {
    const state = location.state as
      | { presetSubject?: string; presetTopic?: string }
      | null;

    if (!state?.presetSubject && !state?.presetTopic) return;

    setPresetSubject(state.presetSubject);
    setPresetTopic(state.presetTopic);
    setIsConfigOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const handleStartQuiz = (config: QuizConfig, selectedQuestions: Question[]) => {
    setActiveConfig(config);
    setActiveQuestions(selectedQuestions);
    setIsConfigOpen(false);
    setViewState('running');
  };

  const handleCompleteQuiz = async (test: PracticeTest, attempts: PracticeAttempt[]) => {
    try {
      await apiClient.practice.submitTest(test, attempts);
      setCompletedTest(test);
      setCompletedAttempts(attempts);
      setViewState('result');
      loadData();
    } catch (err) {
      console.error('Failed to save test submission:', err);
      // Still show results even if remote sync threw
      setCompletedTest(test);
      setCompletedAttempts(attempts);
      setViewState('result');
    }
  };

  const handleToggleBookmark = async (questionId: string) => {
    try {
      const isNowBookmarked = await apiClient.bookmarks.toggle('question', questionId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isNowBookmarked) {
          next.add(questionId);
        } else {
          next.delete(questionId);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handleOpenConfigWithPreset = (subject?: string, topic?: string) => {
    setPresetSubject(subject);
    setPresetTopic(topic);
    setIsConfigOpen(true);
  };

  // Quick review of a past test
  const handleReviewPastTest = async (test: PracticeTest) => {
    try {
      const data = await apiClient.practice.getTest(test.id);
      if (data) {
        // Map questions from bank
        const testQuestions = data.attempts
          .map((a) => questions.find((q) => q.id === a.questionId))
          .filter(Boolean) as Question[];

        setCompletedTest(data.test);
        setCompletedAttempts(data.attempts);
        setActiveQuestions(testQuestions);
        setViewState('result');
      }
    } catch (err) {
      console.error('Failed to retrieve test details:', err);
    }
  };

  // Aggregated analytics
  const totalTestsCount = pastTests.length;
  const totalScore = pastTests.reduce((acc, t) => acc + (t.score || 0), 0);
  const totalPossible = pastTests.reduce((acc, t) => acc + (t.total || 0), 0);
  const overallAccuracy = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  // Render active quiz runner
  if (viewState === 'running' && activeConfig && activeQuestions.length > 0) {
    return (
      <QuizRunner
        config={activeConfig}
        questions={activeQuestions}
        onComplete={handleCompleteQuiz}
        onExit={() => setViewState('hub')}
      />
    );
  }

  // Render test result view
  if (viewState === 'result' && completedTest) {
    return (
      <TestResultSummary
        test={completedTest}
        questions={activeQuestions}
        attempts={completedAttempts}
        onRestart={() => {
          if (activeConfig && activeQuestions.length > 0) {
            setViewState('running');
          } else {
            setViewState('hub');
          }
        }}
        onExit={() => setViewState('hub')}
        onToggleBookmark={handleToggleBookmark}
        bookmarkedIds={bookmarkedIds}
      />
    );
  }

  // Render main practice hub
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Practice & Exam Series
            </h1>
            <Badge variant="accent">Phase 2 Active</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Take topic-wise drills, full sectional mocks, and build exam speed with automated mistake tagging.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Play className="w-4 h-4" />}
          onClick={() => handleOpenConfigWithPreset()}
        >
          Create Custom Quiz
        </Button>
      </div>

      {/* Aggregate Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted block">Tests Completed</span>
          <div className="text-2xl font-bold text-text mt-0.5">{totalTestsCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted block">Overall Accuracy</span>
          <div
            className={`text-2xl font-bold mt-0.5 ${
              overallAccuracy >= 75
                ? 'text-emerald-400'
                : overallAccuracy >= 50
                ? 'text-amber-400'
                : 'text-text'
            }`}
          >
            {totalPossible > 0 ? `${overallAccuracy}%` : 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted block">Questions Solved</span>
          <div className="text-2xl font-bold text-accent mt-0.5">{totalPossible}</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted block">Questions in Bank</span>
          <div className="text-2xl font-bold text-text mt-0.5">{questions.length}</div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Quantitative Drill */}
        <Card
          variant="default"
          className="p-4 hover:border-accent/40 transition-all cursor-pointer group"
          onClick={() => handleOpenConfigWithPreset('Quantitative Aptitude')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <Badge variant="accent" size="sm">
              Drill
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors">
            Quantitative Aptitude Drill
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Practice Percentages, Profit & Loss, Arithmetic, and Algebra drills with step-by-step working.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-accent gap-1">
            <span>Start Drill</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>

        {/* Card 2: Reasoning Drill */}
        <Card
          variant="default"
          className="p-4 hover:border-accent/40 transition-all cursor-pointer group"
          onClick={() => handleOpenConfigWithPreset('Reasoning')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <Badge variant="success" size="sm">
              Logic
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors">
            Logical Reasoning Practice
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Master Syllogisms, Coding-Decoding, Blood Relations, and Puzzles with immediate verification.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-accent gap-1">
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>

        {/* Card 3: Timed Full Mock */}
        <Card
          variant="default"
          className="p-4 hover:border-accent/40 transition-all cursor-pointer group"
          onClick={() => handleOpenConfigWithPreset()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <Badge variant="warning" size="sm">
              Timed Mock
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors">
            Custom Mixed Mock
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Simulate actual exam pressure with strict countdown, negative scoring review, and mistake logging.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-accent gap-1">
            <span>Configure Mock</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Card>
      </div>

      {/* Past Test History */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            Recent Test Attempts
          </h2>
          {pastTests.length > 0 && (
            <span className="text-xs text-text-muted">Showing last {pastTests.length} tests</span>
          )}
        </div>

        {pastTests.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-7 h-7 text-text-muted" />}
            title="No test attempts yet"
            description="Complete your first practice drill or timed mock above to track your scores and automatically log mistakes."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleOpenConfigWithPreset()}
                icon={<Play className="w-4 h-4" />}
              >
                Take Your First Quiz
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {pastTests.map((test) => {
              const accuracy =
                test.total && test.total > 0
                  ? Math.round(((test.score || 0) / test.total) * 100)
                  : 0;

              return (
                <div
                  key={test.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between gap-3 hover:border-surface-border/80 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text truncate">
                        {test.title}
                      </span>
                      {test.exam && (
                        <Badge variant="accent" size="sm">
                          {test.exam}
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-text-muted">
                        {formatDate(test.completedAt || test.startedAt, 'short')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="text-text font-medium">
                        Score: {test.score} / {test.total}
                      </span>
                      <span>•</span>
                      <span
                        className={
                          accuracy >= 75
                            ? 'text-emerald-400 font-semibold'
                            : accuracy >= 50
                            ? 'text-amber-400 font-semibold'
                            : 'text-red-400 font-semibold'
                        }
                      >
                        {accuracy}% Accuracy
                      </span>
                      {test.timeLimitMinutes && (
                        <>
                          <span>•</span>
                          <span className="text-text-muted">
                            {test.timeLimitMinutes}m limit
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReviewPastTest(test)}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Review
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz Config Modal */}
      <QuizConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        questions={questions}
        onStartQuiz={handleStartQuiz}
        initialSubject={presetSubject}
        initialTopic={presetTopic}
      />
    </div>
  );
};
