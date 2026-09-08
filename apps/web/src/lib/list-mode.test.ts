import { describe, expect, it } from 'vitest';
import {
  formatListAmount,
  itemQuantity,
  resolveListMode,
  sumListPrices,
  sumListQuantities,
} from './list-mode';

describe('resolveListMode', () => {
  it('defaults missing and unknown values to plain', () => {
    expect(resolveListMode(undefined)).toBe('plain');
    expect(resolveListMode('simple')).toBe('plain');
  });

  it('keeps priced and counted', () => {
    expect(resolveListMode('priced')).toBe('priced');
    expect(resolveListMode('counted')).toBe('counted');
  });
});

describe('sumListPrices', () => {
  it('sums all prices and checked prices', () => {
    expect(
      sumListPrices([
        { price: 10, checked: true },
        { price: 2.5, checked: false },
        { price: null, checked: true },
      ]),
    ).toEqual({ all: 12.5, checked: 10 });
  });
});

describe('sumListQuantities', () => {
  it('treats missing quantity as 1', () => {
    expect(itemQuantity({})).toBe(1);
    expect(
      sumListQuantities([
        { quantity: 3, checked: true },
        { checked: false },
        { quantity: 2, checked: true },
      ]),
    ).toEqual({ all: 6, checked: 5 });
  });
});

describe('formatListAmount', () => {
  it('formats without forcing two decimals', () => {
    expect(formatListAmount(12, 'en')).toBe('12');
    expect(formatListAmount(12.5, 'en')).toBe('12.5');
  });
});
