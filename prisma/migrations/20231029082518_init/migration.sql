/*
  Warnings:

  - You are about to drop the column `productId` on the `Inventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_productId_fkey";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "productId";
