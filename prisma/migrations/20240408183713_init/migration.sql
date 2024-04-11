/*
  Warnings:

  - A unique constraint covering the columns `[inventorySupplierOrderId]` on the table `Credit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Credit" ADD COLUMN     "inventorySupplierOrderId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Credit_inventorySupplierOrderId_key" ON "Credit"("inventorySupplierOrderId");

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
