-- CreateTable
CREATE TABLE "InventoryEntryHistory" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEntryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEntryItem" (
    "id" SERIAL NOT NULL,
    "inventorySupplierId" INTEGER,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "inventoryEntryId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InventoryEntryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryEntryItem" ADD CONSTRAINT "InventoryEntryItem_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntryItem" ADD CONSTRAINT "InventoryEntryItem_inventoryEntryId_fkey" FOREIGN KEY ("inventoryEntryId") REFERENCES "InventoryEntryHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntryItem" ADD CONSTRAINT "InventoryEntryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
