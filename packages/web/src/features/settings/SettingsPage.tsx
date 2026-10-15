import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../lib/api';
import type { BackupData } from '@study-buddy/shared';
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Database,
  Info,
  ShieldCheck,
  FileJson,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);
  const [importPreviewCounts, setImportPreviewCounts] = useState<Record<string, number>>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Clear State
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [clearConfirmText, setClearConfirmText] = useState<string>('');
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const loadDataSummary = async () => {
    try {
      const backup = await apiClient.backup.export();
      setCounts({
        sessions: backup.sessions?.length || 0,
        goals: backup.goals?.length || 0,
        exams: backup.exams?.length || 0,
        revisions: backup.revisionItems?.length || 0,
        notes: backup.notes?.length || 0,
      });
    } catch (err) {
      console.error('Error loading backup summary:', err);
    }
  };

  useEffect(() => {
    loadDataSummary();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Export Data as JSON
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await apiClient.backup.export();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `study-buddy-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showNotification('success', 'Backup exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', 'Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Select File for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Not a valid JSON object');
        }

        const preview: Record<string, number> = {
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions.length : 0,
          goals: Array.isArray(parsed.goals) ? parsed.goals.length : 0,
          exams: Array.isArray(parsed.exams) ? parsed.exams.length : 0,
          revisionItems: Array.isArray(parsed.revisionItems) ? parsed.revisionItems.length : 0,
          notes: Array.isArray(parsed.notes) ? parsed.notes.length : 0,
        };

        setPendingImportData(parsed as BackupData);
        setImportPreviewCounts(preview);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error('Import parse error:', err);
        showNotification('error', 'Invalid JSON file. Please select a valid Study Buddy backup.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!pendingImportData) return;
    setIsImporting(true);
    try {
      await apiClient.backup.import(pendingImportData);
      setIsImportModalOpen(false);
      setPendingImportData(null);
      await loadDataSummary();
      showNotification('success', 'Data imported and merged successfully!');
    } catch (err) {
      console.error('Import confirmation error:', err);
      showNotification('error', 'Failed to import data.');
    } finally {
      setIsImporting(false);
    }
  };

  // Clear All Data
  const handleConfirmClear = async () => {
    if (clearConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsClearing(true);
    try {
      await apiClient.backup.clearAll();
      setIsClearModalOpen(false);
      setClearConfirmText('');
      await loadDataSummary();
      showNotification('success', 'All local data has been cleared.');
    } catch (err) {
      console.error('Clear error:', err);
      showNotification('error', 'Failed to clear data.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
          Settings & Data Management
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Export your study records, import backups, and configure platform settings.
        </p>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Current Data Overview */}
      <Card
        title="Stored Records"
        subtitle="Current dataset in browser offline storage"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="text-xs text-text-muted">Study Sessions</span>
            <p className="text-xl font-bold text-text mt-1">{counts.sessions || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="text-xs text-text-muted">Daily Goals</span>
            <p className="text-xl font-bold text-text mt-1">{counts.goals || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="text-xs text-text-muted">Active Exams</span>
            <p className="text-xl font-bold text-text mt-1">{counts.exams || 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="text-xs text-text-muted">Revision Items</span>
            <p className="text-xl font-bold text-text mt-1">{counts.revisions || 0}</p>
          </div>
        </div>
      </Card>

      {/* Backup & Export Section */}
      <Card
        title="Backup & Restore"
        subtitle="Preserve your hard work or transfer records across devices"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-elevated border border-surface-border/70">
            <div>
              <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                <Download className="w-4 h-4 text-accent" />
                Export Full Backup
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Download a JSON archive containing all study logs, goals, and revision data.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={isExporting}
              onClick={handleExportData}
              icon={<Download className="w-4 h-4" />}
            >
              Export JSON
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-elevated border border-surface-border/70">
            <div>
              <h4 className="text-sm font-semibold text-text flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import Backup
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Restore previously exported JSON files. Existing entries will be updated.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
              >
                Choose File
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-950/20 border border-red-500/20">
              <div>
                <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Reset Study Records
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Permanently erase all sessions and custom targets. Exams taxonomy will reset to defaults.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsClearModalOpen(true)}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Clear All Data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* About Section */}
      <Card
        title="About Study Buddy"
        subtitle="Platform architecture and offline details"
      >
        <div className="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
          <div className="flex items-center gap-2 text-text font-semibold">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Study Buddy PWA • Version 1.0.0</span>
          </div>
          <p>
            Built as a focused, distraction-free preparation companion for competitive examinations
            including Staff Selection Commission (SSC CGL), Tamil Nadu Public Service Commission (TNPSC Group 2/4),
            and Banking (IBPS & SBI PO/Clerk).
          </p>
          <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border flex items-start gap-2.5 text-xs text-text-muted">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
            <span>
              Phase 1 operates with an offline-first localStorage architecture. All records stay private
              on this browser until Cloudflare Workers sync is enabled in Phase 2.
            </span>
          </div>
        </div>
      </Card>

      {/* Import Preview Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Confirm Data Import"
        description="Verify the record counts in this backup before importing"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-border/40">
              <span className="text-text-muted">Study Sessions</span>
              <span className="font-bold text-text">{importPreviewCounts.sessions || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/40">
              <span className="text-text-muted">Daily Goals</span>
              <span className="font-bold text-text">{importPreviewCounts.goals || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/40">
              <span className="text-text-muted">Active Exams</span>
              <span className="font-bold text-text">{importPreviewCounts.exams || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/40">
              <span className="text-text-muted">Revision Items</span>
              <span className="font-bold text-text">{importPreviewCounts.revisionItems || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Notes</span>
              <span className="font-bold text-text">{importPreviewCounts.notes || 0}</span>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Importing will restore these records into your local database.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isImporting}
              onClick={handleConfirmImport}
              icon={<Upload className="w-4 h-4" />}
            >
              Confirm Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All Data Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => {
          setIsClearModalOpen(false);
          setClearConfirmText('');
        }}
        title="Clear All Study Data"
        description="This action cannot be undone. All local records will be wiped."
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-rose-300 text-xs">
            <p className="font-semibold mb-1">Warning: Irreversible action</p>
            <p>
              Please type <span className="font-mono font-bold text-rose-200">DELETE</span> in the box below to confirm wiping all study sessions and goals.
            </p>
          </div>

          <input
            type="text"
            placeholder="Type DELETE"
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
            className="w-full bg-surface-elevated text-text placeholder-text-muted border border-surface-border rounded-lg text-sm px-3.5 py-2 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsClearModalOpen(false);
                setClearConfirmText('');
              }}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isClearing}
              disabled={clearConfirmText.trim().toUpperCase() !== 'DELETE'}
              onClick={handleConfirmClear}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Erase Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
