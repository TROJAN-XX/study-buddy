import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { PackImporterModal } from './PackImporterModal';
import { apiClient } from '../../lib/api';
import { EXAMS, SUBJECTS, TOPICS } from '@study-buddy/shared';
import type { Question } from '@study-buddy/shared';
import {
  FolderOpen,
  Search,
  Upload,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Trash2,
  BookOpen,
  Filter,
  X,
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // Filter topics based on selected subject
  const availableTopics = useMemo(() => {
    if (!selectedSubject) return TOPICS;
    const foundSubject = SUBJECTS.find((s) => s.name === selectedSubject);
    return foundSubject ? TOPICS.filter((t) => t.subjectId === foundSubject.id) : TOPICS;
  }, [selectedSubject]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allQuestions, bookmarks] = await Promise.all([
        apiClient.questions.list(),
        apiClient.bookmarks.list(),
      ]);
      setQuestions(allQuestions);
      setBookmarkedIds(new Set(bookmarks.map((b) => b.targetId)));
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle bookmark toggle
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

  // Handle question deletion
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await apiClient.questions.delete(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedExam && q.exam !== selectedExam) return false;
      if (selectedSubject && q.subject !== selectedSubject) return false;
      if (selectedTopic && q.topic !== selectedTopic) return false;
      if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesTags = q.tags?.some((t) => t.toLowerCase().includes(query));
        const matchesOptions = q.options?.some((o) => o.text.toLowerCase().includes(query));
        const matchesExplanation = q.explanation?.toLowerCase().includes(query);
        if (!matchesText && !matchesTags && !matchesOptions && !matchesExplanation) {
          return false;
        }
      }
      return true;
    });
  }, [questions, selectedExam, selectedSubject, selectedTopic, selectedDifficulty, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedExam('');
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedDifficulty('');
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedExam || selectedSubject || selectedTopic || selectedDifficulty
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Question Library
            </h1>
            <Badge variant="accent">
              {filteredQuestions.length} Questions
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Search, practice, and manage your authored question packs across competitive exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setIsImporterOpen(true)}
          >
            Import JSON Pack
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card variant="outlined" className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, topics, tags..."
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-text-muted hover:text-text cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Exam Filter */}
          <div className="sm:col-span-2">
            <Select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              options={[
                { value: '', label: 'All Exams' },
                ...EXAMS.map((ex) => ({ value: ex.name, label: ex.name })),
              ]}
            />
          </div>

          {/* Subject Filter */}
          <div className="sm:col-span-2">
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

          {/* Topic Filter */}
          <div className="sm:col-span-2">
            <Select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              options={[
                { value: '', label: 'All Topics' },
                ...availableTopics.map((t) => ({ value: t.name, label: t.name })),
              ]}
            />
          </div>

          {/* Difficulty Filter */}
          <div className="sm:col-span-2">
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
        </div>

        {/* Clear Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-border/40">
            <span className="text-text-muted">
              Showing {filteredQuestions.length} of {questions.length} questions
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </Card>

      {/* Question List */}
      {filteredQuestions.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8 text-accent" />}
          title={hasActiveFilters ? 'No questions match your filters' : 'Your question bank is empty'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search criteria or resetting filters above.'
              : 'Import questions from cleaned PDF materials using our JSON question-pack validator.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => setIsImporterOpen(true)}
              >
                Import First Question Pack
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isBookmarked = bookmarkedIds.has(q.id);
            const isExpanded = expandedExplanations.has(q.id);

            return (
              <Card key={q.id} className="p-4 sm:p-5 space-y-3.5 transition-all hover:border-surface-border">
                {/* Header Metadata Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="accent" size="sm">
                      {q.exam}
                    </Badge>
                    {q.year && (
                      <span className="text-text-muted text-[11px] font-mono">
                        {q.year} {q.paper ? `• ${q.paper}` : ''} {q.shift ? `• ${q.shift}` : ''}
                      </span>
                    )}
                    <span className="text-text-secondary font-medium">
                      {q.subject} → {q.topic}
                    </span>
                    <Badge
                      variant={
                        q.difficulty === 'easy'
                          ? 'success'
                          : q.difficulty === 'hard'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {q.difficulty}
                    </Badge>
                    {q.verificationStatus === 'verified' && (
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(q.id)}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'text-accent bg-accent/15'
                          : 'text-text-muted hover:text-text hover:bg-surface-elevated'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete Question"
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="text-sm font-medium text-text leading-relaxed whitespace-pre-line">
                  <span className="text-text-muted mr-1.5 font-mono text-xs">Q{idx + 1}.</span>
                  {q.questionText}
                </div>

                {/* Multiple Choice Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isCorrect = q.answer.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-surface-elevated/70 border-surface-border/70 text-text-secondary'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500 text-black'
                              : 'bg-surface-border text-text-muted'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="min-w-0 flex-1 leading-normal pt-0.5">
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Toggle */}
                {q.explanation && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide Solution & Reasoning
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Solution & Working
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-surface/50 border border-surface-border/70 text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                        <div className="font-semibold text-text mb-1">Step-by-step Solution:</div>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Source & Tags Footer */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-surface-border/40 text-[11px] text-text-muted flex-wrap">
                  {q.source && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-text-muted">Source:</span>
                      <span className="text-text-secondary truncate">
                        {q.source.name} {q.source.reference ? `(${q.source.reference})` : ''}
                      </span>
                    </div>
                  )}

                  {q.tags && q.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3 h-3 text-text-muted" />
                      {q.tags.map((t, ti) => (
                        <span
                          key={ti}
                          className="px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted text-[10px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Question Pack Importer Modal */}
      <PackImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportComplete={() => {
          loadData();
        }}
      />
    </div>
  );
};
