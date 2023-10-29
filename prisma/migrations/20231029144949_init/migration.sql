/*
  Warnings:

  - The primary key for the `Ingredient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Ingredient` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Ingredient_inventoryId_key";

-- DropIndex
DROP INDEX "Ingredient_productId_key";

-- AlterTable
ALTER TABLE "Ingredient" DROP CONSTRAINT "Ingredient_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("productId", "inventoryId");
