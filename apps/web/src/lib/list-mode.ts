import type { ListItem, ListMode } from '@family-life/types';
import { resolveListMode } from '@family-life/types';
import { intlLocale } from './date-locale';

export { resolveListMode };
export type { ListMode };

export function itemQuantity(item: Pick<ListItem, 'quantity'>): number {
  if (item.quantity == null) return 1;
  const n = Number(item.quantity);
  return Number.isFinite(n) ? n : 0;
}

export function itemPrice(item: Pick<ListItem, 'price'>): number {
  const n = Number(item.price);
  return Number.isFinite(n) ? n : 0;
}

export function sumListPrices(items: Pick<ListItem, 'price' | 'checked'>[]): {
  all: number;
  checked: number;
} {
  let all = 0;
  let checked = 0;
  for (const item of items) {
    const n = itemPrice(item);
    all += n;
    if (item.checked) checked += n;
  }
  return { all, checked };
}

export function sumListQuantities(items: Pick<ListItem, 'quantity' | 'checked'>[]): {
  all: number;
  checked: number;
} {
  let all = 0;
  let checked = 0;
  for (const item of items) {
    const n = itemQuantity(item);
    all += n;
    if (item.checked) checked += n;
  }
  return { all, checked };
}

export function formatListAmount(value: number, language: string): string {
  return new Intl.NumberFormat(intlLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
