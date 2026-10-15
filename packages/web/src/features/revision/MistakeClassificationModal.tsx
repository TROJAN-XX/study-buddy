import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../lib/api';
import type { Mistake, Question, ErrorType, RevisionStatus } from '@study-buddy/shared';
import {
  Brain,
  Calculator,
  Eye,
  HelpCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Save,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface MistakeClassificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistake: Mistake | null;
  question?: Question | null;
  userSelectedOption?: string[];
  onSaved: (updated: Mistake) => void;
}

interface ErrorTypeOption {
  type: ErrorType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

const ERROR_TYPES: ErrorTypeOption[] = [
  {
    type: 'concept_gap',
    label: 'Concept Gap',
    desc: 'Did not know or forgot the underlying concept, rule, or theorem.',
    icon: <Brain className="w-4 h-4" />,
    color: 'border-red-500/40 text-red-400 bg-red-500/10',
  },
  {
    type: 'calculation_error',
    label: 'Calculation Error',
    desc: 'Understood the approach, but made an arithmetic or algebraic slip.',
    icon: <Calculator className="w-4 h-4" />,
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    type: 'misread_question',
    label: 'Misread Question',
    desc: 'Missed "NOT/EXCEPT", misread units, or rushed reading the prompt.',
    icon: <Eye className="w-4 h-4" />,
    color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    type: 'guessed_answer',
    label: 'Guessed / Uncertain',
    desc: 'Eliminated partially, took a 50/50 gamble, or had low confidence.',
    icon: <HelpCircle className="w-4 h-4" />,
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
  {
    type: 'time_pressure',
    label: 'Time Pressure',
    desc: 'Rushed or panicked due to time limit expiring.',
    icon: <Clock className="w-4 h-4" />,
    color: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  },
  {
    type: 'other',
    label: 'Other / Trick Item',
    desc: 'Ambiguous question phrasing, tricky exception, or careless click.',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'border-surface-border text-text-secondary bg-surface-elevated',
  },
];

export const MistakeClassificationModal: React.FC<MistakeClassificationModalProps> = ({
  isOpen,
  onClose,
  mistake,
  question,
  userSelectedOption,
  onSaved,
}) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ErrorType>('concept_gap');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<RevisionStatus>('pending');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (mistake) {
      setSelectedType(mistake.errorType || 'concept_gap');
      setNotes(mistake.notes || '');
      setStatus(mistake.revisionStatus || 'pending');
    }
  }, [mistake]);

  if (!mistake) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiClient.mistakes.update(mistake.id, {
        errorType: selectedType,
        notes: notes.trim() || null,
        revisionStatus: status,
      });

      if (updated) {
        onSaved(updated);
        onClose();
      }
    } catch (err) {
      console.error('Failed to save mistake classification:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Classify Mistake Root Cause"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Question prompt summary snippet */}
        {question && (
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border space-y-2">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="font-semibold text-text">{question.exam}</span>
              <span>•</span>
              <span>{question.subject}</span>
              <span>→</span>
              <span className="text-text-secondary">{question.topic}</span>
            </div>
            <p className="text-sm font-medium text-text line-clamp-3 leading-relaxed">
              {question.questionText}
            </p>
            {userSelectedOption && userSelectedOption.length > 0 && (
              <div className="text-xs text-red-400 font-mono">
                Your Answer: {userSelectedOption.join(', ')} (Correct: {question.answer.join(', ')})
              </div>
            )}
          </div>
        )}

        {/* Error category selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-2.5">
            1. Why did you miss this question?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ERROR_TYPES.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? `${opt.color} ring-1 ring-accent/60 shadow-sm`
                      : 'bg-surface-elevated/40 border-surface-border text-text-secondary hover:border-surface-border/80 hover:text-text'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-surface/60' : 'bg-surface-elevated'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-text flex items-center gap-1.5">
                      {opt.label}
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-accent inline" />}
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reflection Note */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
            2. Personal Reflection & Takeaway (What rule to remember next time?)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. When speed is given in km/hr, multiply by 5/18 to convert to m/s before solving distance!"
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-xl bg-surface-elevated border border-surface-border text-text placeholder-text-muted focus:outline-none focus:border-accent resize-none leading-relaxed"
          />
        </div>

        {/* Revision Status */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-2">
            3. Revision Status
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { id: 'pending', label: 'Due for Review', variant: 'warning' },
                { id: 'reviewed', label: 'Reviewed Once', variant: 'default' },
                { id: 'mastered', label: 'Mastered', variant: 'success' },
                { id: 'suspended', label: 'Suspended', variant: 'default' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id as RevisionStatus)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                  status === s.id
                    ? 'bg-accent/20 border-accent text-accent font-semibold'
                    : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/notes');
            }}
            icon={<BookOpen className="w-4 h-4" />}
          >
            Create Concept Note
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={isSaving}
              onClick={handleSave}
            >
              Save Classification
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
