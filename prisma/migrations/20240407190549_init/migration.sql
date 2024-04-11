-- AlterTable
ALTER TABLE "InventorySupplierOrder" ADD COLUMN     "partialCreditAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT '';
