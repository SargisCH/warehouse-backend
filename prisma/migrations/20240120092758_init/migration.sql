-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "partialCreditAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;
