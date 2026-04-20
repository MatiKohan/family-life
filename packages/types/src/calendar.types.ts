export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  until?: string; // ISO date string "YYYY-MM-DD", inclusive last occurrence
  exceptions?: string[]; // "YYYY-MM-DD" dates to skip
}
