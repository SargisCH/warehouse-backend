/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Inventory_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_name_tenantId_key" ON "Inventory"("name", "tenantId");
