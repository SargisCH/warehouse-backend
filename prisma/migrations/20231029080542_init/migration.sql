-- CreateTable
CREATE TABLE "Ingridient" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingridient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingridient_productId_key" ON "Ingridient"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingridient_inventoryId_key" ON "Ingridient"("inventoryId");

-- AddForeignKey
ALTER TABLE "Ingridient" ADD CONSTRAINT "Ingridient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingridient" ADD CONSTRAINT "Ingridient_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
