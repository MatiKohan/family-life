-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "attendees" JSONB NOT NULL DEFAULT '[]';
