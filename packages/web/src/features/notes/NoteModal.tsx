import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Markdown } from '../../components/Markdown';
import { apiClient } from '../../lib/api';
import { TAXONOMY } from '@study-buddy/shared';
import type { Note, NoteType, TaxonomySubject, Topic } from '@study-buddy/shared';
import {
  Save,
  FileText,
  Calculator,
  Zap,
  BookMarked,
  Sparkles,
  Calendar,
  Link2,
  CheckCircle2,
  Eye,
  Edit2,
} from 'lucide-react';

export interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  initialType?: NoteType;
  onSaved: (savedNote: Note) => void;
}

const NOTE_TYPES: { id: NoteType; label: string; icon: React.ReactNode }[] = [
  { id: 'formula', label: 'Formula', icon: <Calculator className="w-3.5 h-3.5" /> },
  { id: 'shortcut', label: 'Shortcut Trick', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'concept', label: 'Core Concept', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'vocabulary', label: 'Vocabulary', icon: <BookMarked className="w-3.5 h-3.5" /> },
  { id: 'current_affairs', label: 'Current Affairs', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'fact', label: 'Static Fact', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  note,
  initialType = 'formula',
  onSaved,
}) => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [type, setType] = useState<NoteType>(initialType);
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setType(note.type);
      setSubject(note.subject || '');
      setTopic(note.topic || '');
      setTagsInput(note.tags.join(', '));
      setEventDate(note.eventDate || '');
      setSourceName(note.sourceName || '');
      setSourceUrl(note.sourceUrl || '');
    } else {
      setTitle('');
      setContent('');
      setType(initialType);
      setSubject('');
      setTopic('');
      setTagsInput('');
      setEventDate(new Date().toISOString().split('T')[0]);
      setSourceName('');
      setSourceUrl('');
    }
    setIsPreview(false);
  }, [note, initialType, isOpen]);

  const selectedSubjectData = TAXONOMY.find((s: TaxonomySubject) => s.name === subject);
  const availableTopics = selectedSubjectData?.topics.map((t: Topic) => t.name) || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let saved: Note | null = null;
      if (note) {
        saved = await apiClient.notes.update(note.id, {
          title: title.trim(),
          content: content.trim(),
          type,
          subject: subject || null,
          topic: topic || null,
          tags,
          eventDate: eventDate || null,
          sourceName: sourceName.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
        });
      } else {
        saved = await apiClient.notes.create({
          title: title.trim(),
          content: content.trim(),
          type,
          subject: subject || null,
          topic: topic || null,
          tags,
          examRelevance: [],
          eventDate: eventDate || null,
          sourceName: sourceName.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
          isBookmarked: false,
        });
      }

      if (saved) {
        onSaved(saved);
        onClose();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={note ? 'Edit Notebook Item' : 'New Study Note or Formula'}
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Type pills */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-2">
            Item Category
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {NOTE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 border ${
                  type === t.id
                    ? 'bg-accent/20 border-accent text-accent font-semibold'
                    : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
            Title or Formula Name *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'formula'
                ? 'e.g. Quadratic Roots & Discriminant Formula'
                : type === 'shortcut'
                ? 'e.g. Speed Conversion Trick (km/h ↔ m/s)'
                : 'e.g. Governor-General of India Act 1833'
            }
            className="w-full px-3 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Taxonomy Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic('');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent"
            >
              <option value="">-- Select Subject (Optional) --</option>
              {TAXONOMY.map((s: TaxonomySubject) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={!subject || availableTopics.length === 0}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">-- Select Topic (Optional) --</option>
              {availableTopics.map((top: string) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Source Row (especially for Current Affairs) */}
        {type === 'current_affairs' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-surface-card border border-surface-border">
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">
                Source Name
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="The Hindu / PIB"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">
                Source Reference URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-elevated border border-surface-border text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Markdown Content / Formula with live preview toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Content & Formula (Markdown supported)
            </label>
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {isPreview ? <Edit2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{isPreview ? 'Switch to Edit' : 'Preview Note'}</span>
            </button>
          </div>

          {isPreview ? (
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border min-h-[140px]">
              {content ? (
                <Markdown content={content} />
              ) : (
                <span className="text-xs text-text-muted italic">Nothing to preview yet.</span>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={
                type === 'formula'
                  ? 'x = (-b ± √(b² - 4ac)) / (2a)\n\n• If D > 0: Two distinct real roots\n• If D = 0: Two equal real roots\n• If D < 0: No real roots'
                  : 'Write markdown notes, definitions, mnemonic tricks, or bullet points here...'
              }
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent resize-none leading-relaxed"
            />
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="arithmetic, speed, ssc, tnpsc, high-yield"
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            {note ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
