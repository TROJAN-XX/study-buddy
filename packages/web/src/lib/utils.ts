/**
 * Class name merger utility
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a unique ID (UUID v4 or fallback)
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

/**
 * Format date to YYYY-MM-DD string in local time
 */
export function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
export function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string or Date object for friendly display
 * e.g. "Wednesday, 15 October 2025" or "15 Oct 2025"
 */
export function formatDate(
  dateInput: string | Date,
  format: 'full' | 'medium' | 'short' = 'medium'
): string {
  if (!dateInput) return '';

  let date: Date;
  if (typeof dateInput === 'string') {
    // If YYYY-MM-DD, parse year, month, day to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return String(dateInput);

  if (format === 'full') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format duration in minutes into a human-readable string like '2h 30m' or '45m'
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correct: number, attempted: number): number | null {
  if (!attempted || attempted <= 0) return null;
  return Math.round((correct / attempted) * 100);
}
