-- CreateTable
CREATE TABLE "ItemCollection" (
    "itemId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemCollection_pkey" PRIMARY KEY ("itemId","collectionId")
);

-- CreateIndex
CREATE INDEX "ItemCollection_collectionId_idx" ON "ItemCollection"("collectionId");

-- AddForeignKey
ALTER TABLE "ItemCollection" ADD CONSTRAINT "ItemCollection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCollection" ADD CONSTRAINT "ItemCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every existing single-collection link over before the column goes.
-- Only same-owner pairs, which is every row the app has ever written.
INSERT INTO "ItemCollection" ("itemId", "collectionId", "addedAt")
SELECT i."id", i."collectionId", i."updatedAt"
FROM "Item" i
JOIN "Collection" c ON c."id" = i."collectionId" AND c."userId" = i."userId";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_collectionId_fkey";

-- DropIndex
DROP INDEX "Item_collectionId_idx";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "collectionId";
