/*
  Warnings:

  - Added the required column `amount` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `avg` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "avg" DOUBLE PRECISION NOT NULL;
