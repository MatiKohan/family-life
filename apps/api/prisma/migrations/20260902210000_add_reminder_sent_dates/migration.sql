-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "reminderSentDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
