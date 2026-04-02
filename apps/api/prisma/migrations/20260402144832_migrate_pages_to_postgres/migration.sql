-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📄',
    "type" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "taskItems" JSONB NOT NULL DEFAULT '[]',
    "eventIds" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
