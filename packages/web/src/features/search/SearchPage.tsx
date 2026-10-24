import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, FileText, AlertTriangle, Clock, X, Loader2 } from 'lucide-react';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import { cn } from '../../lib/utils';
import type { Question, Note, Mistake, StudySession } from '@study-buddy/shared';

type ResultKind = 'question' | 'note' | 'mistake' | 'session';
type FilterKind = 'all' | ResultKind;

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  snippet: string;
  meta: string;
  href: string;
}

const FILTERS: Array<{ key: FilterKind; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'question', label: 'Questions' },
  { key: 'note', label: 'Notes' },
  { key: 'mistake', label: 'Mistakes' },
  { key: 'session', label: 'Sessions' },
];

const KIND_META: Record<ResultKind, { label: string; icon: React.ElementType; className: string }> = {
  question: { label: 'Question', icon: BookOpen, className: 'text-accent bg-accent/10 border-accent/30' },
  note: { label: 'Note', icon: FileText, className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  mistake: { label: 'Mistake', icon: AlertTriangle, className: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  session: { label: 'Session', icon: Clock, className: 'text-sky-400 bg-sky-400/10 border-sky-400/30' },
};

function makeSnippet(text: string, query: string, radius = 70): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function matches(haystack: string | null | undefined, query: string): boolean {
  return Boolean(haystack && haystack.toLowerCase().includes(query));
}

/**
 * Global, fully offline search across every locally stored collection.
 * Reads straight from IndexedDB so it works with or without the Worker API.
 */
export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const [qs, ns, ms, ss] = await Promise.all([
        storage.getAll<Question>(STORAGE_KEYS.QUESTIONS),
        storage.getAll<Note>(STORAGE_KEYS.NOTES),
        storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES),
        storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS),
      ]);
      if (cancelled) return;
      setQuestions(qs);
      setNotes(ns);
      setMistakes(ms);
      setSessions(ss);
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allResults = useMemo<SearchResult[]>(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const q = trimmed.toLowerCase();

    const questionById = new Map(questions.map((question) => [question.id, question]));
    const out: SearchResult[] = [];

    for (const question of questions) {
      const haystack = [
        question.questionText,
        question.subject,
        question.topic,
        question.exam,
        question.explanation ?? '',
        question.tags.join(' '),
      ].join(' ');

      if (matches(haystack, q)) {
        out.push({
          id: question.id,
          kind: 'question',
          title: question.questionText,
          snippet: makeSnippet(question.questionText, trimmed),
          meta: `${question.exam} · ${question.subject} · ${question.topic} · ${question.difficulty}`,
          href: `/library?q=${encodeURIComponent(trimmed)}`,
        });
      }
    }

    for (const note of notes) {
      const haystack = [
        note.title,
        note.content,
        note.subject ?? '',
        note.topic ?? '',
        note.tags.join(' '),
      ].join(' ');

      if (matches(haystack, q)) {
        out.push({
          id: note.id,
          kind: 'note',
          title: note.title,
          snippet: makeSnippet(note.content, trimmed),
          meta: [note.subject, note.topic, note.type.replace('_', ' ')].filter(Boolean).join(' · '),
          href: '/notes',
        });
      }
    }

    for (const mistake of mistakes) {
      const question = questionById.get(mistake.questionId);
      const haystack = [
        mistake.errorType,
        mistake.notes ?? '',
        question?.questionText ?? '',
        question?.subject ?? '',
        question?.topic ?? '',
      ].join(' ');

      if (matches(haystack, q)) {
        const text = question?.questionText ?? mistake.notes ?? 'Mistake';
        out.push({
          id: mistake.id,
          kind: 'mistake',
          title: text,
          snippet: makeSnippet(text, trimmed),
          meta: [
            mistake.errorType.replace('_', ' '),
            question?.subject,
            question?.topic,
            mistake.revisionStatus,
          ]
            .filter(Boolean)
            .join(' · '),
          href: '/revision',
        });
      }
    }

    for (const session of sessions) {
      const haystack = [session.subject, session.topic, session.reflection ?? '', session.date].join(' ');
      if (matches(haystack, q)) {
        out.push({
          id: session.id,
          kind: 'session',
          title: `${session.subject} — ${session.topic}`,
          snippet: session.reflection?.trim() || `${session.durationMinutes} min · ${session.questionsAttempted} questions`,
          meta: `${session.date} · ${session.confidence} confidence`,
          href: '/tracker',
        });
      }
    }

    return out;
  }, [query, questions, notes, mistakes, sessions]);

  // Counts always reflect every kind, so the filter pills stay informative.
  const counts = useMemo(() => {
    const base = { question: 0, note: 0, mistake: 0, session: 0 };
    for (const result of allResults) base[result.kind] += 1;
    return base;
  }, [allResults]);

  const results = useMemo(
    () =>
      (filter === 'all' ? allResults : allResults.filter((result) => result.kind === filter)).slice(
        0,
        100
      ),
    [allResults, filter]
  );

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-text">Search</h1>
        <p className="text-sm text-text-secondary">
          Search questions, notes, mistakes and study sessions — works offline.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search everything… (min. 2 characters)"
          className="w-full pl-12 pr-11 py-3.5 rounded-xl bg-surface-card border border-surface-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === item.key
                ? 'bg-accent/15 text-accent border-accent/40'
                : 'bg-surface-card text-text-secondary border-surface-border hover:text-text hover:bg-surface-elevated'
            )}
          >
            {item.label}
            {item.key !== 'all' && hasQuery && (
              <span className="ml-1.5 text-[10px] text-text-muted">{counts[item.key]}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {!isLoading && !hasQuery && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center space-y-2">
          <Search className="w-8 h-8 text-text-muted mx-auto" />
          <p className="text-sm font-medium text-text">Start typing to search</p>
          <p className="text-xs text-text-muted">
            Try a topic like “percentage”, a tag, or a note title.
          </p>
        </div>
      )}

      {!isLoading && hasQuery && results.length === 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-8 text-center space-y-2">
          <p className="text-sm font-medium text-text">No matches for “{query.trim()}”</p>
          <p className="text-xs text-text-muted">Try a shorter keyword or a different filter.</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted px-1">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          {results.map((result) => {
            const meta = KIND_META[result.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={`${result.kind}-${result.id}`}
                to={result.href}
                className="block rounded-xl border border-surface-border bg-surface-card p-4 hover:border-accent/40 hover:bg-surface-elevated/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide',
                      meta.className
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-text line-clamp-2">{result.title}</p>
                    <p className="text-xs text-text-secondary line-clamp-2">{result.snippet}</p>
                    <p className="text-[11px] text-text-muted">{result.meta}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
