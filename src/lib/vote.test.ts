import { describe, it, expect } from 'vitest';
import { votesNeeded, votePassed } from './vote';

describe('vote', () => {
  it('7 人存活需 4 票（ceil(7/2)）', () => {
    expect(votesNeeded(7)).toBe(4);
    expect(votePassed(3, 7)).toBe(false);
    expect(votePassed(4, 7)).toBe(true);
  });
  it('8 人存活需 4 票', () => {
    expect(votesNeeded(8)).toBe(4);
  });
});
