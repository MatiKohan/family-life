import type { ListCurrency, ListItem, ListMode, ListUnit } from '@family-life/types';
import {
  resolveListCurrency,
  resolveListMode,
  resolveListUnit,
} from '@family-life/types';
import { intlLocale } from './date-locale';

export { resolveListCurrency, resolveListMode, resolveListUnit };
export type { ListCurrency, ListMode, ListUnit };

export function itemQuantity(item: Pick<ListItem, 'quantity'>): number {
  if (item.quantity == null) return 1;
  const n = Number(item.quantity);
  return Number.isFinite(n) ? n : 0;
}

export function itemPrice(item: Pick<ListItem, 'price'>): number {
  const n = Number(item.price);
  return Number.isFinite(n) ? n : 0;
}

export function sumListPrices(items: Pick<ListItem, 'price'>[]): number {
  return items.reduce((sum, item) => sum + itemPrice(item), 0);
}

export function sumListQuantities(items: Pick<ListItem, 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + itemQuantity(item), 0);
}

export function sumQuantitiesByUnit(
  items: Pick<ListItem, 'quantity' | 'unit'>[],
): Partial<Record<ListUnit, number>> {
  const sums: Partial<Record<ListUnit, number>> = {};
  for (const item of items) {
    const unit = resolveListUnit(item.unit);
    sums[unit] = (sums[unit] ?? 0) + itemQuantity(item);
  }
  return sums;
}

export function formatListAmount(value: number, language: string): string {
  return new Intl.NumberFormat(intlLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatListMoney(
  value: number,
  currency: ListCurrency,
  language: string,
): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function currencySymbol(currency: ListCurrency, language: string): string {
  const parts = new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}
