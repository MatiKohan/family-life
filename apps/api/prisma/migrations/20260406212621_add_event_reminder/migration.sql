-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "reminderMinutesBefore" INTEGER,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
