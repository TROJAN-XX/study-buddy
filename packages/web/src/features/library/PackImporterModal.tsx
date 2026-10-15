import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { validateQuestionPack } from '@study-buddy/shared';
import type { PackValidationResult } from '@study-buddy/shared';
import { apiClient } from '../../lib/api';
import { Upload, FileCode, CheckCircle2, AlertTriangle, Sparkles, Check, ArrowRight } from 'lucide-react';

interface PackImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export const PackImporterModal: React.FC<PackImporterModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [jsonText, setJsonText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'skip' | 'overwrite'>('skip');
  const [validationResult, setValidationResult] = useState<PackValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const resetState = () => {
    setJsonText('');
    setFileName(null);
    setValidationResult(null);
    setImportStatus(null);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseAndValidate = (content: string, name?: string) => {
    setJsonText(content);
    if (name) setFileName(name);
    setImportStatus(null);

    try {
      const parsed = JSON.parse(content);
      const result = validateQuestionPack(parsed);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        questions: [],
        errors: [
          {
            row: 0,
            field: 'JSON Syntax',
            message: `Malformed JSON: ${err.message || 'Syntax error'}`,
          },
        ],
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseAndValidate(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        parseAndValidate(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.questions.length === 0) return;

    setIsImporting(true);
    setImportStatus('Importing validated questions...');

    try {
      const res = await apiClient.questions.importPack(validationResult.questions, strategy);
      setIsImporting(false);
      setImportStatus(`Successfully imported ${res.validRecords} question(s)!`);
      setTimeout(() => {
        onImportComplete(res.validRecords);
        handleClose();
      }, 1000);
    } catch (err: any) {
      setIsImporting(false);
      setImportStatus(`Import failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-accent" />
          <span>Import Question Pack</span>
        </div>
      }
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-surface-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
            }`}
          >
            Upload JSON File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-secondary hover:text-text hover:bg-surface-elevated'
            }`}
          >
            Paste Raw JSON
          </button>
        </div>

        {/* Upload Mode */}
        {activeTab === 'upload' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-surface-border hover:border-accent/50 rounded-xl p-8 text-center transition-all bg-surface/40 group cursor-pointer relative"
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-center text-text-secondary group-hover:text-accent group-hover:scale-105 transition-all">
                <FileCode className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-text">
                {fileName ? fileName : 'Drag & drop your question pack JSON here'}
              </div>
              <p className="text-xs text-text-muted">
                or click to browse from your computer (.json format)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={jsonText}
              onChange={(e) => parseAndValidate(e.target.value)}
              placeholder="Paste JSON array of questions here (matching Study Buddy question schema)..."
              rows={8}
              className="w-full bg-surface-elevated text-text text-xs font-mono p-3 rounded-xl border border-surface-border focus:border-accent outline-none resize-none placeholder-text-muted"
            />
          </div>
        )}

        {/* Duplicate Strategy Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-elevated/70 rounded-xl border border-surface-border/60 text-xs">
          <span className="text-text-secondary font-medium">Duplicate Question ID Strategy:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrategy('skip')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                strategy === 'skip'
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Skip existing
            </button>
            <button
              type="button"
              onClick={() => setStrategy('overwrite')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                strategy === 'overwrite'
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Overwrite existing
            </button>
          </div>
        </div>

        {/* Validation Feedback Area */}
        {validationResult && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="flex items-center gap-1.5">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                Validation Summary
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  {validationResult.validRecords} Valid
                </Badge>
                {validationResult.invalidRecords > 0 && (
                  <Badge variant="error" size="sm">
                    {validationResult.invalidRecords} Invalid
                  </Badge>
                )}
              </div>
            </div>

            {/* Error table if errors exist */}
            {validationResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-red-500/30 bg-red-950/20 p-2.5 space-y-1.5 text-xs text-red-200">
                <div className="font-semibold text-red-300 pb-1 border-b border-red-500/20">
                  Row-level Errors ({validationResult.errors.length}):
                </div>
                {validationResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className="text-red-400 font-mono shrink-0">
                      Row {err.row}:
                    </span>
                    <span className="text-red-300 font-semibold shrink-0">
                      [{err.field}]
                    </span>
                    <span className="text-red-200/90">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {importStatus && (
          <div className="p-2.5 bg-accent/10 border border-accent/30 rounded-lg text-xs text-accent font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {importStatus}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={!validationResult || validationResult.validRecords === 0 || isImporting}
            icon={isImporting ? undefined : <Check className="w-4 h-4" />}
          >
            {isImporting
              ? 'Importing...'
              : `Import ${validationResult?.validRecords || 0} Questions`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
