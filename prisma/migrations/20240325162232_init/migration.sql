/*
  Warnings:

  - You are about to drop the column `originalAmount` on the `SaleItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "originalAmount",
ADD COLUMN     "originalPrice" INTEGER;
