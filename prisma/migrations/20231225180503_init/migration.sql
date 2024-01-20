/*
  Warnings:

  - You are about to drop the column `clientId` on the `SaleItem` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `SaleItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_clientId_fkey";

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "clientId",
DROP COLUMN "name";
