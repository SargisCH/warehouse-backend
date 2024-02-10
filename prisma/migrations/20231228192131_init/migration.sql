/*
  Warnings:

  - You are about to drop the column `name` on the `Credit` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Credit_name_key";

-- AlterTable
ALTER TABLE "Credit" DROP COLUMN "name";
