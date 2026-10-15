import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { MistakeClassificationModal } from './MistakeClassificationModal';
import { apiClient, type MistakeDetail } from '../../lib/api';
import type { ErrorType, RevisionStatus, Mistake } from '@study-buddy/shared';
import {
  Brain,
  Calculator,
  Eye,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Calendar,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export const MistakeBook: React.FC = () => {
  const [mistakes, setMistakes] = useState<MistakeDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedErrorType, setSelectedErrorType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingMistake, setEditingMistake] = useState<MistakeDetail | null>(null);
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());

  const loadMistakes = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.mistakes.list();
      setMistakes(data);
    } catch (err) {
      console.error('Failed to load mistakes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMistakes();
  }, []);

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSavedMistake = (updated: Mistake) => {
    setMistakes((prev) =>
      prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
    );
  };

  const handleDeleteMistake = async (id: string) => {
    if (window.confirm('Remove this question from your Mistake Book?')) {
      await apiClient.mistakes.delete(id);
      setMistakes((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleToggleMastered = async (m: MistakeDetail) => {
    const newStatus: RevisionStatus = m.revisionStatus === 'mastered' ? 'pending' : 'mastered';
    const updated = await apiClient.mistakes.update(m.id, { revisionStatus: newStatus });
    if (updated) {
      setMistakes((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, revisionStatus: newStatus } : item))
      );
    }
  };

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (selectedErrorType !== 'all' && m.errorType !== selectedErrorType) return false;
      if (selectedStatus !== 'all' && m.revisionStatus !== selectedStatus) return false;
      if (selectedSubject !== 'all' && m.question?.subject !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = m.question?.questionText.toLowerCase().includes(q);
        const topicMatch = m.question?.topic.toLowerCase().includes(q);
        const noteMatch = m.notes?.toLowerCase().includes(q);
        if (!textMatch && !topicMatch && !noteMatch) return false;
      }
      return true;
    });
  }, [mistakes, selectedErrorType, selectedStatus, selectedSubject, searchQuery]);

  // Aggregate metrics
  const totalCount = mistakes.length;
  const masteredCount = mistakes.filter((m) => m.revisionStatus === 'mastered').length;
  const pendingCount = mistakes.filter((m) => m.revisionStatus === 'pending').length;

  const errorTypeCounts: Record<ErrorType, number> = {
    concept_gap: 0,
    calculation_error: 0,
    misread_question: 0,
    guessed_answer: 0,
    time_pressure: 0,
    other: 0,
  };

  mistakes.forEach((m) => {
    if (m.errorType in errorTypeCounts) {
      errorTypeCounts[m.errorType]++;
    }
  });

  const uniqueSubjects = Array.from(
    new Set(mistakes.map((m) => m.question?.subject).filter(Boolean))
  ) as string[];

  const getErrorTypeBadge = (type: ErrorType) => {
    switch (type) {
      case 'concept_gap':
        return (
          <Badge variant="error" size="sm">
            <Brain className="w-3 h-3 mr-1 inline" /> Concept Gap
          </Badge>
        );
      case 'calculation_error':
        return (
          <Badge variant="warning" size="sm">
            <Calculator className="w-3 h-3 mr-1 inline" /> Calculation Slip
          </Badge>
        );
      case 'misread_question':
        return (
          <Badge variant="accent" size="sm">
            <Eye className="w-3 h-3 mr-1 inline" /> Misread Question
          </Badge>
        );
      case 'guessed_answer':
        return (
          <Badge variant="default" size="sm">
            <HelpCircle className="w-3 h-3 mr-1 inline" /> Guessed / Uncertain
          </Badge>
        );
      case 'time_pressure':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" /> Time Pressure
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Other
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Diagnostics Breakdown Card */}
      <Card variant="elevated" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Mistake Book Diagnostics
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Review recurring error patterns to turn recurring blindspots into permanent mastery.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-surface/50 border border-surface-border">
              <span className="text-text-muted block text-[11px]">Total Logged</span>
              <span className="font-bold text-text text-base">{totalCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-surface/50 border border-surface-border">
              <span className="text-text-muted block text-[11px]">Due for Review</span>
              <span className="font-bold text-amber-400 text-base">{pendingCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-surface/50 border border-surface-border">
              <span className="text-text-muted block text-[11px]">Mastered</span>
              <span className="font-bold text-emerald-400 text-base">{masteredCount}</span>
            </div>
          </div>
        </div>

        {/* Error Cause Distribution Pills */}
        <div className="pt-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted block">
            Root Cause Distribution
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Brain className="w-3.5 h-3.5 text-red-400" />
                <span>Concept</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.concept_gap}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>Calculation</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.calculation_error}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Misread</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.misread_question}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Guessed</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.guessed_answer}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Time Panic</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.time_pressure}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-text-muted" />
                <span>Other</span>
              </div>
              <span className="font-bold text-text">{errorTypeCounts.other}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mistakes by question prompt, notes, or topic..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Subject Dropdown */}
          {uniqueSubjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              aria-label="Filter by subject"
              className="px-3 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="all">All Subjects ({uniqueSubjects.length})</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by revision status"
            className="px-3 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Due for Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>

        {/* Error Type Quick Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-text-muted text-[11px] mr-1">Error Root Cause:</span>
          {(
            [
              { id: 'all', label: 'All Causes' },
              { id: 'concept_gap', label: 'Concept Gap' },
              { id: 'calculation_error', label: 'Calculation' },
              { id: 'misread_question', label: 'Misread' },
              { id: 'guessed_answer', label: 'Guessed' },
              { id: 'time_pressure', label: 'Time Pressure' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedErrorType(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                selectedErrorType === c.id
                  ? 'bg-accent/20 text-accent border border-accent/40 font-semibold'
                  : 'bg-surface-elevated text-text-muted hover:text-text border border-surface-border'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          title={totalCount === 0 ? 'Mistake Book is Clean' : 'No Mistakes Match Your Filter'}
          description={
            totalCount === 0
              ? 'Whenever you miss questions or mark them as uncertain during practice tests, they will be cataloged here for deep error diagnosis.'
              : 'Try clearing your search query or selecting a different error type filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((m) => {
            const q = m.question;
            const isExpanded = expandedSolutions.has(m.id);
            const isMastered = m.revisionStatus === 'mastered';

            return (
              <Card
                key={m.id}
                className={`p-5 space-y-4 transition-all border ${
                  isMastered
                    ? 'border-emerald-500/20 bg-emerald-950/5'
                    : 'border-surface-border hover:border-surface-border/80'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {getErrorTypeBadge(m.errorType)}

                    {isMastered ? (
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Mastered
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Review Due: {m.nextReviewDate || 'Scheduled'}
                      </Badge>
                    )}

                    {q && (
                      <span className="text-text-muted text-[11px]">
                        {q.exam} • {q.subject} → {q.topic}
                      </span>
                    )}

                    <span className="text-text-muted text-[11px]">
                      Reviewed {m.reviewCount} time{m.reviewCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Top Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleMastered(m)}
                      title={isMastered ? 'Mark as Pending Review' : 'Mark as Mastered'}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                        isMastered
                          ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                          : 'border-surface-border text-text-muted hover:text-text hover:bg-surface-elevated'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isMastered ? 'Mastered' : 'Mark Mastered'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingMistake(m)}
                      title="Edit Error Classification & Notes"
                      className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMistake(m.id)}
                      title="Delete from Mistake Book"
                      className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-red-400 hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                {q ? (
                  <div className="text-sm font-medium text-text whitespace-pre-line leading-relaxed">
                    {q.questionText}
                  </div>
                ) : (
                  <div className="text-sm text-text-muted italic">Question record ID: {m.questionId}</div>
                )}

                {/* Options display with correct highlighted */}
                {q && q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    {q.options.map((opt) => {
                      const isCorrect = q.answer.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                            isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                              : 'bg-surface-elevated/60 border-surface-border text-text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center bg-surface/60">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-400">
                              Correct Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Personal Reflection Note */}
                {m.notes ? (
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-text-secondary leading-relaxed">
                    <span className="font-semibold text-accent block mb-0.5">
                      Learner's Reflection:
                    </span>
                    <p className="italic text-text">"{m.notes}"</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingMistake(m)}
                    className="text-xs text-text-muted hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>+ Add takeaway reflection note...</span>
                  </button>
                )}

                {/* Solution Accordion */}
                {q?.explanation && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSolution(m.id)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide Detailed Solution
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Detailed Solution & Reasoning
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3.5 rounded-xl bg-surface/60 border border-surface-border text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                        <div className="font-semibold text-text mb-1">Step-by-Step Working:</div>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingMistake && (
        <MistakeClassificationModal
          isOpen={true}
          onClose={() => setEditingMistake(null)}
          mistake={editingMistake}
          question={editingMistake.question}
          onSaved={handleSavedMistake}
        />
      )}
    </div>
  );
};
