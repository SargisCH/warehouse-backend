/*
  Warnings:

  - You are about to drop the column `inventoryId` on the `InventorySupplierOrder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventorySupplierOrder" DROP CONSTRAINT "InventorySupplierOrder_inventoryId_fkey";

-- AlterTable
ALTER TABLE "InventorySupplierOrder" DROP COLUMN "inventoryId";
