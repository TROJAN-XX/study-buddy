import { describe, it, expect } from 'vitest';
import { shuffle, calculateAccuracy, formatDuration } from '../packages/web/src/lib/utils';

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const snapshot = [...input];
    const output = shuffle(input);

    expect(output).toHaveLength(input.length);
    expect([...output].sort((a, b) => a - b)).toEqual(snapshot);
    expect(input).toEqual(snapshot);
  });

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });
});

describe('calculateAccuracy', () => {
  it('rounds percentages', () => {
    expect(calculateAccuracy(3, 4)).toBe(75);
    expect(calculateAccuracy(1, 3)).toBe(33);
  });

  it('returns null when nothing was attempted', () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(150)).toBe('2h 30m');
  });
});
