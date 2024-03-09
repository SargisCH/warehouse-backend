-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "inventorySupplierId" INTEGER;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
