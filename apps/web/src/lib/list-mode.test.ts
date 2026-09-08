import { describe, expect, it } from 'vitest';
import {
  currencySymbol,
  formatListAmount,
  formatListMoney,
  itemQuantity,
  resolveListCurrency,
  resolveListMode,
  sumListPrices,
  sumListQuantities,
  sumQuantitiesByUnit,
} from './list-mode';

describe('resolveListMode', () => {
  it('defaults missing and unknown values to plain', () => {
    expect(resolveListMode(undefined)).toBe('plain');
    expect(resolveListMode('simple')).toBe('plain');
  });

  it('keeps priced, counted, and ingredients', () => {
    expect(resolveListMode('priced')).toBe('priced');
    expect(resolveListMode('counted')).toBe('counted');
    expect(resolveListMode('ingredients')).toBe('ingredients');
  });
});

describe('sumListPrices', () => {
  it('sums all prices', () => {
    expect(
      sumListPrices([
        { price: 10, checked: true },
        { price: 2.5, checked: false },
        { price: null, checked: true },
      ]),
    ).toBe(12.5);
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
    ).toBe(6);
  });
});

describe('sumQuantitiesByUnit', () => {
  it('groups by unit and defaults missing unit to g', () => {
    expect(
      sumQuantitiesByUnit([
        { quantity: 500, unit: 'g' },
        { quantity: 1, unit: 'kg' },
        { quantity: 250 },
      ]),
    ).toEqual({ g: 750, kg: 1 });
  });
});

describe('formatListAmount', () => {
  it('formats without forcing two decimals', () => {
    expect(formatListAmount(12, 'en')).toBe('12');
    expect(formatListAmount(12.5, 'en')).toBe('12.5');
  });
});

describe('formatListMoney', () => {
  it('includes a currency symbol', () => {
    expect(formatListMoney(15, 'ILS', 'en')).toMatch(/15/);
    expect(currencySymbol('ILS', 'en')).toBeTruthy();
    expect(resolveListCurrency(undefined)).toBe('ILS');
  });
});
