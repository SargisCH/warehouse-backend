/*
  Warnings:

  - You are about to drop the column `amount` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `amountUnit` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `avg` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "amount",
DROP COLUMN "amountUnit",
DROP COLUMN "avg",
DROP COLUMN "currency";
