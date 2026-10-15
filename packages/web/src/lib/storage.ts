import { generateId } from './utils';
import { EXAMS, SAMPLE_QUESTIONS, SAMPLE_NOTES } from '@study-buddy/shared';
import type { Exam, Question, Note } from '@study-buddy/shared';

export const STORAGE_KEYS = {
  EXAMS: 'sb_exams',
  SESSIONS: 'sb_sessions',
  GOALS: 'sb_goals',
  QUESTIONS: 'sb_questions',
  TESTS: 'sb_tests',
  ATTEMPTS: 'sb_attempts',
  MISTAKES: 'sb_mistakes',
  REVISION: 'sb_revision',
  NOTES: 'sb_notes',
  BOOKMARKS: 'sb_bookmarks',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Safe local storage reader
 */
function readStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return [];
  }
}

/**
 * Safe local storage writer
 */
function writeStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

/**
 * Ensure initial seed data exists in localStorage
 */
function initializeSeedIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const exams = readStorage<Exam>(STORAGE_KEYS.EXAMS);
  if (!exams || exams.length === 0) {
    writeStorage(STORAGE_KEYS.EXAMS, EXAMS);
  }
  const questions = readStorage<Question>(STORAGE_KEYS.QUESTIONS);
  if (!questions || questions.length === 0) {
    writeStorage(STORAGE_KEYS.QUESTIONS, SAMPLE_QUESTIONS);
  }
  const notes = readStorage<Note>(STORAGE_KEYS.NOTES);
  if (!notes || notes.length === 0) {
    writeStorage(STORAGE_KEYS.NOTES, SAMPLE_NOTES);
  }
}

// Run initial seed on load
initializeSeedIfNeeded();

export const storage = {
  /**
   * Get all items for a given storage key
   */
  getAll<T>(key: string): T[] {
    initializeSeedIfNeeded();
    return readStorage<T>(key);
  },

  /**
   * Get a single item by id
   */
  getById<T extends { id: string }>(key: string, id: string): T | null {
    const items = readStorage<T>(key);
    return items.find((item) => item.id === id) || null;
  },

  /**
   * Create a new item with auto-generated id and timestamps
   */
  create<T extends { id: string }>(
    key: string,
    item: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<T>
  ): T {
    const now = new Date().toISOString();
    const newItem = {
      createdAt: now,
      updatedAt: now,
      ...item,
      id: (item as any).id || generateId(),
    } as unknown as T;

    const items = readStorage<T>(key);
    items.unshift(newItem);
    writeStorage(key, items);

    return newItem;
  },

  /**
   * Update an existing item by id
   */
  update<T extends { id: string; updatedAt?: string }>(
    key: string,
    id: string,
    updates: Partial<T>
  ): T | null {
    const items = readStorage<T>(key);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updatedItem;
    writeStorage(key, items);

    return updatedItem;
  },

  /**
   * Remove an item by id
   */
  remove(key: string, id: string): boolean {
    const items = readStorage<{ id: string }>(key);
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;

    writeStorage(key, filtered);
    return true;
  },

  /**
   * Overwrite entire collection
   */
  setAll<T>(key: string, items: T[]): void {
    writeStorage(key, items);
  },

  /**
   * Clear all study buddy keys
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((k) => {
      localStorage.removeItem(k);
    });
    // Re-seed default exams, sample questions, and notes
    writeStorage(STORAGE_KEYS.EXAMS, EXAMS);
    writeStorage(STORAGE_KEYS.QUESTIONS, SAMPLE_QUESTIONS);
    writeStorage(STORAGE_KEYS.NOTES, SAMPLE_NOTES);
  },
};
