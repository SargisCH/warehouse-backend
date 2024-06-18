-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_creditId_fkey";

-- DropIndex
DROP INDEX "BalanceHistory_tenantId_key";

-- DropIndex
DROP INDEX "Client_tenantId_key";

-- DropIndex
DROP INDEX "Inventory_tenantId_key";

-- DropIndex
DROP INDEX "InventoryEntryHistory_tenantId_key";

-- DropIndex
DROP INDEX "InventorySupplier_tenantId_key";

-- DropIndex
DROP INDEX "InventorySupplierOrder_tenantId_key";

-- DropIndex
DROP INDEX "Manager_tenantId_key";

-- DropIndex
DROP INDEX "Product_tenantId_key";

-- DropIndex
DROP INDEX "ProductCategory_tenantId_key";

-- DropIndex
DROP INDEX "Sale_tenantId_key";

-- DropIndex
DROP INDEX "StockProduct_tenantId_key";

-- DropIndex
DROP INDEX "TradeCredit_tenantId_key";

-- DropIndex
DROP INDEX "TransactionHistory_tenantId_key";

-- CreateTable
CREATE TABLE "_CreditToTenant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CreditToTenant_AB_unique" ON "_CreditToTenant"("A", "B");

-- CreateIndex
CREATE INDEX "_CreditToTenant_B_index" ON "_CreditToTenant"("B");

-- AddForeignKey
ALTER TABLE "_CreditToTenant" ADD CONSTRAINT "_CreditToTenant_A_fkey" FOREIGN KEY ("A") REFERENCES "Credit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CreditToTenant" ADD CONSTRAINT "_CreditToTenant_B_fkey" FOREIGN KEY ("B") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
