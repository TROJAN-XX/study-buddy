import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { apiClient } from '../../lib/api';
import type { Note } from '@study-buddy/shared';
import {
  Calendar,
  Search,
  Plus,
  BookOpen,
  Bookmark,
  Share2,
  ExternalLink,
  Sparkles,
  Flame,
  CheckCircle2,
  Trash2,
  Edit2,
  Tag,
  Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CurrentAffairsFeedProps {
  onOpenNewModal: () => void;
  onEditNote: (note: Note) => void;
}

const CATEGORIES = [
  'All',
  'National',
  'Tamil Nadu',
  'Banking & Economy',
  'Science & Tech',
  'Schemes & Policy',
  'Awards & Sports',
];

export const CurrentAffairsFeed: React.FC<CurrentAffairsFeedProps> = ({
  onOpenNewModal,
  onEditNote,
}) => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await apiClient.notes.list({ type: 'current_affairs' });
      setNotes(all);
    } catch (err) {
      console.error('Failed to load current affairs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBookmark = async (note: Note) => {
    const updated = await apiClient.notes.update(note.id, {
      isBookmarked: !note.isBookmarked,
    });
    if (updated) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isBookmarked: !n.isBookmarked } : n))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this current affairs entry?')) {
      await apiClient.notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // Filtered entries
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategory !== 'All') {
        const catLower = selectedCategory.toLowerCase();
        const hasTag = n.tags.some((t) => t.toLowerCase().includes(catLower));
        const hasTitle = n.title.toLowerCase().includes(catLower);
        if (!hasTag && !hasTitle) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const contentMatch = n.content.toLowerCase().includes(q);
        const tagMatch = n.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !tagMatch) return false;
      }
      return true;
    });
  }, [notes, selectedCategory, searchQuery]);

  // Group notes by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    filteredNotes.forEach((n) => {
      let monthKey = 'General Compilations';
      if (n.eventDate) {
        const [y, m] = n.eventDate.split('-');
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        monthKey = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(n);
    });
    return groups;
  }, [filteredNotes]);

  return (
    <div className="space-y-6">
      {/* Hero & Quick Quiz Generator */}
      <Card variant="elevated" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent" />
              Chronological Current Affairs Digest
            </h2>
            <p className="text-xs text-text-secondary">
              Track date-indexed national, state, and economic news items with verified provenance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={<Flame className="w-4 h-4 text-amber-400 fill-current" />}
              onClick={() =>
                navigate('/practice', { state: { presetSubject: 'Current Affairs' } })
              }
            >
              Practice CA Recall Quiz
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={onOpenNewModal}
            >
              Add News Entry
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-4 border-t border-surface-border mt-4 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                selectedCategory === cat
                  ? 'bg-accent/20 border-accent text-accent font-semibold'
                  : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search news events, government schemes, summits, appointments..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-surface-card border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Feed content */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-accent" />}
          title={notes.length === 0 ? 'No Current Affairs Logged Yet' : 'No Results Found'}
          description={
            notes.length === 0
              ? 'Add daily or monthly current affairs summaries to build your high-yield revision feed for SSC, TNPSC, and Banking exams.'
              : 'Try clearing your search query or selecting a different category filter.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={onOpenNewModal}
            >
              Log First Current Affair
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByMonth).map(([monthLabel, entries]) => (
            <div key={monthLabel} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text tracking-tight uppercase text-accent">
                  {monthLabel}
                </span>
                <span className="text-xs text-text-muted">({entries.length} items)</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 space-y-3 hover:border-surface-border/80 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {item.eventDate && (
                            <Badge variant="accent" size="sm">
                              <Calendar className="w-3 h-3 mr-1 inline" />
                              {item.eventDate}
                            </Badge>
                          )}
                          {item.sourceName && (
                            <span className="text-text-muted text-[11px] font-medium">
                              Source: {item.sourceName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(item)}
                            title={item.isBookmarked ? 'Remove Bookmark' : 'Bookmark Note'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              item.isBookmarked
                                ? 'text-accent bg-accent/15'
                                : 'text-text-muted hover:text-text hover:bg-surface-elevated'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditNote(item)}
                            title="Edit Entry"
                            className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Entry"
                            className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-red-400 hover:bg-surface-elevated transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-sm text-text leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line line-clamp-4">
                        {item.content}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-surface-elevated text-[11px] text-text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-accent hover:underline flex items-center gap-1 shrink-0"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
