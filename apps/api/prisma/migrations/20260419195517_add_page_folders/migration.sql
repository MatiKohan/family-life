-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "PageFolder" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📁',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFolder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PageFolder" ADD CONSTRAINT "PageFolder_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PageFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
