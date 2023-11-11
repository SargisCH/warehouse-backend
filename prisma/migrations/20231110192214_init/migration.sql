/*
  Warnings:

  - You are about to drop the column `amount` on the `InventorySupplierOrder` table. All the data in the column will be lost.
  - You are about to drop the column `amountUnit` on the `InventorySupplierOrder` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `InventorySupplierOrder` table. All the data in the column will be lost.
  - You are about to drop the column `priceUnit` on the `InventorySupplierOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventorySupplierOrder" DROP COLUMN "amount",
DROP COLUMN "amountUnit",
DROP COLUMN "price",
DROP COLUMN "priceUnit";

-- CreateTable
CREATE TABLE "InventorySupplierOrderItem" (
    "id" SERIAL NOT NULL,
    "inventorySupplierOrderId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupplierOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventorySupplierOrderItem" ADD CONSTRAINT "InventorySupplierOrderItem_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrderItem" ADD CONSTRAINT "InventorySupplierOrderItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
