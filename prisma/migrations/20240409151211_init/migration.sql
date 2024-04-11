/*
  Warnings:

  - You are about to drop the column `companyCode` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `companyType` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contactPerson` on the `Client` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[legalName]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "companyCode",
DROP COLUMN "companyId",
DROP COLUMN "companyType",
DROP COLUMN "contactPerson",
ADD COLUMN     "legalName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Client_legalName_key" ON "Client"("legalName");
