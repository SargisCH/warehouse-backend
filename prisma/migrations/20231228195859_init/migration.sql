/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Credit` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Credit" DROP CONSTRAINT "Credit_tenantId_fkey";

-- DropIndex
DROP INDEX "Credit_tenantId_key";

-- AlterTable
ALTER TABLE "Credit" DROP COLUMN "tenantId";
