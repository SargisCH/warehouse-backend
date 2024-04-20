-- AlterTable
ALTER TABLE "InventoryEntryHistory" ADD COLUMN     "inventorySupplierId" INTEGER;

-- AddForeignKey
ALTER TABLE "InventoryEntryHistory" ADD CONSTRAINT "InventoryEntryHistory_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
