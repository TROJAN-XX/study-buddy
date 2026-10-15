import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { PracticePage } from './features/practice/PracticePage';
import { LibraryPage } from './features/library/LibraryPage';
import { ProgressPage } from './features/progress/ProgressPage';
import { StudyTracker } from './features/tracker/StudyTracker';
import { GoalsPage } from './features/goals/GoalsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { RevisionPage } from './features/revision/RevisionPage';
import { NotebookPage } from './features/notes/NotebookPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/tracker" element={<StudyTracker />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/planner" element={<Navigate to="/goals" replace />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/notes" element={<NotebookPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
