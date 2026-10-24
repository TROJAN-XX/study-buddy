import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Markdown } from '../../components/Markdown';
import type { Question, PracticeTest, PracticeAttempt } from '@study-buddy/shared';
import type { QuizConfig } from './QuizConfigModal';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Grid,
  Check,
  X,
  Flame,
} from 'lucide-react';

interface QuizRunnerProps {
  config: QuizConfig;
  questions: Question[];
  onComplete: (test: PracticeTest, attempts: PracticeAttempt[]) => void;
  onExit: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  config,
  questions,
  onComplete,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [markedStatus, setMarkedStatus] = useState<Record<string, 'none' | 'uncertain'>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  // Countdown timer for timed exam mode
  const totalSeconds = (config.timeLimitMinutes || 15) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds);
  const [hasRevealedSolution, setHasRevealedSolution] = useState<Record<string, boolean>>({});

  const startTimeRef = useRef<number>(Date.now());
  const currentQuestionStartTime = useRef<number>(Date.now());

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // Track time spent on current question before switching
  const recordQuestionTime = useCallback(() => {
    if (!currentQ) return;
    const elapsed = Math.round((Date.now() - currentQuestionStartTime.current) / 1000);
    setTimeSpent((prev) => ({
      ...prev,
      [currentQ.id]: (prev[currentQ.id] || 0) + elapsed,
    }));
    currentQuestionStartTime.current = Date.now();
  }, [currentQ]);

  // Countdown effect
  useEffect(() => {
    if (config.mode !== 'exam') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.mode]);

  // Handle option select
  const handleSelectOption = (optionId: string) => {
    const isSingleChoice = currentQ.questionType === 'single_choice';
    setAnswers((prev) => {
      const currentSelected = prev[currentQ.id] || [];
      if (isSingleChoice) {
        return { ...prev, [currentQ.id]: [optionId] };
      } else {
        const next = currentSelected.includes(optionId)
          ? currentSelected.filter((id) => id !== optionId)
          : [...currentSelected, optionId];
        return { ...prev, [currentQ.id]: next };
      }
    });

    // In practice mode, immediately reveal answer
    if (config.mode === 'practice') {
      setHasRevealedSolution((prev) => ({ ...prev, [currentQ.id]: true }));
    }
  };

  // Keyboard shortcut listener (1, 2, 3, 4 or A, B, C, D, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitModalOpen) return;

      const key = e.key.toUpperCase();
      const optionMap: Record<string, string> = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        'A': 'A',
        'B': 'B',
        'C': 'C',
        'D': 'D',
      };

      if (optionMap[key]) {
        const targetOption = currentQ.options.find((o) => o.id === optionMap[key]);
        if (targetOption) {
          handleSelectOption(targetOption.id);
        }
      } else if (e.key === 'ArrowRight' && !isLastQuestion) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrev();
      } else if (e.key.toLowerCase() === 'u') {
        toggleUncertain();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQ, isSubmitModalOpen, isLastQuestion]);

  const handleNext = () => {
    recordQuestionTime();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    recordQuestionTime();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const toggleUncertain = () => {
    setMarkedStatus((prev) => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === 'uncertain' ? 'none' : 'uncertain',
    }));
  };

  const jumpToQuestion = (index: number) => {
    recordQuestionTime();
    setCurrentIndex(index);
    setIsPaletteOpen(false);
  };

  // Assemble and submit test
  const handleSubmitTest = () => {
    recordQuestionTime();

    const now = new Date().toISOString();
    let score = 0;

    const attempts: PracticeAttempt[] = questions.map((q) => {
      const selected = answers[q.id] || [];
      const isCorrect =
        selected.length > 0 &&
        selected.length === q.answer.length &&
        selected.every((ans) => q.answer.includes(ans));

      if (isCorrect) score++;

      return {
        id: crypto.randomUUID(),
        testId: '', // populated below
        questionId: q.id,
        selectedAnswer: selected,
        isCorrect,
        timeSeconds: timeSpent[q.id] || 0,
        markedStatus: markedStatus[q.id] || 'none',
        createdAt: now,
      };
    });

    const testId = crypto.randomUUID();
    attempts.forEach((a) => (a.testId = testId));

    const practiceTest: PracticeTest = {
      id: testId,
      title: config.title,
      exam: config.exam || null,
      type: config.topic ? 'topic_wise' : config.subject ? 'sectional' : 'mixed',
      config: {
        subjects: config.subject ? [config.subject] : [],
        topics: config.topic ? [config.topic] : [],
        difficulty: config.difficulty ? [config.difficulty] : [],
        questionCount: questions.length,
      },
      timeLimitMinutes: config.timeLimitMinutes || null,
      status: 'completed',
      score,
      total: questions.length,
      startedAt: new Date(startTimeRef.current).toISOString(),
      completedAt: now,
      createdAt: now,
    };

    onComplete(practiceTest, attempts);
  };

  // Stats calculation
  const answeredCount = Object.keys(answers).filter((k) => (answers[k] || []).length > 0).length;
  const uncertainCount = Object.values(markedStatus).filter((s) => s === 'uncertain').length;
  const unansweredCount = questions.length - answeredCount;

  // Format countdown
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeLow = config.mode === 'exam' && remainingSeconds <= 120;
  const isAnswered = (answers[currentQ.id] || []).length > 0;
  const isUncertain = markedStatus[currentQ.id] === 'uncertain';
  const showSolution = config.mode === 'practice' && hasRevealedSolution[currentQ.id];

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12 animate-fadeIn">
      {/* Top Test Navigation Bar */}
      <div className="flex items-center justify-between p-3.5 bg-surface-card rounded-xl border border-surface-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-text-muted hover:text-text flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quit
          </button>
          <div className="h-4 w-px bg-surface-border" />
          <div className="text-xs font-semibold text-text truncate max-w-[180px] sm:max-w-xs">
            {config.title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer Display */}
          {config.mode === 'exam' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                isTimeLow
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-surface-elevated text-text border-surface-border'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(remainingSeconds)}
            </div>
          )}

          {/* Palette button */}
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="p-1.5 rounded-lg bg-surface-elevated border border-surface-border text-text-secondary hover:text-text cursor-pointer flex items-center gap-1 text-xs"
            title="Question Palette"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Palette</span>
          </button>

          {/* Submit button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
          >
            Finish Test
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <span>{answeredCount} Answered</span>
          <span>•</span>
          <span>{unansweredCount} Left</span>
        </div>
      </div>
      <div className="w-full bg-surface-elevated h-1 rounded-full overflow-hidden">
        <div
          className="bg-accent h-full transition-all duration-200"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Question Card */}
      <Card className="p-5 sm:p-6 space-y-5 border border-surface-border/90">
        {/* Question Metadata */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="accent" size="sm">
              {currentQ.exam}
            </Badge>
            <span className="text-text-secondary font-medium">
              {currentQ.subject} → {currentQ.topic}
            </span>
            <Badge
              variant={
                currentQ.difficulty === 'easy'
                  ? 'success'
                  : currentQ.difficulty === 'hard'
                  ? 'error'
                  : 'warning'
              }
              size="sm"
            >
              {currentQ.difficulty}
            </Badge>
          </div>

          <button
            type="button"
            onClick={toggleUncertain}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              isUncertain
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-text-muted hover:text-text hover:bg-surface-elevated border border-transparent'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {isUncertain ? 'Marked Uncertain (U)' : 'Mark Uncertain (U)'}
          </button>
        </div>

        {/* Prompt */}
        <div className="text-base sm:text-lg font-medium text-text leading-relaxed">
          <Markdown content={currentQ.questionText} variant="inline" />
        </div>

        {/* Options Selection */}
        <div className="space-y-2.5 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = (answers[currentQ.id] || []).includes(opt.id);
            const isCorrectAnswer = currentQ.answer.includes(opt.id);

            let style =
              'bg-surface-elevated/70 border-surface-border text-text hover:border-accent/50 hover:bg-surface-elevated';

            if (showSolution) {
              if (isCorrectAnswer) {
                style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold';
              } else if (isSelected && !isCorrectAnswer) {
                style = 'bg-red-500/15 border-red-500/50 text-red-300 line-through';
              }
            } else if (isSelected) {
              style = 'bg-accent/15 border-accent text-accent font-semibold shadow-sm';
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer text-sm ${style}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-accent text-surface'
                      : 'bg-surface-border text-text-muted'
                  }`}
                >
                  {opt.id}
                </span>
                <span className="flex-1 leading-normal pt-0.5">
                  <Markdown content={opt.text} variant="inline" />
                </span>
                {showSolution && isCorrectAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Practice Mode Solution Reveal */}
        {showSolution && currentQ.explanation && (
          <div className="p-4 rounded-xl bg-surface/80 border border-surface-border/80 text-xs text-text-secondary leading-relaxed space-y-1 animate-fadeIn">
            <div className="font-semibold text-text flex items-center gap-1.5 text-xs text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              Working & Explanation:
            </div>
            <div className="whitespace-pre-line pt-1">{currentQ.explanation}</div>
          </div>
        )}
      </Card>

      {/* Runner Footer Controls */}
      <div className="flex items-center justify-between p-3 bg-surface-card rounded-xl border border-surface-border">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        <span className="text-xs text-text-muted font-mono hidden sm:inline">
          Tip: Press 1-4 or A-D to select option
        </span>

        {isLastQuestion ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            icon={<Check className="w-4 h-4" />}
          >
            Review & Submit
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
          >
            Next Question
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Question Palette Modal */}
      <Modal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        title="Question Navigator"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurr = idx === currentIndex;
              const hasAns = (answers[q.id] || []).length > 0;
              const isUnc = markedStatus[q.id] === 'uncertain';

              let color = 'bg-surface-elevated text-text-muted border-surface-border';
              if (isCurr) {
                color = 'bg-accent text-surface font-bold ring-2 ring-accent/40';
              } else if (hasAns) {
                color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
              } else if (isUnc) {
                color = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => jumpToQuestion(idx)}
                  className={`h-10 rounded-lg border text-xs flex items-center justify-center transition-all cursor-pointer ${color}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-surface-border flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Answered ({answeredCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Uncertain ({uncertainCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-elevated border border-surface-border" />
              Unvisited ({unansweredCount})
            </span>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Ready to Submit Test?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            You are about to complete <span className="text-text font-semibold">{config.title}</span>.
          </p>

          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-elevated border border-surface-border text-center text-xs">
            <div>
              <span className="text-text-muted block">Answered</span>
              <span className="text-lg font-bold text-emerald-400">{answeredCount}</span>
            </div>
            <div>
              <span className="text-text-muted block">Unanswered</span>
              <span className="text-lg font-bold text-red-400">{unansweredCount}</span>
            </div>
            <div>
              <span className="text-text-muted block">Uncertain</span>
              <span className="text-lg font-bold text-amber-400">{uncertainCount}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
              Keep Practicing
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitTest}>
              Confirm Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
