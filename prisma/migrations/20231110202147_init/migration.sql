-- DropForeignKey
ALTER TABLE "InventorySupplierOrder" DROP CONSTRAINT "InventorySupplierOrder_inventoryId_fkey";

-- AlterTable
ALTER TABLE "InventorySupplierOrder" ALTER COLUMN "inventoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
