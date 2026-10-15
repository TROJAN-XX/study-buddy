import { storage, STORAGE_KEYS } from './storage';
import { getToday } from './utils';
import type {
  DashboardData,
  StudySession,
  DailyGoal,
  Exam,
  BackupData,
  RevisionItem,
  Question,
  PracticeTest,
  PracticeAttempt,
  Mistake,
  Note,
  Bookmark,
  BookmarkTargetType,
  ApiResponse,
  PackValidationResult,
} from '@study-buddy/shared';
import { validateQuestionPack } from '@study-buddy/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

/**
 * Low-level HTTP helper that contacts Cloudflare Worker API when configured,
 * returning null on any network failure or non-200 response to trigger offline fallback.
 */
async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  if (!API_BASE_URL) return null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (API_TOKEN) {
      headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) return null;
    const json = (await response.json()) as ApiResponse<T>;
    return json && json.success && json.data !== undefined ? json.data : null;
  } catch (error) {
    // Graceful offline fallback on any fetch or network failure
    console.debug(`[apiClient] Offline or unreachable API for ${path}, using local storage fallback.`, error);
    return null;
  }
}

export interface MistakeDetail extends Mistake {
  question?: Question | null;
}

export const apiClient = {
  dashboard: {
    async get(): Promise<DashboardData> {
      // 1. Try remote Worker API if configured
      const remote = await requestApi<DashboardData>('/api/dashboard');
      if (remote) return remote;

      // 2. Fallback to LocalStorage data calculations
      const today = getToday();
      const allGoals = storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
      const allSessions = storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS);
      const allRevisions = storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
      const allTests = storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS);

      const todayGoals = allGoals.filter((g) => g.date === today);
      const todaySessions = allSessions.filter((s) => s.date === today);

      const dueRevisionCount = allRevisions.filter(
        (r) => r.status === 'pending' && r.nextReview <= today
      ).length;

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const pastWeekSessions = allSessions.filter((s) => {
        const sessionDate = new Date(s.date);
        return sessionDate >= sevenDaysAgo && sessionDate <= now;
      });

      const uniqueDays = new Set(pastWeekSessions.map((s) => s.date));
      const totalMinutes = pastWeekSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const totalQuestions = pastWeekSessions.reduce((acc, s) => acc + (s.questionsAttempted || 0), 0);
      const totalCorrect = pastWeekSessions.reduce((acc, s) => acc + (s.correct || 0), 0);

      const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

      const completedTests = allTests
        .filter((t) => t.status === 'completed' && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      const recentTest = completedTests[0]
        ? {
            testId: completedTests[0].id,
            title: completedTests[0].title,
            score: completedTests[0].score || 0,
            total: completedTests[0].total || 0,
            completedAt: completedTests[0].completedAt!,
          }
        : null;

      return {
        today,
        todayGoals,
        todaySessions,
        dueRevisionCount,
        recentTestResult: recentTest,
        weeklyStats: {
          totalMinutes,
          totalQuestions,
          daysStudied: uniqueDays.size,
          accuracy,
        },
      };
    },
  },

  sessions: {
    async list(date?: string): Promise<StudySession[]> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const remote = await requestApi<{ data: StudySession[] } | StudySession[]>(`/api/sessions${query}`);
      if (remote) {
        return Array.isArray(remote) ? remote : (remote as any).data || [];
      }

      const sessions = storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS);
      return date ? sessions.filter((s) => s.date === date) : sessions;
    },

    async create(
      data: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<StudySession> {
      const local = storage.create<StudySession>(STORAGE_KEYS.SESSIONS, data);
      await requestApi<StudySession>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(local),
      });
      return local;
    },

    async update(id: string, data: Partial<StudySession>): Promise<StudySession | null> {
      const local = storage.update<StudySession>(STORAGE_KEYS.SESSIONS, id, data);
      if (local) {
        await requestApi<StudySession>(`/api/sessions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = storage.remove(STORAGE_KEYS.SESSIONS, id);
      if (removed) {
        await requestApi(`/api/sessions/${id}`, { method: 'DELETE' });
      }
      return removed;
    },
  },

  goals: {
    async list(date?: string): Promise<DailyGoal[]> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const remote = await requestApi<DailyGoal[]>(`/api/goals${query}`);
      if (remote && Array.isArray(remote)) return remote;

      const goals = storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
      return date ? goals.filter((g) => g.date === date) : goals;
    },

    async create(
      data: Omit<DailyGoal, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<DailyGoal> {
      const local = storage.create<DailyGoal>(STORAGE_KEYS.GOALS, data);
      await requestApi<DailyGoal>('/api/goals', {
        method: 'POST',
        body: JSON.stringify(local),
      });
      return local;
    },

    async update(id: string, data: Partial<DailyGoal>): Promise<DailyGoal | null> {
      const local = storage.update<DailyGoal>(STORAGE_KEYS.GOALS, id, data);
      if (local) {
        await requestApi<DailyGoal>(`/api/goals/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = storage.remove(STORAGE_KEYS.GOALS, id);
      if (removed) {
        await requestApi(`/api/goals/${id}`, { method: 'DELETE' });
      }
      return removed;
    },

    async carryForward(): Promise<number> {
      const today = getToday();
      const allGoals = storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
      let count = 0;

      const updated = allGoals.map((g) => {
        if (g.date < today && g.status !== 'completed' && g.status !== 'deferred') {
          count++;
          return {
            ...g,
            date: today,
            status: 'overdue' as const,
            updatedAt: new Date().toISOString(),
          };
        }
        return g;
      });

      if (count > 0) {
        storage.setAll(STORAGE_KEYS.GOALS, updated);
        await requestApi('/api/goals/carry-forward', { method: 'POST' });
      }

      return count;
    },
  },

  exams: {
    async list(): Promise<Exam[]> {
      const remote = await requestApi<Exam[]>('/api/exams');
      if (remote && Array.isArray(remote)) return remote;
      return storage.getAll<Exam>(STORAGE_KEYS.EXAMS);
    },

    async update(id: string, data: Partial<Exam>): Promise<Exam | null> {
      const local = storage.update<Exam>(STORAGE_KEYS.EXAMS, id, data);
      if (local) {
        await requestApi<Exam>(`/api/exams/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return local;
    },
  },

  revisions: {
    async list(filters?: { status?: string; dueOnly?: boolean }): Promise<RevisionItem[]> {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.dueOnly) params.set('dueOnly', 'true');
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const remote = await requestApi<RevisionItem[]>(`/api/revisions${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      const items = storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
      const today = getToday();
      return items.filter((r) => {
        if (filters?.status && r.status !== filters.status) return false;
        if (filters?.dueOnly) {
          if (r.status === 'mastered' || r.status === 'suspended') return false;
          if (r.nextReview > today) return false;
        }
        return true;
      });
    },

    async review(
      id: string,
      grade: 'easy' | 'difficult' | 'forgot'
    ): Promise<RevisionItem | null> {
      const item = storage.getById<RevisionItem>(STORAGE_KEYS.REVISION, id);
      if (!item) return null;

      let interval = item.intervalDays;
      let ease = item.easeFactor;
      let status = item.status;

      if (grade === 'easy') {
        interval = Math.max(1, Math.round(interval * ease));
        ease = Math.min(3.0, ease + 0.15);
        status = interval >= 21 ? 'mastered' : 'reviewed';
      } else if (grade === 'difficult') {
        interval = Math.max(1, Math.round(interval * 1.2));
        ease = Math.max(1.3, ease - 0.15);
        status = 'reviewed';
      } else {
        interval = 1;
        ease = Math.max(1.3, ease - 0.2);
        status = 'pending';
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + interval);
      const nextReview = nextDate.toISOString().split('T')[0];

      const updated = storage.update<RevisionItem>(STORAGE_KEYS.REVISION, id, {
        intervalDays: interval,
        easeFactor: ease,
        status,
        nextReview,
      });

      if (item.sourceType === 'mistake') {
        const mistake = storage.getById<Mistake>(STORAGE_KEYS.MISTAKES, item.sourceId);
        if (mistake) {
          storage.update<Mistake>(STORAGE_KEYS.MISTAKES, item.sourceId, {
            revisionStatus: status,
            nextReviewDate: nextReview,
            reviewCount: mistake.reviewCount + 1,
          });
        }
      }

      await requestApi<RevisionItem>(`/api/revisions/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ grade }),
      });

      return updated;
    },

    async reschedule(mode: 'spread_3_days' | 'defer_tomorrow' | 'reset'): Promise<number> {
      const today = getToday();
      const all = storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
      const overdue = all.filter((r) => r.nextReview < today && r.status === 'pending');

      if (overdue.length === 0) return 0;

      const updatedAll = all.map((r, index) => {
        if (r.nextReview < today && r.status === 'pending') {
          let newDateStr = today;
          if (mode === 'spread_3_days') {
            const offset = (index % 3) + 1;
            const target = new Date();
            target.setDate(target.getDate() + offset);
            newDateStr = target.toISOString().split('T')[0];
          } else if (mode === 'defer_tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            newDateStr = tomorrow.toISOString().split('T')[0];
          }
          return {
            ...r,
            nextReview: newDateStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });

      storage.setAll(STORAGE_KEYS.REVISION, updatedAll);

      await requestApi('/api/revisions/reschedule', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });

      return overdue.length;
    },

    async create(
      data: Omit<RevisionItem, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<RevisionItem> {
      return storage.create<RevisionItem>(STORAGE_KEYS.REVISION, data);
    },

    async update(id: string, data: Partial<RevisionItem>): Promise<RevisionItem | null> {
      return storage.update<RevisionItem>(STORAGE_KEYS.REVISION, id, data);
    },
  },

  mistakes: {
    async list(filters?: {
      errorType?: string;
      revisionStatus?: string;
      subject?: string;
      topic?: string;
    }): Promise<MistakeDetail[]> {
      const params = new URLSearchParams();
      if (filters?.errorType) params.set('errorType', filters.errorType);
      if (filters?.revisionStatus) params.set('revisionStatus', filters.revisionStatus);
      if (filters?.subject) params.set('subject', filters.subject);
      if (filters?.topic) params.set('topic', filters.topic);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const remote = await requestApi<MistakeDetail[]>(`/api/mistakes${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      let allMistakes = storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES);
      const allQuestions = storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
      const qMap = new Map(allQuestions.map((q) => [q.id, q]));

      if (filters?.errorType) {
        allMistakes = allMistakes.filter((m) => m.errorType === filters.errorType);
      }
      if (filters?.revisionStatus) {
        allMistakes = allMistakes.filter((m) => m.revisionStatus === filters.revisionStatus);
      }

      return allMistakes
        .map((m) => {
          const q = qMap.get(m.questionId) || null;
          return { ...m, question: q };
        })
        .filter((m) => {
          if (filters?.subject && m.question?.subject !== filters.subject) return false;
          if (filters?.topic && m.question?.topic !== filters.topic) return false;
          return true;
        });
    },

    async get(id: string): Promise<MistakeDetail | null> {
      const remote = await requestApi<MistakeDetail>(`/api/mistakes/${id}`);
      if (remote) return remote;

      const m = storage.getById<Mistake>(STORAGE_KEYS.MISTAKES, id);
      if (!m) return null;
      const q = storage.getById<Question>(STORAGE_KEYS.QUESTIONS, m.questionId);
      return { ...m, question: q };
    },

    async update(id: string, data: Partial<Mistake>): Promise<Mistake | null> {
      const local = storage.update<Mistake>(STORAGE_KEYS.MISTAKES, id, data);
      if (local) {
        await requestApi<Mistake>(`/api/mistakes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = storage.remove(STORAGE_KEYS.MISTAKES, id);
      if (removed) {
        const revs = storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
        const filtered = revs.filter((r) => !(r.sourceType === 'mistake' && r.sourceId === id));
        storage.setAll(STORAGE_KEYS.REVISION, filtered);

        await requestApi(`/api/mistakes/${id}`, { method: 'DELETE' });
      }
      return removed;
    },
  },

  questions: {
    async list(filters?: {
      exam?: string;
      subject?: string;
      topic?: string;
      difficulty?: string;
      q?: string;
    }): Promise<Question[]> {
      const params = new URLSearchParams();
      if (filters?.exam) params.set('exam', filters.exam);
      if (filters?.subject) params.set('subject', filters.subject);
      if (filters?.topic) params.set('topic', filters.topic);
      if (filters?.difficulty) params.set('difficulty', filters.difficulty);
      if (filters?.q) params.set('q', filters.q);
      params.set('pageSize', '100');

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const remote = await requestApi<{ data: Question[] } | Question[]>(`/api/questions${queryStr}`);
      if (remote) {
        return Array.isArray(remote) ? remote : (remote as any).data || [];
      }

      let questions = storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
      if (filters?.exam) {
        questions = questions.filter((q) => q.exam === filters.exam);
      }
      if (filters?.subject) {
        questions = questions.filter((q) => q.subject === filters.subject);
      }
      if (filters?.topic) {
        questions = questions.filter((q) => q.topic === filters.topic);
      }
      if (filters?.difficulty) {
        questions = questions.filter((q) => q.difficulty === filters.difficulty);
      }
      if (filters?.q) {
        const query = filters.q.toLowerCase();
        questions = questions.filter(
          (q) =>
            q.questionText.toLowerCase().includes(query) ||
            q.tags.some((t) => t.toLowerCase().includes(query)) ||
            q.options.some((o) => o.text.toLowerCase().includes(query))
        );
      }
      return questions;
    },

    async get(id: string): Promise<Question | null> {
      const remote = await requestApi<Question>(`/api/questions/${id}`);
      if (remote) return remote;
      return storage.getById<Question>(STORAGE_KEYS.QUESTIONS, id);
    },

    async importPack(
      data: unknown,
      strategy: 'skip' | 'overwrite' = 'skip'
    ): Promise<PackValidationResult> {
      const validation = validateQuestionPack(data);

      if (validation.questions.length > 0) {
        const existing = storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
        const existingMap = new Map(existing.map((q) => [q.id, q]));

        for (const q of validation.questions) {
          if (strategy === 'overwrite' || !existingMap.has(q.id)) {
            existingMap.set(q.id, q);
          }
        }

        storage.setAll(STORAGE_KEYS.QUESTIONS, Array.from(existingMap.values()));

        // Also sync to remote worker if available
        await requestApi(`/api/questions/import?strategy=${strategy}`, {
          method: 'POST',
          body: JSON.stringify(validation.questions),
        });
      }

      return validation;
    },

    async delete(id: string): Promise<boolean> {
      const removed = storage.remove(STORAGE_KEYS.QUESTIONS, id);
      if (removed) {
        await requestApi(`/api/questions/${id}`, { method: 'DELETE' });
      }
      return removed;
    },
  },

  practice: {
    async listTests(limit: number = 20): Promise<PracticeTest[]> {
      const remote = await requestApi<PracticeTest[]>(`/api/practice/tests?limit=${limit}`);
      if (remote && Array.isArray(remote)) return remote;
      return storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS).slice(0, limit);
    },

    async getTest(id: string): Promise<{ test: PracticeTest; attempts: PracticeAttempt[] } | null> {
      const remote = await requestApi<{ test: PracticeTest; attempts: PracticeAttempt[] }>(`/api/practice/tests/${id}`);
      if (remote) return remote;

      const test = storage.getById<PracticeTest>(STORAGE_KEYS.TESTS, id);
      if (!test) return null;
      const allAttempts = storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS);
      const attempts = allAttempts.filter((a) => a.testId === id);
      return { test, attempts };
    },

    async submitTest(
      test: PracticeTest,
      attempts: PracticeAttempt[]
    ): Promise<{ testId: string; attemptsRecorded: number }> {
      storage.create<PracticeTest>(STORAGE_KEYS.TESTS, test);
      const allAttempts = storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS);
      storage.setAll(STORAGE_KEYS.ATTEMPTS, [...attempts, ...allAttempts]);

      const now = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextReviewDate = tomorrow.toISOString().split('T')[0];

      const existingMistakes = storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES);
      const existingRevisions = storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);

      for (const att of attempts) {
        if (!att.isCorrect || att.markedStatus === 'uncertain') {
          const mistakeId = crypto.randomUUID();
          existingMistakes.unshift({
            id: mistakeId,
            questionId: att.questionId,
            attemptId: att.id,
            errorType: att.markedStatus === 'uncertain' && att.isCorrect ? 'guessed_answer' : 'concept_gap',
            notes: null,
            revisionStatus: 'pending',
            nextReviewDate,
            reviewCount: 0,
            createdAt: now,
            updatedAt: now,
          });

          existingRevisions.unshift({
            id: crypto.randomUUID(),
            sourceType: 'mistake',
            sourceId: mistakeId,
            topic: null,
            subject: null,
            nextReview: nextReviewDate,
            intervalDays: 1,
            easeFactor: 2.5,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      storage.setAll(STORAGE_KEYS.MISTAKES, existingMistakes);
      storage.setAll(STORAGE_KEYS.REVISION, existingRevisions);

      await requestApi('/api/practice/tests/submit', {
        method: 'POST',
        body: JSON.stringify({ test, attempts }),
      });

      return { testId: test.id, attemptsRecorded: attempts.length };
    },
  },

  bookmarks: {
    async list(): Promise<Bookmark[]> {
      return storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
    },

    async toggle(targetType: BookmarkTargetType, targetId: string): Promise<boolean> {
      const all = storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
      const existingIdx = all.findIndex((b) => b.targetId === targetId);

      if (existingIdx !== -1) {
        all.splice(existingIdx, 1);
        storage.setAll(STORAGE_KEYS.BOOKMARKS, all);
        return false;
      } else {
        all.unshift({
          id: crypto.randomUUID(),
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        });
        storage.setAll(STORAGE_KEYS.BOOKMARKS, all);
        return true;
      }
    },

    async isBookmarked(targetId: string): Promise<boolean> {
      const all = storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
      return all.some((b) => b.targetId === targetId);
    },
  },

  notes: {
    async list(filters?: {
      subject?: string;
      topic?: string;
      type?: string;
      q?: string;
      isBookmarked?: boolean;
    }): Promise<Note[]> {
      const params = new URLSearchParams();
      if (filters?.subject) params.set('subject', filters.subject);
      if (filters?.topic) params.set('topic', filters.topic);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.q) params.set('q', filters.q);
      if (filters?.isBookmarked) params.set('isBookmarked', 'true');
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const remote = await requestApi<Note[]>(`/api/notes${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      let notes = storage.getAll<Note>(STORAGE_KEYS.NOTES);
      if (filters?.subject) {
        notes = notes.filter((n) => n.subject === filters.subject);
      }
      if (filters?.topic) {
        notes = notes.filter((n) => n.topic === filters.topic);
      }
      if (filters?.type) {
        notes = notes.filter((n) => n.type === filters.type);
      }
      if (filters?.isBookmarked) {
        notes = notes.filter((n) => n.isBookmarked);
      }
      if (filters?.q) {
        const query = filters.q.toLowerCase();
        notes = notes.filter(
          (n) =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            n.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
      return notes;
    },

    async get(id: string): Promise<Note | null> {
      const remote = await requestApi<Note>(`/api/notes/${id}`);
      if (remote) return remote;
      return storage.getById<Note>(STORAGE_KEYS.NOTES, id);
    },

    async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
      const local = storage.create<Note>(STORAGE_KEYS.NOTES, data);
      await requestApi<Note>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(local),
      });
      return local;
    },

    async update(id: string, data: Partial<Note>): Promise<Note | null> {
      const local = storage.update<Note>(STORAGE_KEYS.NOTES, id, data);
      if (local) {
        await requestApi<Note>(`/api/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = storage.remove(STORAGE_KEYS.NOTES, id);
      if (removed) {
        await requestApi(`/api/notes/${id}`, { method: 'DELETE' });
      }
      return removed;
    },
  },

  backup: {
    async export(): Promise<BackupData> {
      const remote = await requestApi<BackupData>('/api/backup/export');
      if (remote && remote.version) return remote;

      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exams: storage.getAll<Exam>(STORAGE_KEYS.EXAMS),
        sessions: storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS),
        goals: storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS),
        questions: storage.getAll<Question>(STORAGE_KEYS.QUESTIONS),
        tests: storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS),
        attempts: storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS),
        mistakes: storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES),
        revisionItems: storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION),
        notes: storage.getAll<Note>(STORAGE_KEYS.NOTES),
        bookmarks: storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS),
      };
    },

    async import(data: BackupData): Promise<{ success: boolean; counts: Record<string, number> }> {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format');
      }

      const counts: Record<string, number> = {};

      if (Array.isArray(data.exams)) {
        storage.setAll(STORAGE_KEYS.EXAMS, data.exams);
        counts.exams = data.exams.length;
      }
      if (Array.isArray(data.sessions)) {
        storage.setAll(STORAGE_KEYS.SESSIONS, data.sessions);
        counts.sessions = data.sessions.length;
      }
      if (Array.isArray(data.goals)) {
        storage.setAll(STORAGE_KEYS.GOALS, data.goals);
        counts.goals = data.goals.length;
      }
      if (Array.isArray(data.questions)) {
        storage.setAll(STORAGE_KEYS.QUESTIONS, data.questions);
        counts.questions = data.questions.length;
      }
      if (Array.isArray(data.tests)) {
        storage.setAll(STORAGE_KEYS.TESTS, data.tests);
        counts.tests = data.tests.length;
      }
      if (Array.isArray(data.attempts)) {
        storage.setAll(STORAGE_KEYS.ATTEMPTS, data.attempts);
        counts.attempts = data.attempts.length;
      }
      if (Array.isArray(data.mistakes)) {
        storage.setAll(STORAGE_KEYS.MISTAKES, data.mistakes);
        counts.mistakes = data.mistakes.length;
      }
      if (Array.isArray(data.revisionItems)) {
        storage.setAll(STORAGE_KEYS.REVISION, data.revisionItems);
        counts.revisionItems = data.revisionItems.length;
      }
      if (Array.isArray(data.notes)) {
        storage.setAll(STORAGE_KEYS.NOTES, data.notes);
        counts.notes = data.notes.length;
      }
      if (Array.isArray(data.bookmarks)) {
        storage.setAll(STORAGE_KEYS.BOOKMARKS, data.bookmarks);
        counts.bookmarks = data.bookmarks.length;
      }

      // Also forward to API if available
      await requestApi('/api/backup/import', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return { success: true, counts };
    },

    async clearAll(): Promise<void> {
      storage.clearAll();
    },
  },
};
