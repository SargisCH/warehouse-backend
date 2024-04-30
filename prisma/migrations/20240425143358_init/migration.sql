/*
  Warnings:

  - You are about to drop the column `costPrice` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "costPrice";

-- AlterTable
ALTER TABLE "StockProduct" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
