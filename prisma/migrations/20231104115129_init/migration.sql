/*
  Warnings:

  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partner_Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Partner_Item" DROP CONSTRAINT "Partner_Item_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "Partner_Item" DROP CONSTRAINT "Partner_Item_partnerId_fkey";

-- DropTable
DROP TABLE "Partner";

-- DropTable
DROP TABLE "Partner_Item";

-- CreateTable
CREATE TABLE "InventorySupplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySupplierOrder" (
    "id" SERIAL NOT NULL,
    "inventirySupplierId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupplierOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventorySupplier_name_key" ON "InventorySupplier"("name");

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_inventirySupplierId_fkey" FOREIGN KEY ("inventirySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
