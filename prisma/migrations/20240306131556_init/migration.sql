-- CreateTable
CREATE TABLE "StockProduct" (
    "id" SERIAL NOT NULL,
    "inStock" DOUBLE PRECISION NOT NULL,
    "inStockUnit" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockProduct_productId_key" ON "StockProduct"("productId");

-- AddForeignKey
ALTER TABLE "StockProduct" ADD CONSTRAINT "StockProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
