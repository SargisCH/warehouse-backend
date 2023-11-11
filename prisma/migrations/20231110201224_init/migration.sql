/*
  Warnings:

  - You are about to drop the column `inventirySupplierId` on the `InventorySupplierOrder` table. All the data in the column will be lost.
  - Added the required column `inventorySupplierId` to the `InventorySupplierOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InventorySupplierOrder" DROP CONSTRAINT "InventorySupplierOrder_inventirySupplierId_fkey";

-- AlterTable
ALTER TABLE "InventorySupplierOrder" DROP COLUMN "inventirySupplierId",
ADD COLUMN     "inventorySupplierId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
