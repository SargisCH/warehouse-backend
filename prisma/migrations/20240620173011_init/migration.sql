/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `PayoutType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PayoutType_name_tenantId_key" ON "PayoutType"("name", "tenantId");
