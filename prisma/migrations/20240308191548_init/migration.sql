-- DropForeignKey
ALTER TABLE "Credit" DROP CONSTRAINT "Credit_saleId_fkey";

-- AlterTable
ALTER TABLE "Credit" ALTER COLUMN "saleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
