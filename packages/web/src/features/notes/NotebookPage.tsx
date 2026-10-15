import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoteModal } from './NoteModal';
import { CurrentAffairsFeed } from './CurrentAffairsFeed';
import { apiClient } from '../../lib/api';
import { TAXONOMY } from '@study-buddy/shared';
import type { Note, NoteType, TaxonomySubject } from '@study-buddy/shared';
import {
  BookOpen,
  Calculator,
  Zap,
  Bookmark,
  Search,
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  Calendar,
  FileText,
  Sparkles,
  ExternalLink,
  BookMarked,
  Filter,
} from 'lucide-react';

export const NotebookPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<'notebook' | 'current_affairs' | 'bookmarks'>('notebook');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [initialModalType, setInitialModalType] = useState<NoteType>('formula');

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const all = await apiClient.notes.list();
      setNotes(all);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCopyContent = (note: Note) => {
    navigator.clipboard.writeText(note.content || note.title);
    setCopiedId(note.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

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
    if (window.confirm('Delete this note permanently?')) {
      await apiClient.notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleOpenNew = (defaultType: NoteType = 'formula') => {
    setEditingNote(null);
    setInitialModalType(defaultType);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setInitialModalType(note.type);
    setIsModalOpen(true);
  };

  const handleSavedNote = (saved: Note) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  // Filtered notes for notebook tab
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (activeTab === 'bookmarks' && !n.isBookmarked) return false;
      if (activeTab === 'notebook' && n.type === 'current_affairs') return false;

      if (selectedType !== 'all' && n.type !== selectedType) return false;
      if (selectedSubject !== 'all' && n.subject !== selectedSubject) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const contentMatch = n.content.toLowerCase().includes(q);
        const topicMatch = n.topic?.toLowerCase().includes(q);
        const tagMatch = n.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !topicMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [notes, activeTab, selectedType, selectedSubject, searchQuery]);

  const getTypeBadge = (type: NoteType) => {
    switch (type) {
      case 'formula':
        return (
          <Badge variant="accent" size="sm">
            <Calculator className="w-3 h-3 mr-1 inline" /> Formula
          </Badge>
        );
      case 'shortcut':
        return (
          <Badge variant="warning" size="sm">
            <Zap className="w-3 h-3 mr-1 inline" /> Shortcut
          </Badge>
        );
      case 'vocabulary':
        return (
          <Badge variant="default" size="sm">
            <BookMarked className="w-3 h-3 mr-1 inline" /> Vocab
          </Badge>
        );
      case 'fact':
        return (
          <Badge variant="default" size="sm">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Static Fact
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            <FileText className="w-3 h-3 mr-1 inline" /> Concept
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Study Notebook & Formulas
            </h1>
            <Badge variant="accent">Markdown & Shortcuts</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-0.5">
            Your personal digital repository for formulas, math tricks, vocabulary, and high-yield notes.
          </p>
        </div>

        {/* Primary action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenNew('formula')}
          >
            Add Formula / Note
          </Button>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('notebook')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'notebook'
              ? 'bg-accent/20 border border-accent text-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Formulas & Concepts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('current_affairs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'current_affairs'
              ? 'bg-accent/20 border border-accent text-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Current Affairs Digest</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookmarks')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
            activeTab === 'bookmarks'
              ? 'bg-accent/20 border border-accent text-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Bookmark className="w-4 h-4 fill-current" />
          <span>Starred Formulas</span>
        </button>
      </div>

      {/* Render Current Affairs Tab */}
      {activeTab === 'current_affairs' ? (
        <CurrentAffairsFeed
          onOpenNewModal={() => handleOpenNew('current_affairs')}
          onEditNote={handleOpenEdit}
        />
      ) : (
        /* Render Formulas & Concepts Notebook */
        <div className="space-y-5">
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search formula names, theorems, shortcuts, or tags..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* Subject Filter Dropdown */}
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                aria-label="Filter notes by subject"
                className="px-3 py-2 text-xs rounded-xl bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {TAXONOMY.map((s: TaxonomySubject) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Note Type Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All Items' },
                  { id: 'formula', label: 'Formulas' },
                  { id: 'shortcut', label: 'Shortcut Tricks' },
                  { id: 'concept', label: 'Core Concepts' },
                  { id: 'vocabulary', label: 'Vocabulary' },
                  { id: 'fact', label: 'Static Facts' },
                ] as const
              ).map((typeItem) => (
                <button
                  key={typeItem.id}
                  type="button"
                  onClick={() => setSelectedType(typeItem.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    selectedType === typeItem.id
                      ? 'bg-accent/20 text-accent border border-accent/40 font-semibold'
                      : 'bg-surface-elevated text-text-muted hover:text-text border border-surface-border'
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notebook Grid */}
          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8 text-accent" />}
              title={notes.length === 0 ? 'Your Notebook is Empty' : 'No Matching Notes'}
              description={
                notes.length === 0
                  ? 'Add your most critical math formulas, shortcuts, and memory mnemonics for instant one-click copying and review.'
                  : 'Try searching with different terms or selecting another category filter.'
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenNew('formula')}
                >
                  Create First Formula
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map((note) => {
                const isCopied = copiedId === note.id;

                return (
                  <Card
                    key={note.id}
                    className="p-5 space-y-3.5 hover:border-surface-border/80 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {getTypeBadge(note.type)}
                          {note.subject && (
                            <span className="text-text-muted text-[11px] font-medium">
                              {note.subject}
                              {note.topic && ` → ${note.topic}`}
                            </span>
                          )}
                        </div>

                        {/* Top action icons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyContent(note)}
                            title="Copy Formula / Note to Clipboard"
                            className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-accent hover:bg-surface-elevated transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(note)}
                            title={note.isBookmarked ? 'Remove Star' : 'Star Note'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              note.isBookmarked
                                ? 'text-accent bg-accent/15'
                                : 'text-text-muted hover:text-text hover:bg-surface-elevated'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(note)}
                            title="Edit Note"
                            className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(note.id)}
                            title="Delete Note"
                            className="p-1.5 rounded-lg border border-surface-border text-text-muted hover:text-red-400 hover:bg-surface-elevated transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-base text-text leading-snug">
                        {note.title}
                      </h3>

                      {/* Content Box with Formula styling */}
                      <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-surface-border/60 text-xs text-text-secondary leading-relaxed font-mono whitespace-pre-line">
                        {note.content}
                      </div>
                    </div>

                    {/* Tags at bottom */}
                    {note.tags.length > 0 && (
                      <div className="pt-2 border-t border-surface-border/50 flex items-center gap-1.5 flex-wrap text-xs">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md bg-surface-elevated text-[11px] text-text-muted font-sans"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Note modal */}
      {isModalOpen && (
        <NoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          note={editingNote}
          initialType={initialModalType}
          onSaved={handleSavedNote}
        />
      )}
    </div>
  );
};

export default NotebookPage;
