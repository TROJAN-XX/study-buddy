import { storage, STORAGE_KEYS } from './storage';
import { getToday, generateId } from './utils';
import { apiRequest } from './http';
import { scheduleSync } from './sync';
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

/**
 * Read-through helper: returns remote data when the Worker is reachable,
 * otherwise `null` so the caller can fall back to local storage.
 */
async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const result = await apiRequest<T>(path, options);
  return result.ok ? result.data : null;
}

export interface MistakeDetail extends Mistake {
  question?: Question | null;
}

export const apiClient = {
  dashboard: {
    async get(): Promise<DashboardData> {
      // 1. Try remote Worker API if configured
      const remote = await requestApi<DashboardData>('/api/v1/dashboard');
      if (remote) return remote;

      // 2. Fallback to IndexedDB/LocalStorage data calculations
      const today = getToday();
      const allGoals = await storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
      const allSessions = await storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS);
      const allRevisions = await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
      const allTests = await storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS);

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
      const remote = await requestApi<{ data: StudySession[] } | StudySession[]>(`/api/v1/sessions${query}`);
      if (remote) {
        return Array.isArray(remote) ? remote : (remote as any).data || [];
      }

      const sessions = await storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS);
      return date ? sessions.filter((s) => s.date === date) : sessions;
    },

    async create(
      data: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<StudySession> {
      const local = await storage.create<StudySession>(STORAGE_KEYS.SESSIONS, data);
      scheduleSync();
      return local;
    },

    async update(id: string, data: Partial<StudySession>): Promise<StudySession | null> {
      const local = await storage.update<StudySession>(STORAGE_KEYS.SESSIONS, id, data);
      if (local) scheduleSync();
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = await storage.remove(STORAGE_KEYS.SESSIONS, id);
      if (removed) scheduleSync();
      return removed;
    },
  },

  goals: {
    async list(date?: string): Promise<DailyGoal[]> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const remote = await requestApi<DailyGoal[]>(`/api/v1/goals${query}`);
      if (remote && Array.isArray(remote)) return remote;

      const goals = await storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
      return date ? goals.filter((g) => g.date === date) : goals;
    },

    async create(
      data: Omit<DailyGoal, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<DailyGoal> {
      const local = await storage.create<DailyGoal>(STORAGE_KEYS.GOALS, data);
      scheduleSync();
      return local;
    },

    async update(id: string, data: Partial<DailyGoal>): Promise<DailyGoal | null> {
      const local = await storage.update<DailyGoal>(STORAGE_KEYS.GOALS, id, data);
      if (local) scheduleSync();
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = await storage.remove(STORAGE_KEYS.GOALS, id);
      if (removed) scheduleSync();
      return removed;
    },

    async carryForward(): Promise<number> {
      const today = getToday();
      const allGoals = await storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS);
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
        await storage.setAll(STORAGE_KEYS.GOALS, updated);
        await requestApi('/api/v1/goals/carry-forward', { method: 'POST' });
      }

      return count;
    },
  },

  exams: {
    async list(): Promise<Exam[]> {
      const remote = await requestApi<Exam[]>('/api/v1/exams');
      if (remote && Array.isArray(remote)) return remote;
      return await storage.getAll<Exam>(STORAGE_KEYS.EXAMS);
    },

    async update(id: string, data: Partial<Exam>): Promise<Exam | null> {
      const local = await storage.update<Exam>(STORAGE_KEYS.EXAMS, id, data);
      if (local) scheduleSync();
      return local;
    },
  },

  revisions: {
    async list(filters?: { status?: string; dueOnly?: boolean }): Promise<RevisionItem[]> {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.dueOnly) params.set('dueOnly', 'true');
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const remote = await requestApi<RevisionItem[]>(`/api/v1/revisions${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      const items = await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
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
      const item = await storage.getById<RevisionItem>(STORAGE_KEYS.REVISION, id);
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

      const updated = await storage.update<RevisionItem>(STORAGE_KEYS.REVISION, id, {
        intervalDays: interval,
        easeFactor: ease,
        status,
        nextReview,
      });

      if (item.sourceType === 'mistake') {
        const mistake = await storage.getById<Mistake>(STORAGE_KEYS.MISTAKES, item.sourceId);
        if (mistake) {
          await storage.update<Mistake>(STORAGE_KEYS.MISTAKES, item.sourceId, {
            revisionStatus: status,
            nextReviewDate: nextReview,
            reviewCount: mistake.reviewCount + 1,
          });
        }
      }

      await storage.enqueue({ op: 'review_revision', id, grade });
      scheduleSync();

      return updated;
    },

    async reschedule(mode: 'spread_3_days' | 'defer_tomorrow' | 'reset'): Promise<number> {
      const today = getToday();
      const all = await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
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

      await storage.setAll(STORAGE_KEYS.REVISION, updatedAll);

      await storage.enqueue({ op: 'reschedule_revisions', mode });
      scheduleSync();

      return overdue.length;
    },

    async create(
      data: Omit<RevisionItem, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<RevisionItem> {
      return await storage.create<RevisionItem>(STORAGE_KEYS.REVISION, data);
    },

    async update(id: string, data: Partial<RevisionItem>): Promise<RevisionItem | null> {
      return await storage.update<RevisionItem>(STORAGE_KEYS.REVISION, id, data);
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

      const remote = await requestApi<MistakeDetail[]>(`/api/v1/mistakes${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      let allMistakes = await storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES);
      const allQuestions = await storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
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
      const remote = await requestApi<MistakeDetail>(`/api/v1/mistakes/${id}`);
      if (remote) return remote;

      const m = await storage.getById<Mistake>(STORAGE_KEYS.MISTAKES, id);
      if (!m) return null;
      const q = await storage.getById<Question>(STORAGE_KEYS.QUESTIONS, m.questionId);
      return { ...m, question: q };
    },

    async update(id: string, data: Partial<Mistake>): Promise<Mistake | null> {
      const local = await storage.update<Mistake>(STORAGE_KEYS.MISTAKES, id, data);
      if (local) scheduleSync();
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = await storage.remove(STORAGE_KEYS.MISTAKES, id);
      if (removed) {
        const revs = await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);
        const filtered = revs.filter((r) => !(r.sourceType === 'mistake' && r.sourceId === id));
        await storage.setAll(STORAGE_KEYS.REVISION, filtered);
        scheduleSync();
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
      const remote = await requestApi<{ data: Question[] } | Question[]>(`/api/v1/questions${queryStr}`);
      if (remote) {
        return Array.isArray(remote) ? remote : (remote as any).data || [];
      }

      let questions = await storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
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
      const remote = await requestApi<Question>(`/api/v1/questions/${id}`);
      if (remote) return remote;
      return await storage.getById<Question>(STORAGE_KEYS.QUESTIONS, id);
    },

    async importPack(
      data: unknown,
      strategy: 'skip' | 'overwrite' = 'skip'
    ): Promise<PackValidationResult> {
      const validation = validateQuestionPack(data);

      if (validation.questions.length > 0) {
        const existing = await storage.getAll<Question>(STORAGE_KEYS.QUESTIONS);
        const existingMap = new Map(existing.map((q) => [q.id, q]));

        for (const q of validation.questions) {
          if (strategy === 'overwrite' || !existingMap.has(q.id)) {
            existingMap.set(q.id, q);
          }
        }

        await storage.setAll(STORAGE_KEYS.QUESTIONS, Array.from(existingMap.values()));

        // Queue the import so it survives being offline at import time.
        await storage.enqueue({
          op: 'import_questions',
          questions: validation.questions as unknown as Record<string, unknown>[],
          strategy,
        });
        scheduleSync();
      }

      return validation;
    },

    async delete(id: string): Promise<boolean> {
      const removed = await storage.remove(STORAGE_KEYS.QUESTIONS, id);
      if (removed) scheduleSync();
      return removed;
    },
  },

  practice: {
    async listTests(limit: number = 20): Promise<PracticeTest[]> {
      const remote = await requestApi<PracticeTest[]>(`/api/v1/practice/tests?limit=${limit}`);
      if (remote && Array.isArray(remote)) return remote;
      const allTests = await storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS);
      return allTests.slice(0, limit);
    },

    async getTest(id: string): Promise<{ test: PracticeTest; attempts: PracticeAttempt[] } | null> {
      const remote = await requestApi<{ test: PracticeTest; attempts: PracticeAttempt[] }>(`/api/v1/practice/tests/${id}`);
      if (remote) return remote;

      const test = await storage.getById<PracticeTest>(STORAGE_KEYS.TESTS, id);
      if (!test) return null;
      const allAttempts = await storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS);
      const attempts = allAttempts.filter((a) => a.testId === id);
      return { test, attempts };
    },

    async submitTest(
      test: PracticeTest,
      attempts: PracticeAttempt[]
    ): Promise<{ testId: string; attemptsRecorded: number }> {
      // Store locally first; a single queued mutation pushes test + attempts
      // atomically to /practice/tests/submit (the only endpoint that accepts
      // both resources, and which also derives mistake/revision rows).
      await storage.create<PracticeTest>(STORAGE_KEYS.TESTS, test);
      const allAttempts = await storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS);
      await storage.setAll(STORAGE_KEYS.ATTEMPTS, [...attempts, ...allAttempts]);

      const now = new Date().toISOString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextReviewDate = tomorrow.toISOString().split('T')[0];

      const existingMistakes = await storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES);
      const existingRevisions = await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION);

      for (const att of attempts) {
        if (!att.isCorrect || att.markedStatus === 'uncertain') {
          const mistakeId = generateId();
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

      await storage.setAll(STORAGE_KEYS.MISTAKES, existingMistakes);
      await storage.setAll(STORAGE_KEYS.REVISION, existingRevisions);

      await storage.enqueue({
        op: 'submit_test',
        test: test as unknown as Record<string, unknown>,
        attempts: attempts as unknown as Record<string, unknown>[],
      });
      scheduleSync();

      return { testId: test.id, attemptsRecorded: attempts.length };
    },
  },

  bookmarks: {
    async list(): Promise<Bookmark[]> {
      return await storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
    },

    async toggle(targetType: BookmarkTargetType, targetId: string): Promise<boolean> {
      const all = await storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
      const existingIdx = all.findIndex((b) => b.targetId === targetId && b.targetType === targetType);

      if (existingIdx !== -1) {
        const [removed] = all.splice(existingIdx, 1);
        await storage.setAll(STORAGE_KEYS.BOOKMARKS, all);
        await storage.enqueue({
          op: 'delete_bookmark',
          targetType: removed.targetType,
          targetId: removed.targetId,
        });
        scheduleSync();
        return false;
      }

      const bookmark: Bookmark = {
        id: generateId(),
        targetType,
        targetId,
        createdAt: new Date().toISOString(),
      };
      all.unshift(bookmark);
      await storage.setAll(STORAGE_KEYS.BOOKMARKS, all);
      await storage.enqueue({
        op: 'create',
        store: STORAGE_KEYS.BOOKMARKS,
        data: bookmark as unknown as Record<string, unknown>,
      });
      scheduleSync();
      return true;
    },

    async isBookmarked(targetId: string, targetType?: BookmarkTargetType): Promise<boolean> {
      const all = await storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS);
      return all.some((b) => b.targetId === targetId && (!targetType || b.targetType === targetType));
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

      const remote = await requestApi<Note[]>(`/api/v1/notes${queryStr}`);
      if (remote && Array.isArray(remote)) return remote;

      let notes = await storage.getAll<Note>(STORAGE_KEYS.NOTES);
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
      const remote = await requestApi<Note>(`/api/v1/notes/${id}`);
      if (remote) return remote;
      return await storage.getById<Note>(STORAGE_KEYS.NOTES, id);
    },

    async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
      const local = await storage.create<Note>(STORAGE_KEYS.NOTES, data);
      scheduleSync();
      return local;
    },

    async update(id: string, data: Partial<Note>): Promise<Note | null> {
      const local = await storage.update<Note>(STORAGE_KEYS.NOTES, id, data);
      if (local) scheduleSync();
      return local;
    },

    async delete(id: string): Promise<boolean> {
      const removed = await storage.remove(STORAGE_KEYS.NOTES, id);
      if (removed) scheduleSync();
      return removed;
    },
  },

  backup: {
    async export(): Promise<BackupData> {
      const remote = await requestApi<BackupData>('/api/v1/backup/export');
      if (remote && remote.version) return remote;

      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exams: await storage.getAll<Exam>(STORAGE_KEYS.EXAMS),
        sessions: await storage.getAll<StudySession>(STORAGE_KEYS.SESSIONS),
        goals: await storage.getAll<DailyGoal>(STORAGE_KEYS.GOALS),
        questions: await storage.getAll<Question>(STORAGE_KEYS.QUESTIONS),
        tests: await storage.getAll<PracticeTest>(STORAGE_KEYS.TESTS),
        attempts: await storage.getAll<PracticeAttempt>(STORAGE_KEYS.ATTEMPTS),
        mistakes: await storage.getAll<Mistake>(STORAGE_KEYS.MISTAKES),
        revisionItems: await storage.getAll<RevisionItem>(STORAGE_KEYS.REVISION),
        notes: await storage.getAll<Note>(STORAGE_KEYS.NOTES),
        bookmarks: await storage.getAll<Bookmark>(STORAGE_KEYS.BOOKMARKS),
      };
    },

    async import(data: BackupData): Promise<{ success: boolean; counts: Record<string, number> }> {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format');
      }

      const counts: Record<string, number> = {};

      if (Array.isArray(data.exams)) {
        await storage.setAll(STORAGE_KEYS.EXAMS, data.exams);
        counts.exams = data.exams.length;
      }
      if (Array.isArray(data.sessions)) {
        await storage.setAll(STORAGE_KEYS.SESSIONS, data.sessions);
        counts.sessions = data.sessions.length;
      }
      if (Array.isArray(data.goals)) {
        await storage.setAll(STORAGE_KEYS.GOALS, data.goals);
        counts.goals = data.goals.length;
      }
      if (Array.isArray(data.questions)) {
        await storage.setAll(STORAGE_KEYS.QUESTIONS, data.questions);
        counts.questions = data.questions.length;
      }
      if (Array.isArray(data.tests)) {
        await storage.setAll(STORAGE_KEYS.TESTS, data.tests);
        counts.tests = data.tests.length;
      }
      if (Array.isArray(data.attempts)) {
        await storage.setAll(STORAGE_KEYS.ATTEMPTS, data.attempts);
        counts.attempts = data.attempts.length;
      }
      if (Array.isArray(data.mistakes)) {
        await storage.setAll(STORAGE_KEYS.MISTAKES, data.mistakes);
        counts.mistakes = data.mistakes.length;
      }
      if (Array.isArray(data.revisionItems)) {
        await storage.setAll(STORAGE_KEYS.REVISION, data.revisionItems);
        counts.revisionItems = data.revisionItems.length;
      }
      if (Array.isArray(data.notes)) {
        await storage.setAll(STORAGE_KEYS.NOTES, data.notes);
        counts.notes = data.notes.length;
      }
      if (Array.isArray(data.bookmarks)) {
        await storage.setAll(STORAGE_KEYS.BOOKMARKS, data.bookmarks);
        counts.bookmarks = data.bookmarks.length;
      }

      // Queue the restore so it reaches D1 even if performed offline.
      await storage.enqueue({
        op: 'restore_backup',
        data: data as unknown as Record<string, unknown>,
      });
      scheduleSync();

      return { success: true, counts };
    },

    async clearAll(): Promise<void> {
      await storage.clearAll();
    },
  },
};
