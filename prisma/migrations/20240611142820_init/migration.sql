/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `BalanceHistory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `InventoryEntryHistory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `InventorySupplier` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `InventorySupplierOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Manager` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `ProductCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `StockProduct` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `TradeCredit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `TransactionHistory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `InventoryEntryHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `InventorySupplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `InventorySupplierOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Manager` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ProductCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `StockProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `TradeCredit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `TransactionHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "InventoryEntryHistory" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "InventorySupplier" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "InventorySupplierOrder" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Manager" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "StockProduct" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TradeCredit" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BalanceHistory_tenantId_key" ON "BalanceHistory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_key" ON "Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_tenantId_key" ON "Inventory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntryHistory_tenantId_key" ON "InventoryEntryHistory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySupplier_tenantId_key" ON "InventorySupplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySupplierOrder_tenantId_key" ON "InventorySupplierOrder"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_tenantId_key" ON "Manager"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_key" ON "Product"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_tenantId_key" ON "ProductCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_tenantId_key" ON "Sale"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StockProduct_tenantId_key" ON "StockProduct"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCredit_tenantId_key" ON "TradeCredit"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionHistory_tenantId_key" ON "TransactionHistory"("tenantId");

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCredit" ADD CONSTRAINT "TradeCredit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockProduct" ADD CONSTRAINT "StockProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplier" ADD CONSTRAINT "InventorySupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntryHistory" ADD CONSTRAINT "InventoryEntryHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
