/*
  Warnings:

  - Added the required column `before` to the `BalanceHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `result` to the `BalanceHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `BalanceHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BalanceHistory" ADD COLUMN     "before" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "result" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
