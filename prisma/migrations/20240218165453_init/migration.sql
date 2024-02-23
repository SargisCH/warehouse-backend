/*
  Warnings:

  - You are about to drop the column `creditId` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId]` on the table `Credit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Credit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_creditId_fkey";

-- AlterTable
ALTER TABLE "Credit" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "creditId";

-- CreateIndex
CREATE UNIQUE INDEX "Credit_tenantId_key" ON "Credit"("tenantId");

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
