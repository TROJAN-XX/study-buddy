import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { EXAMS, SUBJECTS, TOPICS } from '@study-buddy/shared';
import type { Question, TestType, Difficulty } from '@study-buddy/shared';
import { Play, Sparkles, Clock, BookOpen, Layers } from 'lucide-react';
import { shuffle } from '../../lib/utils';

export interface QuizConfig {
  title: string;
  exam?: string;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty;
  questionCount: number;
  mode: 'practice' | 'exam'; // Practice = immediate explanation; Exam = timed submission
  timeLimitMinutes?: number;
}

interface QuizConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onStartQuiz: (config: QuizConfig, selectedQuestions: Question[]) => void;
  initialSubject?: string;
  initialTopic?: string;
}

export const QuizConfigModal: React.FC<QuizConfigModalProps> = ({
  isOpen,
  onClose,
  questions,
  onStartQuiz,
  initialSubject,
  initialTopic,
}) => {
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || '');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [timeLimit, setTimeLimit] = useState<number>(15);

  // The modal stays mounted between openings, so presets must be re-applied
  // each time it opens (e.g. from the dashboard's weak-topic shortcuts).
  useEffect(() => {
    if (!isOpen) return;
    setSelectedSubject(initialSubject || '');
    setSelectedTopic(initialTopic || '');
  }, [isOpen, initialSubject, initialTopic]);

  const availableTopics = useMemo(() => {
    if (!selectedSubject) return TOPICS;
    const foundSubject = SUBJECTS.find((s) => s.name === selectedSubject);
    return foundSubject ? TOPICS.filter((t) => t.subjectId === foundSubject.id) : TOPICS;
  }, [selectedSubject]);

  // Filter matching questions
  const matchingQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedExam && q.exam !== selectedExam) return false;
      if (selectedSubject && q.subject !== selectedSubject) return false;
      if (selectedTopic && q.topic !== selectedTopic) return false;
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [questions, selectedExam, selectedSubject, selectedTopic, selectedDifficulty]);

  const handleStart = () => {
    if (matchingQuestions.length === 0) return;

    // Shuffle (Fisher-Yates) and pick requested count
    const shuffled = shuffle(matchingQuestions);
    const selected = shuffled.slice(0, questionCount);

    const title = selectedTopic
      ? `${selectedTopic} Drill`
      : selectedSubject
      ? `${selectedSubject} Quiz`
      : selectedExam
      ? `${selectedExam} Mock Practice`
      : 'Mixed Practice Test';

    onStartQuiz(
      {
        title,
        exam: selectedExam || undefined,
        subject: selectedSubject || undefined,
        topic: selectedTopic || undefined,
        difficulty: (selectedDifficulty as Difficulty) || undefined,
        questionCount: selected.length,
        mode,
        timeLimitMinutes: mode === 'exam' ? timeLimit : undefined,
      },
      selected
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <span>Configure Practice Test</span>
        </div>
      }
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Mode Selector: Practice vs Timed Exam */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-surface-elevated/70 rounded-xl border border-surface-border">
          <button
            type="button"
            onClick={() => setMode('practice')}
            className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
              mode === 'practice'
                ? 'bg-accent/15 border border-accent/40 text-text shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-elevated'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-accent mb-0.5">
              <Sparkles className="w-4 h-4" />
              Practice Mode
            </div>
            <div className="text-[11px] text-text-muted leading-tight">
              Instant answer reveal & step-by-step working after each choice.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('exam')}
            className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
              mode === 'exam'
                ? 'bg-accent/15 border border-accent/40 text-text shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-elevated'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-accent mb-0.5">
              <Clock className="w-4 h-4" />
              Timed Mock Mode
            </div>
            <div className="text-[11px] text-text-muted leading-tight">
              Simulate exam pressure with countdown timer & post-test score.
            </div>
          </button>
        </div>

        {/* Filter Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">
              Target Examination
            </label>
            <Select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              options={[
                { value: '', label: 'All Exams (Mixed)' },
                ...EXAMS.map((ex) => ({ value: ex.name, label: ex.name })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">
              Difficulty
            </label>
            <Select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              options={[
                { value: '', label: 'All Difficulties' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">
              Subject
            </label>
            <Select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('');
              }}
              options={[
                { value: '', label: 'All Subjects' },
                ...SUBJECTS.map((s) => ({ value: s.name, label: s.name })),
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">
              Topic
            </label>
            <Select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              options={[
                { value: '', label: 'All Topics' },
                ...availableTopics.map((t) => ({ value: t.name, label: t.name })),
              ]}
            />
          </div>
        </div>

        {/* Question Count & Time Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
              Question Count
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[5, 10, 15, 20, 25].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    questionCount === count
                      ? 'bg-accent text-surface font-bold'
                      : 'bg-surface-elevated text-text-secondary hover:text-text border border-surface-border'
                  }`}
                >
                  {count} Qs
                </button>
              ))}
            </div>
          </div>

          {mode === 'exam' && (
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                Time Limit (Minutes)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimeLimit(mins)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timeLimit === mins
                        ? 'bg-emerald-500 text-surface font-bold'
                        : 'bg-surface-elevated text-text-secondary hover:text-text border border-surface-border'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pool Counter Banner */}
        <div className="p-3 bg-surface/50 rounded-xl border border-surface-border flex items-center justify-between text-xs">
          <span className="text-text-secondary">Matching Questions in Bank:</span>
          <Badge variant={matchingQuestions.length > 0 ? 'accent' : 'error'}>
            {matchingQuestions.length} Questions Available
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStart}
            disabled={matchingQuestions.length === 0}
            icon={<Play className="w-4 h-4" />}
          >
            Start Practice Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};
