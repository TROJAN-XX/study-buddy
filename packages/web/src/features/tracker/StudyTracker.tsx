import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { apiClient } from '../../lib/api';
import { getToday, formatDate, formatDuration } from '../../lib/utils';
import { SUBJECTS, TOPICS, EXAMS } from '@study-buddy/shared';
import type { StudySession, Confidence, Exam } from '@study-buddy/shared';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  HelpCircle,
  XCircle,
  BarChart2,
  RotateCcw,
} from 'lucide-react';

export const StudyTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [examsList, setExamsList] = useState<Exam[]>(EXAMS);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form State
  const [subject, setSubject] = useState<string>(SUBJECTS[0].name);
  const [topic, setTopic] = useState<string>('');
  const [examId, setExamId] = useState<string>('');
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('45');
  const [questionsAttempted, setQuestionsAttempted] = useState<string>('0');
  const [correct, setCorrect] = useState<string>('0');
  const [incorrect, setIncorrect] = useState<string>('0');
  const [skipped, setSkipped] = useState<string>('0');
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [reflection, setReflection] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Available topics for selected subject
  const currentSubjectObj = SUBJECTS.find((s) => s.name === subject);
  const filteredTopics = currentSubjectObj
    ? TOPICS.filter((t) => t.subjectId === currentSubjectObj.id)
    : [];

  useEffect(() => {
    if (filteredTopics.length > 0 && (!topic || !filteredTopics.some((t) => t.name === topic))) {
      setTopic(filteredTopics[0].name);
    }
  }, [subject, filteredTopics, topic]);

  // Load sessions for selected date
  const loadSessions = useCallback(async () => {
    try {
      const data = await apiClient.sessions.list(selectedDate);
      setSessions(data);
      const ex = await apiClient.exams.list();
      if (ex && ex.length > 0) setExamsList(ex);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Date Navigation
  const changeDateBy = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setEditingSessionId(null);
  };

  // Reset form
  const resetForm = () => {
    setEditingSessionId(null);
    setHours('0');
    setMinutes('45');
    setQuestionsAttempted('0');
    setCorrect('0');
    setIncorrect('0');
    setSkipped('0');
    setConfidence('medium');
    setReflection('');
    setFormError(null);
  };

  // Edit session handler
  const handleStartEdit = (session: StudySession) => {
    setEditingSessionId(session.id);
    setSubject(session.subject);
    setTopic(session.topic);
    setExamId(session.examId || '');
    const h = Math.floor(session.durationMinutes / 60);
    const m = session.durationMinutes % 60;
    setHours(String(h));
    setMinutes(String(m));
    setQuestionsAttempted(String(session.questionsAttempted));
    setCorrect(String(session.correct));
    setIncorrect(String(session.incorrect));
    setSkipped(String(session.skipped));
    setConfidence(session.confidence);
    setReflection(session.reflection || '');
    setFormError(null);

    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  // Delete session handler
  const handleDeleteSession = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this study session?')) {
      await apiClient.sessions.delete(id);
      await loadSessions();
      if (editingSessionId === id) resetForm();
    }
  };

  // Submit session
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const totalMinutes = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
    if (totalMinutes <= 0) {
      setFormError('Please enter a duration greater than 0 minutes.');
      return;
    }

    const qAttempted = parseInt(questionsAttempted, 10) || 0;
    const qCorrect = parseInt(correct, 10) || 0;
    const qIncorrect = parseInt(incorrect, 10) || 0;
    const qSkipped = parseInt(skipped, 10) || 0;

    if (qAttempted < 0 || qCorrect < 0 || qIncorrect < 0 || qSkipped < 0) {
      setFormError('Question counts cannot be negative.');
      return;
    }

    if (qCorrect + qIncorrect > qAttempted) {
      setFormError('Correct + Incorrect questions cannot exceed total Attempted questions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: selectedDate,
        subject,
        topic: topic || 'General',
        examId: examId || null,
        durationMinutes: totalMinutes,
        questionsAttempted: qAttempted,
        correct: qCorrect,
        incorrect: qIncorrect,
        skipped: qSkipped,
        confidence,
        reflection: reflection.trim() || null,
      };

      if (editingSessionId) {
        await apiClient.sessions.update(editingSessionId, payload);
      } else {
        await apiClient.sessions.create(payload);
      }

      resetForm();
      await loadSessions();
    } catch (err) {
      console.error('Error saving session:', err);
      setFormError('Failed to save session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary Metrics for Selected Date
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correct, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Study Tracker
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Log your study hours, questions attempted, and daily reflections.
          </p>
        </div>

        {/* Date Selector Pill */}
        <div className="flex items-center gap-1 bg-surface-card border border-surface-border p-1 rounded-xl shadow-sm self-start sm:self-auto">
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
            {selectedDate === getToday() && (
              <Badge variant="accent" size="sm">
                Today
              </Badge>
            )}
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

      {/* Date Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted">Total Study Time</span>
          <p className="text-xl sm:text-2xl font-bold text-accent mt-1">
            {formatDuration(totalDuration)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted">Questions Attempted</span>
          <p className="text-xl sm:text-2xl font-bold text-text mt-1">
            {totalQuestions}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted">Accuracy</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            {accuracy !== null ? `${accuracy}%` : '—'}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-xs text-text-muted">Sessions Logged</span>
          <p className="text-xl sm:text-2xl font-bold text-text mt-1">
            {sessions.length}
          </p>
        </div>
      </div>

      {/* Form: Log / Edit Session */}
      <Card
        title={editingSessionId ? 'Edit Study Session' : 'Log Study Session'}
        subtitle={`Recording for ${formatDate(selectedDate, 'medium')}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-rose-400 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Subject & Topic & Exam */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>

            <Select
              label="Exam (Optional)"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">General Prep</option>
              {examsList.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Duration *
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <Input
                type="number"
                min="0"
                max="24"
                label="Hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                max="59"
                label="Minutes"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          {/* Questions Stats */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Practice Questions (Optional)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                type="number"
                min="0"
                label="Attempted"
                value={questionsAttempted}
                onChange={(e) => setQuestionsAttempted(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                label="Correct"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                label="Incorrect"
                value={incorrect}
                onChange={(e) => setIncorrect(e.target.value)}
              />
              <Input
                type="number"
                min="0"
                label="Skipped"
                value={skipped}
                onChange={(e) => setSkipped(e.target.value)}
              />
            </div>
          </div>

          {/* Confidence Level */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Confidence Level
            </label>
            <div className="flex items-center gap-2">
              {(['low', 'medium', 'high'] as Confidence[]).map((level) => {
                const isSelected = confidence === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                      isSelected
                        ? level === 'high'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                          : level === 'medium'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-400'
                          : 'bg-rose-950/60 border-rose-500 text-rose-400'
                        : 'bg-surface-elevated border-surface-border text-text-secondary hover:text-text'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Reflection / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What went well? Any sticky concepts or tricky questions to review?"
              className="w-full bg-surface-elevated text-text placeholder-text-muted border border-surface-border rounded-lg text-sm p-3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border/60">
            {editingSessionId && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Cancel Edit
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={editingSessionId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {editingSessionId ? 'Update Session' : 'Save Session'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Logged Sessions List for Selected Date */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">
          Sessions on {formatDate(selectedDate, 'medium')} ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-surface-card rounded-2xl border border-dashed border-surface-border text-text-secondary space-y-2">
            <Clock className="w-8 h-8 mx-auto text-text-muted" />
            <p className="text-sm font-medium text-text">No study sessions logged for this day.</p>
            <p className="text-xs text-text-muted">Use the form above to record your study progress.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sessions.map((sess) => {
              const sessAccuracy =
                sess.questionsAttempted > 0
                  ? Math.round((sess.correct / sess.questionsAttempted) * 100)
                  : null;

              return (
                <div
                  key={sess.id}
                  className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-surface-border/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="accent">{sess.subject}</Badge>
                      <span className="font-semibold text-sm text-text">
                        {sess.topic}
                      </span>
                      {sess.examId && (
                        <Badge variant="default" size="sm">
                          {sess.examId.toUpperCase()}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          sess.confidence === 'high'
                            ? 'success'
                            : sess.confidence === 'medium'
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      >
                        {sess.confidence} confidence
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap">
                      <span className="text-text font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {formatDuration(sess.durationMinutes)}
                      </span>

                      {sess.questionsAttempted > 0 && (
                        <span className="flex items-center gap-1">
                          <BarChart2 className="w-3.5 h-3.5 text-text-muted" />
                          {sess.correct}/{sess.questionsAttempted} correct ({sessAccuracy}%)
                        </span>
                      )}

                      {sess.incorrect > 0 && (
                        <span className="text-rose-400">
                          {sess.incorrect} incorrect
                        </span>
                      )}
                      {sess.skipped > 0 && (
                        <span className="text-text-muted">
                          {sess.skipped} skipped
                        </span>
                      )}
                    </div>

                    {sess.reflection && (
                      <p className="text-xs text-text-muted italic pt-0.5">
                        "{sess.reflection}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(sess)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSession(sess.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
