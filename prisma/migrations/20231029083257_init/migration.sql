/*
  Warnings:

  - You are about to drop the `Ingridient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ingridient" DROP CONSTRAINT "Ingridient_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "Ingridient" DROP CONSTRAINT "Ingridient_productId_fkey";

-- DropTable
DROP TABLE "Ingridient";

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_productId_key" ON "Ingredient"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_inventoryId_key" ON "Ingredient"("inventoryId");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
