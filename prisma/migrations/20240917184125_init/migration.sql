/*
  Warnings:

  - You are about to drop the column `confirmed` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `disposed` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SaleReturn" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disposed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "confirmed",
DROP COLUMN "disposed";
