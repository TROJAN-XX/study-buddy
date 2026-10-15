import React from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FolderOpen, FileText, Bookmark, Newspaper, Code2, Database } from 'lucide-react';

export const LibraryPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Study Library
          </h1>
          <Badge variant="accent">Phase 2</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">
          Central repository for question packs, formula cheat-sheets, notes, and current affairs.
        </p>
      </div>

      {/* Main EmptyState */}
      <EmptyState
        icon={<FolderOpen className="w-6 h-6 text-accent" />}
        title="Study Library Arriving Soon"
        description="Your question bank, notes, formulas, and current affairs. Coming in Phase 2."
      />

      {/* Feature Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Database className="w-4 h-4 text-accent" />
              Question Packs
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Curated questions from past year SSC CGL, TNPSC Group 2/4, and IBPS PO exams with verified solutions.
          </p>
        </Card>

        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="w-4 h-4 text-emerald-400" />
              Concept Notes
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Markdown-powered study notes covering History, Geography, Polity, Science, and Arithmetic concepts.
          </p>
        </Card>

        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Newspaper className="w-4 h-4 text-amber-400" />
              Current Affairs
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Daily & monthly digests categorized by National, International, Tamil Nadu, Economy, and Sports.
          </p>
        </Card>

        <Card
          variant="outlined"
          title={
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Bookmark className="w-4 h-4 text-rose-400" />
              Bookmarks & Tags
            </span>
          }
        >
          <p className="text-xs text-text-secondary leading-relaxed">
            Save difficult questions, tricky formulas, and key shortcuts for last-minute revision before exams.
          </p>
        </Card>
      </div>
    </div>
  );
};
